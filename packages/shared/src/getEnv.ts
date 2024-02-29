export const getEnv = (env: string[]) =>
  env.reduce((_env: Record<string, string>, arg: string) => {
    const [key, value = true] = arg.split('=');
    return Object.assign(_env, {
      [key]: value,
    });
  }, {});
