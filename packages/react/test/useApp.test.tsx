/* eslint-disable react/function-component-definition */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable import/no-extraneous-dependencies */
import React, { useEffect, useState } from 'react';
import {
  render,
  fireEvent,
  screen,
  act,
  configure,
} from '@testing-library/react';
import { useApp } from '../index';

configure({ testIdAttribute: 'rc-mfe' });

test('basic', async () => {
  const initFn = jest.fn();
  const renderFn = jest.fn();

  const App2Component = () => <div>test</div>;

  const App1 = () => {
    const App2 = useApp({
      name: '@example/app2',
      attrs: {
        'data-test': 'bar',
      },
      loader: () =>
        Promise.resolve({
          default: {
            init: initFn,
            render: (
              element?: HTMLElement | null,
              props?: { foo: string },
              mfeId?: string
            ) => {
              const _props = props ?? {};
              expect(typeof mfeId === 'string').toBeTruthy();
              renderFn(element, _props);
              render(<App2Component />, {
                container: element ?? document.body,
              });
              return () => {
                //
              };
            },
          },
        }),
      bootstrap: ({ init }) => {
        init('foobar');
      },
    });
    return <App2 foo="bar" />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(initFn).toBeCalledTimes(1);
  expect(initFn).toBeCalledWith('foobar');
  expect(renderFn).toBeCalledTimes(1);
  expect(renderFn).toBeCalledWith(document.querySelector('[data-rc-mfe]>div'), {
    foo: 'bar',
  });
  expect(screen.queryByText('test')).toBeInTheDocument();
});

test('check re-render', async () => {
  const initFn = jest.fn();
  const renderFn = jest.fn();
  const externalRenderFn = jest.fn();
  const internalRenderFn = jest.fn();
  let externalUpdate: () => void;
  let internalUpdate: () => void;
  const App2Component = () => {
    const [state, setState] = useState(0);
    useEffect(() => {
      internalUpdate = () => {
        setState((s) => s + 1);
      };
    }, [state]);
    internalRenderFn();
    return <div>test</div>;
  };

  const App1 = () => {
    const [state, setState] = useState(0);
    useEffect(() => {
      externalUpdate = () => {
        setState((s) => s + 1);
      };
    }, [state]);
    const App2 = useApp({
      name: '@example/app2',
      loader: () =>
        Promise.resolve({
          default: {
            init: initFn,
            render: (
              element?: HTMLElement | null,
              props?: { foo: string },
              mfeId?: string
            ) => {
              const _props = props ?? {};
              expect(typeof mfeId === 'string').toBeTruthy();
              renderFn(element, _props);
              render(<App2Component />, {
                container: element ?? document.body,
              });
              return () => {
                //
              };
            },
          },
        }),
      bootstrap: ({ init }) => {
        init('foobar');
      },
    });
    externalRenderFn();
    return <App2 foo="bar" />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(initFn).toBeCalledTimes(1);
  expect(initFn).toBeCalledWith('foobar');
  expect(renderFn).toBeCalledWith(document.querySelector('[data-rc-mfe]>div'), {
    foo: 'bar',
  });
  expect(screen.queryByText('test')).toBeInTheDocument();

  expect(renderFn).toBeCalledTimes(1);
  expect(externalRenderFn).toBeCalledTimes(2);
  expect(internalRenderFn).toBeCalledTimes(1);

  externalUpdate!();

  expect(renderFn).toBeCalledTimes(1);
  expect(externalRenderFn).toBeCalledTimes(3);
  expect(internalRenderFn).toBeCalledTimes(1);

  internalUpdate!();

  expect(renderFn).toBeCalledTimes(1);
  expect(externalRenderFn).toBeCalledTimes(3);
  expect(internalRenderFn).toBeCalledTimes(2);
});

test('basic with props and attrs', async () => {
  const initFn = jest.fn();
  const renderFn = jest.fn();

  const App2Component = () => <div>test</div>;

  const App1 = () => {
    const App2 = useApp({
      name: '@example/app2',
      attrs: {
        'data-test': 'bar',
        foobar: 'foobar',
      },
      props: {
        foo1: 'bar1',
      },
      loader: () =>
        Promise.resolve({
          default: {
            init: initFn,
            render: (
              element?: HTMLElement | null,
              props?: { foo?: string; foo1?: string },
              mfeId?: string
            ) => {
              const _props = props ?? {};
              expect(typeof mfeId === 'string').toBeTruthy();
              renderFn(element, _props);
              render(<App2Component />, {
                container: element ?? document.body,
              });
              return () => {
                //
              };
            },
          },
        }),
      bootstrap: ({ init }) => {
        init('foobar');
      },
    });
    return <App2 foo="bar" />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(initFn).toBeCalledTimes(1);
  expect(initFn).toBeCalledWith('foobar');
  expect(renderFn).toBeCalledTimes(1);
  expect(renderFn.mock.calls[0][1]).toEqual({
    foo: 'bar',
    foo1: 'bar1',
  });
  expect(renderFn).toBeCalledWith(document.querySelector('[data-rc-mfe]>div'), {
    foo: 'bar',
    foo1: 'bar1',
  });
  expect(screen.queryByText('test')).toBeInTheDocument();
  expect(
    document.querySelector('[data-test=bar]')!.getAttribute('foobar')
  ).toBe('foobar');
});

test('check options - bootstrap', async () => {
  const initFn = jest.fn();
  const renderFn = jest.fn();
  const unmountFn = jest.fn();
  let bootstrapFn: (...args: any) => any;

  const App2Component = () => <div>test</div>;

  const App1 = () => {
    const App2 = useApp({
      name: '@example/app2',
      attrs: {
        'data-test': 'bar',
      },
      bootstrap: ({ init }) => {
        return new Promise((resolve) => {
          bootstrapFn = (...args: any) => {
            init(...args);
            resolve();
          };
        });
      },
      loader: () =>
        Promise.resolve({
          default: {
            init: initFn,
            render: (
              element?: HTMLElement | null,
              props?: { foo: string },
              mfeId?: string
            ) => {
              const _props = props ?? {};
              expect(typeof mfeId === 'string').toBeTruthy();
              renderFn(element, _props);
              render(<App2Component />, {
                container: element ?? document.body,
              });
              return unmountFn;
            },
          },
        }),
    });
    return <App2 foo="bar" />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(initFn).toBeCalledTimes(0);
  expect(renderFn).toBeCalledTimes(0);
  expect(renderFn).not.toBeCalledWith(
    document.querySelector('[data-rc-mfe]>div'),
    {
      foo: 'bar',
    }
  );
  expect(screen.queryByText('test')).not.toBeInTheDocument();

  bootstrapFn!('foobar');
  await act(() => Promise.resolve());

  expect(initFn).toBeCalledTimes(1);
  expect(initFn).toBeCalledWith('foobar');
  expect(renderFn).toBeCalledTimes(1);
  expect(renderFn).toBeCalledWith(document.querySelector('[data-rc-mfe]>div'), {
    foo: 'bar',
  });
  expect(screen.queryByText('test')).toBeInTheDocument();
});
