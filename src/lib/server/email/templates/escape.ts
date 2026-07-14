// Minimal HTML escaper for values interpolated into email markup. Ampersand
// must be replaced first, otherwise it would double-encode the entities emitted
// by the later replacements. Covers the five characters that can break out of
// text or a double-quoted attribute value.
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
