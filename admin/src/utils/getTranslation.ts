import { PLUGIN_ID } from '../pluginId';

/** Namespace a translation key to avoid collisions with Strapi and other plugins. */
const getTranslation = (id: string) => `${PLUGIN_ID}.${id}`;

export { getTranslation };
