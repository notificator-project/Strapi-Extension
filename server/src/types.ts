/** Document actions exposed by Strapi's document-service middleware. */
export const SUPPORTED_EVENTS = ['create', 'update', 'delete', 'publish', 'unpublish'] as const;

/** Alert levels shared by local activity and remote Notificator delivery. */
export const SEVERITIES = ['info', 'warning', 'critical'] as const;

export type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];
export type Severity = (typeof SEVERITIES)[number];

/** Per-rule destinations. `dashboard` represents the remote Notificator inbox. */
export type DeliveryChannels = {
  panel: boolean;
  dashboard: boolean;
  push: boolean;
  email: boolean;
  mqtt: boolean;
};

/** Safe, locally retained representation of a matched rule. */
export type PanelActivity = {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  body: string;
  severity: Severity;
  event: SupportedEvent;
  contentType: string;
  contentTypeName: string;
  actorName: string;
  createdAt: string;
};

/** Administrator-managed mapping from a Strapi action to an alert template. */
export type NotificationRule = {
  id: string;
  name: string;
  enabled: boolean;
  contentType: string;
  event: SupportedEvent;
  title: string;
  body: string;
  severity: Severity;
  channels: DeliveryChannels;
};

export type StoredSettings = {
  rules: NotificationRule[];
};

/** Server-only plugin configuration. Secret fields must never reach admin responses. */
export type PluginConfig = {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  origin: string;
  requestTimeoutMs: number;
  mqtt: {
    enabled: boolean;
    host: string;
    username: string;
    password: string;
    topicPrefix: string;
  };
};

export type ContentTypeOption = {
  uid: string;
  displayName: string;
  kind: string;
};

/** Small actor snapshot captured while Strapi's request context is still active. */
export type ActorContext = {
  id: string;
  name: string;
  username: string;
  email: string;
  type: 'admin' | 'authenticated' | 'api' | 'anonymous' | 'system';
};
