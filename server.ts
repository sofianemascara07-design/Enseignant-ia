import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { makeRandomSubscriberId, makeSubscriberIdForEmail, normalizeSubscriberEmail } from './src/utils/subscriberId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Always bind port 3000 in dev/AI Studio preview to avoid EADDRINUSE on container port 8080
const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

const ACTIVATION_SECRET = process.env.ACTIVATION_SECRET || 'madrassati-cem-dz-2026-ccp-secret';
const ADMIN_EMAIL = 'sofianemascara07@gmail.com';
const ADMIN_PIN = process.env.ADMIN_PIN || '202607';
const MAX_FREE_TRIALS = 2;

interface FirebaseAppletConfig {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
}

const firebaseConfig: FirebaseAppletConfig = (() => {
  const candidates = [
    path.resolve(__dirname, 'firebase-applet-config.json'),
    path.resolve(__dirname, '..', 'firebase-applet-config.json'),
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf8')) as FirebaseAppletConfig;
      }
    } catch {
      // Try next candidate
    }
  }
  return {};
})();

app.use(express.json({ limit: '4mb' }));

const DEFAULT_ALLOWED_ORIGINS = [
  'https://ace-gist-l0z9n.web.app',
  'https://ace-gist-l0z9n.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const extraOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins];

  if (origin && (allowed.includes(origin) || origin.endsWith('.run.app') || origin.endsWith('.onrender.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Activation-Code, X-Trial-Count, X-Admin-Token, X-Admin-Pin'
    );
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

type PlanKey = 'MENSUEL' | 'TRIMESTRE' | 'ANNUEL';
type SubscriberPlanKey = PlanKey | 'ACCES_TOTAL';

interface ServerSubscriberRecord {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  plan: SubscriberPlanKey;
  active: boolean;
  licenseCode?: string;
  expiresAt?: string;
  notes?: string;
  updatedAt: string;
}

interface AdminAccessState {
  globalOpenAccess: boolean;
  subscribers: Record<string, ServerSubscriberRecord>;
}

const STATE_FILE_PATH = path.resolve(process.cwd(), '.madrassati-admin-state.json');

function loadAdminStateFromDisk(): AdminAccessState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8')) as Partial<AdminAccessState>;
      return {
        globalOpenAccess: Boolean(parsed.globalOpenAccess),
        subscribers: parsed.subscribers && typeof parsed.subscribers === 'object' ? parsed.subscribers : {},
      };
    }
  } catch {
    // Fallback to clean state
  }
  return { globalOpenAccess: false, subscribers: {} };
}

const adminState: AdminAccessState = loadAdminStateFromDisk();

function saveAdminStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(adminState, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist admin state file:', err);
  }
}

const PLAN_DAYS: Record<PlanKey, number> = {
  MENSUEL: 30,
  TRIMESTRE: 90,
  ANNUEL: 365,
};

function signActivationPayload(plan: PlanKey, expiryCompact: string): string {
  return crypto
    .createHmac('sha256', ACTIVATION_SECRET)
    .update(`${plan}:${expiryCompact}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

function formatCompactDateToIso(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function generateSignedCode(plan: PlanKey, durationDays?: number): { code: string; plan: PlanKey; expiresAt: string } {
  const days = Math.max(1, Math.min(730, Number(durationDays) || PLAN_DAYS[plan] || 30));
  const expDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const yyyy = expDate.getUTCFullYear();
  const mm = String(expDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(expDate.getUTCDate()).padStart(2, '0');
  const compact = `${yyyy}${mm}${dd}`;
  const sig = signActivationPayload(plan, compact);
  return {
    code: `CEM-${plan}-${compact}-${sig}`,
    plan,
    expiresAt: `${yyyy}-${mm}-${dd}`,
  };
}

function signAdminSessionToken(email: string): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', ACTIVATION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminSessionToken(token: unknown): { valid: boolean; email?: string } {
  if (typeof token !== 'string' || !token.includes('.')) return { valid: false };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { valid: false };
  const expectedSig = crypto.createHmac('sha256', ACTIVATION_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (!parsed.exp || parsed.exp < Date.now()) return { valid: false };
    return { valid: true, email: parsed.email };
  } catch {
    return { valid: false };
  }
}

const tokenLookupCache = new Map<string, { email: string; emailVerified: boolean; expiresAtMs: number }>();

async function verifyFirebaseIdToken(idToken: string | undefined): Promise<{ email: string; emailVerified: boolean } | null> {
  if (!idToken || !firebaseConfig.apiKey) return null;
  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = tokenLookupCache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) {
    return { email: cached.email, emailVerified: cached.emailVerified };
  }

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: { email?: string; emailVerified?: boolean }[];
    };
    const u = data.users?.[0];
    if (!u?.email) return null;
    const result = {
      email: u.email.trim().toLowerCase(),
      emailVerified: Boolean(u.emailVerified),
    };
    tokenLookupCache.set(cacheKey, {
      ...result,
      expiresAtMs: Date.now() + 5 * 60 * 1000,
    });
    return result;
  } catch {
    return null;
  }
}

function getBearerToken(req: express.Request): string | undefined {
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

async function isAdminRequest(req: express.Request): Promise<boolean> {
  const adminToken = req.header('x-admin-token');
  if (adminToken && verifyAdminSessionToken(adminToken).valid) {
    return true;
  }
  const adminPinHeader = req.header('x-admin-pin');
  if (adminPinHeader && adminPinHeader.trim() === ADMIN_PIN) {
    return true;
  }
  const bearer = getBearerToken(req);
  if (bearer) {
    const fbUser = await verifyFirebaseIdToken(bearer);
    if (fbUser && fbUser.emailVerified && fbUser.email === ADMIN_EMAIL) {
      return true;
    }
  }
  return false;
}

let lastFirestoreGlobalSyncMs = 0;

async function syncGlobalAccessFromFirestoreIfStale(): Promise<boolean> {
  if (!firebaseConfig.projectId || !firebaseConfig.firestoreDatabaseId) {
    return adminState.globalOpenAccess;
  }
  const now = Date.now();
  if (now - lastFirestoreGlobalSyncMs < 15000) {
    return adminState.globalOpenAccess;
  }
  lastFirestoreGlobalSyncMs = now;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/appSettings/access`;
    const resp = await fetch(url);
    if (resp.ok) {
      const docJson = (await resp.json()) as {
        fields?: { globalOpenAccess?: { booleanValue?: boolean } };
      };
      if (typeof docJson.fields?.globalOpenAccess?.booleanValue === 'boolean') {
        adminState.globalOpenAccess = docJson.fields.globalOpenAccess.booleanValue;
        saveAdminStateToDisk();
      }
    }
  } catch {
    // Ignore transient Firestore REST fetch issues
  }
  return adminState.globalOpenAccess;
}

async function fetchSubscriberFromFirestoreIfNeeded(
  email: string,
  idToken?: string
): Promise<ServerSubscriberRecord | null> {
  const normalized = normalizeSubscriberEmail(email);
  if (!normalized) return null;

  const existingLocal = Object.values(adminState.subscribers).find(
    (s) => normalizeSubscriberEmail(s.email) === normalized
  );
  if (existingLocal) return existingLocal;

  if (!idToken || !firebaseConfig.projectId || !firebaseConfig.firestoreDatabaseId) return null;
  try {
    const subId = makeSubscriberIdForEmail(normalized);
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/subscribers/${subId}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!resp.ok) return null;
    const docJson = (await resp.json()) as {
      fields?: {
        fullName?: { stringValue?: string };
        email?: { stringValue?: string };
        phone?: { stringValue?: string };
        plan?: { stringValue?: string };
        active?: { booleanValue?: boolean };
        licenseCode?: { stringValue?: string };
        expiresAt?: { stringValue?: string };
      };
    };
    if (!docJson.fields) return null;
    const record: ServerSubscriberRecord = {
      id: subId,
      fullName: docJson.fields.fullName?.stringValue || normalized,
      email: normalized,
      phone: docJson.fields.phone?.stringValue || '',
      plan: (docJson.fields.plan?.stringValue as SubscriberPlanKey) || 'MENSUEL',
      active: Boolean(docJson.fields.active?.booleanValue),
      licenseCode: docJson.fields.licenseCode?.stringValue || '',
      expiresAt: docJson.fields.expiresAt?.stringValue || '',
      updatedAt: new Date().toISOString(),
    };
    adminState.subscribers[subId] = record;
    saveAdminStateToDisk();
    return record;
  } catch {
    return null;
  }
}

function findSubscriberByLicenseCode(code: string): ServerSubscriberRecord | undefined {
  const normalized = code.trim().toUpperCase();
  return Object.values(adminState.subscribers).find(
    (s) => s.licenseCode && s.licenseCode.trim().toUpperCase() === normalized
  );
}

