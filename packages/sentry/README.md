# @ringcentral/mfe-sentry

Note: Sentry does not fully support micro-frontends, and the library cannot capture default errors in fetch() requests of sub-applications.

- Sentry 2023 and the JavaScript SDK: https://github.com/getsentry/sentry-javascript/discussions/5878
- Isolated exceptions/transactions (micro-frontends/browser extensions/3rd party scripts isolation) [request feedback] Micro Frontend support: https://github.com/getsentry/sentry-javascript/discussions/5217
- Sentry experimental features: https://docs.sentry.io/platforms/javascript/configuration/micro-frontend-support/

Based on Sentry experimental features, it relies on injecting `moduleMetadata` through webpack bundler. To reduce dependency on builders and improve ease of use, `@ringcentral/mfe-sentry` only provides runtime API.

```ts
interface MfeSentry {
    hub: Hub;
    client: BrowserClient;
    urls: string[];
    setTags: (tags: Record<string, any>) => void;
    setTag: (key: string, value: any) => void;
    setExtra: (key: string, value: any) => void;
    setExtras: (extras: Record<...>) => void;
    setUser: (user: User | null) => void;
}
```
