// Tolerant JSON extractor: handles raw JSON, ```json blocks, and JSON
// preceded by a few words of preamble. Throws if no JSON object found.
export function extractJSON<T = unknown>(text: string): T {
  // 1. Strip ```json fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return JSON.parse(fenced[1].trim()) as T;
  }
  // 2. Try the whole thing.
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    // 3. Find first { and matching last }.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("No JSON object found in response");
  }
}
