/**
 * Admin routes are split between read and mutation permissions so custom
 * Strapi roles can inspect activity without being allowed to change rules.
 */
export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/overview',
      handler: 'admin.overview',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::notificator.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/activity',
      handler: 'admin.activity',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::notificator.read'] },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/activity',
      handler: 'admin.clearActivity',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::notificator.settings.update'] },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'admin.saveSettings',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::notificator.settings.update'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/test',
      handler: 'admin.testConnection',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::notificator.settings.update'] },
          },
        ],
      },
    },
  ],
});
