import { createHmac, randomUUID } from 'node:crypto';

import type { Core, Schema } from '@strapi/strapi';

import type { ActorContext, NotificationRule, PluginConfig, SupportedEvent } from '../types';

export type TemplateContext = {
  entry: Record<string, unknown>;
  actor: ActorContext;
  event: { name: SupportedEvent; label: string };
  model: { uid: string; displayName: string };
};

const EVENT_LABELS: Record<SupportedEvent, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  publish: 'published',
  unpublish: 'unpublished',
};

const MAX_DETAIL_FIELDS = 24;
const MAX_DETAIL_LENGTH = 500;

/** Restrict template traversal to ordinary objects with no custom prototype. */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Convert supported scalar values to a bounded, serializable representation. */
const scalarValue = (value: unknown): string | number | boolean | null => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.slice(0, MAX_DETAIL_LENGTH);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
};

/**
 * Publish, unpublish, and delete return a document envelope. Create and update
 * return the entry directly. Normalizing both forms keeps templates predictable.
 */
export const normalizeDocumentResult = (result: unknown): unknown => {
  if (!isPlainObject(result) || !Array.isArray(result.entries)) {
    return result;
  }

  const entry = result.entries.find(isPlainObject) ?? {};
  return {
    ...entry,
    documentId: scalarValue(result.documentId),
  };
};

/**
 * Extract public scalar attributes using the registered Strapi schema.
 * Relations, components, media, private fields, and password-like values are
 * intentionally unavailable to both templates and outbound payloads.
 */
export const publicEntryDetails = (
  entry: unknown,
  contentType: Schema.ContentType
): Record<string, unknown> => {
  if (!isPlainObject(entry)) {
    return {};
  }

  const details: Record<string, unknown> = {};
  const attributes = contentType.attributes ?? {};

  for (const [key, rawValue] of Object.entries(entry)) {
    if (Object.keys(details).length >= MAX_DETAIL_FIELDS) {
      break;
    }

    if (['password', 'resetPasswordToken', 'confirmationToken'].includes(key)) {
      continue;
    }

    const attribute = attributes[key] as { type?: string; private?: boolean } | undefined;
    if (attribute?.private || attribute?.type === 'password') {
      continue;
    }

    const value = scalarValue(rawValue);
    if (value !== null || rawValue === null) {
      details[key] = value;
    }
  }

  return details;
};

/** Resolve an own-property template path without getters or method invocation. */
const resolveTemplateValue = (context: TemplateContext, path: string): unknown => {
  const segments = path.split('.');
  let current: unknown = context;

  for (const segment of segments) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return '';
    }
    current = current[segment];
  }

  return scalarValue(current) ?? '';
};

/** Replace supported `{{path.to.value}}` tokens; missing values become empty strings. */
export const renderTemplate = (template: string, context: TemplateContext): string =>
  template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, path: string) =>
    String(resolveTemplateValue(context, path))
  );

/** Derive a secret-free MQTT readiness model suitable for the admin response. */
export const getMqttState = (config: PluginConfig) => {
  const mqtt = config.mqtt;
  const configured = Boolean(mqtt?.host && mqtt.username && mqtt.password && mqtt.topicPrefix);
  const useAccount = Boolean(mqtt?.useAccount);

  return {
    enabled: Boolean(mqtt?.enabled),
    useAccount,
    configured: useAccount || configured,
    ready: Boolean(mqtt?.enabled && (useAccount || configured)),
    host: mqtt?.host || '',
    topicPrefix: mqtt?.topicPrefix || 'notificator-project',
  };
};

