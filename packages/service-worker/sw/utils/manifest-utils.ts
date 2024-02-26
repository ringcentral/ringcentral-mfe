import { Md5 } from 'ts-md5';

function paseManifestContent(manifestContent: string, scope: string) {
  const md5 = Md5.hashStr(manifestContent);
  const files = manifestContent
    .split('\n')
    .filter((line) => line)
    .map((line) => line.split(' '))
    .map(([filePath, revision]) => ({
      url: `${scope}${filePath}`,
      revision,
    }));
  return {
    md5,
    files,
  };
}

async function fetchCacheFiles(
  manifestUrl: string,
  scope: string
): Promise<{
  manifestResponse: Response;
  md5: string;
  files: Array<{ url: string; revision: string }>;
}> {
  const manifestResponse = await fetch(`${manifestUrl}?t=${Date.now()}`);
  const manifestContent = await manifestResponse.clone().text();
  return {
    manifestResponse,
    ...(await paseManifestContent(manifestContent, scope)),
  };
}

export { paseManifestContent, fetchCacheFiles };
