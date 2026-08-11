/** Permission descriptors shared by navigation and admin authorization checks. */
export const PERMISSIONS = {
  read: [{ action: 'plugin::notificator.read', subject: null }],
  update: [{ action: 'plugin::notificator.settings.update', subject: null }],
};
