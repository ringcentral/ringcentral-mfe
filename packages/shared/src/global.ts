/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-restricted-globals */
type GlobalThis = typeof globalThis & { name: string };

const getGlobal = () => {
  let _global: GlobalThis;
  if (typeof window !== 'undefined') {
    _global = window;
  } else if (typeof global !== 'undefined') {
    _global = global as GlobalThis;
  } else if (typeof self !== 'undefined') {
    _global = self;
  } else {
    _global = {} as GlobalThis;
  }
  return _global;
};

const _global = getGlobal();

export { _global as global, getGlobal };
