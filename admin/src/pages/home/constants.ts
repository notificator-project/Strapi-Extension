import type { Channels, EventName, RuleDraft } from './types';

export const EVENTS: Array<{ value: EventName; label: string }> = [
  { value: 'create', label: 'Entry created' },
  { value: 'update', label: 'Entry updated' },
  { value: 'publish', label: 'Entry published' },
  { value: 'unpublish', label: 'Entry unpublished' },
  { value: 'delete', label: 'Entry deleted' },
];

export const TEMPLATE_TAGS = [
  '{{entry.title}}',
  '{{entry.documentId}}',
  '{{model.displayName}}',
  '{{event.label}}',
  '{{actor.name}}',
  '{{actor.email}}',
  '{{actor.username}}',
  '{{actor.id}}',
  '{{actor.type}}',
];

/** Channels administrators can change; the Notificator inbox is always included remotely. */
export const CONFIGURABLE_CHANNELS: Array<keyof Channels> = ['panel', 'push', 'email', 'mqtt'];

export const EMPTY_RULE: RuleDraft = {
  name: '',
  enabled: true,
  contentType: '',
  event: 'publish',
  title: '{{model.displayName}} {{event.label}}',
  body: '{{entry.title}}',
  severity: 'info',
  channels: {
    panel: true,
    dashboard: true,
    push: true,
    email: false,
    mqtt: false,
  },
};
