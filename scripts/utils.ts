import sh from 'shelljs';

type Workspace = { name: string; version: string; location: string };

/**
 * get all not private workspaces
 */
const getWorkspaces = () => {
  const workspaces: Workspace[] = JSON.parse(
    sh.exec('lerna list --json', { silent: true }).stdout
  );

  return workspaces;
};

export { getWorkspaces };
