# @ringcentral/mfe-service-worker

## Usage

1. init service worker

```ts
importScripts('/public-path/service-worker.mfe.js');

const subAppServiceWorkerManager = new mfe.SubAppServiceWorkerManager();

subAppServiceWorkerManager.listener();
```

2. register service worker

```ts
import mfe from '@ringcentral/mfe-service-worker';

await navigator.serviceWorker.register('/service-worker.js').then((res) => {
  console.log('[MAIN] register success');
});

// receive prefixes parmas which will match request path, if matched, will
// return cache file
mfe
  .registerSubApp({
    name: 'phone',
    scope: 'https://app.ringcentral.com/mfe/platform/23.2.10/',
    version: '0.0.1',
    manifestRelativePath: 'precache-manifest',
  })
  .then(() => {
    console.log('phone register success');
  });
```

3. add webpack plugin

```ts
import { GenerateManifestWebpackPlugin } from '@ringcentral/mfe-service-worker/generate-manifest-webpack-plugin';
{
    plugin: [
      new GenerateManifestWebpackPlugin();
    ]
}
```
