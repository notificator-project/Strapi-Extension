# Contributing

Thank you for helping improve Notificator for Strapi. Contributions are welcome
for code, tests, documentation, accessibility, design, and verified bug reports.

## Before you start

- Search existing issues before opening a duplicate.
- Keep proposals focused on one problem or capability.
- Discuss major API, storage, security, or UI architecture changes before
  investing in a large implementation.
- Do not include API keys, MQTT credentials, personal content, or production
  activity data in issues, fixtures, screenshots, or commits.

Security vulnerabilities should not be reported in a public issue. Use the
private security-reporting option on the GitHub repository when available, or
contact the project through <https://notificator-project.com/contact/>.

## Local setup

Requirements are Node.js and npm versions supported by the current Strapi 5
release, plus a local Strapi 5 application for interactive admin testing.

```bash
git clone https://github.com/notificator-project/Strapi-Extension.git
cd Strapi-Extension
npm install
npm run build
```

For live development, start the extension link watcher:

```bash
npm run watch:link
```

In the consuming Strapi application, run `npm run strapi link`, select
`@notificator-project/strapi-extension`, and restart Strapi when prompted.
Configure secrets only in that application's environment.

## Code structure

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing lifecycle,
templates, local storage, or delivery. In brief:

- `admin/src` contains the Strapi admin extension.
- `server/src` contains configuration, routes, services, and middleware.
- `tests` documents server behavior and security boundaries.

Keep page composition, state/transport, and focused UI panels separate. Keep
server controllers thin and place domain behavior in services or small pure
helpers that can be tested directly.

## Coding standards

- Use TypeScript and follow the existing module and naming conventions.
- Prefer explicit domain types over broad casts.
- Comment decisions, invariants, and security boundaries rather than restating
  straightforward code.
- Keep credentials and secret-bearing objects server-side.
- Preserve accessible labels, keyboard behavior, semantic headings, and native
  Strapi design-system patterns.
- Add or update tests whenever behavior changes.
- Update the README and architecture guide when user-visible setup or system
  boundaries change.

Run the formatter rather than manually aligning code:

```bash
npm run format
```

## Required checks

Before opening a pull request, run:

```bash
npm run release:check
```

This runs formatting, behavior tests, both TypeScript checks, the production
build, and Strapi Plugin SDK package verification.

The behavior suite must remain deterministic and must not call live Notificator,
Strapi, HiveMQ, or customer services. Mock network and plugin-store boundaries.

## Pull requests

A useful pull request includes:

- a concise explanation of the problem and the chosen solution;
- the affected user or developer workflow;
- tests for changed behavior;
- screenshots or a short recording for visible admin changes;
- documentation updates where needed;
- confirmation that the required checks pass.

Avoid unrelated formatting or dependency churn. Keep commits understandable,
but maintainers may squash them when merging.

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE).
