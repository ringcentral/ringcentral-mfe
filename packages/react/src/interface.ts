/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FunctionComponent, ComponentType, RefObject } from 'react';
import type {
  ExposeOptions,
  RenderProps,
  UseAppOptions,
  UseIframeOptions,
  UseWebComponentsOptions,
} from '@ringcentral/mfe-core';

export type AppWrapper<T> = FunctionComponent<
  {
    /**
     * fallback component
     */
    fallback?: ComponentType;
    /**
     * loading component
     */
    loading?: ComponentType;
  } & T
>;

type IframeWrapper<T> = FunctionComponent<
  {
    /**
     * iframe src
     */
    src?: string;
  } & T
>;

export type UseApp = <T extends ExposeOptions>(
  options: Pick<UseAppOptions<T>, Exclude<keyof UseAppOptions<T>, 'target'>>
) => AppWrapper<
  RenderProps<T> extends null | undefined | never ? {} : RenderProps<T>
>;

export type UseIframe = <T>(
  options: Pick<
    UseIframeOptions<T>,
    Exclude<keyof UseIframeOptions<T>, 'target'>
  > & {
    /**
     * iframe dom ref
     */
    ref?: RefObject<HTMLIFrameElement>;
  }
) => IframeWrapper<{}>;

export type UseWebComponents = <T extends ExposeOptions>(
  options: Pick<
    UseWebComponentsOptions<T>,
    Exclude<keyof UseWebComponentsOptions<T>, 'target'>
  >
) => AppWrapper<RenderProps<T> extends undefined ? {} : RenderProps<T>>;
