[@ringcentral/mfe-react](../README.md) / GlobalTransport

# Class: GlobalTransport<T, P\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | {} |
| `P` | {} |

## Hierarchy

- `Transport`<`T`, `P`\>

  ↳ **`GlobalTransport`**

## Table of contents

### Constructors

- [constructor](GlobalTransport.md#constructor)

### Properties

- [dispose](GlobalTransport.md#dispose)
- [eventListeners](GlobalTransport.md#eventlisteners)
- [isGlobalTransport](GlobalTransport.md#isglobaltransport)
- [targetOrigin](GlobalTransport.md#targetorigin)
- [targetScope](GlobalTransport.md#targetscope)

### Methods

- [emit](GlobalTransport.md#emit)
- [listen](GlobalTransport.md#listen)
- [setLogger](GlobalTransport.md#setlogger)
- [setOrigin](GlobalTransport.md#setorigin)
- [setScope](GlobalTransport.md#setscope)
- [setVerbose](GlobalTransport.md#setverbose)

## Constructors

### constructor

• **new GlobalTransport**<`T`, `P`\>(`«destructured»`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | {} |
| `P` | {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `GlobalTransportOptions` |

#### Overrides

BaseTransport&lt;T, P\&gt;.constructor

#### Defined in

packages/transport/src/globalTransport.ts:45

## Properties

### dispose

• **dispose**: () => `any`

#### Type declaration

▸ (): `any`

dispose transport

##### Returns

`any`

#### Inherited from

BaseTransport.dispose

#### Defined in

node_modules/data-transport/dist/transport.d.ts:22

___

### eventListeners

• `Private` **eventListeners**: `Map`<`string`, `Set`<(...`args`: `any`) => `any`\>\>

#### Defined in

packages/transport/src/globalTransport.ts:117

___

### isGlobalTransport

• `Protected` **isGlobalTransport**: (`string`: `string`) => `boolean`

#### Type declaration

▸ (`string`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `string` | `string` |

##### Returns

`boolean`

#### Defined in

packages/transport/src/globalTransport.ts:43

___

### targetOrigin

• `Protected` **targetOrigin**: `string`

#### Defined in

packages/transport/src/globalTransport.ts:39

___

### targetScope

• `Protected` **targetScope**: `string`

#### Defined in

packages/transport/src/globalTransport.ts:41

## Methods

### emit

▸ **emit**<`K`\>(`options`, `...request`): `Promise`<`Response`<`T`[`K`]\>\>

Emit an event that transport data.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `EmitOptions`<`K`\> | - |
| `...request` | `Request`<`T`[`K`]\> | A request data |

#### Returns

`Promise`<`Response`<`T`[`K`]\>\>

Return a response for the request.

#### Inherited from

BaseTransport.emit

#### Defined in

node_modules/data-transport/dist/transport.d.ts:40

___

### listen

▸ **listen**<`K`\>(`name`, `fn`): () => `void`

Listen an event that transport data.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `K` | A transport action as listen message data action type |
| `fn` | `P`[`K`] | A transport listener |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Overrides

BaseTransport.listen

#### Defined in

packages/transport/src/globalTransport.ts:153

___

### setLogger

▸ **setLogger**(`logger`): `void`

Set a custom logger

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | (`data`: `SendOptions`) => `void` |

#### Returns

`void`

#### Defined in

packages/transport/src/globalTransport.ts:136

___

### setOrigin

▸ **setOrigin**(`targetOrigin`): `void`

Set the target origin

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetOrigin` | `string` |

#### Returns

`void`

#### Defined in

packages/transport/src/globalTransport.ts:122

___

### setScope

▸ **setScope**(`scope`): `void`

Set the target scope

#### Parameters

| Name | Type |
| :------ | :------ |
| `scope` | `string` |

#### Returns

`void`

#### Defined in

packages/transport/src/globalTransport.ts:143

___

### setVerbose

▸ **setVerbose**(`value`): `void`

Set verbose mode

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |

#### Returns

`void`

#### Defined in

packages/transport/src/globalTransport.ts:129
