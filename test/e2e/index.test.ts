/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-promise-executor-return */
import { chromium, Page, Browser } from 'playwright';
// @ts-ignore
import waitOn from 'wait-on';

jest.retryTimes(5);
jest.setTimeout(30000);

let browser: Browser;
let page: Page;

const waitHostWeb = async () => {
  await waitOn(
    {
      resources: [
        'tcp:localhost:4000',
        'tcp:localhost:4001',
        'tcp:localhost:4002',
        'tcp:localhost:4003',
      ],
      delay: 1000,
      tcpTimeout: 3000,
    },
    () => {
      //
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
});
beforeEach(async () => {
  await waitHostWeb();
  page = await browser.newPage();
});
afterEach(async () => {
  await page.close();
});

test('e2e should work', async () => {
  await page.goto('http://localhost:4001/');
  expect(await page.title()).toBe('app1 - shell');
});

test('render base Nested apps', async () => {
  await page.goto('http://localhost:4001/');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 using native dynamic import to load App2\nNested\nApp 2\nApp 2 Button with count(0)\n'
  );
  // use build mfe config
  expect(
    await page.evaluate(
      `__RC_MFE__.modules['@base/app1'].dependencies['@base/app2']`
    )
  ).toEqual({
    entry: 'http://localhost:4002/remoteEntry.js',
    version: '>1.0.0',
    dependencyVersion: '>1.0.0',
  });
  await page.waitForFunction('window.updateEntryLogs.length === 1');
  expect(await page.evaluate(`window.updateEntryLogs`)).toEqual([
    [
      '@base/app2',
      {
        entry: 'http://localhost:4002/remoteEntry.js?remote=true',
        version: '1.0.1',
      },
      {},
    ],
  ]);
  await page.reload();
  // use use remote entry
  expect(
    await page.evaluate(
      `__RC_MFE__.modules['@base/app1'].dependencies['@base/app2']`
    )
  ).toEqual({
    entry: 'http://localhost:4002/remoteEntry.js?remote=true',
    version: '1.0.1',
    dependencyVersion: '>1.0.0',
    forcedVersion: false,
  });
  expect(
    await page.evaluate(
      `__RC_MFE__.modules['@base/app1'].dependencies['@base/app2']`
    )
  ).toEqual({
    entry: 'http://localhost:4002/remoteEntry.js?remote=true',
    version: '1.0.1',
    dependencyVersion: '>1.0.0',
    forcedVersion: false,
  });
  expect(await page.evaluate(`localStorage.length`)).toBe(1);
  expect(await page.evaluate(`localStorage.length`)).toBe(1);
  expect(
    await page.evaluate(
      `localStorage['rc-mfe:@base/app1:0.1.0-alpha.0:*:@base/app2']`
    )
  ).toBe(
    '{"entry":"http://localhost:4002/remoteEntry.js?remote=true","version":"1.0.1"}'
  );
});

test('check useApp', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-app"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 use common `useApp()`\nNested\nApp 2\nApp 2 Button with count(0)\n'
  );
});

test('check useApp with React', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-app-with-react"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 using `useApp()` React hooks\nNested\nApp 2\nApp 2 Button with count(0)\n'
  );
});

test('check useIframe', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-iframe"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 use common `useIframe()`'
  );
});

test('check useIframe with React', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-iframe-with-react"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 using `useIframe()` React hooks'
  );
});

test('check useWebComponents', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-web-components"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 use common `useWebComponents()`\nNested\nApp 2\nApp 2 Button with count(0)\n'
  );
});

test('check useWebComponents with React', async () => {
  await page.goto('http://localhost:4001/');
  await page.click('[href="#/use-web-components-with-react"]');
  expect(await page.evaluate('document.body.innerText')).toBe(
    'App 1\nhome\nuseApp\nuseApp with React\nuseIframe\nuseIframe with React\nuseWebComponents\nuseWebComponents with React\nApp1 send to App3 counter(0)\nApp1 using `useWebComponents()` React hooks'
  );
});
