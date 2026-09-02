# Notificator for Strapi

Turn Strapi content activity into useful alerts without writing lifecycle code
for every content type.

Notificator for Strapi adds a rule builder to the Strapi 5 admin panel. Choose
what content to watch, when an alert should be created, what it should say, and
where it should be delivered. Rules can keep activity inside Strapi or extend
it to the Notificator inbox, mobile push, email, and compatible IoT devices.

> **Status:** Early development preview. The extension is ready for integration
> testing with Strapi 5, but it should not be the only record of a critical
> business or security event.

The current package is available from
[npm](https://www.npmjs.com/package/@notificator-project/strapi-extension), with
release notes published in the
[latest GitHub release](https://github.com/notificator-project/Strapi-Extension/releases/latest).

## Why use it?

- **No repeated lifecycle code.** Administrators create and maintain rules from
  one interface instead of adding handlers to every content type.
- **Useful, readable alerts.** Templates turn a technical content event into a
  title and message that make sense to editors and site owners.
- **Local or connected operation.** The Strapi activity log works without a
  Notificator API key. External delivery can be enabled when it is needed.
- **One event, several destinations.** Keep an event in the Notificator inbox,
  send a mobile or email alert, and forward it to an IoT device through MQTT.
- **User-owned MQTT.** Device delivery currently uses the administrator's own
  HiveMQ Cloud cluster, keeping broker ownership and credentials under their
  control.
- **Safe failure behavior.** Notification delivery runs after a successful
  Strapi operation. A delivery failure is logged without preventing content
  from being saved.

## How it works

1. Strapi successfully creates, updates, publishes, unpublishes, or deletes an
   entry.
2. The extension finds enabled rules for that content type and action.
3. Safe template values are resolved from the entry, model, event, and actor.
4. The local activity record is written first when **Strapi activity log** is enabled.
5. Configured Notificator channels receive a signed server-to-server request.

Rules support Strapi application collection types and single types. Strapi's
internal admin and plugin models are intentionally excluded.

## Supported actions

| Rule action       | Trigger                            |
| ----------------- | ---------------------------------- |
| Entry created     | A new document is created          |
| Entry updated     | An existing document is changed    |
| Entry published   | A draft is published               |
| Entry unpublished | Published content returns to draft |
| Entry deleted     | A document is deleted              |

## Delivery channels

| Channel             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| Strapi activity log | Stores up to 100 recent matches locally and shows a Strapi admin toast      |
| Notificator inbox   | Stores the accepted event in the user's Notificator account                 |
| Push                | Sends a mobile push through the Notificator app                             |
| Email               | Uses the email-notification preference configured in the Notificator app    |
| MQTT                | Delivers to compatible devices through a user-owned HiveMQ Cloud connection |

Every event sent to the Notificator API is automatically stored in the
Notificator inbox. Push, email, and MQTT are optional additional delivery
channels.

The Strapi activity log is independent from the Notificator API and MQTT. The
activity feed remains available when either connection is unavailable. Toasts
appear while the Strapi admin application is open and may take up to 15 seconds
to appear.

## Rule builder

Each rule contains:

- A private rule name for identifying it in the Strapi admin panel
- A Strapi content type
- One supported content action
- A notification title and message
- Information, warning, or critical severity
- A local Strapi activity-log toggle and external delivery choices
- An enabled or disabled state

Rules can be added, edited, enabled, disabled, and removed without changing
application code. New Strapi projects need at least one application content
type before a rule can be created.

## Requirements

- Strapi 5.51.2 or newer within the Strapi 5 release line
- A supported Node.js version for the installed Strapi release
- A Notificator API key for inbox, push, email, or MQTT delivery
- A HiveMQ Cloud cluster only when MQTT delivery is required

The Strapi activity log does not require a Notificator account or API key.

## Installation

Install the extension from the Strapi application's directory:

```bash
npm install @notificator-project/strapi-extension
```

Then add the configuration below and restart Strapi. Until the first stable
release, review version changes before upgrading an existing installation.

### Get a Notificator account and API key

Create an account or sign in through the [web dashboard (beta)](https://dashboard.notificator-project.com)
or the Notificator mobile app, and create a **Strapi
Extension** (`strapi_server`) API key for the Strapi installation. Add that key
to the Strapi server environment as `NOTIFICATOR_API_KEY`; do not paste it into
browser-side admin fields or commit it to the repository.

The dashboard also lets you read connected notifications and monitor devices
without installing the app. Mobile push still requires the app and notification
permission. See the [mobile app page](https://notificator-project.com/mobile-app/) for the
current iOS and Android availability.

## Configure Strapi

Add Notificator to `config/plugins.ts` in the consuming Strapi application.
Keep API keys and broker credentials in environment variables.

```ts
export default ({ env }) => ({
  notificator: {
    enabled: true,
    config: {
      enabled: env.bool('NOTIFICATOR_ENABLED', true),
      apiKey: env('NOTIFICATOR_API_KEY', ''),
      origin: env('PUBLIC_URL', ''),
      requestTimeoutMs: env.int('NOTIFICATOR_TIMEOUT_MS', 8000),
      mqtt: {
        enabled: env.bool('NOTIFICATOR_MQTT_ENABLED', false),
        host: env('NOTIFICATOR_MQTT_HOST', ''),
        username: env('NOTIFICATOR_MQTT_USERNAME', ''),
        password: env('NOTIFICATOR_MQTT_PASSWORD', ''),
        topicPrefix: env('NOTIFICATOR_MQTT_TOPIC_PREFIX', 'notificator-project'),
      },
    },
  },
});
```

Production delivery always uses the official Notificator API endpoint. It is
owned by the project and is not a user-configurable connection value.

### Environment variables

The plugin configuration above reads the following variables from the consuming
Strapi application's environment. Only the API key and broker password must be
treated as secrets, though keeping the MQTT username private is also sensible.

| Variable                        | Required                        | Default               | Purpose                                                                                       |
| ------------------------------- | ------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `NOTIFICATOR_ENABLED`           | No                              | `true`                | Enables remote Notificator delivery. Local Strapi activity continues when this is `false`.    |
| `NOTIFICATOR_API_KEY`           | For inbox, push, email, or MQTT | Empty                 | Secret server API key created in the Notificator mobile app. Never expose it to browser code. |
| `PUBLIC_URL`                    | Recommended for remote delivery | Empty                 | Public origin of the Strapi application, such as `https://cms.example.com`.                   |
| `NOTIFICATOR_TIMEOUT_MS`        | No                              | `8000`                | Remote request timeout in milliseconds. Accepted range: `1000` to `30000`.                    |
| `NOTIFICATOR_MQTT_ENABLED`      | No                              | `false`               | Enables the MQTT configuration used by rules with the MQTT channel selected.                  |
| `NOTIFICATOR_MQTT_HOST`         | When MQTT is enabled            | Empty                 | HiveMQ Cloud hostname only, without a protocol, port, or path.                                |
| `NOTIFICATOR_MQTT_USERNAME`     | When MQTT is enabled            | Empty                 | Username created for the HiveMQ Cloud cluster.                                                |
| `NOTIFICATOR_MQTT_PASSWORD`     | When MQTT is enabled            | Empty                 | Secret password created for the HiveMQ Cloud cluster.                                         |
| `NOTIFICATOR_MQTT_TOPIC_PREFIX` | When MQTT is enabled            | `notificator-project` | Topic namespace shared with the user's Notificator devices.                                   |

For local activity only, no Notificator environment variables are required.
Add a rule, enable **Strapi activity log**, and leave the external channels off.

For connected inbox and push delivery, the smallest useful `.env` configuration
is:

```dotenv
NOTIFICATOR_ENABLED=true
NOTIFICATOR_API_KEY=your-server-api-key
PUBLIC_URL=https://cms.example.com
```

Restart Strapi after changing environment variables. Environment changes are
not applied dynamically.

After restarting Strapi, open **Notificator** in the admin menu. The page shows
the current API and MQTT connection state, provides a connection test, and
contains the rule builder and local activity feed.

### Confirm the setup

1. Open **Notificator** and confirm that the API card says **Configured** when
   remote delivery is required.
2. Use **Test connection** and check the Notificator inbox or mobile device.
3. Create a rule for an application content type and enable **Strapi activity
   log**.
4. Perform the selected action on a matching entry.
5. Confirm the event appears in the local activity feed and in any selected
   remote channels.

The connection test is intentionally unavailable until an API key is
configured. It tests signed API and push delivery; it is not required for a
local-only installation.

### Admin permissions

The extension registers two Strapi admin permissions:

- **Read** allows an administrator to open the extension and view its state.
- **Manage settings** allows rules and local activity to be changed.

Super Admin users receive normal unrestricted access. Assign both permissions
to any custom admin role that should manage notification rules.

## Optional HiveMQ Cloud delivery

MQTT currently supports HiveMQ Cloud. Add the following values to the Strapi
application's `.env` file and restart Strapi:

```dotenv
NOTIFICATOR_MQTT_ENABLED=true
NOTIFICATOR_MQTT_HOST=your-cluster.s1.eu.hivemq.cloud
NOTIFICATOR_MQTT_USERNAME=your-cluster-username
NOTIFICATOR_MQTT_PASSWORD=your-cluster-password
NOTIFICATOR_MQTT_TOPIC_PREFIX=notificator-project
```

The MQTT password remains in the Strapi server environment. For an MQTT-enabled
rule, the extension includes the connection only in its signed HTTPS request.
The Notificator API uses it for that delivery and does not persist it in the API
database. If the MQTT configuration is incomplete, MQTT is skipped while the
other configured channels continue.

HiveMQ Cloud uses TLS WebSockets on port `8884` and path `/mqtt`; these fixed
transport values do not need environment variables. Create the cluster access
credentials in HiveMQ Cloud, then enter only its hostname, username, and
password in Strapi's server environment.

## Template values

Use template values in a notification title or message:

| Value                   | Meaning                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `{{model.displayName}}` | Human-readable content type name                            |
| `{{model.uid}}`         | Strapi content type UID                                     |
| `{{event.name}}`        | Raw event name, such as `publish`                           |
| `{{event.label}}`       | Readable event text, such as `published`                    |
| `{{entry.title}}`       | A public scalar field named `title` from the affected entry |
| `{{entry.documentId}}`  | Strapi document identifier when available                   |
| `{{actor.name}}`        | Name of the user who triggered the operation                |
| `{{actor.email}}`       | Actor email when available                                  |
| `{{actor.username}}`    | Actor username when available                               |
| `{{actor.id}}`          | Actor or API credential identifier                          |
| `{{actor.type}}`        | `admin`, `authenticated`, `api`, `anonymous`, or `system`   |

Other public scalar entry fields can use the same pattern, for example
`{{entry.slug}}`, `{{entry.status}}`, or `{{entry.price}}`. A missing value
resolves to an empty string.

Example:

```text
Rule name: Article published
Title: {{model.displayName}} {{event.label}}
Message: {{entry.title}} was published by {{actor.name}}.
```

## Security and privacy

- API keys and MQTT credentials stay in server configuration and are never
  returned by the extension's admin API.
- Remote requests are signed with HMAC-SHA256, a timestamp, and a unique nonce.
- Remote requests use a configurable timeout between 1 and 30 seconds.
- Passwords, private attributes, relations, components, media, and other
  complex values are excluded from entry details.
- At most 24 scalar entry fields are included, with individual values limited
  in length.
- Template paths read own properties only. They cannot invoke methods or read
  inherited object properties.
- Actor details are included in rendered text only when the rule explicitly
  uses an actor template value.

Background operations are attributed to `System`. Unauthenticated requests use
`Anonymous user`. Delivery occurs asynchronously after Strapi has completed the
content operation.

## Local activity retention

Strapi activity is stored through Strapi's plugin store and capped at the
100 most recent matches. Administrators with **Manage settings** permission can
clear it from the extension page. This feed is intended as a convenient recent
activity view, not as an immutable audit log.

## Troubleshooting

### No content types appear in the rule builder

Only application models whose UID begins with `api::` are listed. Create a
collection type or single type in Content-Type Builder and restart Strapi if it
prompts you to do so. Admin, plugin, and other internal models are excluded.

### Test connection is disabled

Confirm that `NOTIFICATOR_API_KEY` is available to the Strapi server process,
then restart Strapi. Credentials are not entered through the admin page.

### Local activity appears but remote notifications do not

Local activity is intentionally independent. Check the API connection card,
the Strapi server log, the rule's external channels, and the notification
preferences in the mobile app.

### A Strapi toast does not appear immediately

The admin application polls for new local activity. Keep the admin open and
allow up to 15 seconds. The event should still appear in the activity feed even
if the toast was missed while the admin application was closed.

### MQTT is skipped

MQTT requires all four MQTT values, a HiveMQ Cloud hostname, and an API key for
the signed Notificator request. If MQTT is incomplete, it is skipped without
blocking the inbox, push, email, or local activity channels.

## Development

Developer setup, testing, and repository internals are collected here so the
installation and configuration guidance above remains focused on Strapi users.

### Link the extension to a local Strapi application

This repository uses the official Strapi Plugin SDK. From the extension
repository:

```bash
npm install
npm run watch:link
```

In a second terminal, from the consuming Strapi application:

```bash
npm run strapi link
```

Choose `@notificator-project/strapi-extension`, then restart Strapi. A fixed
local path using a `file:` dependency can also be used during development.

API contributors can set `NOTIFICATOR_DEV_ENDPOINT` to an HTTPS development API
or a local URL when `NODE_ENV=development`. The override is ignored in every
other environment; production builds always use the official Notificator
endpoint.

### Quality commands

```bash
npm run build          # Production bundles and type declarations
npm run watch          # Rebuild during extension development
npm run watch:link     # Rebuild and update linked Strapi applications
npm run verify         # Plugin SDK package verification
npm test               # Rule, template, activity, and delivery behavior tests
npm run test:ts:front  # Admin TypeScript check
npm run test:ts:back   # Server TypeScript check
npm run format         # Format source and project files
npm run format:check   # Check formatting without writing changes
npm run release:check  # Run every check required before publishing
```

The [architecture guide](docs/ARCHITECTURE.md) explains the event pipeline,
trust boundaries, storage, and extension points. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the local workflow, quality checks, and pull-request expectations.

## Project links

- [Notificator website](https://notificator-project.com)
- [Documentation](https://docs.notificator-project.com)
- [Issues](https://github.com/notificator-project/Strapi-Extension/issues)

Notificator is a free and open-source community project. It is not affiliated
with or endorsed by Strapi Solutions SAS or HiveMQ GmbH.

## License

[MIT](LICENSE)
