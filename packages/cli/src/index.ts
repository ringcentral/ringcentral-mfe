import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { createFetchCommand } from './fetch';

export const cli = () => {
  const packageJson = fs.readJsonSync(
    path.resolve(__dirname, '../package.json')
  );
  const command = new Command() as Command;
  command.usage('[command] [options]').version(packageJson.version);

  createFetchCommand(command);

  command.parse(process.argv);
};

export * from './utils/index';
