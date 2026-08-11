import { Badge, Box, Button, Flex, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';

import type { PanelActivity } from './types';
import { ChannelCard, Panel } from './ui';

type ActivityPanelProps = {
  activity: PanelActivity[];
  onRefresh: () => void;
  onClear: () => void;
};

/** Display the bounded local event history independently from remote delivery. */
export const ActivityPanel = ({ activity, onRefresh, onClear }: ActivityPanelProps) => (
  <Panel background="neutral0" padding={6}>
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between" alignItems="center" gap={4}>
        <Box>
          <Flex alignItems="center" gap={2}>
            <Typography tag="h2" variant="beta">
              Strapi activity log
            </Typography>
            <Badge>{activity.length}</Badge>
          </Flex>
          <Box paddingTop={2}>
            <Typography textColor="neutral600">
              Recent rule matches stored locally in Strapi. This feed works without a Notificator
              API or MQTT connection.
            </Typography>
          </Box>
        </Box>
        <Flex gap={2}>
          <Button variant="secondary" onClick={onRefresh}>
            Refresh
          </Button>
          <Button
            variant="danger-light"
            startIcon={<Trash />}
            disabled={!activity.length}
            onClick={onClear}
          >
            Clear
          </Button>
        </Flex>
      </Flex>

      {activity.length ? (
        activity.map((item) => (
          <ChannelCard key={item.id} padding={4}>
            <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
              <Box>
                <Flex alignItems="center" gap={2} wrap="wrap">
                  <Typography fontWeight="bold">{item.title}</Typography>
                  <Badge>{item.severity}</Badge>
                  <Badge>{item.ruleName}</Badge>
                </Flex>
                <Box paddingTop={2}>
                  <Typography textColor="neutral600">{item.body}</Typography>
                </Box>
                <Box paddingTop={2}>
                  <Typography variant="pi" textColor="neutral500">
                    {item.contentTypeName} · {item.actorName}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="pi" textColor="neutral500">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(item.createdAt))}
              </Typography>
            </Flex>
          </ChannelCard>
        ))
      ) : (
        <Box padding={6} background="neutral100" hasRadius>
          <Typography textColor="neutral600">
            No local activity yet. Enable Strapi activity log on a rule, then create or edit a
            matching entry.
          </Typography>
        </Box>
      )}
    </Flex>
  </Panel>
);
