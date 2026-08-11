import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

import deliveryService from '../server/src/services/delivery';
import type { PluginConfig } from '../server/src/types';

const baseConfig: PluginConfig = {
  enabled: true,
  endpoint: 'https://example.com/notify',
  apiKey: 'test-api-key',
  origin: 'https://cms.example.com',
  requestTimeoutMs: 1_000,
  mqtt: {
    enabled: true,
    host: '',
    username: '',
    password: '',
    topicPrefix: 'notificator-project',
  },
};

describe('remote delivery', () => {
  it('signs the exact request body and skips only incomplete MQTT delivery', async () => {
    const originalFetch = globalThis.fetch;
    let request: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = async (url, init) => {
      request = { url: String(url), init: init ?? {} };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const strapi = { config: { get: () => baseConfig } } as never;
      await deliveryService({ strapi }).send({
        title: 'Published',
        sendPush: true,
        sendMqtt: true,
      });

      assert.ok(request);
      assert.equal(request.url, baseConfig.endpoint);
      const body = String(request.init.body);
      assert.deepEqual(JSON.parse(body), {
        title: 'Published',
        sendPush: true,
        sendMqtt: false,
        mqttConnection: { mode: 'custom', status: 'incomplete' },
      });

      const headers = new Headers(request.init.headers);
      const timestamp = headers.get('X-Timestamp') ?? '';
      const nonce = headers.get('X-Nonce') ?? '';
      const expectedSignature = createHmac('sha256', baseConfig.apiKey)
        .update(`${timestamp}.${nonce}.${body}`)
        .digest('hex');
      assert.equal(headers.get('X-Signature'), expectedSignature);
      assert.equal(headers.get('Authorization'), `Bearer ${baseConfig.apiKey}`);
      assert.equal(headers.get('Origin'), baseConfig.origin);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects delivery when the API connection is disabled or incomplete', async () => {
    const disabled = { ...baseConfig, enabled: false };
    await assert.rejects(
      deliveryService({ strapi: { config: { get: () => disabled } } as never }).send({}),
      /disabled/
    );

    const incomplete = { ...baseConfig, apiKey: '' };
    await assert.rejects(
      deliveryService({ strapi: { config: { get: () => incomplete } } as never }).send({}),
      /not configured/
    );
  });
});
