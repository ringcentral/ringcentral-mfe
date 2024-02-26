[@ringcentral/mfe-builder](../README.md) / ModuleFederationPlugin

# Class: ModuleFederationPlugin

Webpack plugin for module federation In RC-MFE

## Hierarchy

- `ModuleFederationPlugin`

  ↳ **`ModuleFederationPlugin`**

## Table of contents

### Constructors

- [constructor](ModuleFederationPlugin.md#constructor)

### Properties

- [bannerPlugin](ModuleFederationPlugin.md#bannerplugin)
- [definePlugin](ModuleFederationPlugin.md#defineplugin)

### Methods

- [apply](ModuleFederationPlugin.md#apply)

## Constructors

### constructor

• **new ModuleFederationPlugin**(`siteExtraConfig?`, `externalOptions?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `siteExtraConfig?` | `SiteOverridableConfig` |
| `externalOptions?` | `ModuleFederationPluginOptions` |

#### Overrides

container.ModuleFederationPlugin.constructor

#### Defined in

builder/src/ModuleFederationPlugin.ts:58

## Properties

### bannerPlugin

• **bannerPlugin**: `BannerPlugin`

#### Defined in

builder/src/ModuleFederationPlugin.ts:54

___

### definePlugin

• **definePlugin**: `DefinePlugin`

#### Defined in

builder/src/ModuleFederationPlugin.ts:56

## Methods

### apply

▸ **apply**(`compiler`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `compiler` | `Compiler` |

#### Returns

`void`

#### Overrides

container.ModuleFederationPlugin.apply

#### Defined in

builder/src/ModuleFederationPlugin.ts:101
