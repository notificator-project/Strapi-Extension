import type { Core } from '@strapi/strapi';

/**
 * No runtime resources require explicit teardown. Stored rules and local
 * activity are intentionally retained across ordinary Strapi restarts.
 */
const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  void strapi;
};

export default destroy;
