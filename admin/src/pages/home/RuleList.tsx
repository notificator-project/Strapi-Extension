import { Badge, Box, Button, Dialog, Flex, Toggle, Typography } from '@strapi/design-system';
import { Pencil, Trash, WarningCircle } from '@strapi/icons';
import type { ChangeEvent } from 'react';

import { EVENTS } from './constants';
import type { Rule } from './types';
import { ChannelCard, fieldId, Panel } from './ui';

type RuleListProps = {
  rules: Rule[];
  contentTypeNames: Map<string, string>;
  saving: boolean;
  onEdit: (rule: Rule) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
};

/** Render saved rules and delegate all mutations to the page state hook. */
export const RuleList = ({
  rules,
  contentTypeNames,
  saving,
  onEdit,
  onToggle,
  onRemove,
}: RuleListProps) => (
  <Panel background="neutral0" padding={6}>
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Box>
        <Typography tag="h2" variant="beta">
          Notification rules
        </Typography>
        <Box paddingTop={2}>
          <Typography textColor="neutral600">
            Rules run after a successful Strapi content operation and never block the editor from
            saving.
          </Typography>
        </Box>
      </Box>

      {rules.length ? (
        rules.map((rule) => (
          <ChannelCard key={rule.id} padding={4}>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              <Flex direction="column" alignItems="flex-start" gap={2}>
                <Flex alignItems="center" gap={2}>
                  <Typography fontWeight="bold">{rule.name}</Typography>
                  <Badge>{EVENTS.find((item) => item.value === rule.event)?.label}</Badge>
                  <Badge>{rule.severity}</Badge>
                </Flex>
                <Typography textColor="neutral600">
                  {contentTypeNames.get(rule.contentType) ?? rule.contentType} · {rule.title} ·{' '}
                  {rule.body}
                </Typography>
              </Flex>
              <Flex gap={2}>
                <Toggle
                  id={fieldId(`enabled-${rule.id}`)}
                  name={`enabled-${rule.id}`}
                  checked={rule.enabled}
                  disabled={saving}
                  offLabel="Off"
                  onLabel="On"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onToggle(rule.id, event.target.checked)
                  }
                />
                <Button
                  variant="secondary"
                  startIcon={<Pencil />}
                  disabled={saving}
                  onClick={() => onEdit(rule)}
                >
                  Edit
                </Button>
                <Dialog.Root>
                  <Dialog.Trigger>
                    <Button variant="danger-light" startIcon={<Trash />} disabled={saving}>
                      Remove
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content>
                    <Dialog.Header>Remove notification rule?</Dialog.Header>
                    <Dialog.Body icon={<WarningCircle />}>
                      {`This permanently removes “${rule.name}”. Existing local and remote activity will not be deleted.`}
                    </Dialog.Body>
                    <Dialog.Footer>
                      <Dialog.Cancel>
                        <Button fullWidth variant="tertiary">
                          Cancel
                        </Button>
                      </Dialog.Cancel>
                      <Dialog.Action>
                        <Button
                          fullWidth
                          variant="danger"
                          startIcon={<Trash />}
                          onClick={() => onRemove(rule.id)}
                        >
                          Remove rule
                        </Button>
                      </Dialog.Action>
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Root>
              </Flex>
            </Flex>
          </ChannelCard>
        ))
      ) : (
        <Box padding={6} background="neutral100" hasRadius>
          <Typography textColor="neutral600">
            No rules yet. Add your first content event above.
          </Typography>
        </Box>
      )}
    </Flex>
  </Panel>
);
