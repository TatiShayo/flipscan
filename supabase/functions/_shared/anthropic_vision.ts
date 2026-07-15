// Real Claude vision provider. Only constructed when ANTHROPIC_API_KEY is present.
// Deno-native (fetch); no SDK dependency to keep the edge bundle small. Validates the
// model's JSON against IdentifiedSchema and retries ONCE on parse failure (fail closed).
import { IdentifiedSchema, type Identified } from './schema.ts';
import { fetchWithBackoff } from './http.ts';
import {
  VISION_SYSTEM_PROMPT,
  type VisionInput,
  type VisionProvider,
} from './vision_provider.ts';

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 700;

export class AnthropicVisionProvider implements VisionProvider {
  readonly name = 'anthropic';
  constructor(private readonly apiKey: string) {}

  async identify(input: VisionInput): Promise<Identified> {
    const content: unknown[] = input.imagesB64.map((b64) => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
    }));
    const hint = input.barcode
      ? `The item's barcode (GTIN) is ${input.barcode}. Use it as a strong identity hint.`
      : 'Identify the item in the photo(s).';
    content.push({
      type: 'text',
      text: `<task>${hint} Return only the JSON object.</task>`,
    });

    const first = await this.call(content);
    const parsed = safeParse(first);
    if (parsed) return parsed;

    // retry once, telling the model its previous output failed to parse
    (content as { type: string; text?: string }[]).push({
      type: 'text',
      text: 'Your previous response was not valid JSON matching the schema. Return ONLY the JSON object.',
    });
    const second = await this.call(content);
    const reparsed = safeParse(second);
    if (reparsed) return reparsed;
    throw new IdentificationError('LLM output failed schema validation after retry');
  }

  private async call(content: unknown[]): Promise<string> {
    const res = await fetchWithBackoff('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: VISION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new IdentificationError(`anthropic ${res.status}`);
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((c) => c.type === 'text')?.text ?? '';
  }
}

export class IdentificationError extends Error {}

// Estimated Anthropic cost per scan (for the budget cap accounting). Rough: image + short
// completion. Tune when real usage lands; keep it non-zero so the cap engages.
export const EST_COST_PER_SCAN_USD = 0.02;

function safeParse(raw: string): Identified | null {
  const jsonText = extractJson(raw);
  if (!jsonText) return null;
  try {
    const obj = JSON.parse(jsonText);
    const result = IdentifiedSchema.safeParse(obj);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Models sometimes wrap JSON in prose or ```json fences. Extract the first {...} block.
function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}