function verifyActivationCode(rawCode: unknown): {
  valid: boolean;
  suspended?: boolean;
  plan?: string;
  expiresAt?: string;
  message: string;
} {
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    return { valid: false, message: 'Code d’activation manquant.' };
  }
  const normalized = rawCode.trim().toUpperCase();
  const match = normalized.match(/^CEM-(MENSUEL|TRIMESTRE|ANNUEL)-(\d{8})-([A-F0-9]{8})$/);
  if (!match) {
    return { valid: false, message: 'Format du code invalide. Exemple attendu : CEM-MENSUEL-20270115-A1B2C3D4.' };
  }

  const [, planRaw, compactDate, providedSig] = match;
  const plan = planRaw as PlanKey;
  const expectedSig = signActivationPayload(plan, compactDate);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, message: 'Code d’activation non reconnu ou altéré.' };
  }

  const expiresAt = formatCompactDateToIso(compactDate);
  const todayIso = new Date().toISOString().slice(0, 10);
  if (expiresAt < todayIso) {
    return { valid: false, plan, expiresAt, message: `Ce code a expiré le ${expiresAt}. Veuillez renouveler via WhatsApp 05 57 76 78 04.` };
  }

  const linkedSub = findSubscriberByLicenseCode(normalized);
  if (linkedSub && !linkedSub.active) {
    return {
      valid: false,
      suspended: true,
      plan,
      expiresAt,
      message: 'Votre abonnement a été désactivé par l’administrateur. Contactez WhatsApp 05 57 76 78 04.',
    };
  }

  return {
    valid: true,
    plan,
    expiresAt,
    message: `Licence ${plan} activée avec succès jusqu’au ${expiresAt}.`,
  };
}

async function resolveCallerAccess(req: express.Request): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
  globalOpenAccess: boolean;
  subscriberActive: boolean | null;
  suspended: boolean;
  plan?: string;
  expiresAt?: string;
  reason: 'admin' | 'global_open' | 'subscriber' | 'license' | 'suspended' | 'trial_or_locked';
  message?: string;
}> {
  const isAdmin = await isAdminRequest(req);
  const globalOpenAccess = await syncGlobalAccessFromFirestoreIfStale();

  if (isAdmin) {
    return {
      hasAccess: true,
      isAdmin: true,
      globalOpenAccess,
      subscriberActive: true,
      suspended: false,
      plan: 'ADMIN',
      reason: 'admin',
      message: 'Accès total administrateur actif.',
    };
  }

  if (globalOpenAccess) {
    return {
      hasAccess: true,
      isAdmin: false,
      globalOpenAccess: true,
      subscriberActive: true,
      suspended: false,
      plan: 'ACCES_TOTAL',
      reason: 'global_open',
      message: 'Accès total ouvert activé par l’administrateur.',
    };
  }

  const bearer = getBearerToken(req);
  if (bearer) {
    const fbUser = await verifyFirebaseIdToken(bearer);
    if (fbUser && fbUser.emailVerified) {
      const sub = await fetchSubscriberFromFirestoreIfNeeded(fbUser.email, bearer);
      if (sub) {
        const todayIso = new Date().toISOString().slice(0, 10);
        const notExpired = !sub.expiresAt || sub.expiresAt >= todayIso;
        if (!sub.active) {
          return {
            hasAccess: false,
            isAdmin: false,
            globalOpenAccess: false,
            subscriberActive: false,
            suspended: true,
            plan: sub.plan,
            expiresAt: sub.expiresAt,
            reason: 'suspended',
            message: 'Votre abonnement a été désactivé par l’administrateur. Contactez WhatsApp 05 57 76 78 04.',
          };
        }
        if (notExpired) {
          return {
            hasAccess: true,
            isAdmin: false,
            globalOpenAccess: false,
            subscriberActive: true,
            suspended: false,
            plan: sub.plan,
            expiresAt: sub.expiresAt,
            reason: 'subscriber',
          };
        }
      }
    }
  }

  const code = req.header('x-activation-code');
  if (code) {
    const check = verifyActivationCode(code);
    if (check.valid) {
      return {
        hasAccess: true,
        isAdmin: false,
        globalOpenAccess: false,
        subscriberActive: true,
        suspended: false,
        plan: check.plan,
        expiresAt: check.expiresAt,
        reason: 'license',
      };
    }
    return {
      hasAccess: false,
      isAdmin: false,
      globalOpenAccess: false,
      subscriberActive: check.suspended ? false : null,
      suspended: Boolean(check.suspended),
      plan: check.plan,
      expiresAt: check.expiresAt,
      reason: check.suspended ? 'suspended' : 'trial_or_locked',
      message: check.message,
    };
  }

  return {
    hasAccess: false,
    isAdmin: false,
    globalOpenAccess: false,
    subscriberActive: null,
    suspended: false,
    reason: 'trial_or_locked',
  };
}

async function checkAiAccess(req: express.Request): Promise<{ allowed: boolean; status: number; message?: string }> {
  const access = await resolveCallerAccess(req);
  if (access.hasAccess) {
    return { allowed: true, status: 200 };
  }
  if (access.suspended || req.header('x-activation-code')) {
    return { allowed: false, status: 402, message: access.message };
  }

  const trialHeader = Number(req.header('x-trial-count') ?? '0');
  const trialCount = Number.isFinite(trialHeader) ? trialHeader : 0;
  if (trialCount < MAX_FREE_TRIALS) {
    return { allowed: true, status: 200 };
  }

  return {
    allowed: false,
    status: 402,
    message:
      'Essai gratuit terminé (2/2 générations). Payez par CCP / BaridiMob et envoyez le reçu sur WhatsApp 05 57 76 78 04 pour recevoir votre code d’activation.',
  };
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PRIMARY_TEXT_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_TEXT_MODEL = 'gemini-4-hydrogen';

function safeParseJson<T>(raw: string | undefined): T {
  const cleaned = (raw ?? '{}')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('Réponse IA malformée. Veuillez relancer la génération.');
  }
}

async function generateWithBoost(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction?: string;
    responseSchema: Record<string, unknown>;
    thinkingLevel?: ThinkingLevel;
  }
) {
  const callModel = async (model: string, thinkingLevel: ThinkingLevel) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);
    const effectiveThinking =
      model === 'gemini-3.1-flash-lite'
        ? ThinkingLevel.MINIMAL
        : thinkingLevel;
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          abortSignal: controller.signal,
          thinkingConfig: { thinkingLevel: effectiveThinking },
          ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await callModel(PRIMARY_TEXT_MODEL, params.thinkingLevel ?? ThinkingLevel.LOW);
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID') || msg.includes('403')) {
      throw primaryErr;
    }
    console.warn(`Primary model ${PRIMARY_TEXT_MODEL} issue (${msg}), switching to ${FALLBACK_TEXT_MODEL}...`);
    try {
      return await callModel(FALLBACK_TEXT_MODEL, ThinkingLevel.LOW);
    } catch (fallbackErr) {
      await new Promise((r) => setTimeout(r, 700));
      return await callModel(FALLBACK_TEXT_MODEL, ThinkingLevel.LOW);
    }
  }
}

function getFriendlyGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Clé API Gemini invalide ou manquante. Vérifiez Settings > Secrets dans AI Studio.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Quota API Gemini temporairement atteint. Veuillez réessayer dans quelques instants.',
    };
  }
  return {
    status: 500,
    message: raw || 'Erreur lors de la génération IA.',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/access/status', async (req, res) => {
  const access = await resolveCallerAccess(req);
  return res.json(access);
});

app.post('/api/admin/auth', async (req, res) => {
  const { idToken, adminPin } = req.body ?? {};
  let authenticatedEmail = '';

  if (typeof adminPin === 'string' && adminPin.trim() === ADMIN_PIN) {
    authenticatedEmail = ADMIN_EMAIL;
  } else if (typeof idToken === 'string' && idToken.trim()) {
    const fbUser = await verifyFirebaseIdToken(idToken.trim());
    if (fbUser && fbUser.emailVerified && fbUser.email === ADMIN_EMAIL) {
      authenticatedEmail = fbUser.email;
    }
  }

  if (!authenticatedEmail) {
    return res.status(403).json({ error: 'Authentification administrateur invalide.' });
  }

  await syncGlobalAccessFromFirestoreIfStale();
  const adminToken = signAdminSessionToken(authenticatedEmail);
  return res.json({
    adminToken,
    email: authenticatedEmail,
    globalOpenAccess: adminState.globalOpenAccess,
    subscribers: Object.values(adminState.subscribers),
  });
});

app.get('/api/admin/state', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  await syncGlobalAccessFromFirestoreIfStale();
  return res.json({
    globalOpenAccess: adminState.globalOpenAccess,
    subscribers: Object.values(adminState.subscribers),
  });
});

app.post('/api/admin/access-config', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const { globalOpenAccess } = req.body ?? {};
  adminState.globalOpenAccess = Boolean(globalOpenAccess);
  lastFirestoreGlobalSyncMs = Date.now();
  saveAdminStateToDisk();
  return res.json({
    globalOpenAccess: adminState.globalOpenAccess,
  });
});

app.post('/api/admin/subscribers', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const { id, fullName, email, phone, plan, active = true, notes = '', generateCode = true } = req.body ?? {};
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ error: 'Nom de l’abonné requis.' });
  }

  const cleanEmail = normalizeSubscriberEmail(email);
  const subId =
    typeof id === 'string' && /^[a-zA-Z0-9_\-]+$/.test(id)
      ? id
      : cleanEmail
        ? makeSubscriberIdForEmail(cleanEmail)
        : makeRandomSubscriberId();

  const rawPlan = String(plan || 'MENSUEL').toUpperCase();
  const validPlan: SubscriberPlanKey =
    rawPlan === 'TRIMESTRE' || rawPlan === 'ANNUEL' || rawPlan === 'ACCES_TOTAL' ? rawPlan : 'MENSUEL';

  let licenseCode = '';
  let expiresAt = '';
  if (generateCode) {
    const codePlan: PlanKey = validPlan === 'ACCES_TOTAL' ? 'ANNUEL' : validPlan;
    const gen = generateSignedCode(codePlan, validPlan === 'ACCES_TOTAL' ? 365 : undefined);
    licenseCode = gen.code;
    expiresAt = gen.expiresAt;
  }

  const record: ServerSubscriberRecord = {
    id: subId,
    fullName: fullName.trim().slice(0, 120),
    email: cleanEmail,
    phone: typeof phone === 'string' ? phone.trim().slice(0, 40) : '',
    plan: validPlan,
    active: Boolean(active),
    licenseCode,
    expiresAt,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    updatedAt: new Date().toISOString(),
  };

  adminState.subscribers[subId] = record;
  saveAdminStateToDisk();
  return res.json({ subscriber: record });
});

