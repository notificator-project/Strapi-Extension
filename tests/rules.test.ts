import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanRule } from '../server/src/services/settings';

const validRule = {
  id: 'article-published',
  name: ' Article published ',
  enabled: false,
  contentType: 'api::article.article',
  event: 'publish',
  title: ' {{entry.title}} ',
  body: ' Published by {{actor.name}} ',
  severity: 'warning',
  channels: { panel: false, dashboard: false, push: false, email: true, mqtt: true },
};

describe('notification rule sanitization', () => {
  it('normalizes a valid rule and always enables the remote inbox', () => {
    assert.deepEqual(cleanRule(validRule), {
      ...validRule,
      name: 'Article published',
      title: '{{entry.title}}',
      body: 'Published by {{actor.name}}',
      channels: { ...validRule.channels, dashboard: true },
    });
  });

  it('adds migration defaults when older rules lack channel flags', () => {
    const cleaned = cleanRule({
      id: 'legacy',
      contentType: 'api::article.article',
      event: 'update',
      title: 'Updated',
      body: '{{entry.title}}',
      channels: {},
    });

    assert.deepEqual(cleaned?.channels, {
      panel: true,
      dashboard: true,
      push: true,
      email: false,
      mqtt: false,
    });
    assert.equal(cleaned?.enabled, true);
  });

  it('rejects internal models, unknown actions, and empty messages', () => {
    assert.equal(cleanRule({ ...validRule, contentType: 'admin::user' }), null);
    assert.equal(cleanRule({ ...validRule, event: 'findMany' }), null);
    assert.equal(cleanRule({ ...validRule, body: '   ' }), null);
  });
});
