// QA target — vision provider: the mock returns schema-valid fixtures for every variant,
// and the REAL Anthropic provider's parse/retry contract (BUILD_PROMPT §44, PLAYBOOK 2.6:
// "validate against zod, retry once, fail closed") is exercised against recorded-shape
// Claude responses via a mocked fetch. No network, no API key needed.
import { MockVisionProvider } from '../vision_provider.ts';
import { AnthropicVisionProvider, IdentificationError } from '../anthropic_vision.ts';
import { FIXTURE_IDENTIFIED } from '../fixtures.ts';

// Build a Claude Messages API response envelope wrapping the given assistant text.
function claudeResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text }] }),
  } as unknown as Response;
}

const VALID_JSON = JSON.stringify(FIXTURE_IDENTIFIED);

describe('MockVisionProvider', () => {
  const p = new MockVisionProvider();

  it('returns the default clothing fixture', async () => {
    const r = await p.identify({ imagesB64: ['x'] });
    expect(r.brand).toBe('Patagonia');
    expect(r.needs_better_photo).toBe(false);
  });

  it('returns the low-confidence fixture for the low_conf variant', async () => {
    const r = await p.identify({ imagesB64: ['x'], mockVariant: 'low_conf' });
    expect(r.needs_better_photo).toBe(true);
    expect(r.confidence).toBeLessThan(0.4);
  });

  it('returns the barcode fixture when a GTIN is present', async () => {
    const r = await p.identify({ imagesB64: [], barcode: '9780135957059' });
    expect(r.category).toBe('books_media');
  });
});

describe('AnthropicVisionProvider parse/retry contract', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('parses valid JSON on the first call (no retry)', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(claudeResponse(VALID_JSON));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    const r = await provider.identify({ imagesB64: ['x'] });
    expect(r.name).toBe(FIXTURE_IDENTIFIED.name);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('strips ```json fences and surrounding prose', async () => {
    const wrapped = 'Here is the item:\n```json\n' + VALID_JSON + '\n```\nHope that helps!';
    global.fetch = jest.fn().mockResolvedValueOnce(claudeResponse(wrapped)) as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    const r = await provider.identify({ imagesB64: ['x'] });
    expect(r.brand).toBe('Patagonia');
  });

  it('retries exactly once when the first response is unparseable, then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(claudeResponse('I cannot help with that.'))
      .mockResolvedValueOnce(claudeResponse(VALID_JSON));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    const r = await provider.identify({ imagesB64: ['x'] });
    expect(r.name).toBe(FIXTURE_IDENTIFIED.name);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails closed after a second unparseable response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(claudeResponse('nope'))
      .mockResolvedValueOnce(claudeResponse('still nope'));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    await expect(provider.identify({ imagesB64: ['x'] })).rejects.toBeInstanceOf(IdentificationError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects schema-invalid JSON (bad category) and retries', async () => {
    const badCategory = JSON.stringify({ ...FIXTURE_IDENTIFIED, category: 'weapons' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(claudeResponse(badCategory))
      .mockResolvedValueOnce(claudeResponse(VALID_JSON));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    const r = await provider.identify({ imagesB64: ['x'] });
    expect(r.category).toBe('clothing');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-200 from the API', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) }) as unknown as typeof fetch;
    const provider = new AnthropicVisionProvider('sk-test');
    await expect(provider.identify({ imagesB64: ['x'] })).rejects.toBeInstanceOf(IdentificationError);
  });
});
