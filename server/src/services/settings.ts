import type { Core } from '@strapi/strapi';

import {
  SEVERITIES,
  SUPPORTED_EVENTS,
  type ContentTypeOption,
  type NotificationRule,
  type StoredSettings,
} from '../types';

const STORE_KEY = 'settings';
const EMPTY_SETTINGS: StoredSettings = { rules: [] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * Sanitize an untrusted stored or admin-supplied rule.
 *
 * This function is shared by reads and writes so older stored rules receive
 * current defaults while malformed records never reach delivery code.
 */
export const cleanRule = (value: unknown): NotificationRule | null => {
  if (!isObject(value)) {
    return null;
  }

  const contentType = String(value.contentType ?? '').trim();
  const event = String(value.event ?? '');
  const severity = String(value.severity ?? 'info');
  const title = String(value.title ?? '')
    .trim()
    .slice(0, 180);
  const body = String(value.body ?? '')
    .trim()
    .slice(0, 1_500);
  const name = String(value.name ?? '')
    .trim()
    .slice(0, 120);
  const channels = isObject(value.channels) ? value.channels : {};

  if (
    !contentType.startsWith('api::') ||
    !SUPPORTED_EVENTS.includes(event as NotificationRule['event']) ||
    !SEVERITIES.includes(severity as NotificationRule['severity']) ||
    !title ||
    !body
  ) {
    return null;
  }

  return {
    id: String(value.id ?? '').trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: name || `${contentType.split('.').pop() || 'Content'} · ${event}`,
    enabled: isBoolean(value.enabled) ? value.enabled : true,
    contentType,
    event: event as NotificationRule['event'],
    title,
    body,
    severity: severity as NotificationRule['severity'],
    channels: {
      // Existing rules opt in during migration so the local activity log works immediately.
      panel: isBoolean(channels.panel) ? channels.panel : true,
      // The API stores every accepted event in the Notificator inbox.
      dashboard: true,
      push: isBoolean(channels.push) ? channels.push : true,
      email: isBoolean(channels.email) ? channels.email : false,
      mqtt: isBoolean(channels.mqtt) ? channels.mqtt : false,
    },
  };
};

/** Persist rules in Strapi's plugin store and expose eligible app content types. */
const settingsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Read settings defensively, omitting records that no longer validate. */
  async get(): Promise<StoredSettings> {
    const stored = await strapi
      .store({ type: 'plugin', name: 'notificator', key: STORE_KEY })
      .get();

    if (!isObject(stored) || !Array.isArray(stored.rules)) {
      return EMPTY_SETTINGS;
    }

    return {
      rules: stored.rules.map(cleanRule).filter((rule): rule is NotificationRule => rule !== null),
    };
  },

  /** Validate the complete collection before replacing the stored settings. */
  async save(input: unknown): Promise<StoredSettings> {
    if (!isObject(input) || !Array.isArray(input.rules)) {
      throw new Error('Rules must be provided as an array.');
    }

    const rules = input.rules.map(cleanRule);
    if (rules.some((rule) => rule === null)) {
      throw new Error('One or more notification rules are invalid.');
    }

    const availableContentTypes = new Set(
      this.getContentTypes().map((contentType: ContentTypeOption) => contentType.uid)
    );
    if (rules.some((rule) => rule !== null && !availableContentTypes.has(rule.contentType))) {
      throw new Error('One or more rules refer to an unavailable content type.');
    }

    const settings: StoredSettings = {
      rules: rules as NotificationRule[],
    };

    await strapi
      .store({ type: 'plugin', name: 'notificator', key: STORE_KEY })
      .set({ value: settings });

    return settings;
  },

  /** List application models only; Strapi and plugin internals are excluded. */
  getContentTypes(): ContentTypeOption[] {
    return Object.values(strapi.contentTypes)
      .filter((contentType) => contentType.uid.startsWith('api::'))
      .map((contentType) => ({
        uid: contentType.uid,
        displayName: contentType.info.displayName,
        kind: contentType.kind,
      }))
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  },
});

export default settingsService;