app.patch('/api/admin/subscribers/:id', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const subId = String(req.params.id || '');
  const { active, fullName, email, phone, plan, licenseCode, expiresAt, notes } = req.body ?? {};
  const existing = adminState.subscribers[subId];
  const updated: ServerSubscriberRecord = {
    id: subId,
    fullName: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : existing?.fullName || 'Abonné',
    email: email !== undefined ? normalizeSubscriberEmail(email) : existing?.email || '',
    phone: phone !== undefined ? String(phone).trim() : existing?.phone || '',
    plan: (plan as SubscriberPlanKey) || existing?.plan || 'MENSUEL',
    active: typeof active === 'boolean' ? active : existing?.active ?? true,
    licenseCode: licenseCode !== undefined ? String(licenseCode).trim() : existing?.licenseCode || '',
    expiresAt: expiresAt !== undefined ? String(expiresAt).trim() : existing?.expiresAt || '',
    notes: notes !== undefined ? String(notes).trim() : existing?.notes || '',
    updatedAt: new Date().toISOString(),
  };
  adminState.subscribers[subId] = updated;
  saveAdminStateToDisk();
  return res.json({ subscriber: updated });
});

app.delete('/api/admin/subscribers/:id', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const subId = String(req.params.id || '');
  delete adminState.subscribers[subId];
  saveAdminStateToDisk();
  return res.json({ ok: true });
});

