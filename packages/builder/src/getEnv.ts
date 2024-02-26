import yargs from 'yargs';

const argv = yargs.array('env').default('env', []).argv as { env: string[] };

export const getEnv = () =>
  argv.env.reduce((env: Record<string, string>, arg: string) => {
    const [key, value = true] = arg.split('=');
    return Object.assign(env, {
      [key]: value,
    });
  }, {});
