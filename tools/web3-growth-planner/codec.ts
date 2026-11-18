import { parseModel, validateModel, type Model } from "./model";

export const HASH_PREFIX = "#w3g=1.";
export const MAX_ENCODED_LENGTH = 28_000;
export const MAX_DECODED_BYTES = 21_000;

/** Remove every authored string, including IDs; keep typed measurement settings. */
export function shareModel(model: Model, includeText: boolean): Model {
  const copy = structuredClone(model);
  if (includeText) return copy;
  copy.textOmitted = true;
  copy.title = "";
  copy.scenarios.forEach((s, i) => {
    s.id = `s${i + 1}`;
    for (const key of ["name", "retentionAssumption", "activationEvent", "retentionEvent", "exclusions", "attribution", "assumptions", "nextExperiment", "evidenceUrl"] as const) s[key] = "";
    s.channels.forEach((c, j) => { c.id = `c${j + 1}`; c.name = ""; });
  });
  return copy;
}

export function encodeShare(model: Model, includeText = false): string {
  if (!validateModel(model).ok) throw new Error("invalid");
  const bytes = new TextEncoder().encode(JSON.stringify(shareModel(model, includeText)));
  if (bytes.length > MAX_DECODED_BYTES) throw new Error("size");
  const payload = btoa(Array.from(bytes, n => String.fromCharCode(n)).join("")).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  if (payload.length > MAX_ENCODED_LENGTH) throw new Error("size");
  return HASH_PREFIX + payload;
}

export function decodeShare(hash: string): Model | null {
  try {
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const payload = hash.slice(HASH_PREFIX.length);
    if (!payload || payload.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
    const binary = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    if (binary.length > MAX_DECODED_BYTES) return null;
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const result = parseModel(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return result.ok ? result.model : null;
  } catch { return null; }
}
