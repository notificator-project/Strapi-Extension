export type EventName = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
export type Severity = 'info' | 'warning' | 'critical';

export type Channels = {
  panel: boolean;
  dashboard: boolean;
  push: boolean;
  email: boolean;
  mqtt: boolean;
};

export type PanelActivity = {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  body: string;
  severity: Severity;
  event: EventName;
  contentType: string;
  contentTypeName: string;
  actorName: string;
  createdAt: string;
};

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  contentType: string;
  event: EventName;
  title: string;
  body: string;
  severity: Severity;
  channels: Channels;
};

export type RuleDraft = Omit<Rule, 'id'>;

export type ContentTypeOption = {
  uid: string;
  displayName: string;
  kind: string;
};

export type ConnectionState = {
  enabled: boolean;
  configured: boolean;
  originConfigured: boolean;
  mqtt: {
    enabled: boolean;
    useAccount: boolean;
    configured: boolean;
    ready: boolean;
    host: string;
    topicPrefix: string;
  };
};

export type OverviewResponse = {
  settings: { rules: Rule[] };
  contentTypes: ContentTypeOption[];
  connection: ConnectionState;
  activity: PanelActivity[];
};

export type StatusNotice = {
  tone: 'success' | 'danger';
  text: string;
};
