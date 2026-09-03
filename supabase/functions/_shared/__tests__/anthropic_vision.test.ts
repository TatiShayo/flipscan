// Unit tests for Anthropic Vision Provider parsing & error handling.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnthropicVisionProvider, IdentificationError, EST_COST_PER_SCAN_USD } from '../anthropic_vision.ts';

describe('AnthropicVisionProvider', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const validResponsePayload = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          name: 'Patagonia Fleece',
          brand: 'Patagonia',
          model_or_era: 'Snap-T',
          category: 'clothing',
          condition_notes: 'Good condition',
          confidence: 0.85,
          ebay_search_keywords: ['patagonia fleece'],
          needs_better_photo: false,
          photo_tip: null,
        }),
      },
    ],
  };

  it('correctly parses clean JSON response from model', async () => {
    const fetchMock = jest.fn<() => Promise<Response>>().mockResolvedValue(
      new Response(JSON.stringify(validResponsePayload), { status: 200 }),
    );
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new AnthropicVisionProvider('sk-test-key');
    const result = await provider.identify({ imagesB64: ['b64data'] });

    expect(result.name).toBe('Patagonia Fleece');
    expect(result.brand).toBe('Patagonia');
    expect(result.confidence).toBe(0.85);
    expect(result.category).toBe('clothing');
  });

  it('extracts JSON when enclosed in markdown markdown code fences', async () => {
    const fencedResponse = {
      content: [
        {
          type: 'text',
          text: `Here is the identified item:
\`\`\`json
${JSON.stringify({
  name: 'Vintage Silk Tie',
  brand: 'Hermes',
  model_or_era: null,
  category: 'accessories',
  condition_notes: 'Excellent condition',
  confidence: 0.92,
  ebay_search_keywords: ['hermes silk tie'],
  needs_better_photo: false,
  photo_tip: null,
})}
\`\`\`
Hope this helps!`,
        },
      ],
    };

    const fetchMock = jest.fn<() => Promise<Response>>().mockResolvedValue(
      new Response(JSON.stringify(fencedResponse), { status: 200 }),
    );
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new AnthropicVisionProvider('sk-test-key');
    const result = await provider.identify({ imagesB64: ['b64data'] });

    expect(result.name).toBe('Vintage Silk Tie');
    expect(result.brand).toBe('Hermes');
  });

  it('retries once if first response fails JSON parsing and succeeds on second response', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Sorry I cannot identify this as JSON' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(validResponsePayload), { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new AnthropicVisionProvider('sk-test-key');
    const result = await provider.identify({ imagesB64: ['b64data'] });

    expect(result.name).toBe('Patagonia Fleece');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws IdentificationError if both initial call and retry fail to return valid JSON', async () => {
    const fetchMock = jest.fn<() => Promise<Response>>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Unparseable garbage text' }],
          }),
          { status: 200 },
        ),
    );
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new AnthropicVisionProvider('sk-test-key');
    await expect(provider.identify({ imagesB64: ['b64data'] })).rejects.toThrow(
      IdentificationError,
    );
  });

  it('has non-zero estimated cost per scan constant', () => {
    expect(EST_COST_PER_SCAN_USD).toBeGreaterThan(0);
  });
});
