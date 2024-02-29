import type { Command } from 'commander';
import fetch from 'node-fetch';
import path from 'path';
import yargs from 'yargs';
import { getSiteConfig } from '@ringcentral/mfe-shared';

const { env } = yargs.array('env').default('env', []).argv as { env: string[] };

export const createPublishCommand = (command: Command) => {
  command
    .command('publish')
    .option('-t, --type <type>', `create a MFE project`, 'module')
    .action(async ({ type }: { type: string }) => {
      const isApp = type === 'app';
      const isModule = type === 'module';
      if (!isApp && !isModule) {
        throw new Error(`'type' can not be '${type}'.`);
      }
      const rootPath = process.cwd();
      const configFile = path.join(rootPath, 'site.config');
      const {
        name,
        version,
        dependencies,
        meta = {},
        links = {},
        remoteEntry,
        registry,
        registryType,
        dependenciesLock,
      } = getSiteConfig(configFile, env) as any;
      if (registryType !== 'server') {
        throw new Error(`'registryType' can not be 'server'.`);
      }
      const _dependencies: Record<string, string> = {};
      const _dependenciesLock: Record<string, string> = {};
      Object.entries(dependencies).forEach(([key, value]) => {
        // @ts-ignore
        _dependencies[key] = value.dependencyVersion;
      });
      Object.entries(dependenciesLock).forEach(([key, value]) => {
        // @ts-ignore
        _dependenciesLock[key] = value.version;
      });
      const body = isApp
        ? {
            dependenciesLock: _dependenciesLock,
            dependencies: _dependencies,
            version,
          }
        : {
            version,
            dependencies: _dependencies,
            remoteEntry,
            links,
            meta,
          };
      const url = isApp
        ? `${registry}/api/apps/${name}/releases`
        : `${registry}/api/modules/${name}/releases`;
      console.log('dependencies', dependencies);
      console.log('body', body);
      console.log('url', url);
      const response = await fetch(url, {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      console.log('data', JSON.stringify(data, null, 2));
    });
};
