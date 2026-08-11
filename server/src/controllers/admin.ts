import type { Core } from '@strapi/strapi';

/**
 * Admin-only HTTP handlers. Authorization is applied by the route policies;
 * controllers remain responsible for input parsing and user-safe errors.
 */
const adminController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Return the complete model required to render the extension page. */
  async overview(ctx) {
    const settings = await strapi.plugin('notificator').service('settings').get();
    const contentTypes = strapi.plugin('notificator').service('settings').getContentTypes();
    const connection = strapi.plugin('notificator').service('delivery').getConnectionState();
    const activity = await strapi.plugin('notificator').service('activity').list();

    ctx.body = { settings, contentTypes, connection, activity };
  },

  /** Validate and persist the full notification-rule collection. */
  async saveSettings(ctx) {
    try {
      const settings = await strapi
        .plugin('notificator')
        .service('settings')
        .save(ctx.request.body);
      ctx.body = { settings };
    } catch (error) {
      ctx.badRequest(error instanceof Error ? error.message : 'Invalid settings.');
    }
  },

  /** Send a real signed notification without creating a saved rule. */
  async testConnection(ctx) {
    try {
      await strapi.plugin('notificator').service('delivery').sendTest();
      ctx.body = { ok: true };
    } catch (error) {
      ctx.badRequest(error instanceof Error ? error.message : 'Connection test failed.');
    }
  },

  /** Return recent local events, optionally newer than an ISO timestamp. */
  async activity(ctx) {
    const after = typeof ctx.query.after === 'string' ? ctx.query.after : undefined;
    const requestedLimit = Number(ctx.query.limit);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : undefined;
    ctx.body = {
      activity: await strapi.plugin('notificator').service('activity').list({ after, limit }),
    };
  },

  /** Remove local panel history without touching remote Notificator events. */
  async clearActivity(ctx) {
    await strapi.plugin('notificator').service('activity').clear();
    ctx.body = { ok: true };
  },
});

export default adminController;
