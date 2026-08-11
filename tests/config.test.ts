import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import pluginConfig, {
  OFFICIAL_ENDPOINT,
  resolveEndpoint,
  validator,
} from '../server/src/config/index';

describe('API endpoint configuration', () => {
  it('uses the official endpoint in production and ignores development overrides', () => {
    assert.equal(
      resolveEndpoint({
        NODE_ENV: 'production',
        NOTIFICATOR_DEV_ENDPOINT: 'https://development.example.com',
      }),
      OFFICIAL_ENDPOINT
    );
  });

  it('supports an explicitly named endpoint override in development', () => {
    assert.equal(
      resolveEndpoint({
        NODE_ENV: 'development',
        NOTIFICATOR_DEV_ENDPOINT: 'http://localhost:8888/notify',
      }),
      'http://localhost:8888/notify'
    );
  });

  it('rejects production endpoint overrides', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      assert.doesNotThrow(() =>
        validator({ ...pluginConfig.default, endpoint: OFFICIAL_ENDPOINT })
      );
      assert.throws(
        () => validator({ ...pluginConfig.default, endpoint: 'https://development.example.com' }),
        /official Notificator API endpoint/
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('requires HTTPS for non-local development endpoints', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      assert.doesNotThrow(() =>
        validator({ ...pluginConfig.default, endpoint: 'http://localhost:8888/notify' })
      );
      assert.doesNotThrow(() =>
        validator({ ...pluginConfig.default, endpoint: 'https://development.example.com' })
      );
      assert.throws(
        () => validator({ ...pluginConfig.default, endpoint: 'http://development.example.com' }),
        /must use HTTPS/
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
