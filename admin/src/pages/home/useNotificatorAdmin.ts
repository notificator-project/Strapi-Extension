import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useCallback, useEffect, useState } from 'react';

import { EMPTY_RULE } from './constants';
import type { OverviewResponse, Rule, RuleDraft, StatusNotice } from './types';

const FEEDBACK_TIMEOUT_MS = 6_000;

/** Own the admin page's remote state and mutations independently from its presentation. */
export const useNotificatorAdmin = () => {
  const { del, get, post, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_RULE);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<StatusNotice | null>(null);

  /** Pair persistent page feedback with Strapi's immediate native notification. */
  const notify = useCallback(
    (
      type: 'success' | 'danger' | 'warning' | 'info',
      title: string,
      text: string,
      persist = true
    ) => {
      if (persist) {
        setMessage({ tone: type === 'success' ? 'success' : 'danger', text });
      }
      toggleNotification({ type, title, message: text, timeout: FEEDBACK_TIMEOUT_MS });
    },
    [toggleNotification]
  );

  /** Dismiss persistent page feedback after the matching native toast has expired. */
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeout = globalThis.setTimeout(() => setMessage(null), FEEDBACK_TIMEOUT_MS);
    return () => globalThis.clearTimeout(timeout);
  }, [message]);

  /** Load the complete screen model in one request to avoid partial UI states. */
  const loadOverview = useCallback(
    async (announce = false) => {
      setLoading(true);
      try {
        const response = await get<OverviewResponse>('/notificator/overview');
        setOverview(response.data);
        setMessage(null);
        if (announce) {
          notify(
            'success',
            'Activity refreshed',
            'The latest rules and activity are now shown.',
            false
          );
        }
      } catch (error) {
        notify(
          'danger',
          'Could not refresh Notificator',
          error instanceof Error ? error.message : 'Could not load Notificator.'
        );
      } finally {
        setLoading(false);
      }
    },
    [get, notify]
  );

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  /** Persist the complete rule collection and use the server-cleaned response. */
  const saveRules = async (rules: Rule[], feedback: { title: string; message: string }) => {
    if (!overview) {
      return false;
    }

    setSaving(true);
    try {
      const response = await put<{ settings: { rules: Rule[] } }>('/notificator/settings', {
        rules,
      });
      setOverview((current) =>
        current ? { ...current, settings: response.data.settings } : current
      );
      notify('success', feedback.title, feedback.message);
      return true;
    } catch (error) {
      notify(
        'danger',
        'Rule changes were not saved',
        error instanceof Error ? error.message : 'Rules could not be saved.'
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Validate the editor draft, then add or replace the selected rule atomically. */
  const saveDraftRule = async () => {
    if (
      !overview ||
      !draft.name.trim() ||
      !draft.contentType ||
      !draft.title.trim() ||
      !draft.body.trim()
    ) {
      notify(
        'warning',
        'Rule needs attention',
        'Provide a rule name, choose a content type, and complete the notification text.'
      );
      return;
    }

    const wasEditing = Boolean(editingRuleId);
    const ruleName = draft.name.trim();

    const nextRules = editingRuleId
      ? overview.settings.rules.map((rule) =>
          rule.id === editingRuleId ? { ...draft, id: editingRuleId } : rule
        )
      : [
          ...overview.settings.rules,
          {
            ...draft,
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
          },
        ];

    if (
      await saveRules(nextRules, {
        title: wasEditing ? 'Rule updated' : 'Rule created',
        message: wasEditing
          ? `Changes to “${ruleName}” were saved.`
          : `“${ruleName}” was added to your notification rules.`,
      })
    ) {
      setDraft(EMPTY_RULE);
      setEditingRuleId(null);
    }
  };

  /** Copy a saved rule into the editor without mutating the overview response. */
  const editRule = (rule: Rule) => {
    const { id, ...editableRule } = rule;
    setEditingRuleId(id);
    setDraft({ ...editableRule, channels: { ...editableRule.channels, dashboard: true } });
    setMessage(null);
    notify(
      'info',
      'Editing notification rule',
      `Make changes to “${rule.name}”, then choose Save changes.`,
      false
    );
    globalThis.document
      ?.getElementById('notificator-rule-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setDraft(EMPTY_RULE);
    setMessage(null);
    notify('info', 'Editing cancelled', 'No changes were saved.', false);
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    if (overview) {
      const rule = overview.settings.rules.find((item) => item.id === id);
      await saveRules(
        overview.settings.rules.map((item) => (item.id === id ? { ...item, enabled } : item)),
        {
          title: enabled ? 'Rule enabled' : 'Rule disabled',
          message: rule
            ? `“${rule.name}” is now ${enabled ? 'active' : 'paused'}.`
            : `The rule is now ${enabled ? 'active' : 'paused'}.`,
        }
      );
    }
  };

  const removeRule = async (id: string) => {
    if (overview) {
      const rule = overview.settings.rules.find((item) => item.id === id);
      await saveRules(
        overview.settings.rules.filter((item) => item.id !== id),
        {
          title: 'Rule removed',
          message: rule
            ? `“${rule.name}” was removed from your notification rules.`
            : 'The notification rule was removed.',
        }
      );
    }
  };

  /** Exercise the same signed delivery path used by live rules. */
  const testConnection = async () => {
    setTesting(true);
    try {
      await post('/notificator/test');
      notify(
        'success',
        'Connection test sent',
        'Check your Notificator inbox or phone for the test notification.'
      );
    } catch (error) {
      notify(
        'danger',
        'Connection test failed',
        error instanceof Error ? error.message : 'Connection test failed.'
      );
    } finally {
      setTesting(false);
    }
  };

  /** Clear local Strapi activity only; remote Notificator history is unaffected. */
  const clearActivity = async () => {
    try {
      await del('/notificator/activity');
      setOverview((current) => (current ? { ...current, activity: [] } : current));
      notify('success', 'Activity cleared', 'The local Strapi activity log is now empty.');
    } catch (error) {
      notify(
        'danger',
        'Activity could not be cleared',
        error instanceof Error ? error.message : 'Activity could not be cleared.'
      );
    }
  };

  return {
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
  };
};
