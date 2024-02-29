import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { createInitCommand } from './init';
// import { createRemoveCommand } from './remove';
import { createAddCommand } from './add';
import { createPublishCommand } from './publish';

const packageJson = fs.readJsonSync(path.resolve(__dirname, '../package.json'));
const command = new Command() as Command;
command.usage('[command] [options]').version(packageJson.version);

createInitCommand(command);
createAddCommand(command);
// createRemoveCommand(command);
createPublishCommand(command);

command.parse(process.argv);