app.post('/api/admin/subscribers/sync', async (req, res) => {
  if (!(await isAdminRequest(req))) {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const { subscribers } = req.body ?? {};
  if (Array.isArray(subscribers)) {
    for (const s of subscribers) {
      if (s && typeof s.id === 'string' && /^[a-zA-Z0-9_\-]+$/.test(s.id)) {
        adminState.subscribers[s.id] = {
          id: s.id,
          fullName: String(s.fullName || 'Abonné').slice(0, 120),
          email: normalizeSubscriberEmail(s.email),
          phone: String(s.phone || '').slice(0, 40),
          plan: (s.plan as SubscriberPlanKey) || 'MENSUEL',
          active: Boolean(s.active),
          licenseCode: String(s.licenseCode || '').slice(0, 120),
          expiresAt: String(s.expiresAt || '').slice(0, 40),
          notes: String(s.notes || '').slice(0, 500),
          updatedAt: new Date().toISOString(),
        };
      }
    }
    saveAdminStateToDisk();
  }
  return res.json({ count: Object.keys(adminState.subscribers).length });
});

app.post('/api/license/verify', (req, res) => {
  const { code } = req.body ?? {};
  const result = verifyActivationCode(code);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/license/generate', async (req, res) => {
  const { adminEmail, adminPin, planType, durationDays } = req.body ?? {};
  const isOwnerEmail = typeof adminEmail === 'string' && adminEmail.trim().toLowerCase() === ADMIN_EMAIL;
  const isPinValid = typeof adminPin === 'string' && adminPin.trim() === ADMIN_PIN;
  const isHeaderAdmin = await isAdminRequest(req);

  if (!isOwnerEmail && !isPinValid && !isHeaderAdmin) {
    return res.status(403).json({ error: 'Accès administrateur requis pour générer un code d’activation.' });
  }

  const normalizedPlan = String(planType || 'MENSUEL').toUpperCase() as PlanKey;
  const validPlan: PlanKey =
    normalizedPlan === 'TRIMESTRE' || normalizedPlan === 'ANNUEL' ? normalizedPlan : 'MENSUEL';

  const generated = generateSignedCode(validPlan, durationDays);
  return res.json(generated);
});

app.post('/api/ai/generate-document', async (req, res) => {
  const access = await checkAiAccess(req);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message, locked: true });
  }

  try {
    const {
      subject,
      level,
      docType,
      language,
      trimester,
      topic,
      customInstructions,
      includeCorrection,
      includeDiagram,
      durationMinutes,
      answerSpaceMode,
    } = req.body ?? {};

    if (!subject || !level || !docType || !language || !topic) {
      return res.status(400).json({ error: 'Paramètres manquants (matière, niveau, type, langue, sujet).' });
    }

    const ai = getGeminiClient();

    const languageLabel =
      language === 'ar' ? 'Arabe (العربية الفصحى المدرسية)' : language === 'en' ? 'Anglais (English)' : 'Français';

    let prompt = '';
    let systemInstruction = '';

    if (docType === 'fiche') {
      if (language === 'fr') {
        systemInstruction =
          'Tu es un Inspecteur de l’Éducation Nationale (IEN) et professeur formateur expert du Cycle Moyen algérien (CEM, programmes 2e génération). Tu rédiges des Fiches Pédagogiques complètes, rigoureuses, directement exploitables en classe et prêtes à imprimer.';
        prompt = `Rédige une FICHE PÉDAGOGIQUE OFFICIELLE CEM complète et détaillée, rédigée 100% en **Français**, selon le programme algérien (2e génération) :
- Matière : ${subject}
- Niveau : ${level} (Cycle Moyen algérien)
- Trimestre : ${trimester || 'T1'}
- Intitulé de la séance / Séquence : ${topic}
- Durée : ${durationMinutes || 60} minutes
- Consignes spécifiques : ${customInstructions || 'Aucune'}
${includeDiagram ? '- Si un schéma simple ou tableau conceptuel SVG aide la séance, génère un svgDiagram propre (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260" width="600" height="260">...</svg>, fond blanc), sinon laisse "".' : '- Laisse svgDiagram vide "".'}

Structure OBLIGATOIRE de contentMarkdown :
1. **## 1. Fiche Synoptique** : Tableau Markdown clair (Projet / Domaine | Séquence | Niveau | Séance / Activité | Durée | Supports didactiques).
2. **## 2. Compétence Terminale, Composantes & Objectifs** : Liste précise des objectifs d'apprentissage, valeurs et compétences transversales.
3. **## 3. Prérequis & Situation de départ** : Mise en train courte + situation-problème / texte ou support déclencheur + questions d'observation.
4. **## 4. Déroulement de la séance** : Grand tableau Markdown structuré avec les colonnes :
   | Phase | Durée | Activités de l'enseignant & Consignes | Activités attendues de l'élève | Évaluation / Modalités |
   Couvrant obligatoirement : Éveil de l'intérêt / Rappel, Observation & Analyse, Structuration ("Je retiens"), et Application / Réinvestissement.
5. **## 5. Trace écrite (À recopier sur le cahier)** : Règle, synthèse et exemples clairs prêts pour le tableau.
6. **## 6. Exercice d'évaluation formative** : 1 exercice concret pour vérifier l'acquisition.${
          answerSpaceMode
            ? '\n- Ajoute des lignes pointillées (................................................................................) sous les questions de l’exercice pour répondre directement sur la feuille.'
            : ''
        }${
          includeCorrection
            ? '\n7. À la fin, ajoute une ligne contenant exactement :\n[[CORRECTION_PAGE]]\nPuis **## Corrigé type et Grille d’évaluation de la séance** avec les réponses détaillées et les critères d’observation.'
            : ''
        }

Règles strictes :
- N’ajoute pas d’en-tête administratif (République Algérienne / Direction) dans contentMarkdown (déjà généré par l’application).
- N’utilise JAMAIS &nbsp; ni de balises HTML.`;
      } else if (language === 'en') {
        systemInstruction =
          'You are a Senior Algerian Middle School (CEM) Inspector and Teacher Trainer specializing in the 2nd Generation Competency-Based Curriculum (PDP, PPU, PIASP lesson frameworks). You write clear, practical, print-ready Lesson Plans.';
        prompt = `Create a complete, authentic ALGERIAN MIDDLE SCHOOL (CEM) LESSON PLAN (Fiche Pédagogique) written 100% in **English**:
- Subject: ${subject}
- Level: ${level} (Algerian Middle School)
- Term: ${trimester || 'T1'}
- Sequence / Lesson Topic: ${topic}
- Timing: ${durationMinutes || 60} minutes
- Teacher's specific instructions: ${customInstructions || 'None'}
${includeDiagram ? '- If a simple SVG visual diagram or timeline enhances the lesson, include a clean white-background svgDiagram (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260" width="600" height="260">...</svg>), otherwise set svgDiagram to "".' : '- Set svgDiagram to "".'}

MANDATORY structure for contentMarkdown:
1. **## 1. Synoptic Lesson Header**: Markdown table (Level | Sequence | Lesson Focus | Framework (PDP/PPU/PIASP) | Duration | Visual Aids / Materials).
2. **## 2. Learning Objectives, Target Competency & Core Values**: Specify Interact / Interpret / Produce, target language structure/pronunciation, and cross-curricular competencies.
3. **## 3. Anticipated Problems & Solutions**: 2 concise practical classroom tips.
4. **## 4. Lesson Procedure**: Structured Markdown table with columns:
   | Stage & Timing | Procedure & Teacher's Role | Learners' Tasks | Interaction | Competency & VAKT |
   Covering: Warm-up, Presentation / Pre-task, Isolation-Analysis-Stating the Rule (or During-task), Practice & Use / Post-task.
5. **## 5. Board Plan & Copybook Summary**: Crisp rule box + model sentences for pupils' copybooks.
6. **## 6. Formative Assessment Task**: A ready-to-use mini task (MCQ with ☐ or gap-fill).${
          answerSpaceMode
            ? '\n- Add dotted answer lines (................................................................................) under the assessment questions.'
            : ''
        }${
          includeCorrection
            ? '\n7. At the end, insert a line containing ONLY:\n[[CORRECTION_PAGE]]\nFollowed by **## Answer Key & Lesson Evaluation Rubric** with full solutions and assessment indicators.'
            : ''
        }

Strict rules:
- Do NOT include administrative headers (Republic / Ministry / Name box) inside contentMarkdown.
- NEVER use &nbsp; or raw HTML tags.`;
      } else {
        systemInstruction =
          'أنت مفتش التربية الوطنية وأستاذ مكون خبير في الطور المتوسط الجزائري (CEM - مناهج الجيل الثاني). تعدّ مذكرات بيداغوجية رسمية متكاملة وعملية جاهزة للتطبيق في القسم والطباعة.';
        prompt = `أنشئ **مذكرة بيداغوجية نموذجية متكاملة (Fiche Pédagogique CEM)** محررة 100% باللغة **العربية الفصحى المدرسية** وفق مناهج الجيل الثاني لوزارة التربية الوطنية الجزائرية:
- المادة : ${subject}
- المستوى : ${level} (التعليم المتوسط)
- الفصل : ${trimester || 'T1'}
- عنوان المقطع / الوحدة التعلمية : ${topic}
- المدة الزمنية : ${durationMinutes || 60} دقيقة
- توجيهات إضافية : ${customInstructions || 'لا توجد'}
${includeDiagram ? '- إذا كان الدرس يتطلب شكلاً هندسياً أو مخططاً توضيحياً بسيطاً أنشئ svgDiagram صالحاً (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260" width="600" height="260">...</svg> بخلفية بيضاء)، وإلا اتركه فارغاً "".' : '- اترك svgDiagram فارغاً "".'}

الهيكلة الإلزامية لـ contentMarkdown :
1. **## 1. البطاقة التقنية للمذكرة** : جدول Markdown منظم يضم (الميدان | المقطع التعلمي | موضوع الدرس | المستوى | المدة | الوسائل البيداغوجية والمراجع).
2. **## 2. الكفاءة الختامية، مركبات الكفاءة والقيم المستهدفة** : صياغة دقيقة وفق الوثيقة المرافقة للمنهاج (مع الكفاءات العرضية).
3. **## 3. المكتسبات القبلية والوضعية المشكلة الانطلاقية** : تذكير موجز + وضعية تعلمية محفزة وأسئلة التقصي.
4. **## 4. جدول سير التعلمات (السيرورة المنهجية للدرس)** : جدول Markdown شامل بالأعمدة التالية :
   | المرحلة | المدة | نشاط الأستاذ والسير المنهجي | نشاط التلميذ المتوقع | مؤشرات التقويم |
   يغطي إلزامياً: مرحلة الانطلاق (التقويم التشخيصي)، مرحلة بناء التعلمات والبحث، مرحلة الحوصلة وإرساء الموارد، ومرحلة الاستثمار والتقويم.
5. **## 5. الأثر الكتابي للتلميذ (الملخص على الكراس)** : ملخص منظم، تعاريف/قوانين/تواريخ معلمية أو أمثلة محلولة جاهزة للنقل على السبورة.
6. **## 6. تمرين تقويمي ختامي** : نشاط تطبيقي سريع للتأكد من استيعاب التلاميذ (يتضمن خيارات ☐ أو جدول إكمال).${
          answerSpaceMode
            ? '\n- أضف أسطر إجابة منقطة (................................................................................) تحت أسئلة التمرين التقويمي.'
            : ''
        }${
          includeCorrection
            ? '\n7. في نهاية الوثيقة، اكتب السطر التالي بمفرده:\n[[CORRECTION_PAGE]]\nثم أضف **## التصحيح النموذجي للتمرين وشبكة تقويم المذكرة** يتضمن الحل الكامل ومؤشرات تحقق الكفاءة.'
            : ''
        }

قواعد صارمة:
- لا تكتب الترويسة الإدارية (الجمهورية الجزائرية / مديرية التربية) داخل contentMarkdown لأن التطبيق يضيفها آلياً.
- لا تستعمل &nbsp; أو أي وسوم HTML بتاتاً، واستعمل الرموز العلمية العالمية (x, y, A, B, cm, V, DA) عند الحاجة.`;
      }
    } else {
      const docTypeInstructions: Record<string, string> = {
        cours:
          'Un cours complet structuré selon le programme officiel algérien (2e génération) : الكفاءة القاعدية / Objectif d’apprentissage, الوضعية الانطلاقية / Situation de départ, البناء المعرفي والشرح المفصل مع أمثلة محلولة, القاعدة / À retenir, وتطبيقات مباشرة.',
        examen:
          'Un Sujet d’Examen officiel trimestriel (اختبار الفصل / BEM) noté sur 20 points : التمرين الأول (أسئلة اختيار من متعدد بعلامة ☐ + جداول منظمة + تطبيقات، 06 نقاط)، التمرين الثاني (06 نقاط)، والوضعية الإدماجية (08 نقاط) مهيكلة بـ: السياق، السند 1 (وثيقة أو جدول معطيات)، السند 2، والتعليمات المرقمة مع تنقيط كل تعليمة.',
        devoir:
          'Un Devoir surveillé (فرض محروس) noté sur 20 points conforme au CEM algérien : التمرين الأول (يتضمن أسئلة اختيار من متعدد بعلامة ☐ وجدول إكمال أو مقارنة، 06 نقاط)، التمرين الثاني (06 نقاط)، ووضعية إدماجية (08 نقاط) تتضمن السياق + السند 1 + التعليمات المرقمة.',
        exercice:
          'Une Série d’exercices gradués (سلسلة تمارين محلولة) par difficulté : التمرين 1 (استرجاع المعارف واختيار من متعدد ☐)، التمرين 2 (تطبيق وتوظيف)، التمرين 3 (وضعية مشكلة مركبة من نمط BEM).',
      };

      const answerSpaceRule = answerSpaceMode
        ? `\n5. وضع "ورقة أسئلة وإجابة" مُفعّل : أضف أسطر إجابة منقطة (مثل: ................................................................................) مباشرة تحت كل سؤال أو تعليمة حتى يتمكن التلميذ من الإجابة على نفس الورقة.`
        : '';

      const correctionRule = includeCorrection
        ? `\n6. بما أن التصحيح النموذجي مطلوب: اكتب بعد نهاية أسئلة التلميذ السطر التالي بالضبط بمفرده:\n[[CORRECTION_PAGE]]\nثم أضف قسم "## التصحيح النموذجي وسلّم التنقيط" (أو "## Corrigé type et barème détaillé" بالفرنسية / "## Model Answer & Marking Scale" بالإنجليزية) يتضمن حلاً كاملاً خطوة بخطوة وجدول سلّم تنقيط Markdown مفصل مجموع نقاطه 20/20.`
        : '';

      systemInstruction =
        'أنت خبير بيداغوجي جزائري في الطور المتوسط (CEM). تنتج مواضيع اختبارات، فروضاً، ودروساً نموذجية عالية الدقة مطابقة تماماً لمنهج وزارة التربية الوطنية الجزائرية وللأوراق الرسمية الجاهزة للطباعة والتصدير.';

      prompt = `أنت مفتش بيداغوجي وأستاذ مكون خبير في التعليم المتوسط الجزائري (CEM - وزارة التربية الوطنية، مناهج الجيل الثاني الرسمية).

أنشئ وثيقة بيداغوجية متكاملة وعالية الجودة جاهزة للطباعة A4 والتصدير إلى Word وفق المعطيات الدقيقة التالية:
- المادة : ${subject}
- المستوى : ${level} (التعليم المتوسط الجزائري)
- الفصل / الإطار : ${trimester || 'T1'}
- نوع الوثيقة : ${docType} (${docTypeInstructions[docType] || docType})
- لغة التحرير : ${languageLabel}
- الموضوع / الوحدة الرسمية : ${topic}
- المدة الزمنية : ${durationMinutes || 60} دقيقة
- توجيهات إضافية من الأستاذ : ${customInstructions || 'لا توجد'}
${includeDiagram ? '- أنشئ أيضاً رسماً تخطيطياً أو شكلاً هندسياً بسيطاً بصيغة SVG (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 280" width="600" height="280">...</svg>، خلفية بيضاء) إذا كان الموضوع يتطلب ذلك، وإلا اترك svgDiagram فارغاً "".' : '- اترك svgDiagram فارغاً "".'}

قواعد التحرير الصارمة (مهم جداً):
1. حرّر كامل العنوان والمحتوى بلغة **${languageLabel}** حصراً وبمصطلحات وزارة التربية الوطنية الجزائرية المعتمدة.
   - في مواد الرياضيات، علوم الطبيعة والحياة، العلوم الفيزيائية والتكنولوجيا، اللغة العربية، و**التاريخ والجغرافيا**: استعمل اللغة العربية الرسمية 100% (التمرين الأول، اختر الإجابة الصحيحة بوضع علامة (×) في الخانة المناسبة ☐، أكمل الجدول، الوضعية الإدماجية، السند 1، السند 2، التعليمات، التصحيح النموذجي وسلّم التنقيط) مع الحفاظ على الرموز العلمية العالمية (x, y, A, B, C, cm, m, V, A, Ω, DA).
   - في مادة التاريخ والجغرافيا للمتوسط: وظف الوثائق التاريخية والخرائط/الجداول الإحصائية، الشخصيات، التواريخ المعلمية، والمصطلحات الدقيقة.
   - في الفرنسية والإنجليزية: اكتب موضوعاً متكاملاً (نص قراءة، أسئلة فهم Text Comprehension / Compréhension de l'écrit، قواعد Language / Fonctionnement de la langue، وضعية إدماجية Written Expression / Production écrite مع السندات).
2. نسّق الأسئلة بأسلوب احترافي مطابق لاختبارات CEM الجزائرية:
   - استعمل الرمز **☐** لخيارات الاختيار من متعدد (QCM) في سطر واضح ومقروء.
   - أدرج جداول Markdown حقيقية (| ... |) لملء الفراغات أو الفواتير أو مقارنة المعطيات أو سلّم التنقيط.
   - أبرز النقاط لكل تمرين ولكل سؤال فرعي بدقة مثل **(06 نقاط)** و **(01.5 نقطة)**.
3. لا تكتب الترويسة الإدارية (الجمهورية الجزائرية / مديرية التربية / خانة الاسم واللقب) داخل contentMarkdown لأن التطبيق يضيفها آلياً في أعلى الورقة.
4. ابدأ مباشرة بأقسام التمارين أو محاور الدرس بصيغة Markdown نظيفة (#، ##، ###، قوائم مرقمة، جداول)، واستعمل المسافات العادية دون أي وسوم أو رموز HTML مثل &nbsp;.${answerSpaceRule}${correctionRule}`;
    }

    const response = await generateWithBoost(ai, {
      contents: prompt,
      systemInstruction,
      thinkingLevel: ThinkingLevel.MEDIUM,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Titre officiel précis du document dans la langue sélectionnée.',
          },
          summary: {
            type: Type.STRING,
            description: 'Résumé en une phrase de la compétence ciblée.',
          },
          contentMarkdown: {
            type: Type.STRING,
            description: 'Contenu complet en Markdown propre avec tableaux, cases ☐ et marqueur [[CORRECTION_PAGE]] avant le corrigé.',
          },
          svgDiagram: {
            type: Type.STRING,
            description: 'Code SVG valide (<svg viewBox="0 0 600 280" ...>...</svg>) ou chaîne vide "".',
          },
        },
        required: ['title', 'summary', 'contentMarkdown', 'svgDiagram'],
      },
    });

    const parsed = safeParseJson<{
      title?: string;
      summary?: string;
      contentMarkdown?: string;
      svgDiagram?: string;
    }>(response.text);

    if (!parsed.contentMarkdown) {
      throw new Error('Réponse IA vide, veuillez réessayer.');
    }

    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/generate-document:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

