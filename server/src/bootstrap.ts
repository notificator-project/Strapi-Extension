import type { Core } from '@strapi/strapi';

/** Register the read and mutation capabilities exposed to Strapi admin roles. */
const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'notificator',
    },
    {
      section: 'plugins',
      displayName: 'Manage settings',
      uid: 'settings.update',
      pluginName: 'notificator',
    },
  ]);
};

export default bootstrap;
