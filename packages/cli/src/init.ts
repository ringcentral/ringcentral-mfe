import type { Command } from 'commander';

export const supportLanguageMap = {
  ts: 'typescript',
} as const;

export const supportTypeMap = {
  react: 'react',
} as const;

export const supportLanguages = Array.from(
  new Set(Object.values(supportLanguageMap))
);

interface Options {
  type: keyof typeof supportTypeMap;
  language: keyof typeof supportLanguageMap;
}

export const createInitCommand = (command: Command) => {
  command
    .command('init')
    .arguments('<project-directory>')
    .usage('<project-directory> [options]')
    .option(
      '-l, --language <language>',
      `specify a development language(${supportLanguages.join('/')})`,
      supportLanguageMap.ts
    )
    .option('-t, --type <type>', `create a mfe project`, supportTypeMap.react)
    .action((projectName, { type, language }: Options) => {
      // TODO: create project
    });
};
