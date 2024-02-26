/* eslint-disable no-multi-assign */
/* eslint-disable no-param-reassign */
import type { getGlobal as GetGlobal } from './global';

export const fetchWithJsonp = <T>(
  getGlobal: typeof GetGlobal,
  url: string,
  _name: string
): Promise<T> => {
  const _global = getGlobal();
  const jsonpKey = '__RC_MFE_REGISTRY_CALLBACK__';
  const jsonpPromisesKey = '__RC_MFE_REGISTRY_PROMISES__';
  _global[jsonpKey] = _global[jsonpKey] ?? {};
  _global[jsonpPromisesKey] = _global[jsonpPromisesKey] ?? {};
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (_global[jsonpPromisesKey][_name]) return _global[jsonpPromisesKey][_name];
  _global[jsonpPromisesKey][_name] = new Promise<T>((resolve, reject) => {
    const script = document.createElement('script');
    const callback = (_global[jsonpKey][_name] = (data: T) => {
      document.body.removeChild(script);
      if (_global[jsonpKey][_name] === callback) {
        _global[jsonpKey][_name] = null;
      }
      delete _global[jsonpPromisesKey][_name];
      resolve(data);
    });
    script.src = url;
    script.onerror = () => {
      document.body.removeChild(script);
      if (_global[jsonpKey][_name] === callback) {
        _global[jsonpKey][_name] = null;
      }
      delete _global[jsonpPromisesKey][_name];
      reject(new Error(`[MFE] '${url}' jsonp fetch failed.`));
    };
    document.body.appendChild(script);
  });
  return _global[jsonpPromisesKey][_name];
};
