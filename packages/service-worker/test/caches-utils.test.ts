import {
  getCacheName,
  parseCacheName,
  getCacheResList,
} from '../sw/utils/caches-utils';

describe('caches-utils', () => {
  describe('getCacheName', () => {
    it('should return a valid cache name', () => {
      const info = {
        name: 'my-app',
        scope: 'my-scope',
        version: '1.0.0',
        timestamp: 1679734000000,
        manifestRelativePath: 'manifest.json',
        md5: 'abc123',
      };
      const cacheName = getCacheName(info);
      expect(cacheName).toEqual(
        'mfe-sub-app-my-app@1.0.0/0-abc123-my-scope@manifest:manifest.json'
      );
    });
    it('should return a valid cache name 2', () => {
      const info = {
        name: 'my-app',
        scope: 'my-scope',
        version: '>=1.0.0',
        timestamp: 1679734000000,
        manifestRelativePath: 'manifest.json',
        md5: 'abc123',
      };
      const cacheName = getCacheName(info);
      expect(cacheName).toEqual(
        'mfe-sub-app-my-app@>=1.0.0/0-abc123-my-scope@manifest:manifest.json'
      );
    });
  });

  describe('parseCacheName', () => {
    it.each`
      cacheName | parsed
      ${'mfe-sub-app-my-app@1.0.0/111-abc123-https://my-scope/@manifest:app-manifest'} | ${{
  name: 'my-app',
  version: '1.0.0',
  timestamp: 111,
  md5: 'abc123',
  scope: 'https://my-scope/',
  manifestRelativePath: 'app-manifest',
}}
      ${'mfe-sub-app-my-app@>1.0.0/111-abc123-http://my-scope/@manifest:manifest.txt'} | ${{
  name: 'my-app',
  version: '>1.0.0',
  timestamp: 111,
  md5: 'abc123',
  scope: 'http://my-scope/',
  manifestRelativePath: 'manifest.txt',
}}
    `(
      'should parse a valid cache name: $cacheName',
      ({ cacheName, parsed }) => {
        const result = parseCacheName(cacheName);
        expect(result).toEqual(parsed);
      }
    );

    it('should return undefined for an invalid cache name', () => {
      const cacheName = 'invalid-cache-name';
      const parsed = parseCacheName(cacheName);
      expect(parsed).toBeUndefined();
    });
  });

  describe('getCacheResList', () => {
    it('should return a list of URLs from the cache', async () => {
      const cache = {
        keys: jest.fn(() =>
          Promise.resolve([
            { url: 'https://example.com/css/styles.css' },
            { url: 'https://example.com/js/app.js' },
            { url: 'https://example.com/images/logo.png' },
          ])
        ),
      };
      const resList = await getCacheResList(cache as any);
      expect(resList).toEqual([
        { url: 'https://example.com/css/styles.css' },
        { url: 'https://example.com/js/app.js' },
        { url: 'https://example.com/images/logo.png' },
      ]);
    });
  });
});
