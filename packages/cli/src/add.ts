import type { Command } from 'commander';

export const createAddCommand = (command: Command) => {
  command
    .command('add')
    .arguments('<name>')
    .usage('<name> [options]')
    .action((args) => {
      const [name, version] = args.split('@');
      console.log(name, version);
    });
};
