# Changelog

All notable changes to Notificator for Strapi will be documented in this file.

## 1.0.0 - 2026-09-21

- Promote the extension to its first stable release for Strapi 5.
- Add an account-MQTT toggle that reuses the encrypted HiveMQ connection saved
  to the `strapi_server` API key's Notificator account.
- Keep custom HiveMQ configuration available as an explicit fallback.
- Keep account broker credentials out of Strapi and the signed request body.
