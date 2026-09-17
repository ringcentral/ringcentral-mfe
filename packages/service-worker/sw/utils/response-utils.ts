const JAVASCRIPT_MEDIA_TYPES = [
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
];

const getMediaType = (contentType: string): string =>
  contentType.split(';')[0].trim().toLowerCase();

const isJavaScriptMediaType = (contentType: string): boolean =>
  JAVASCRIPT_MEDIA_TYPES.includes(getMediaType(contentType));

const isValidResponse = (response: Response, url: string): boolean => {
  if (!response.ok) {
    return false;
  }
  const pathname = url.split('?')[0];
  if (pathname.endsWith('.js')) {
    if (!isJavaScriptMediaType(response.headers.get('content-type') || '')) {
      return false;
    }
  }
  return true;
};

export { isValidResponse };
