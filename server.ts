import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Always bind port 3000 in dev/AI Studio preview to avoid EADDRINUSE on container port 8080
const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

const ACTIVATION_SECRET = process.env.ACTIVATION_SECRET || 'madrassati-cem-dz-2026-ccp-secret';
const ADMIN_EMAIL = 'sofianemascara07@gmail.com';
const ADMIN_PIN = process.env.ADMIN_PIN || '202607';
const MAX_FREE_TRIALS = 2;

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Activation-Code, X-Trial-Count');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

type PlanKey = 'MENSUEL' | 'TRIMESTRE' | 'ANNUEL';

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

function verifyActivationCode(rawCode: unknown): {
  valid: boolean;
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

  return {
    valid: true,
    plan,
    expiresAt,
    message: `Licence ${plan} activée avec succès jusqu’au ${expiresAt}.`,
  };
}

function checkAiAccess(req: express.Request): { allowed: boolean; status: number; message?: string } {
  const code = req.header('x-activation-code');
  if (code) {
    const check = verifyActivationCode(code);
    if (check.valid) {
      return { allowed: true, status: 200 };
    }
    return { allowed: false, status: 402, message: check.message };
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
const FALLBACK_TEXT_MODEL = 'gemini-3.5-flash';

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
    const timer = setTimeout(() => controller.abort(), 32000);
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          abortSignal: controller.signal,
          thinkingConfig: { thinkingLevel },
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
    return await callModel(FALLBACK_TEXT_MODEL, ThinkingLevel.LOW);
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

app.post('/api/license/verify', (req, res) => {
  const { code } = req.body ?? {};
  const result = verifyActivationCode(code);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/license/generate', (req, res) => {
  const { adminEmail, adminPin, planType, durationDays } = req.body ?? {};
  const isOwnerEmail = typeof adminEmail === 'string' && adminEmail.trim().toLowerCase() === ADMIN_EMAIL;
  const isPinValid = typeof adminPin === 'string' && adminPin.trim() === ADMIN_PIN;

  if (!isOwnerEmail && !isPinValid) {
    return res.status(403).json({ error: 'Accès administrateur requis pour générer un code d’activation.' });
  }

  const normalizedPlan = String(planType || 'MENSUEL').toUpperCase() as PlanKey;
  const validPlan: PlanKey =
    normalizedPlan === 'TRIMESTRE' || normalizedPlan === 'ANNUEL' ? normalizedPlan : 'MENSUEL';

  const generated = generateSignedCode(validPlan, durationDays);
  return res.json(generated);
});

app.post('/api/ai/generate-document', async (req, res) => {
  const access = checkAiAccess(req);
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
  const access = checkAiAccess(req);
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
  const access = checkAiAccess(req);
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

app.get('/api/flashcards/external-catalog', async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedExternalCatalog && now - cachedExternalCatalog.fetchedAt < 30 * 60 * 1000) {
      return res.json({ packs: cachedExternalCatalog.packs });
    }

    const resp = await fetch('https://kids-flashcards.com/fr/flashcards-en-anglais', {
      headers: { 'User-Agent': 'Madrassati-CEM/1.0' },
    });
    if (!resp.ok) {
      throw new Error(`Impossible de joindre kids-flashcards.com (${resp.status}).`);
    }
    const html = await resp.text();

    const packRegex =
      /<a href="(\/fr\/free-printable\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,400}?src="(\/collages\/[^"]+)"[\s\S]{0,300}?<span class="truncate card-category-title">([^<]+)<\/span>[\s\S]{0,120}?data-cnt="(\d+)"/g;

    const packs: ExternalPackSummary[] = [];
    for (const m of html.matchAll(packRegex)) {
      packs.push({
        path: m[1],
        titleFr: decodeHtmlEntities(m[2].replace(/^Imagiers\s+/i, '')),
        thumbUrl: `https://kids-flashcards.com${m[3]}`,
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
      !targetUrl.startsWith('https://kids-flashcards.com/collages/')
    ) {
      return res.status(400).send('URL image non autorisée.');
    }

    const imgResp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Madrassati-CEM/1.0' },
    });
    if (!imgResp.ok) {
      return res.status(imgResp.status).send('Image introuvable.');
    }
    const contentType = imgResp.headers.get('content-type') || 'image/webp';
    const arrayBuffer = await imgResp.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Error in /api/flashcards/image-proxy:', error);
    return res.status(502).send('Erreur proxy image.');
  }
});

app.post('/api/flashcards/external-pack', async (req, res) => {
  try {
    const { packPath, level, maxCards } = req.body ?? {};
    if (typeof packPath !== 'string' || !/^\/fr\/free-printable\/[a-z0-9\-]+$/i.test(packPath)) {
      return res.status(400).json({ error: 'Chemin du pack kids-flashcards invalide.' });
    }

    const targetLevel = level || '1AM';
    const limit = Math.min(24, Math.max(4, Number(maxCards) || 16));

    const packResp = await fetch(`https://kids-flashcards.com${packPath}`, {
      headers: { 'User-Agent': 'Madrassati-CEM/1.0' },
    });
    if (!packResp.ok) {
      throw new Error(`Erreur récupération pack (${packResp.status}).`);
    }
    const html = await packResp.text();

    const cardRegex =
      /<img[^>]+src="(https:\/\/kids-flashcards\.com\/images\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,200}?<h3 lang="en">([^<]+)<\/h3>/g;

    const rawItems: { english: string; imageUrl: string }[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(cardRegex)) {
      const english = decodeHtmlEntities(m[3]);
      if (!english || seen.has(english.toLowerCase())) continue;
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

    // Enrich with French translations, grammatical categories, and CEM examples via Gemini when key is configured
    let enrichedByWord = new Map<string, { french: string; category: string; example: string }>();
    if (process.env.GEMINI_API_KEY) {
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

    return res.json({ cards, sourceUrl: `https://kids-flashcards.com${packPath}` });
  } catch (error) {
    console.error('Error in /api/flashcards/external-pack:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur import pack kids-flashcards.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Madrassati CEM server running on http://localhost:${PORT}`);
  });
}

startServer();
