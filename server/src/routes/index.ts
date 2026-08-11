import contentAPIRoutes from './content-api';
import adminAPIRoutes from './admin';

/** Route groups consumed by Strapi's plugin router. */
const routes = {
  'content-api': contentAPIRoutes,
  admin: adminAPIRoutes,
};

export default routes;