/** Build safe notification payloads and deliver them to the Notificator API. */
const deliveryService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Return connection readiness without exposing API keys or broker credentials. */
  getConnectionState() {
    const config = strapi.config.get('plugin::notificator') as PluginConfig;
    const mqtt = getMqttState(config);

    return {
      enabled: config.enabled,
      configured: Boolean(config.apiKey),
      originConfigured: Boolean(config.origin),
      mqtt,
    };
  },

  /** Build the canonical remote payload shared by live and local activity paths. */
  buildRulePayload(
    rule: NotificationRule,
    event: SupportedEvent,
    uid: string,
    result: unknown,
    actor: ActorContext
  ) {
    const contentType = strapi.contentTypes[uid];
    if (!contentType) {
      return null;
    }

    const entry = publicEntryDetails(normalizeDocumentResult(result), contentType);
    const context: TemplateContext = {
      entry,
      actor,
      event: { name: event, label: EVENT_LABELS[event] },
      model: { uid, displayName: contentType.info.displayName },
    };

    return {
      title: renderTemplate(rule.title, context),
      body: renderTemplate(rule.body, context),
      severity: rule.severity,
      category: rule.severity,
      source: 'strapi_plugin',
      sendPush: rule.channels.push,
      sendEmail: rule.channels.email,
      sendMqtt: rule.channels.mqtt,
      data: {
        strapi_event: event,
        content_type: uid,
        content_type_name: contentType.info.displayName,
        entry,
      },
      timestamp: new Date().toISOString(),
    };
  },

  /** Convenience wrapper for callers that do not need the intermediate payload. */
  async sendRule(
    rule: NotificationRule,
    event: SupportedEvent,
    uid: string,
    result: unknown,
    actor: ActorContext
  ) {
    const payload = this.buildRulePayload(rule, event, uid, result, actor);
    if (payload) {
      await this.send(payload);
    }
  },

  /** Exercise authentication, signing, and API delivery with a harmless event. */
  async sendTest() {
    return this.send({
      title: 'Strapi connection test',
      body: 'Notificator is connected to your Strapi project.',
      severity: 'info',
      category: 'info',
      source: 'strapi_plugin',
      sendPush: true,
      sendEmail: false,
      sendMqtt: false,
      data: { strapi_event: 'connection_test' },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Sign and send a notification request.
   *
   * The signature covers `timestamp.nonce.body`, allowing the API to reject
   * modified or replayed requests. MQTT credentials are attached only when a
   * rule requests device delivery and the server configuration is complete.
   */
  async send(payload: Record<string, unknown>) {
    const config = strapi.config.get('plugin::notificator') as PluginConfig;

    if (!config.enabled) {
      throw new Error('Notificator delivery is disabled.');
    }

    if (!config.apiKey) {
      throw new Error(
        'Notificator is not configured. Set apiKey in the Strapi plugin configuration.'
      );
    }

    const preparedPayload = { ...payload };
    if (preparedPayload.sendMqtt === true) {
      const mqtt = getMqttState(config);
      if (mqtt.ready) {
        if (mqtt.useAccount) {
          preparedPayload.mqttConnection = { mode: 'account', status: 'ready' };
        } else {
          preparedPayload.mqttConnection = { mode: 'custom', status: 'ready' };
          preparedPayload.mqttConfig = {
            version: 1,
            provider: 'hivemq_cloud',
            host: config.mqtt.host.trim().toLowerCase().replace(/\.$/, ''),
            port: 8884,
            path: '/mqtt',
            username: config.mqtt.username.trim(),
            password: config.mqtt.password,
            topicPrefix: config.mqtt.topicPrefix.trim().replace(/^\/+|\/+$/g, ''),
          };
        }
      } else {
        // Preserve the other delivery channels when MQTT is not ready.
        preparedPayload.sendMqtt = false;
        preparedPayload.mqttConnection = { mode: 'custom', status: 'incomplete' };
      }
    }

    // Serialize once: the exact bytes sent must be the bytes covered by HMAC.
    const body = JSON.stringify(preparedPayload);
    const timestamp = Date.now().toString();
    const nonce = randomUUID();
    const signature = createHmac('sha256', config.apiKey)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
          'X-Signature': signature,
          ...(config.origin
            ? { Origin: config.origin, Referer: `${config.origin.replace(/\/$/, '')}/` }
            : {}),
        },
        body,
      });

      const responseBody = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;

      if (!response.ok) {
        const message =
          typeof responseBody?.error === 'string'
            ? responseBody.error
            : `Notificator returned HTTP ${response.status}.`;
        throw new Error(message);
      }

      return responseBody;
    } finally {
      clearTimeout(timeout);
    }
  },
});

export default deliveryService;
