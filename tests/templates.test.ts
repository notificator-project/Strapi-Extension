import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeDocumentResult,
  publicEntryDetails,
  renderTemplate,
  type TemplateContext,
} from '../server/src/services/delivery';

const contentType = {
  attributes: {
    title: { type: 'string' },
    views: { type: 'integer' },
    secret: { type: 'string', private: true },
    password: { type: 'password' },
    author: { type: 'relation' },
  },
} as never;

describe('notification templates', () => {
  it('normalizes document envelopes used by publish and delete', () => {
    assert.deepEqual(
      normalizeDocumentResult({ documentId: 'doc-1', entries: [{ title: 'Release' }] }),
      { title: 'Release', documentId: 'doc-1' }
    );
  });

  it('includes only public scalar entry fields', () => {
    const details = publicEntryDetails(
      {
        title: 'Release',
        views: 42,
        secret: 'private',
        password: 'password',
        author: { name: 'Editor' },
      },
      contentType
    );

    assert.deepEqual(details, { title: 'Release', views: 42 });
  });

  it('resolves own scalar properties without getters or inherited values', () => {
    const inherited = Object.create({ unsafe: 'inherited' });
    inherited.title = 'Release';
    const context: TemplateContext = {
      entry: inherited,
      actor: {
        id: '1',
        name: 'Editor',
        username: 'editor',
        email: 'editor@example.com',
        type: 'admin',
      },
      event: { name: 'publish', label: 'published' },
      model: { uid: 'api::article.article', displayName: 'Article' },
    };

    assert.equal(renderTemplate('{{entry.title}} {{entry.unsafe}}', context), ' ');
    assert.equal(renderTemplate('{{actor.name}} {{missing.value}}', context), 'Editor ');
  });
});
