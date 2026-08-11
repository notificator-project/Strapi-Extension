import { getFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useRef } from 'react';

import { PLUGIN_ID } from '../pluginId';

type InitializerProps = {
  setPlugin: (id: string) => void;
};

type ToastRuntimeHost = typeof globalThis & {
  __notificatorPanelToastRuntime?: { stop: () => void };
};

/**
 * Marks the admin plugin as ready and installs the page-lifetime activity
 * watcher used for native Strapi toasts.
 *
 * Strapi unmounts plugin initializers immediately after `setPlugin` runs. The
 * watcher therefore cannot rely on the component lifecycle: it is registered
 * as a singleton on `globalThis` and is naturally released with the admin page.
 */
const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = useRef(setPlugin);
  const { toggleNotification } = useNotification();

  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);

  useEffect(() => {
    const runtimeHost = globalThis as ToastRuntimeHost;
    runtimeHost.__notificatorPanelToastRuntime?.stop();

    // Initializers unmount as soon as a Strapi plugin reports that it is ready.
    // Use the standalone client and a page-lifetime singleton so panel alerts
    // continue to be observed throughout the admin application.
    const { get } = getFetchClient();
    let active = true;
    let lastSeen = new Date().toISOString();

    /** Fetch and display only events created after this admin session started. */
    const pollActivity = async () => {
      try {
        const response = await get<{
          activity: Array<{
            title: string;
            body: string;
            severity: 'info' | 'warning' | 'critical';
            createdAt: string;
          }>;
        }>(`/notificator/activity?after=${encodeURIComponent(lastSeen)}&limit=5`);

        if (!active || !response.data.activity.length) {
          return;
        }

        // The API returns newest first; toasts read naturally in chronological order.
        const items = [...response.data.activity].reverse();
        for (const item of items) {
          toggleNotification({
            title: item.title,
            message: item.body,
            type:
              item.severity === 'critical'
                ? 'danger'
                : item.severity === 'warning'
                  ? 'warning'
                  : 'info',
            timeout: 8_000,
          });
        }

        lastSeen = items.reduce(
          (latest, item) => (item.createdAt > latest ? item.createdAt : latest),
          lastSeen
        );
      } catch {
        // Missing permissions or a temporary request failure should not disrupt Strapi admin.
      }
    };

    const interval = globalThis.setInterval(() => void pollActivity(), 15_000);
    const stop = () => {
      active = false;
      globalThis.clearInterval(interval);
    };

    runtimeHost.__notificatorPanelToastRuntime = { stop };
    // Do not return the usual React cleanup here. Strapi immediately unmounts
    // the initializer; the browser clears this runtime when the admin page ends.
  }, [toggleNotification]);

  return null;
};

export { Initializer };
