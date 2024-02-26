import { runAll } from '../sw/utils/promise-utils';

describe('runAll', () => {
  it('should resolve all promises and return their results', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.resolve('two'),
      Promise.resolve(true),
    ];
    const results = await runAll(promises as any);
    expect(results).toEqual([1, 'two', true]);
  });

  it('should catch and store any errors and return them', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.reject(new Error('Error 1')),
      Promise.reject(new Error('Error 2')),
    ];
    try {
      await runAll(promises);
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Error 1');
      expect((error as Error).stack).toBeDefined();
    }
  });

  it('should throw the first error if multiple errors occur', async () => {
    const promises = [
      Promise.reject(new Error('Error 1')),
      Promise.reject(new Error('Error 2')),
      Promise.resolve('three'),
    ];
    try {
      await runAll(promises);
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual('Error 1');
      expect((error as Error).stack).toBeDefined();
    }
  });
});
