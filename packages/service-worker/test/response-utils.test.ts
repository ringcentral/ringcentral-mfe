import { isValidResponse } from '../sw/utils/response-utils';

describe('isValidResponse', () => {
  const makeResponse = (status: number, contentType: string | null) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => (name === 'content-type' ? contentType : null),
      },
    } as unknown as Response);

  it('accepts a 200 javascript response for a .js asset', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'application/javascript'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js'
      )
    ).toBe(true);
  });

  it('accepts a case-insensitive javascript media type', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'Application/JavaScript'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js'
      )
    ).toBe(true);
  });

  it('accepts a javascript media type with parameters', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'application/javascript; charset=utf-8'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js'
      )
    ).toBe(true);
  });

  it('rejects a non-ok response', () => {
    expect(
      isValidResponse(
        makeResponse(404, 'text/html'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js'
      )
    ).toBe(false);
  });

  it('rejects an html response for a .js asset', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'text/html'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js'
      )
    ).toBe(false);
  });

  it('accepts an html response for a non-js asset', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'text/html'),
        'https://app.ringcentral.com/subapp/message/1.0.0/index.html'
      )
    ).toBe(true);
  });

  it('accepts a css response', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'text/css'),
        'https://app.ringcentral.com/subapp/message/1.0.0/style.css'
      )
    ).toBe(true);
  });

  it('detects js assets ignoring query params', () => {
    expect(
      isValidResponse(
        makeResponse(200, 'text/html'),
        'https://app.ringcentral.com/subapp/message/1.0.0/remoteEntry.js?rev=123'
      )
    ).toBe(false);
  });
});
