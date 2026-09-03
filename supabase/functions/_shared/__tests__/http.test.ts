// Unit tests for HTTP helpers and fetchWithBackoff.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  json,
  errorResponse,
  ERROR_STATUS,
  CORS_HEADERS,
  fetchWithBackoff,
} from '../http.ts';

describe('HTTP Helpers', () => {
  it('creates JSON response with default 200 status and CORS headers', async () => {
    const res = json({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const data = await res.json();
    expect(data).toEqual({ hello: 'world' });
  });

  it('creates error response with specified status code', async () => {
    const res = errorResponse({ error: 'unauthorized', message: 'Sign-in required.' }, 401);
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string; message: string };
    expect(data.error).toBe('unauthorized');
    expect(data.message).toBe('Sign-in required.');
  });

  it('maps all standard ScanError types to correct HTTP status codes', () => {
    expect(ERROR_STATUS.unauthorized).toBe(401);
    expect(ERROR_STATUS.rate_limited).toBe(429);
    expect(ERROR_STATUS.quota_exhausted).toBe(402);
    expect(ERROR_STATUS.budget_capped).toBe(402);
    expect(ERROR_STATUS.paywall).toBe(402);
    expect(ERROR_STATUS.ai_disabled).toBe(503);
    expect(ERROR_STATUS.bad_request).toBe(400);
    expect(ERROR_STATUS.identification_failed).toBe(422);
    expect(ERROR_STATUS.internal).toBe(500);
  });
});

describe('fetchWithBackoff', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns immediately on successful 200 response', async () => {
    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const res = await fetchWithBackoff('https://example.com/api', {}, { retries: 2, baseMs: 10 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 rate limit and succeeds on subsequent attempt', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const res = await fetchWithBackoff('https://example.com/api', {}, { retries: 2, baseMs: 5 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server error and succeeds', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('success', { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const res = await fetchWithBackoff('https://example.com/api', {}, { retries: 2, baseMs: 5 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on client 400 Bad Request (fails fast)', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('bad request', { status: 400 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const res = await fetchWithBackoff('https://example.com/api', {}, { retries: 2, baseMs: 5 });
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on network exceptions (DNS / connection reset) up to retry limit', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new Error('Network reset'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const res = await fetchWithBackoff('https://example.com/api', {}, { retries: 2, baseMs: 5 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws error when retries are exhausted on network failure', async () => {
    const fetchMock = jest.fn<() => Promise<Response>>().mockRejectedValue(new Error('Persistent DNS outage'));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    await expect(
      fetchWithBackoff('https://example.com/api', {}, { retries: 1, baseMs: 5 }),
    ).rejects.toThrow('Persistent DNS outage');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
