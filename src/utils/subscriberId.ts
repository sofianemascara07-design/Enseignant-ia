export function normalizeSubscriberEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

// Deterministic synchronous 128-bit hex digest (valid Firestore ID: ^[a-zA-Z0-9_\-]+$)
export function makeSubscriberIdForEmail(email: string): string {
  const normalized = normalizeSubscriberEmail(email);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
    h3 = Math.imul(h3 ^ (c * 31), 0xc2b2ae35) >>> 0;
    h4 = Math.imul(h4 ^ (c + i * 17), 0x27d4eb2f) >>> 0;
  }
  const hex = [h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, '0')).join('');
  return `sub_${hex}`;
}

export function makeRandomSubscriberId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
