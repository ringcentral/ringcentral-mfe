@ringcentral/mfe-react

# @ringcentral/mfe-react

## Table of contents

### Classes

- [GlobalTransport](classes/GlobalTransport.md)

### Type Aliases

- [PickListeners](README.md#picklisteners)

### Variables

- [globalTransport](README.md#globaltransport)

### Functions

- [dynamicLoad](README.md#dynamicload)
- [expose](README.md#expose)
- [getGlobalTransport](README.md#getglobaltransport)
- [getMeta](README.md#getmeta)
- [useApp](README.md#useapp)
- [useIframe](README.md#useiframe)
- [useWebComponents](README.md#usewebcomponents)

## Type Aliases

### PickListeners

Ƭ **PickListeners**<`T`\>: `ListenerRecord`<{ `transport`: `Exclude`<`T`[``"transport"``], `undefined`\>  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |

#### Defined in

packages/transport/src/interface.ts:18

## Variables

### globalTransport

• `Const` **globalTransport**: [`GlobalTransport`](classes/GlobalTransport.md) = `global.__RC_TRANSPORT__`

#### Defined in

packages/transport/src/globalTransport.ts:179

## Functions

### dynamicLoad

▸ **dynamicLoad**<`T`\>(`path`, `entry?`, `options?`): `Promise`<{ `default`: `T`  }\>

Dynamic load the module.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ExposeOptions` = `ExposeOptions` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` | The name of the module |
| `entry?` | `string` | The remote entry of the module |
| `options` | `Object` | The default remote of the module |
| `options.maxRetries?` | `number` | optional value to set the maximum number of retries to load the module remote script. The default is 1. |
| `options.retryDelay?` | `number` | Optional number value to set the delay time in milliseconds to try to load the module remote script again. The default value is 1000. |

#### Returns

`Promise`<{ `default`: `T`  }\>

#### Defined in

packages/core/src/importer.ts:52

___

### expose

▸ **expose**<`T`\>(`options`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ExposeOptions` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `T` |

#### Returns

`T`

#### Defined in

packages/core/src/expose.ts:4

___

### getGlobalTransport

▸ **getGlobalTransport**<`T`, `P`\>(): [`GlobalTransport`](classes/GlobalTransport.md)<`T`, `P`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | {} |
| `P` | {} |

#### Returns

[`GlobalTransport`](classes/GlobalTransport.md)<`T`, `P`\>

#### Defined in

packages/transport/src/globalTransport.ts:181

___

### getMeta

▸ **getMeta**(`name?`): ``null`` \| { `data`: { `entry`: `string` ; `main`: `string` ; `modules`: `Record`<`string`, `any`\> ; `registry`: `string` ; `registryType`: ``"fetch"`` \| ``"jsonp"`` ; `renderContainers`: `Record`<`string`, `any`\> ; `version`: `string`  } ; `loaded`: `string`[] ; `name`: `undefined` \| `string` ; `rendered`: `string`[]  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | `string` |

#### Returns

``null`` \| { `data`: { `entry`: `string` ; `main`: `string` ; `modules`: `Record`<`string`, `any`\> ; `registry`: `string` ; `registryType`: ``"fetch"`` \| ``"jsonp"`` ; `renderContainers`: `Record`<`string`, `any`\> ; `version`: `string`  } ; `loaded`: `string`[] ; `name`: `undefined` \| `string` ; `rendered`: `string`[]  }

#### Defined in

packages/core/src/meta.ts:6

___

### useApp

▸ **useApp**<`T`\>(`options`): `AppWrapper`<`RenderProps`<`T`\> extends `undefined` \| ``null`` ? {} : `RenderProps`<`T`\>\>

Render app as React component

Their rendering is isolated,
and any re-rendering of the parent component will not trigger an MFE re-render,
unless the parent component is unmounted and re-mounted.

**`Example`**

```ts
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useApp } from '@ringcentral/mfe-react';

export default async () => {
  const App1 = () => {
    const App2 = useApp({
      name: '@example/app2',
      loader: () => global.mockImport('@example/app2'),
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(screen.queryByText('test')).toBeInTheDocument();
}
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ExposeOptions` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Pick`<`UseAppOptions`<`T`\>, ``"name"`` \| ``"loader"`` \| ``"attrs"`` \| ``"props"`` \| ``"bootstrap"``\> |

#### Returns

`AppWrapper`<`RenderProps`<`T`\> extends `undefined` \| ``null`` ? {} : `RenderProps`<`T`\>\>

#### Defined in

packages/react/src/interface.ts:26

___

### useIframe

▸ **useIframe**<`T`\>(`options`): `IframeWrapper`<{}\>

Render app in iframe

Their rendering is isolated,
and any re-rendering of the parent component will not trigger an MFE re-render,
unless the parent component is unmounted and re-mounted.

**`Example`**

```ts
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useIframe } from '@ringcentral/mfe-react';

export default async () => {
  const App1 = () => {
    const App2 = useIframe({
      name: '@example/app2',
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(document.querySelector('iframe')!).toBeInTheDocument();
}
```

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Pick`<`UseIframeOptions`<`T`\>, ``"name"`` \| ``"attrs"`` \| ``"url"`` \| ``"scope"``\> & { `ref?`: `RefObject`<`HTMLIFrameElement`\>  } |

#### Returns

`IframeWrapper`<{}\>

#### Defined in

packages/react/src/interface.ts:32

___

### useWebComponents

▸ **useWebComponents**<`T`\>(`options`): `AppWrapper`<`RenderProps`<`T`\> extends `undefined` ? {} : `RenderProps`<`T`\>\>

Render app as Web Components

Their rendering is isolated,
and any re-rendering of the parent component will not trigger an MFE re-render,
unless the parent component is unmounted and re-mounted.

**`Example`**

```ts
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useWebComponents } from '@ringcentral/mfe-react';

export default async () => {
  const App1 = () => {
    const App2 = useWebComponents({
      name: '@example/app2',
      loader: () => global.mockImport('@example/app2'),
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(screen.queryByText('test')).toBeInTheDocument();
}
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ExposeOptions` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Pick`<`UseWebComponentsOptions`<`T`\>, ``"name"`` \| ``"loader"`` \| ``"attrs"`` \| ``"props"`` \| ``"bootstrap"`` \| ``"useShadowDOM"`` \| ``"shadowMode"``\> |

#### Returns

`AppWrapper`<`RenderProps`<`T`\> extends `undefined` ? {} : `RenderProps`<`T`\>\>

#### Defined in

packages/react/src/interface.ts:44
