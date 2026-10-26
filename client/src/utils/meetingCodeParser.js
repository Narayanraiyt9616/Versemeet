/**
 * Robust utility to parse and normalize meeting codes from any input:
 * - Direct codes (e.g. "vm-205-3432-346", "VM-205-3432-346", "  vm-205-3432-346  ")
 * - Full URLs (e.g. "http://localhost:5173/meeting/vm-205-3432-346?name=Test", "https://versemeet.edu/join/vm-xxx#section")
 * - Partial paths (e.g. "/waiting/vm-205-3432-346/", "meeting/vm-205-3432-346")
 */
export function parseMeetingCode(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let str = rawInput.trim();

  // Try URL parsing first if input starts with http:// or https://
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const url = new URL(str);
      const pathname = url.pathname;
      const match = pathname.match(/\/(?:meeting|waiting|join)\/([^/?#]+)/i);
      if (match && match[1]) {
        return match[1].trim().toLowerCase();
      }
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1].trim().toLowerCase();
      }
    }
  } catch (e) {
    // Fall back to regex
  }

  // Regex matching /(meeting|waiting|join)/<code...>
  const match = str.match(/(?:meeting|waiting|join)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }

  // Strip any query strings, hashes, or trailing/leading slashes
  str = str.split('?')[0].split('#')[0].replace(/\/+$/, '').replace(/^\/+/, '').trim().toLowerCase();

  return str;
}
