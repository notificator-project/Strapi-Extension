import type { Core } from '@strapi/strapi';

import { SUPPORTED_EVENTS, type ActorContext, type SupportedEvent } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const stringValue = (value: unknown, maxLength = 200): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, maxLength)
    : '';

/**
 * Capture a small serializable actor snapshot while request context is active.
 * Background operations have no request and are labelled as system actions.
 */
const getActorContext = (strapi: Core.Strapi): ActorContext => {
  const request = strapi.requestContext.get();
  if (!request) {
    return { id: '', name: 'System', username: '', email: '', type: 'system' };
  }

  const state = isPlainObject(request.state) ? request.state : {};
  const auth = isPlainObject(state.auth) ? state.auth : {};
  const adminUser = isPlainObject(state.user) ? state.user : null;
  const credentials = isPlainObject(auth.credentials) ? auth.credentials : null;
  const actor = adminUser ?? credentials;

  if (!actor) {
    return {
      id: '',
      name: 'Anonymous user',
      username: '',
      email: '',
      type: 'anonymous',
    };
  }

  const firstName = stringValue(actor.firstname ?? actor.firstName, 100);
  const lastName = stringValue(actor.lastname ?? actor.lastName, 100);
  const username = stringValue(actor.username, 150);
  const email = stringValue(actor.email, 254);
  const explicitName = stringValue(actor.name, 200);
  const name =
    [firstName, lastName].filter(Boolean).join(' ') ||
    explicitName ||
    username ||
    email ||
    'Authenticated user';
  const credentialType = stringValue(actor.type).toLowerCase();

  return {
    id: stringValue(actor.id ?? actor.documentId, 128),
    name,
    username,
    email,
    type: adminUser ? 'admin' : credentialType.includes('api') ? 'api' : 'authenticated',
  };
};

/**
 * Install the document-service middleware that converts successful Strapi
 * content operations into rule deliveries.
 *
 * Actor data is captured before `next()` because the request context may no
 * longer be available when background delivery begins. Calling `next()` first
 * also guarantees that a failed content operation never generates an alert.
 */
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.documents.use(async (context, next) => {
    const actor = getActorContext(strapi);
    const result = await next();
    const event = context.action as SupportedEvent;

    if (!context.uid.startsWith('api::') || !SUPPORTED_EVENTS.includes(event)) {
      return result;
    }

    // Defer I/O so notification latency never extends the editor's save request.
    setImmediate(async () => {
      try {
        const settings = await strapi.plugin('notificator').service('settings').get();
        const rules = settings.rules.filter(
          (rule) => rule.enabled && rule.contentType === context.uid && rule.event === event
        );

        // Independent rules may deliver concurrently; each rule isolates remote failures.
        await Promise.all(
          rules.map(async (rule) => {
            const delivery = strapi.plugin('notificator').service('delivery');
            const payload = delivery.buildRulePayload(rule, event, context.uid, result, actor);
            if (!payload) {
              return;
            }

            // Local activity is independent from API, push, email, and MQTT delivery.
            if (rule.channels.panel) {
              await strapi
                .plugin('notificator')
                .service('activity')
                .record(rule, event, context.uid, actor, payload);
            }

            // An unconfigured API is valid for installations using the local activity log only.
            const connection = delivery.getConnectionState();
            if (connection.enabled && connection.configured) {
              try {
                await delivery.send(payload);
              } catch (error) {
                strapi.log.error(
                  `[Notificator] Remote delivery for rule "${rule.name}" failed: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            }
          })
        );
      } catch (error) {
        strapi.log.error(
          `[Notificator] Event delivery failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    return result;
  });
};

export default register;
