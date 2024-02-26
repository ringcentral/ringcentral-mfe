/* eslint-disable react/function-component-definition */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable import/no-extraneous-dependencies */
import React, { useEffect, useRef } from 'react';
import { render, act, configure } from '@testing-library/react';
import { identifierContainer } from '@ringcentral/mfe-shared';
import { useIframe } from '../index';

configure({ testIdAttribute: 'rc-mfe' });

const mockMeta = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global[identifierContainer] = {
    prefix: '*',
    styles: {},
    renderContainers: {},
    modules: {
      '@example/app1': {
        name: '@example/app1',
        registry: 'http://localhost:3000/app1-registry.json',
        dependencies: {
          '@example/app2': {
            entry: 'http://localhost:3002/remoteEntry.js?remote=true',
            version: '*',
          },
          '@example/app3': {
            entry: 'http://localhost:3003/remoteEntry.js?remote=true',
            version: '*',
          },
        },
        exposes: { './src/bootstrap': './src/bootstrap' },
        version: '0.1.0-alpha.0',
      },
      '@example/app2': {
        name: '@example/app2',
        registry: 'http://localhost:3000/app2-registry.json',
        dependencies: {
          '@example/app3': {
            entry: 'http://localhost:3003/remoteEntry.js',
            version: '*',
          },
        },
        exposes: { './src/bootstrap': './src/bootstrap' },
        version: '0.1.0-alpha.0',
      },
      '@example/app3': {
        name: '@example/app3',
        exposes: { './src/bootstrap': './src/bootstrap' },
        version: '0.1.0-alpha.0',
      },
    },
  };
};

test('basic', async () => {
  mockMeta();
  const App1 = () => {
    const App2 = useIframe({
      name: '@example/app2',
      attrs: {
        'data-test': 'bar',
      },
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  const dom = document.querySelector('iframe')!;
  expect(dom).toBeInTheDocument();
  expect(dom.getAttribute('src')).toBe('http://localhost:3002');
  expect(dom.getAttribute('data-test')).toBe('bar');
  expect(dom.getAttribute('name')).toMatch('rc-mfe:@example/app2');
  expect(dom.getAttribute('name')).toMatch(/:\*$/);
});

describe('check options', () => {
  test('set url', async () => {
    mockMeta();
    const App1 = () => {
      const App2 = useIframe({
        name: '@example/app2',
        attrs: {
          'data-test': 'bar',
        },
        url: 'http://localhost:3002?foo=bar',
      });
      return <App2 />;
    };
    render(<App1 />);
    await act(() => Promise.resolve());
    const dom = document.querySelector('iframe')!;
    expect(dom).toBeInTheDocument();
    expect(dom.getAttribute('src')).toBe('http://localhost:3002?foo=bar');
    expect(dom.getAttribute('data-test')).toBe('bar');
    expect(dom.getAttribute('name')).toMatch('rc-mfe:@example/app2');
    expect(dom.getAttribute('name')).toMatch(/:\*$/);
  });
  test('set attrs', async () => {
    mockMeta();
    const App1 = () => {
      const App2 = useIframe({
        name: '@example/app2',
        attrs: {
          'data-test': 'bar',
          foobar: 'foobar',
        },
      });
      return <App2 />;
    };
    render(<App1 />);
    await act(() => Promise.resolve());
    const dom = document.querySelector('iframe')!;
    expect(dom).toBeInTheDocument();
    expect(dom.getAttribute('src')).toBe('http://localhost:3002');
    expect(dom.getAttribute('data-test')).toBe('bar');
    expect(dom.getAttribute('foobar')).toBe('foobar');
    expect(dom.getAttribute('name')).toMatch('rc-mfe:@example/app2');
    expect(dom.getAttribute('name')).toMatch(/:\*$/);
  });
  test('check ref', async () => {
    mockMeta();
    const App1 = () => {
      const ref = useRef<HTMLIFrameElement>(null);
      const App2 = useIframe({
        name: '@example/app2',
        attrs: {
          'data-test': 'bar',
          foobar: 'foobar',
        },
        ref,
      });

      useEffect(() => {
        expect(ref.current).not.toBeNull();
      });

      return <App2 />;
    };
    render(<App1 />);
    await act(() => Promise.resolve());
    const dom = document.querySelector('iframe')!;
    expect(dom).toBeInTheDocument();
    expect(dom.getAttribute('src')).toBe('http://localhost:3002');
    expect(dom.getAttribute('data-test')).toBe('bar');
    expect(dom.getAttribute('foobar')).toBe('foobar');
    expect(dom.getAttribute('name')).toMatch('rc-mfe:@example/app2');
    expect(dom.getAttribute('name')).toMatch(/:\*$/);
  });
  test('check scope', async () => {
    mockMeta();
    const App1 = () => {
      const App2 = useIframe({
        name: '@example/app2',
        attrs: {
          'data-test': 'bar',
          foobar: 'foobar',
        },
        scope: 'someScope',
      });
      return <App2 />;
    };
    render(<App1 />);
    await act(() => Promise.resolve());
    const dom = document.querySelector('iframe')!;
    expect(dom).toBeInTheDocument();
    expect(dom.getAttribute('src')).toBe('http://localhost:3002');
    expect(dom.getAttribute('data-test')).toBe('bar');
    expect(dom.getAttribute('foobar')).toBe('foobar');
    expect(dom.getAttribute('name')).toMatch('rc-mfe:@example/app2');
    expect(dom.getAttribute('name')).toMatch(/:someScope$/);
  });
});
