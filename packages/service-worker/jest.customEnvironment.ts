// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSdomEnv = require('jest-environment-jsdom').TestEnvironment;

class FakeCache implements Cache {
  add(request: RequestInfo | URL): Promise<void> {
    return Promise.resolve(undefined);
  }

  addAll(requests: RequestInfo[]): Promise<void>;

  addAll(requests: Iterable<RequestInfo>): Promise<void>;

  addAll(requests: RequestInfo[] | Iterable<RequestInfo>): Promise<void> {
    return Promise.resolve(undefined);
  }

  delete(
    request: RequestInfo | URL,
    options?: CacheQueryOptions
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  keys(
    request?: RequestInfo | URL,
    options?: CacheQueryOptions
  ): Promise<ReadonlyArray<Request>> {
    return Promise.resolve([]);
  }

  match(
    request: RequestInfo | URL,
    options?: CacheQueryOptions
  ): Promise<Response | undefined> {
    return Promise.resolve(undefined);
  }

  matchAll(
    request?: RequestInfo | URL,
    options?: CacheQueryOptions
  ): Promise<ReadonlyArray<Response>> {
    return Promise.resolve([]);
  }

  put(request: RequestInfo | URL, response: Response): Promise<void> {
    return Promise.resolve(undefined);
  }
}

class FakeCacheStorage implements CacheStorage {
  private store: Map<string, unknown>;

  constructor() {
    this.store = new Map();
  }

  async open(name: string) {
    if (!this.store.has(name)) {
      this.store.set(name, new Map());
    }
    return new FakeCache();
  }

  async has(name: string) {
    return this.store.has(name);
  }

  async delete(name: string) {
    return this.store.delete(name);
  }

  async keys() {
    return Array.from(this.store.keys());
  }

  match(
    request: RequestInfo | URL,
    options?: MultiCacheQueryOptions
  ): Promise<Response | undefined> {
    return Promise.resolve(undefined);
  }
}

class CustomEnvironment extends JSdomEnv {
  constructor(config: any, context: any) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    this.global.caches = new FakeCacheStorage();
  }

  async teardown() {
    this.global.caches = null;
    await super.teardown();
  }
}

module.exports = CustomEnvironment;