app.post('/api/ai/generate-diagram', async (req, res) => {
  const access = await checkAiAccess(req);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message, locked: true });
  }

  try {
    const { subject, level, language, description } = req.body ?? {};
    if (!description) {
      return res.status(400).json({ error: 'Description du schéma requise.' });
    }

    const ai = getGeminiClient();
    const langText = language === 'ar' ? 'Arabe' : language === 'en' ? 'Anglais' : 'Français';

    const prompt = `Crée un schéma pédagogique vectoriel SVG haute précision pour un élève du cycle moyen algérien (${level || 'CEM'}, matière : ${subject || 'Sciences'}).
Description demandée : ${description}
Langue des légendes dans le SVG : ${langText}.

Contraintes techniques obligatoires pour le SVG :
- Balise racine <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
- Fond blanc propre (<rect width="640" height="360" fill="#ffffff" />)
- Traits précis (#0f172a, #047857, #1d4ed8), flèches, cotes, angles droits ou symboles normalisés
- Texte lisible (font-family="sans-serif", font-size="13" à "15"), sans chevauchement ni débordement hors de 0..640 x 0..360
- Pas de scripts ni d'images externes.`;

    const response = await generateWithBoost(ai, {
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          caption: { type: Type.STRING, description: 'Légende courte du schéma.' },
          svg: { type: Type.STRING, description: 'Code SVG complet et valide.' },
        },
        required: ['caption', 'svg'],
      },
    });

    const parsed = safeParseJson<{ caption?: string; svg?: string }>(response.text);
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/generate-diagram:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

app.post('/api/ai/correspondent-message', async (req, res) => {
  try {
    const { correspondentName, roleType, messageGoal, language, amountDzd, documentTitle, levelFocus, subjectFocus } =
      req.body ?? {};

    if (!correspondentName || !messageGoal) {
      return res.status(400).json({ error: 'Nom du correspondant et objectif du message requis.' });
    }

    const ai = getGeminiClient();
    const langLabel = language === 'ar' ? 'Arabe' : language === 'en' ? 'Anglais' : 'Français';

    const prompt = `Rédige un message court, courtois et professionnel prêt à envoyer (WhatsApp / Email / SMS) à un correspondant d'un enseignant algérien du CEM.
Paramètres :
- Destinataire : ${correspondentName} (${roleType || 'Correspondant'})
- Niveau / Matière : ${levelFocus || 'CEM'} ${subjectFocus ? `- ${subjectFocus}` : ''}
- Objectif : ${messageGoal}
- Document ou pack concerné : ${documentTitle || 'Pack pédagogique CEM'}
- Montant en Dinars Algériens : ${Number(amountDzd || 0)} DZD
- Langue du message : ${langLabel}

Donne un ton respectueux, clair, adapté au contexte éducatif algérien (avec mention BaridiMob / CCP / WhatsApp si paiement).`;

    const response = await generateWithBoost(ai, {
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjectLine: { type: Type.STRING, description: 'Objet court du message.' },
          messageBody: { type: Type.STRING, description: 'Corps du message prêt à copier.' },
        },
        required: ['subjectLine', 'messageBody'],
      },
    });

    const parsed = safeParseJson<{ subjectLine?: string; messageBody?: string }>(response.text);
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/correspondent-message:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

app.post('/api/ai/generate-flashcards', async (req, res) => {
  const access = await checkAiAccess(req);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message, locked: true });
  }

  try {
    const { topic, level, count } = req.body ?? {};
    const targetLevel = level || '1AM';
    const targetTopic = topic || 'Daily routines and school life';
    const cardCount = Math.min(18, Math.max(4, Number(count) || 8));

    const ai = getGeminiClient();

    const prompt = `Génère exactement ${cardCount} flashcards éducatives Anglais–Français conformes au programme du cycle moyen algérien (CEM, niveau ${targetLevel}) sur le thème : "${targetTopic}".
Pour chaque carte :
- english : mot ou expression courte en anglais (lisible à 3 mètres sur tableau blanc)
- french : traduction française exacte et claire
- category : strictement l'une des valeurs "Nom", "Verbe", "Adjectif", "Expression"
- level : "${targetLevel}"
- emoji : 1 seul emoji pertinent et visuel
- example : une phrase courte d'exemple en anglais adaptée au niveau ${targetLevel}.`;

    const response = await generateWithBoost(ai, {
      contents: prompt,
      thinkingLevel: ThinkingLevel.LOW,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                english: { type: Type.STRING },
                french: { type: Type.STRING },
                category: { type: Type.STRING },
                level: { type: Type.STRING },
                emoji: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              required: ['english', 'french', 'category', 'level', 'emoji', 'example'],
            },
          },
        },
        required: ['cards'],
      },
    });

    const parsed = safeParseJson<{ cards?: unknown[] }>(response.text);
    return res.json({ cards: Array.isArray(parsed.cards) ? parsed.cards : [] });
  } catch (error) {
    console.error('Error in /api/ai/generate-flashcards:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

interface ExternalPackSummary {
  path: string;
  titleFr: string;
  titleEn: string;
  count: number;
  thumbUrl: string;
}

let cachedExternalCatalog: { fetchedAt: number; packs: ExternalPackSummary[] } | null = null;
const cachedSitePages = new Map<string, { fetchedAt: number; html: string }>();
const cachedImages = new Map<string, { fetchedAt: number; contentType: string; buf: Buffer }>();
const cachedPackPreviews = new Map<
  string,
  {
    fetchedAt: number;
    packTitle: string;
    cards: { english: string; imageUrl: string }[];
    pdfDownloads: { label: string; format: string; url: string }[];
  }
>();

function setLimitedCache<K, V>(map: Map<K, V>, key: K, val: V, maxEntries: number) {
  if (map.size >= maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, val);
}

async function fetchExternalHtmlCached(rawPath: string): Promise<string> {
  const now = Date.now();
  const cached = cachedSitePages.get(rawPath);
  if (cached && now - cached.fetchedAt < 30 * 60 * 1000) {
    return cached.html;
  }
  const resp = await fetch(`https://kids-flashcards.com${rawPath}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    throw new Error(`Impossible de joindre kids-flashcards.com (${resp.status}).`);
  }
  const html = await resp.text();
  setLimitedCache(cachedSitePages, rawPath, { fetchedAt: now, html }, 80);
  return html;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function isAdminRequestOrQuery(req: express.Request): Promise<boolean> {
  if (await isAdminRequest(req)) return true;
  const qToken = typeof req.query.adminToken === 'string' ? req.query.adminToken.trim() : '';
  if (qToken && verifyAdminSessionToken(qToken).valid) return true;
  const qPin = typeof req.query.pin === 'string' ? req.query.pin.trim() : '';
  if (qPin && qPin === ADMIN_PIN) return true;
  return false;
}

app.get('/api/flashcards/external-catalog', async (_req, res) => {
  try {
    const now = Date.now();
    if (
      cachedExternalCatalog &&
      now - cachedExternalCatalog.fetchedAt < 30 * 60 * 1000 &&
      cachedExternalCatalog.packs[0]?.thumbUrl?.startsWith('/api/flashcards/image-proxy')
    ) {
      return res.json({ packs: cachedExternalCatalog.packs });
    }

    const html = await fetchExternalHtmlCached('/fr/flashcards-en-anglais');

    const packRegex =
      /<a href="(\/fr\/free-printable\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,400}?src="(\/collages\/[^"]+)"[\s\S]{0,300}?<span class="truncate card-category-title">([^<]+)<\/span>[\s\S]{0,120}?data-cnt="(\d+)"/g;

    const packs: ExternalPackSummary[] = [];
    for (const m of html.matchAll(packRegex)) {
      packs.push({
        path: m[1],
        titleFr: decodeHtmlEntities(m[2].replace(/^Imagiers\s+/i, '')),
        thumbUrl: `/api/flashcards/image-proxy?url=${encodeURIComponent(`https://kids-flashcards.com${m[3]}`)}`,
        titleEn: decodeHtmlEntities(m[4]),
        count: Number(m[5]),
      });
    }

    cachedExternalCatalog = { fetchedAt: now, packs };
    return res.json({ packs });
  } catch (error) {
    console.error('Error in /api/flashcards/external-catalog:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erreur de connexion à kids-flashcards.com.',
    });
  }
});

app.get('/api/flashcards/image-proxy', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    if (
      !targetUrl.startsWith('https://kids-flashcards.com/images/') &&
      !targetUrl.startsWith('https://kids-flashcards.com/collages/') &&
      !targetUrl.startsWith('https://kids-flashcards.com/img/') &&
      !targetUrl.startsWith('https://kids-flashcards.com/favicon')
    ) {
      return res.status(400).send('URL image non autorisée.');
    }

    const now = Date.now();
    const cached = cachedImages.get(targetUrl);
    if (cached && now - cached.fetchedAt < 60 * 60 * 1000) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buf);
    }

    const imgResp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Madrassati-CEM/1.0' },
    });
    if (!imgResp.ok) {
      return res.status(imgResp.status).send('Image introuvable.');
    }
    const contentType = imgResp.headers.get('content-type') || 'image/webp';
    const buf = Buffer.from(await imgResp.arrayBuffer());
    setLimitedCache(cachedImages, targetUrl, { fetchedAt: now, contentType, buf }, 350);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (error) {
    console.error('Error in /api/flashcards/image-proxy:', error);
    return res.status(502).send('Erreur proxy image.');
  }
});

app.get('/api/flashcards/file-proxy', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    const fullUrl = rawUrl.startsWith('/download/') ? `https://kids-flashcards.com${rawUrl}` : rawUrl;
    if (!/^https:\/\/kids-flashcards\.com\/download\/[a-z0-9\-\/_.?=&]+$/i.test(fullUrl)) {
      return res.status(400).send('Lien de téléchargement non autorisé.');
    }

    const fileResp = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Madrassati-CEM/1.0)' },
    });
    if (!fileResp.ok) {
      return res.status(fileResp.status).send('Fichier PDF introuvable.');
    }

    const contentType = fileResp.headers.get('content-type') || 'application/pdf';
    const urlPath = fullUrl.split('?')[0];
    const fileName = path.basename(urlPath) || 'flashcards.pdf';
    const buf = Buffer.from(await fileResp.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(buf);
  } catch (error) {
    console.error('Error in /api/flashcards/file-proxy:', error);
    return res.status(502).send('Erreur téléchargement PDF.');
  }
});

