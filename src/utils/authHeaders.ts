import { auth } from '../firebase';

export const ADMIN_TOKEN_STORAGE_KEY = 'madrassati_admin_token_v1';
export const ADMIN_PIN_STORAGE_KEY = 'madrassati_admin_pin_v1';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.run.app') ||
      host.endsWith('.onrender.com')
    ) {
      return '';
    }
  }
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  if (!raw || /ALLOWED_ORIGI|[\s,]/i.test(raw)) {
    return '';
  }
  try {
    const parsed = new URL(raw);
    const h = parsed.hostname.toLowerCase();
    if (h.endsWith('.web.app') || h.endsWith('.firebaseapp.com')) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

export async function parseJsonSafe<T = Record<string, unknown>>(res: Response): Promise<T> {
  const raw = await res.text();
  if (!raw || !raw.trim()) {
    throw new Error(
      res.ok
        ? 'Réponse vide du serveur. Veuillez réessayer.'
        : `Serveur indisponible (${res.status}). Veuillez réessayer.`
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      res.status >= 500 || res.status === 404
        ? `Serveur en cours de démarrage (${res.status}). Réessayez dans 2 secondes.`
        : `Réponse inattendue du serveur (${res.status}).`
    );
  }
}

export async function buildApiHeaders(options?: {
  licenseCode?: string | null;
  trialsUsed?: number;
  adminToken?: string | null;
}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.licenseCode) {
    headers['X-Activation-Code'] = options.licenseCode;
  }
  if (typeof options?.trialsUsed === 'number') {
    headers['X-Trial-Count'] = String(options.trialsUsed);
  }

  let token = options?.adminToken ?? null;
  let pinFallback: string | null = null;
  try {
    if (!token) {
      token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    }
    pinFallback = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
  } catch {
    token = token ?? null;
    pinFallback = null;
  }
  if (token) {
    headers['X-Admin-Token'] = token;
  }
  if (pinFallback) {
    headers['X-Admin-Pin'] = pinFallback;
  }

  try {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    }
  } catch {
    // Ignore Firebase ID token lookup failure
  }

  return headers;
}
