import { randomUUID } from 'node:crypto';

import type { Core } from '@strapi/strapi';

import type { ActorContext, NotificationRule, PanelActivity, SupportedEvent } from '../types';

const STORE_KEY = 'panel-activity';
const MAX_ACTIVITY_ITEMS = 100;
const DEFAULT_LIST_LIMIT = 20;

/** Accept only the minimum shape required to render a historical activity item. */
const isPanelActivity = (value: unknown): value is PanelActivity => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<PanelActivity>;
  return Boolean(item.id && item.ruleId && item.title && item.createdAt);
};

/**
 * Stores a small, capped activity feed inside Strapi. Writes are serialized so
 * simultaneous document events cannot overwrite one another.
 */
const activityService = ({ strapi }: { strapi: Core.Strapi }) => {
  // Strapi's plugin store has no atomic prepend operation. Serialize writes to
  // prevent concurrent document events from replacing one another's history.
  let writeQueue: Promise<void> = Promise.resolve();

  /** Read the store defensively so corrupt legacy values cannot break the admin page. */
  const readStored = async (): Promise<PanelActivity[]> => {
    const stored = await strapi
      .store({ type: 'plugin', name: 'notificator', key: STORE_KEY })
      .get();

    return Array.isArray(stored) ? stored.filter(isPanelActivity) : [];
  };

  return {
    /** Return newest-first activity with bounded polling and UI limits. */
    async list(options: { after?: string; limit?: number } = {}) {
      const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIST_LIMIT, 1), MAX_ACTIVITY_ITEMS);
      const items = await readStored();
      const filtered = options.after
        ? items.filter((item) => item.createdAt > options.after!)
        : items;

      return filtered.slice(0, limit);
    },

    /** Render-independent local record written before any remote delivery attempt. */
    async record(
      rule: NotificationRule,
      event: SupportedEvent,
      uid: string,
      actor: ActorContext,
      payload: Record<string, unknown>
    ) {
      const contentType = strapi.contentTypes[uid];
      const activity: PanelActivity = {
        id: randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        title: String(payload.title ?? ''),
        body: String(payload.body ?? ''),
        severity: rule.severity,
        event,
        contentType: uid,
        contentTypeName: contentType?.info.displayName ?? uid,
        actorName: actor.name,
        createdAt: new Date().toISOString(),
      };

      // Recover the queue after an earlier storage error so future events can retry.
      const operation = writeQueue
        .catch(() => undefined)
        .then(async () => {
          const current = await readStored();
          await strapi
            .store({ type: 'plugin', name: 'notificator', key: STORE_KEY })
            .set({ value: [activity, ...current].slice(0, MAX_ACTIVITY_ITEMS) });
        });

      writeQueue = operation;
      await operation;
      return activity;
    },

    /** Clear the activity feed through the same queue used by concurrent writes. */
    async clear() {
      const operation = writeQueue
        .catch(() => undefined)
        .then(async () => {
          await strapi
            .store({ type: 'plugin', name: 'notificator', key: STORE_KEY })
            .set({ value: [] });
        });
      writeQueue = operation;
      await operation;
    },
  };
};

export default activityService;
