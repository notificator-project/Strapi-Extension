import {
  Badge,
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Check, Plus } from '@strapi/icons';
import type { ChangeEvent } from 'react';

import { CONFIGURABLE_CHANNELS, EVENTS, TEMPLATE_TAGS } from './constants';
import type { ContentTypeOption, EventName, RuleDraft, Severity } from './types';
import { ChannelCard, ChannelGrid, fieldId, FormField, FormGrid, Panel } from './ui';

type RuleEditorProps = {
  draft: RuleDraft;
  contentTypes: ContentTypeOption[];
  editing: boolean;
  mqttReady: boolean;
  saving: boolean;
  onDraftChange: (draft: RuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** Edit one rule draft while keeping persistence and page state outside the form. */
export const RuleEditor = ({
  draft,
  contentTypes,
  editing,
  mqttReady,
  saving,
  onDraftChange,
  onSave,
  onCancel,
}: RuleEditorProps) => (
  <Panel id="notificator-rule-editor" background="neutral0" padding={6}>
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Box>
        <Typography tag="h2" variant="beta">
          {editing ? 'Edit notification rule' : 'Add a notification rule'}
        </Typography>
        <Box paddingTop={2}>
          <Typography textColor="neutral600">
            Start with a content type and event, then use any available tag in the title or message.
          </Typography>
        </Box>
        <Box paddingTop={3}>
          <Flex gap={2} wrap="wrap">
            {TEMPLATE_TAGS.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </Flex>
        </Box>
        <Box paddingTop={2}>
          <Typography variant="pi" textColor="neutral600">
            Actor details are resolved from the active admin or authenticated API request. Email
            remains inside Strapi unless you explicitly use its tag.
          </Typography>
        </Box>
      </Box>

      {!contentTypes.length ? (
        <Box padding={5} background="neutral100" hasRadius>
          <Typography tag="h3" variant="delta">
            Create a content type first
          </Typography>
          <Box paddingTop={2}>
            <Typography textColor="neutral600">
              This is a new Strapi installation, so there are no application content types to
              monitor yet. Create one in Content-Type Builder, restart Strapi if prompted, and it
              will appear here automatically.
            </Typography>
          </Box>
        </Box>
      ) : null}

      {contentTypes.length ? (
        <FormGrid>
          <FormField id={fieldId('rule-name')} label="Rule name">
            <TextInput
              placeholder="For example: Article published"
              value={draft.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDraftChange({ ...draft, name: event.target.value })
              }
            />
          </FormField>

          <FormField id={fieldId('content-type')} label="Content type">
            <SingleSelect
              placeholder="Choose a content type"
              value={draft.contentType}
              onChange={(value: string | number | undefined) =>
                onDraftChange({ ...draft, contentType: String(value ?? '') })
              }
            >
              {contentTypes.map((item) => (
                <SingleSelectOption key={item.uid} value={item.uid}>
                  {item.displayName}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </FormField>

          <FormField id={fieldId('event')} label="Event">
            <SingleSelect
              value={draft.event}
              onChange={(value: string | number | undefined) =>
                onDraftChange({ ...draft, event: String(value) as EventName })
              }
            >
              {EVENTS.map((event) => (
                <SingleSelectOption key={event.value} value={event.value}>
                  {event.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </FormField>

          <FormField id={fieldId('title')} label="Notification title">
            <TextInput
              value={draft.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
            />
          </FormField>

          <FormField id={fieldId('body')} label="Message">
            <TextInput
              value={draft.body}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onDraftChange({ ...draft, body: event.target.value })
              }
            />
          </FormField>

          <FormField id={fieldId('severity')} label="Severity">
            <SingleSelect
              value={draft.severity}
              onChange={(value: string | number | undefined) =>
                onDraftChange({ ...draft, severity: String(value) as Severity })
              }
            >
              <SingleSelectOption value="info">Information</SingleSelectOption>
              <SingleSelectOption value="warning">Warning</SingleSelectOption>
              <SingleSelectOption value="critical">Critical</SingleSelectOption>
            </SingleSelect>
          </FormField>
        </FormGrid>
      ) : null}

      {contentTypes.length ? (
        <Box>
          <Typography tag="h3" variant="delta">
            Delivery channels
          </Typography>
          <Box paddingTop={2}>
            <Typography textColor="neutral600">
              Events sent to Notificator are automatically saved in your Notificator inbox. Choose
              any additional delivery channels below.
            </Typography>
          </Box>
          <Box paddingTop={3}>
            <ChannelGrid>
              {CONFIGURABLE_CHANNELS.map((channel) => (
                <ChannelCard key={channel} padding={3}>
                  <Toggle
                    id={fieldId(`channel-${channel}`)}
                    name={`channel-${channel}`}
                    checked={draft.channels[channel]}
                    disabled={channel === 'mqtt' && !mqttReady}
                    offLabel="Off"
                    onLabel="On"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onDraftChange({
                        ...draft,
                        channels: { ...draft.channels, [channel]: event.target.checked },
                      })
                    }
                  />
                  <Box paddingTop={2}>
                    <Typography textTransform="capitalize" fontWeight="bold">
                      {channel === 'panel' ? 'Strapi activity log' : channel}
                      {channel === 'mqtt' && !mqttReady ? ' · setup needed' : ''}
                    </Typography>
                    {channel === 'panel' ? (
                      <Box paddingTop={1}>
                        <Typography variant="pi" textColor="neutral600">
                          Store this match locally in Strapi.
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                </ChannelCard>
              ))}
            </ChannelGrid>
          </Box>
        </Box>
      ) : null}

      {contentTypes.length ? (
        <Flex justifyContent="flex-end" gap={2}>
          {editing ? (
            <Button variant="tertiary" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button startIcon={editing ? <Check /> : <Plus />} loading={saving} onClick={onSave}>
            {editing ? 'Save changes' : 'Add rule'}
          </Button>
        </Flex>
      ) : null}
    </Flex>
  </Panel>
);