app.get('/api/flashcards/external-pack-preview', async (req, res) => {
  try {
    const packPath = String(req.query.path || '');
    if (!/^\/fr\/free-printable\/[a-z0-9\-]+$/i.test(packPath)) {
      return res.status(400).json({ error: 'Chemin du pack invalide.' });
    }

    const now = Date.now();
    const cached = cachedPackPreviews.get(packPath);
    if (cached && now - cached.fetchedAt < 30 * 60 * 1000) {
      return res.json({
        packPath,
        packTitle: cached.packTitle,
        cards: cached.cards,
        pdfDownloads: cached.pdfDownloads,
      });
    }

    const html = await fetchExternalHtmlCached(packPath);

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const packTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : '';

    const cardRegex =
      /<img[^>]+src="(https:\/\/kids-flashcards\.com\/images\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,200}?<h3 lang="en">([^<]+)<\/h3>/g;

    const cards: { english: string; imageUrl: string }[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(cardRegex)) {
      const english = decodeHtmlEntities(m[3]);
      if (!english || seen.has(english.toLowerCase())) continue;
      seen.add(english.toLowerCase());
      cards.push({
        english,
        imageUrl: `/api/flashcards/image-proxy?url=${encodeURIComponent(m[1])}`,
      });
    }

    const pdfDownloads: { label: string; format: string; url: string }[] = [];
    const seenPdf = new Set<string>();
    const pdfBtnRegex = /data-format="([^"]+)"[^>]*data-url="(\/download\/[^"]+)"/g;
    for (const m of html.matchAll(pdfBtnRegex)) {
      const format = decodeHtmlEntities(m[1]);
      const rawDlUrl = m[2];
      if (!seenPdf.has(rawDlUrl)) {
        seenPdf.add(rawDlUrl);
        const label =
          format === '6-A4'
            ? 'PDF A4 Portrait (6 cartes/page)'
            : format === '8-A4'
              ? 'PDF A4 Paysage (8 cartes/page)'
              : format === '1-A4'
                ? 'PDF A4 (1 carte/page)'
                : format === '1-Square'
                  ? 'PDF Carré (1 carte/page)'
                  : `PDF (${format})`;
        pdfDownloads.push({
          label,
          format,
          url: `/api/flashcards/file-proxy?url=${encodeURIComponent(rawDlUrl)}`,
        });
      }
    }

    setLimitedCache(cachedPackPreviews, packPath, { fetchedAt: now, packTitle, cards, pdfDownloads }, 100);
    return res.json({ packPath, packTitle, cards, pdfDownloads });
  } catch (error) {
    console.error('Error in /api/flashcards/external-pack-preview:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erreur chargement aperçu pack.',
    });
  }
});

