import type { Command } from 'commander';
import { FetchOptions, fetchInfo } from './utils';

export const createFetchCommand = (command: Command) => {
  command
    .command('fetch')
    .option('-t, --type <type>', `a MFE type, 'app' | 'module'`, 'app')
    .requiredOption('-n, --name <name>', `a MFE name`)
    .requiredOption('-v, --version <version>', `a MFE version`)
    .requiredOption('-r, --registry <registry>', `a MFE registry`)
    .action(async ({ name, version, registry, type }: FetchOptions) => {
      const result = await fetchInfo({ name, version, registry, type });
      console.log('Fetch MFE options:');
      console.log(JSON.stringify({ name, version, registry, type }, null, 2));
      console.log('Fetch MFE result:');
      console.log(JSON.stringify(result, null, 2));
    });
};
