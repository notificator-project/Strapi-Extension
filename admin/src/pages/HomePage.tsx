import { Box, Button, Flex, Loader, Main, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { Page } from '@strapi/strapi/admin';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';
import { ActivityPanel } from './home/ActivityPanel';
import { ConnectionsPanel } from './home/ConnectionsPanel';
import { RuleEditor } from './home/RuleEditor';
import { RuleList } from './home/RuleList';
import { PageShell, StatusMessage } from './home/ui';
import { useNotificatorAdmin } from './home/useNotificatorAdmin';

/** Compose the extension panels while state and transport live in a dedicated hook. */
const HomePage = () => {
  const { formatMessage } = useIntl();
  const {
    overview,
    draft,
    setDraft,
    editingRuleId,
    loading,
    saving,
    testing,
    message,
    loadOverview,
    saveDraftRule,
    editRule,
    cancelEditing,
    toggleRule,
    removeRule,
    testConnection,
    clearActivity,
  } = useNotificatorAdmin();

  const contentTypeNames = useMemo(
    () => new Map((overview?.contentTypes ?? []).map((item) => [item.uid, item.displayName])),
    [overview?.contentTypes]
  );

  if (loading && !overview) {
    return (
      <Main>
        <Flex justifyContent="center" padding={10}>
          <Loader>Loading Notificator</Loader>
        </Flex>
      </Main>
    );
  }

  return (
    <Main>
      <Page.Title>
        {formatMessage({ id: getTranslation('page.title'), defaultMessage: 'Notificator' })}
      </Page.Title>
      <PageShell padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
            <Box>
              <Typography tag="h1" variant="alpha">
                Notificator
              </Typography>
              <Box paddingTop={2}>
                <Typography textColor="neutral600">
                  Turn Strapi content events into useful inbox, mobile, email, and device alerts.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="secondary"
              startIcon={<Check />}
              loading={testing}
              disabled={!overview?.connection.configured}
              onClick={() => void testConnection()}
            >
              Test connection
            </Button>
          </Flex>

          {message ? (
            <StatusMessage $tone={message.tone} padding={4} role="status">
              <Typography textColor={message.tone === 'success' ? 'success700' : 'danger700'}>
                {message.text}
              </Typography>
            </StatusMessage>
          ) : null}

          {overview ? (
            <>
              <ConnectionsPanel connection={overview.connection} />
              <RuleEditor
                draft={draft}
                contentTypes={overview.contentTypes}
                editing={Boolean(editingRuleId)}
                mqttReady={overview.connection.mqtt.ready}
                saving={saving}
                onDraftChange={setDraft}
                onSave={() => void saveDraftRule()}
                onCancel={cancelEditing}
              />
              <RuleList
                rules={overview.settings.rules}
                contentTypeNames={contentTypeNames}
                saving={saving}
                onEdit={editRule}
                onToggle={(id, enabled) => void toggleRule(id, enabled)}
                onRemove={(id) => void removeRule(id)}
              />
              <ActivityPanel
                activity={overview.activity}
                onRefresh={() => void loadOverview(true)}
                onClear={() => void clearActivity()}
              />
            </>
          ) : null}
        </Flex>
      </PageShell>
    </Main>
  );
};

export { HomePage };
