/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
  BrowserClient,
  makeMain,
  Hub,
  makeMultiplexedTransport,
  User,
} from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import { global, identifierContainer } from '@ringcentral/mfe-shared';

type IBrowserClientOptions = ConstructorParameters<typeof BrowserClient>[0];

interface SentryInstance {
  hub: Hub;
  client: BrowserClient;
  urls: string[];
  dsn: string;
  tags: Record<string, any>;
  extras: Record<string, any>;
  user: { current?: User | null };
}

export interface BrowserClientOptions extends Partial<IBrowserClientOptions> {
  /**
   * The Dsn used to connect to Sentry and identify the project. If omitted, the
   * SDK will not send any data to Sentry.
   */
  dsn: string;
  /**
   * The whitelist of URLs allowed to be sent to sentry server
   */
  urls: string[];
}

// @ts-ignore
global[identifierContainer] = global[identifierContainer] || {};
// @ts-ignore
global[identifierContainer].sentryInstances =
  // @ts-ignore
  global[identifierContainer].sentryInstances || [];

export const useSentry = ({ urls, ...options }: BrowserClientOptions) => {
  // @ts-ignore
  const { sentryInstances } = global[identifierContainer] as {
    sentryInstances: SentryInstance[];
  };
  const beforeSend: BrowserClientOptions['beforeSend'] = (event, hint) => {
    // When the event is intercepted, we should not send it to the server
    // you can use `mfeSentry.setTags({ intercepted })`
    if (event.tags?.intercepted) {
      return null;
    }
    const frames = event?.exception?.values?.[0].stacktrace?.frames || [];
    const filename = frames.slice(-1)[0]?.filename;
    if (!filename) return event;
    for (const instance of sentryInstances) {
      if (instance.urls.find((url) => new RegExp(url).test(filename))) {
        event.tags = {
          ...event.tags,
          ...instance.tags,
        };
        event.extra = {
          ...event.extra,
          ...instance.extras,
          dsn: instance.dsn,
        };
        event.user = {
          ...instance.user,
        };
        return event;
      }
    }
    return event;
  };
  const client = new BrowserClient({
    ...options,
    // @ts-ignore
    transport: makeMultiplexedTransport(makeFetchTransport, (matchParam) => {
      const event = matchParam.getEvent();
      if (event?.extra?.dsn) {
        const { dsn } = event.extra;
        delete event?.extra?.dsn;
        return [{ dsn }];
      }
      return [];
    }),
    stackParser: options.stackParser ?? defaultStackParser,
    integrations: options.integrations ?? [
      ...defaultIntegrations,
      new BrowserTracing(),
    ],
    ...(!sentryInstances.length ? { beforeSend } : {}),
  });
  const hub = new Hub(client);
  if (!sentryInstances.length) {
    makeMain(hub);
  }
  const user = {};
  const tags = {};
  const extras = {};
  sentryInstances.push({
    hub,
    client,
    urls,
    dsn: options.dsn,
    tags,
    extras,
    user,
  });
  return {
    hub,
    client,
    urls,
    /**
     * Set tags to be sent along with the event.
     */
    setTags: (_tags: Record<string, any>) => {
      Object.assign(tags, _tags);
    },
    /**
     * Set a tag to be sent along with the event.
     */
    setTag: (key: string, value: any) => {
      Object.assign(tags, {
        [key]: value,
      });
    },
    /**
     * Set extra to be sent along with the event.
     */
    setExtra: (key: string, value: any) => {
      Object.assign(extras, {
        [key]: value,
      });
    },
    /**
     * Set extras to be sent along with the event.
     */
    setExtras: (_extras: Record<string, any>) => {
      Object.assign(extras, _extras);
    },
    /**
     * Set user to be sent along with the event.
     */
    setUser: (_user: User | null) => {
      Object.assign(user, _user);
    },
  };
};
