import { Badge, Box, Flex, Typography } from '@strapi/design-system';

import type { ConnectionState } from './types';
import { ChannelCard, ConnectionGrid, Panel } from './ui';

/** Summarize server-side API and MQTT readiness without exposing credentials. */
export const ConnectionsPanel = ({ connection }: { connection: ConnectionState }) => (
  <Panel background="neutral0" padding={6}>
    <Box paddingBottom={4}>
      <Typography tag="h2" variant="beta">
        Connections
      </Typography>
    </Box>
    <ConnectionGrid>
      <ChannelCard padding={4}>
        <Flex gap={2} alignItems="center">
          <Typography tag="h3" variant="delta">
            Notificator API
          </Typography>
          <Badge
            backgroundColor={connection.configured ? 'success100' : 'warning100'}
            textColor={connection.configured ? 'success700' : 'warning700'}
          >
            {connection.configured ? 'Configured' : 'Setup needed'}
          </Badge>
        </Flex>
        <Box paddingTop={2}>
          <Typography textColor="neutral600">
            {connection.configured
              ? 'Signed connection to the Notificator API is ready.'
              : 'Set NOTIFICATOR_API_KEY in the Strapi server environment, then restart Strapi.'}
          </Typography>
        </Box>
      </ChannelCard>

      <ChannelCard padding={4}>
        <Flex gap={2} alignItems="center">
          <Typography tag="h3" variant="delta">
            MQTT · HiveMQ Cloud
          </Typography>
          <Badge
            backgroundColor={connection.mqtt.ready ? 'success100' : 'warning100'}
            textColor={connection.mqtt.ready ? 'success700' : 'warning700'}
          >
            {connection.mqtt.ready ? 'Ready' : 'Optional setup'}
          </Badge>
        </Flex>
        <Box paddingTop={2}>
          <Typography textColor="neutral600">
            {connection.mqtt.useAccount && connection.mqtt.enabled
              ? 'Uses the saved Notificator account MQTT connection automatically.'
              : connection.mqtt.ready
                ? `${connection.mqtt.host} · ${connection.mqtt.topicPrefix}`
                : 'Set the NOTIFICATOR_MQTT_* environment values to deliver alerts to your devices.'}
          </Typography>
        </Box>
      </ChannelCard>
    </ConnectionGrid>
  </Panel>
);
