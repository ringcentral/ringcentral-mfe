export const parserRemoteUrl = (remoteUrl: string) => {
  const link = new URL(remoteUrl.replace(/^.*@/, ''));
  const path = link.pathname.split('/').slice(0, -1).join('/');
  return {
    ...link,
    path: `${link.origin}${path}`,
  };
};
