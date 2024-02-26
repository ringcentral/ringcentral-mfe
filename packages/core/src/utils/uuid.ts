export const uuid = (name: string) =>
  `rc-mfe:${name}-${Math.random().toString(36).slice(2, -1)}`;
