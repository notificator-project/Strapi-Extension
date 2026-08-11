import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import activityService from '../server/src/services/activity';
import type { ActorContext, NotificationRule } from '../server/src/types';

const rule: NotificationRule = {
  id: 'article-updated',
  name: 'Article updated',
  enabled: true,
  contentType: 'api::article.article',
  event: 'update',
  title: 'Updated',
  body: '{{entry.title}}',
  severity: 'info',
  channels: { panel: true, dashboard: true, push: false, email: false, mqtt: false },
};

const actor: ActorContext = {
  id: '1',
  name: 'Editor',
  username: 'editor',
  email: 'editor@example.com',
  type: 'admin',
};

describe('local panel activity', () => {
  it('serializes concurrent writes and caps retained history at 100 items', async () => {
    let stored: unknown = [];
    const store = {
      async get() {
        return stored;
      },
      async set({ value }: { value: unknown }) {
        await Promise.resolve();
        stored = value;
      },
    };
    const strapi = {
      store: () => store,
      contentTypes: {
        'api::article.article': { info: { displayName: 'Article' } },
      },
    } as never;
    const service = activityService({ strapi });

    await Promise.all(
      Array.from({ length: 105 }, (_, index) =>
        service.record(rule, 'update', rule.contentType, actor, {
          title: `Update ${index}`,
          body: `Body ${index}`,
        })
      )
    );

    const items = await service.list({ limit: 100 });
    assert.equal(items.length, 100);
    assert.equal(new Set(items.map((item) => item.title)).size, 100);
    assert.equal(items[0]?.title, 'Update 104');
  });

  it('supports incremental reads and clearing the local feed', async () => {
    const old = {
      id: 'old',
      ruleId: rule.id,
      ruleName: rule.name,
      title: 'Old',
      body: 'Old',
      severity: 'info',
      event: 'update',
      contentType: rule.contentType,
      contentTypeName: 'Article',
      actorName: 'Editor',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    let stored: unknown = [old];
    const strapi = {
      store: () => ({
        get: async () => stored,
        set: async ({ value }: { value: unknown }) => {
          stored = value;
        },
      }),
      contentTypes: {},
    } as never;
    const service = activityService({ strapi });

    assert.deepEqual(await service.list({ after: '2026-01-02T00:00:00.000Z' }), []);
    await service.clear();
    assert.deepEqual(await service.list(), []);
  });
});
