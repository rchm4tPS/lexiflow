export interface ParsedTranslation {
  sentences: string[];
  timestamps: { start: number; end: number }[];
}

// LingQ's "MM:SS.mmm" / "HH:MM:SS.mmm" timecodes into seconds.
function timecodeToSeconds(timecode: string): number {
  return timecode.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
};

function decodeXmlEntities(text: string): string {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, (entity) => XML_ENTITIES[entity] ?? entity);
}

// Parses LingQ's /languages/{lang}/lessons/{id}/text/ XML payload (one <span> per sentence)
// into parallel arrays of English translation text and start/end audio timestamps (seconds).
export function parseLingqTranslationXml(xml: string): ParsedTranslation {
  const sentences: string[] = [];
  const timestamps: { start: number; end: number }[] = [];

  const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>/g;
  let spanMatch: RegExpExecArray | null;

  while ((spanMatch = spanRegex.exec(xml)) !== null) {
    const attrs = spanMatch[1] ?? '';
    const body = spanMatch[2] ?? '';

    const startAttr = attrs.match(/\bstart="([^"]*)"/)?.[1];
    const endAttr = attrs.match(/\bend="([^"]*)"/)?.[1];
    if (!startAttr || !endAttr) continue;

    // Prefer <data code="en" ...>TEXT</data> — a clean, full-sentence translation.
    const dataMatch = body.match(/<data code="en"[^>]*>([\s\S]*?)<\/data>/);
    let text = dataMatch?.[1]?.trim();

    // Fallback: <cwtd code="en">word|word|word</cwtd> — per-word, "|"-separated.
    if (!text) {
      const cwtdMatch = body.match(/<cwtd code="en"[^>]*>([\s\S]*?)<\/cwtd>/);
      text = cwtdMatch?.[1]?.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!text) continue;

    sentences.push(decodeXmlEntities(text));
    timestamps.push({ start: timecodeToSeconds(startAttr), end: timecodeToSeconds(endAttr) });
  }

  return { sentences, timestamps };
}
