import type { PluginConfig } from '../types';

export const OFFICIAL_ENDPOINT = 'https://wpnotif.notificator-project.com';

/** Keep production fixed to the official API while allowing deliberate local integration work. */
export const resolveEndpoint = (environment: NodeJS.ProcessEnv = process.env): string => {
  const developmentEndpoint =
    environment.NODE_ENV === 'development' ? environment.NOTIFICATOR_DEV_ENDPOINT?.trim() : '';

  return developmentEndpoint || OFFICIAL_ENDPOINT;
};

const defaults: PluginConfig = {
  enabled: true,
  endpoint: resolveEndpoint(),
  apiKey: '',
  origin: '',
  requestTimeoutMs: 8_000,
  mqtt: {
    enabled: false,
    host: '',
    username: '',
    password: '',
    topicPrefix: 'notificator-project',
  },
};

/**
 * Validate deployment configuration during Strapi startup.
 *
 * Secrets are validated for shape only and are never normalized back into the
 * configuration object. MQTT currently targets the TLS WebSocket interface of
 * HiveMQ Cloud, so arbitrary broker hosts are intentionally rejected.
 */
export const validator = (config: PluginConfig) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Notificator configuration must be an object.');
  }

  if (typeof config.enabled !== 'boolean') {
    throw new Error('Notificator `enabled` must be a boolean.');
  }

  let endpoint: URL;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new Error('Notificator API endpoint is invalid.');
  }

  if (config.endpoint !== OFFICIAL_ENDPOINT) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Production delivery must use the official Notificator API endpoint.');
    }

    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname);
    if (endpoint.protocol !== 'https:' && !isLocal) {
      throw new Error('Notificator development endpoint must use HTTPS or a local hostname.');
    }
  }

  if (
    !Number.isInteger(config.requestTimeoutMs) ||
    config.requestTimeoutMs < 1_000 ||
    config.requestTimeoutMs > 30_000
  ) {
    throw new Error('Notificator `requestTimeoutMs` must be between 1000 and 30000.');
  }

  if (config.mqtt?.enabled) {
    const host = String(config.mqtt.host ?? '')
      .trim()
      .toLowerCase();
    const username = String(config.mqtt.username ?? '').trim();
    const password = String(config.mqtt.password ?? '');
    const topicPrefix = String(config.mqtt.topicPrefix ?? '').trim();

    if (!host.endsWith('.hivemq.cloud') || host.length > 253 || host.includes('..')) {
      throw new Error('Notificator MQTT requires a valid HiveMQ Cloud hostname.');
    }
    if (!username || username.length > 128) {
      throw new Error('Notificator MQTT requires a valid username.');
    }
    if (!password || password.length > 512) {
      throw new Error('Notificator MQTT requires a valid password.');
    }
    if (
      !topicPrefix ||
      topicPrefix.length > 128 ||
      !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(topicPrefix)
    ) {
      throw new Error('Notificator MQTT requires a valid topic prefix.');
    }
  }
};

export default {
  default: defaults,
  validator,
};