app.get('/api/flashcards/site-proxy', async (req, res) => {
  try {
    const qToken = typeof req.query.adminToken === 'string' ? req.query.adminToken.trim() : '';
    const qPin = typeof req.query.pin === 'string' ? req.query.pin.trim() : '';
    const authSuffix = qToken
      ? `&adminToken=${encodeURIComponent(qToken)}`
      : qPin
        ? `&pin=${encodeURIComponent(qPin)}`
        : '';
    let rawPath = String(req.query.path || '/fr/flashcards-en-anglais').trim();
    if (!rawPath.startsWith('/')) rawPath = `/${rawPath}`;
    if (!/^\/(?:fr|en)\/[a-z0-9\-\/]*$/i.test(rawPath)) {
      rawPath = '/fr/flashcards-en-anglais';
    }

    let html = await fetchExternalHtmlCached(rawPath);

    // 1. Strip ALL third-party scripts, tracking iframes, noscript tags, ad/offer asides, and promo banners (blocks Hercule AI & ads)
    html = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<ins\b[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>[\s\S]*?<\/ins>/gi, '')
      .replace(/<form\b[^>]*id="kf-subscribe-form"[^>]*>[\s\S]*?<\/form>/gi, '');

    // 2. Fix lazy images so real illustrations load immediately and asynchronously
    html = html
      .replace(/\s+srcset="[^"]*"/gi, '')
      .replace(/\s+data-srcset="[^"]*"/gi, '')
      .replace(/\s+loading="lazy"/gi, ' decoding="async"');

    // 3. Route all Kids Flashcards images & collages through our ad-free fast RAM image proxy
    html = html
      .replace(
        /(?:src|data-src)="(https:\/\/kids-flashcards\.com\/(?:images|collages|img)\/[^"]+)"/gi,
        (_m, u) => `src="/api/flashcards/image-proxy?url=${encodeURIComponent(u)}"`
      )
      .replace(
        /(?:src|data-src)="(\/(?:images|collages|img)\/[^"]+)"/gi,
        (_m, p) => `src="/api/flashcards/image-proxy?url=${encodeURIComponent(`https://kids-flashcards.com${p}`)}"`
      );

    // 4. Preserve external stylesheet hrefs and keep /fr/... & /en/... navigation inside our ad-free proxy
    html = html
      .replace(
        /<link([^>]+?)href="(\/(?!fr\/|en\/)[^"]+)"/gi,
        (_m, attrs, p) => `<link${attrs}href="https://kids-flashcards.com${p}"`
      )
      .replace(
        /href="(?:https:\/\/kids-flashcards\.com)?(\/(?:fr|en)\/[a-z0-9\-\/]*)"/gi,
        (_m, p) => `href="/api/flashcards/site-proxy?path=${encodeURIComponent(p)}${authSuffix}"`
      )
      .replace(/\s+target="(?:_blank|_top|_parent)"/gi, '')
      .replace(/\s+target='(?:_blank|_top|_parent)'/gi, '')
      .replace(/\s+onclick="[^"]*"/gi, '')
      .replace(/\s+onclick='[^']*'/gi, '');

    const isPackPage = /^\/(?:fr|en)\/free-printable\/[a-z0-9\-]+$/i.test(rawPath);
    const bridgeHtml = `
      <style>
        .offer, .adsbygoogle, #kf-subscribe-form, .footer-subscribe, .ad-container, #progressModal, [id*="hercule"], [class*="hercule"], [class*="partner"] {
          display: none !important;
        }
        .fade-in, ul.staggered-list li, .owl-carousel, .owl-carousel.owl-loading, .owl-carousel .owl-item, img.lazy, img.gallery-thumb, img.responsive-img, .card-image img {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .kf-madrassati-bar {
          position: sticky; top: 0; z-index: 99999;
          background: #064e3b; color: #ffffff;
          padding: 10px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
          font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.18);
        }
        .kf-madrassati-btn {
          background: #10b981; color: #052e16; border: none; border-radius: 8px;
          padding: 7px 14px; font-weight: 700; font-size: 12px; cursor: pointer;
        }
        .kf-madrassati-btn:hover { background: #34d399; }
        .kf-madrassati-link {
          background: rgba(255,255,255,0.15); color: #ffffff; text-decoration: none;
          border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 12px;
        }
        ${isPackPage ? `
        img.gallery-thumb { cursor: pointer; transition: transform .15s, box-shadow .15s; border-radius: 8px; }
        img.gallery-thumb:hover { transform: scale(1.03); box-shadow: 0 0 0 3px #10b981; }
        ` : ''}
      </style>
      <div class="kf-madrassati-bar">
        <div>
          <strong>Télécharger cartes françaises anglais</strong> · Sans publicités &amp; Hercule IA bloqué
          ${isPackPage ? ' · <em>Cliquez sur « Téléchargez le PDF » en bas ou sur une image pour l’ajouter à votre planche A4</em>' : ' · <em>Choisissez une catégorie ci-dessous</em>'}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${isPackPage ? `<a class="kf-madrassati-link" href="/api/flashcards/site-proxy?path=${encodeURIComponent('/fr/flashcards-en-anglais')}${authSuffix}">← Toutes les catégories</a>` : ''}
          ${isPackPage ? `<a class="kf-madrassati-link" href="#download-files">↓ Aller aux PDF</a>` : ''}
          ${isPackPage ? `<button type="button" class="kf-madrassati-btn" id="kf-import-pack-btn">Importer vers Planche A4</button>` : ''}
        </div>
      </div>
      <script>
        (function() {
          var packPath = ${JSON.stringify(rawPath)};
          var authSuffix = ${JSON.stringify(authSuffix)};
          var importBtn = document.getElementById('kf-import-pack-btn');
          if (importBtn) {
            importBtn.addEventListener('click', function() {
              window.parent.postMessage({ type: 'kf-import-pack', packPath: packPath }, '*');
            });
          }
          document.addEventListener('click', function(e) {
            var dlBtn = e.target && e.target.closest ? e.target.closest('.js-download-pdf, button[data-url*="/download/"], a[data-url*="/download/"]') : null;
            if (dlBtn) {
              e.preventDefault();
              e.stopPropagation();
              var dlUrl = dlBtn.getAttribute('data-url') || '';
              if (dlUrl) {
                var a = document.createElement('a');
                a.href = '/api/flashcards/file-proxy?url=' + encodeURIComponent(dlUrl) + authSuffix;
                a.download = '';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              return;
            }
            var img = e.target && e.target.closest ? e.target.closest('img.gallery-thumb') : null;
            if (img) {
              e.preventDefault();
              e.stopPropagation();
              var card = img.closest('div, figure, article, li') || img.parentElement;
              var h3 = card ? card.querySelector('h3[lang="en"], h3') : null;
              var english = (h3 && h3.textContent ? h3.textContent : img.getAttribute('title') || '').trim();
              var imageUrl = img.getAttribute('src') || '';
              if (english && imageUrl) {
                window.parent.postMessage({ type: 'kf-select-card', english: english, imageUrl: imageUrl, packPath: packPath }, '*');
              }
            }
          }, true);
        })();
      </script>
    `;

    html = html.replace(/<body([^>]*)>/i, `<body$1>${bridgeHtml}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error in /api/flashcards/site-proxy:', error);
    return res.status(502).send('Erreur proxy cartes françaises-anglais.');
  }
});

app.post('/api/flashcards/external-pack', async (req, res) => {
  const access = await resolveCallerAccess(req);

  try {
    const { packPath, level, maxCards, useAiEnrichment = true, selectedWords } = req.body ?? {};
    if (typeof packPath !== 'string' || !/^\/(?:fr|en)\/free-printable\/[a-z0-9\-]+$/i.test(packPath)) {
      return res.status(400).json({ error: 'Chemin du pack invalide.' });
    }

    const targetLevel = level || '1AM';
    const selectedSet = Array.isArray(selectedWords) && selectedWords.length > 0
      ? new Set(selectedWords.map((w: unknown) => String(w || '').trim().toLowerCase()).filter(Boolean))
      : null;
    const limit = selectedSet ? 60 : Math.min(48, Math.max(4, Number(maxCards) || 16));

    const html = await fetchExternalHtmlCached(packPath);

    const cardRegex =
      /<img[^>]+src="(https:\/\/kids-flashcards\.com\/images\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,200}?<h3 lang="en">([^<]+)<\/h3>/g;

    const rawItems: { english: string; imageUrl: string }[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(cardRegex)) {
      const english = decodeHtmlEntities(m[3]);
      if (!english || seen.has(english.toLowerCase())) continue;
      if (selectedSet && !selectedSet.has(english.toLowerCase())) continue;
      seen.add(english.toLowerCase());
      rawItems.push({
        english,
        imageUrl: `/api/flashcards/image-proxy?url=${encodeURIComponent(m[1])}`,
      });
      if (rawItems.length >= limit) break;
    }

    if (rawItems.length === 0) {
      throw new Error('Aucune carte trouvée dans ce pack.');
    }

    // Enrich with French translations, grammatical categories, and CEM examples via Gemini when user has active access
    const canUseAi = Boolean(useAiEnrichment && access.hasAccess && process.env.GEMINI_API_KEY);
    let enrichedByWord = new Map<string, { french: string; category: string; example: string }>();
    if (canUseAi) {
      try {
        const ai = getGeminiClient();
        const wordList = rawItems.map((item) => item.english);
        const prompt = `Pour chacun des mots/expressions anglais suivants destinés à des élèves algériens du CEM (${targetLevel}), donne :
- english : le mot exact fourni
- french : traduction française scolaire courte et exacte
- category : strictement "Nom", "Verbe", "Adjectif" ou "Expression"
- example : une courte phrase d'exemple simple en anglais (${targetLevel}).

Liste : ${JSON.stringify(wordList)}`;

        const aiResp = await generateWithBoost(ai, {
          contents: prompt,
          thinkingLevel: ThinkingLevel.LOW,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    english: { type: Type.STRING },
                    french: { type: Type.STRING },
                    category: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                  required: ['english', 'french', 'category', 'example'],
                },
              },
            },
            required: ['translations'],
          },
        });

        const parsed = safeParseJson<{
          translations?: { english: string; french: string; category: string; example: string }[];
        }>(aiResp.text);

        for (const t of parsed.translations || []) {
          if (t.english) {
            enrichedByWord.set(t.english.trim().toLowerCase(), {
              french: t.french || t.english,
              category: t.category || 'Nom',
              example: t.example || '',
            });
          }
        }
      } catch (aiErr) {
        console.warn('Translation enrichment fallback for external pack:', aiErr);
      }
    }

    const cards = rawItems.map((item) => {
      const meta = enrichedByWord.get(item.english.toLowerCase());
      return {
        english: item.english,
        french: meta?.french || item.english,
        category: meta?.category || 'Nom',
        level: targetLevel,
        emoji: '📘',
        imageUrl: item.imageUrl,
        example: meta?.example || '',
      };
    });

    return res.json({ cards, aiEnriched: canUseAi });
  } catch (error) {
    console.error('Error in /api/flashcards/external-pack:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur import pack kids-flashcards.',
    });
  }
});

interface LearnEnglishSongItem {
  id: string;
  title: string;
  level: '1AM' | '2AM' | '3AM' | '4AM';
  category: 'Chanson' | 'Vocabulaire' | 'Routine' | 'Histoire';
  topicFr: string;
  keywords: string[];
  url: string;
  emoji: string;
}

const LEARN_ENGLISH_KIDS_SONGS: LearnEnglishSongItem[] = [
  {
    id: 'hello-hello-hello',
    title: 'Hello, hello, hello',
    level: '1AM',
    category: 'Chanson',
    topicFr: 'Salutations & accueil en classe (Séquence 1)',
    keywords: ['hello', 'how are you', 'fine', 'name', 'nice to meet you'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/hello-hello-hello',
    emoji: '👋',
  },
  {
    id: 'lets-tidy-up',
    title: "Let's tidy up",
    level: '1AM',
    category: 'Routine',
    topicFr: 'Fournitures scolaires, classe & impératif positif',
    keywords: ['tidy up', 'book', 'pen', 'schoolbag', 'desk', 'put away'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/lets-tidy-up',
    emoji: '🎒',
  },
  {
    id: 'hickory-dickory-dock',
    title: 'Hickory dickory dock',
    level: '1AM',
    category: 'Chanson',
    topicFr: 'Lire l’heure & les nombres (What time is it?)',
    keywords: ['clock', 'one o’clock', 'time', 'mouse', 'numbers'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/hickory-dickory-dock',
    emoji: '⏰',
  },
  {
    id: 'can-i-play-with-you',
    title: 'Can I play with you?',
    level: '1AM',
    category: 'Vocabulaire',
    topicFr: 'Jeux, loisirs & demandes polies (Can I...?)',
    keywords: ['play', 'friends', 'share', 'please', 'yes you can'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/can-i-play-with-you',
    emoji: '⚽',
  },
  {
    id: 'brush-bus',
    title: 'Brush bus',
    level: '2AM',
    category: 'Routine',
    topicFr: 'Routines quotidiennes & hygiène (Present Simple)',
    keywords: ['brush teeth', 'morning', 'night', 'wash', 'healthy'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/brush-bus',
    emoji: '🪥',
  },
  {
    id: 'feelings-are-feelings',
    title: 'Feelings are feelings',
    level: '2AM',
    category: 'Vocabulaire',
    topicFr: 'Émotions, adjectifs & description morale',
    keywords: ['happy', 'sad', 'angry', 'excited', 'worried', 'feelings'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/feelings-are-feelings',
    emoji: '😊',
  },
  {
    id: 'animal-house',
    title: 'Animal house',
    level: '2AM',
    category: 'Chanson',
    topicFr: 'Animaux, pièces de la maison & prépositions',
    keywords: ['house', 'kitchen', 'bedroom', 'animal', 'where is'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/animal-house',
    emoji: '🏠',
  },
  {
    id: 'grand-old-duke-of-york',
    title: 'The Grand Old Duke of York',
    level: '2AM',
    category: 'Chanson',
    topicFr: 'Prépositions de mouvement (up / down / top)',
    keywords: ['up', 'down', 'hill', 'march', 'halfway'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/the-grand-old-duke-of-york',
    emoji: '⛰️',
  },
  {
    id: 'do-your-best',
    title: 'Do your best',
    level: '3AM',
    category: 'Chanson',
    topicFr: 'Persévérance scolaire, conseils & personnalité',
    keywords: ['try', 'do your best', 'proud', 'never give up', 'learn'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/do-your-best',
    emoji: '🌟',
  },
  {
    id: 'amazing-superheroes',
    title: 'Amazing superheroes',
    level: '3AM',
    category: 'Vocabulaire',
    topicFr: 'Capacités (can / can’t) & verbes d’action',
    keywords: ['fly', 'jump', 'strong', 'fast', 'help people', 'can'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/amazing-superheroes',
    emoji: '🦸',
  },
  {
    id: 'in-my-dreams',
    title: 'In my dreams',
    level: '4AM',
    category: 'Histoire',
    topicFr: 'Projets d’avenir, imagination & expression écrite',
    keywords: ['dream', 'future', 'travel', 'world', 'hope'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/in-my-dreams',
    emoji: '🌍',
  },
  {
    id: 'old-lady-who-swallowed-a-fly',
    title: 'An old lady who swallowed a fly',
    level: '4AM',
    category: 'Histoire',
    topicFr: 'Narration au Past Simple & enchaînement logique',
    keywords: ['swallowed', 'once', 'story', 'past simple', 'why'],
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs/old-lady-who-swallowed-a-fly',
    emoji: '📖',
  },
];

app.get('/api/videos/learnenglish-catalog', (_req, res) => {
  return res.json({
    platformUrl: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs',
    extraLinks: [
      { label: 'Chansons (Songs)', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/songs' },
      { label: 'Histoires (Short Stories)', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/short-stories' },
      { label: 'Vidéos Grammaire', url: 'https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-videos' },
      { label: 'Video Zone', url: 'https://learnenglishkids.britishcouncil.org/listen-watch/video-zone' },
    ],
    songs: LEARN_ENGLISH_KIDS_SONGS,
  });
});

app.post('/api/ai/generate-educational-video', async (req, res) => {
  const access = await checkAiAccess(req);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message, locked: true });
  }

  try {
    const {
      topic,
      level = '1AM',
      videoStyle = 'song',
      referenceTitle = '',
    } = req.body ?? {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Sujet ou thème de la vidéo requis.' });
    }

    const ai = getGeminiClient();
    const styleLabel =
      videoStyle === 'song'
        ? 'Rhythmic Educational Classroom Song / Chant (catchy rhymes for kids/teens)'
        : videoStyle === 'dialogue'
          ? 'Short Classroom Role-Play Dialogue (2 pupils or teacher-pupil)'
          : videoStyle === 'grammar'
            ? 'PIASP Visual Grammar Mini-Lesson (Presentation, Isolation, Analysis, Rule)'
            : 'Visual Illustrated Vocabulary & Pronunciation Video';

    const prompt = `Create a complete, classroom-ready educational English video script for an Algerian Middle School (CEM) teacher (${level}), inspired by British Council LearnEnglish Kids pedagogy.

- Topic / Song Theme: ${topic.trim()}
- British Council Reference (if any): ${referenceTitle || 'Custom CEM English Lesson'}
- Target Level: ${level} (Algerian Middle School)
- Video Format: ${styleLabel}

Requirements:
1. Generate exactly 5 sequential scenes for a 45-60 second educational classroom video.
2. Each scene MUST have:
   - sceneNumber (1 to 5)
   - headlineEn: short bold slide title in English (2-6 words)
   - spokenLineEn: clear, rhythmic, natural British English line/verse/dialogue spoken aloud in the video (10-22 words, easy to repeat aloud)
   - translationFr: accurate French translation for explanation
   - pronunciationTip: brief pronunciation or rhythm tip in French (e.g., "Insistez sur le /h/ aspiré" or "Répétez en frappant dans les mains")
   - emoji: 1 relevant emoji
   - accentHex: clean hex color from ["#047857", "#2563EB", "#D97706", "#7C3AED", "#0F766E"]
   - durationSec: integer between 7 and 12
3. Generate vocabularyList (6 key words/expressions with english, french, phonetic).
4. Generate classroomActivityMarkdown: a concise printable CEM worksheet in English + instructions (Warm-up, While-watching listen & tick task, Post-watching speaking/singing task).`;

    const response = await generateWithBoost(ai, {
      contents: prompt,
      systemInstruction:
        'You are a Senior Algerian CEM English Teacher Trainer creating engaging British Council-inspired classroom videos, chants, and listening worksheets.',
      thinkingLevel: ThinkingLevel.LOW,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                headlineEn: { type: Type.STRING },
                spokenLineEn: { type: Type.STRING },
                translationFr: { type: Type.STRING },
                pronunciationTip: { type: Type.STRING },
                emoji: { type: Type.STRING },
                accentHex: { type: Type.STRING },
                durationSec: { type: Type.INTEGER },
              },
              required: [
                'sceneNumber',
                'headlineEn',
                'spokenLineEn',
                'translationFr',
                'pronunciationTip',
                'emoji',
                'accentHex',
                'durationSec',
              ],
            },
          },
          vocabularyList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                english: { type: Type.STRING },
                french: { type: Type.STRING },
                phonetic: { type: Type.STRING },
              },
              required: ['english', 'french', 'phonetic'],
            },
          },
          classroomActivityMarkdown: { type: Type.STRING },
        },
        required: ['title', 'subtitle', 'scenes', 'vocabularyList', 'classroomActivityMarkdown'],
      },
    });

    const parsed = safeParseJson<{
      title?: string;
      subtitle?: string;
      scenes?: unknown[];
      vocabularyList?: unknown[];
      classroomActivityMarkdown?: string;
    }>(response.text);

    return res.json({
      title: parsed.title || topic.trim(),
      subtitle: parsed.subtitle || `Vidéo pédagogique Anglais · ${level}`,
      scenes: Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 6) : [],
      vocabularyList: Array.isArray(parsed.vocabularyList) ? parsed.vocabularyList.slice(0, 8) : [],
      classroomActivityMarkdown: parsed.classroomActivityMarkdown || '',
    });
  } catch (error) {
    console.error('Error in /api/ai/generate-educational-video:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

app.post('/api/ai/tts-english', async (req, res) => {
  const access = await checkAiAccess(req);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.message, locked: true });
  }

  try {
    const { text, voiceName = 'Kore', style = 'Cheerful, clear British English primary/middle school teacher' } =
      req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Texte anglais requis pour la synthèse vocale.' });
    }

    const allowedVoices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];
    const safeVoice = allowedVoices.includes(String(voiceName)) ? String(voiceName) : 'Kore';
    const cleanText = text.trim().slice(0, 1800);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: String(style).slice(0, 140),
                },
              },
            ],
          },
        ],
        config: {
          abortSignal: controller.signal,
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: safeVoice },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || 'audio/wav';
      if (!base64Audio) {
        return res.status(502).json({ error: 'Aucun flux audio généré par le modèle TTS.' });
      }
      return res.json({ audioBase64: base64Audio, mimeType });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error('Error in /api/ai/tts-english:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !disableHmr,
        ws: { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distCandidates = [
      path.resolve(__dirname, 'dist'),
      __dirname,
      path.resolve(__dirname, '..'),
      path.resolve(process.cwd(), 'dist'),
    ];
    const distPath =
      distCandidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) ||
      path.resolve(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      return res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Madrassati CEM server running on http://localhost:${PORT}`);
    setTimeout(() => {
      fetchExternalHtmlCached('/fr/flashcards-en-anglais').catch(() => {});
    }, 1500);
  });
}

startServer();
