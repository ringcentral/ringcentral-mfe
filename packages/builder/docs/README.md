@ringcentral/mfe-builder

# @ringcentral/mfe-builder

## Table of contents

### Classes

- [ModuleFederationPlugin](classes/ModuleFederationPlugin.md)

### Type Aliases

- [SiteConfigFile](README.md#siteconfigfile)

### Functions

- [insertStyle](README.md#insertstyle)

## Type Aliases

### SiteConfigFile

Ƭ **SiteConfigFile**: `SiteConfig` \| (`env`: `Record`<`string`, `any`\>) => `SiteConfig`

#### Defined in

shared/src/interface.ts:81

## Functions

### insertStyle

▸ **insertStyle**(`element`): `void`

use for `style-loader` options.insert or `MiniCssExtractPlugin` options.insert

#### Parameters

| Name | Type |
| :------ | :------ |
| `element` | `HTMLStyleElement` \| `HTMLLinkElement` |

#### Returns

`void`

#### Defined in

builder/src/insertStyle.ts:10
