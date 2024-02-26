const runAll = async <T>(promises: Promise<T>[]) => {
  const errors: Error[] = [];
  const results = await Promise.all(
    promises.map(async (promise) => {
      try {
        const result = await promise;
        return result;
      } catch (error) {
        errors.push(error as Error);
        return error;
      }
    })
  );
  if (errors.length) {
    throw errors[0];
  }
  return results;
};

export { runAll };
