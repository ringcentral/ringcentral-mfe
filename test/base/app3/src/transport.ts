import { getGlobalTransport } from '@ringcentral/mfe-transport';

export const transport = getGlobalTransport<{
  listen: { count1: (n: number) => Promise<number> };
  emit: { count: (n: number) => Promise<number> };
}>();
