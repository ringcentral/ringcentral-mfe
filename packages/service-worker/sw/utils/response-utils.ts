const isValidResponse = (response: Response, url: string): boolean => {
  if (!response.ok) {
    return false;
  }
  const pathname = url.split('?')[0];
  if (pathname.endsWith('.js')) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('javascript')) {
      return false;
    }
  }
  return true;
};

export { isValidResponse };
