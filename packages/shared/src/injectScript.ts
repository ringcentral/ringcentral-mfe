export const injectScript = ({
  url,
  retryTimes,
  retryDelay,
  injectScript: _injectScript,
}: {
  url: string;
  retryTimes: number;
  retryDelay: number;
  injectScript: (options: {
    url: string;
    retryTimes: number;
    retryDelay: number;
    // recurrence type
    injectScript: (...args: any) => Promise<void>;
  }) => Promise<void>;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = url;
    element.async = true;
    element.type = 'text/javascript';
    element.onload = () => {
      resolve();
      document.head.removeChild(element);
    };
    element.onerror = () => {
      document.head.removeChild(element);
      if (retryTimes > 0) {
        setTimeout(() => {
          _injectScript({
            url,
            retryTimes: retryTimes - 1,
            retryDelay,
            injectScript: _injectScript,
          }).then(resolve, reject);
        }, retryDelay);
        return;
      }
      reject(new Error(`[MFE] Script Error: ${url}`));
    };
    document.head.appendChild(element);
  });
};
