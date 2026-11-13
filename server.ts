import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

app.post('/api/ai/generate-document', async (req, res) => {
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
    } = req.body ?? {};

    if (!subject || !level || !docType || !language || !topic) {
      return res.status(400).json({ error: 'Paramètres manquants (matière, niveau, type, langue, sujet).' });
    }

    const ai = getGeminiClient();

    const languageLabel =
      language === 'ar' ? 'Arabe (العربية الفصحى المدرسية)' : language === 'en' ? 'Anglais (English)' : 'Français';

    const docTypeInstructions: Record<string, string> = {
      cours:
        'Un cours complet structuré selon le programme officiel algérien (2e génération) : Objectif d’apprentissage, Situation de départ, Développement détaillé avec exemples résolus, Règle / À retenir, et Exercices d’application.',
      fiche:
        'Une Fiche Pédagogique officielle algérienne (CEM) comprenant un tableau récapitulatif (Niveau, Domaine, Compétence terminale, Composantes, Matériel, Durée), Situation-problème, et les phases de déroulement (Mise en train, Découverte/Construction, Institutionnalisation, Réinvestissement/Évaluation).',
      examen:
        'Un Sujet d’Examen officiel trimestriel (ou type BEM pour la 4AM) noté sur 20 points avec barème précis par question : Exercices progressifs (12 pts) + Situation d’intégration contextualisée (8 pts).',
      devoir:
        'Un Devoir surveillé (1 heure) noté sur 20 points conforme au CEM algérien : 2 exercices ciblés + 1 situation problème courte avec barème détaillé.',
      exercice:
        'Une Série d’exercices gradués par difficulté (Application directe, Approfondissement, Situation complexe type BEM) adaptée au niveau CEM demandé.',
    };

    const prompt = `Tu es un inspecteur pédagogique et enseignant expert du cycle moyen algérien (CEM - Ministère de l'Éducation Nationale d'Algérie, programmes de 2ème génération).

Génère un document pédagogique prêt à imprimer et à exporter en Word/PDF avec les paramètres exacts suivants :
- Matière : ${subject}
- Niveau : ${level} (Cycle Moyen Algérien)
- Trimestre / Cadre : ${trimester || 'T1'}
- Type de document : ${docType} (${docTypeInstructions[docType] || docType})
- Langue de rédaction du contenu : ${languageLabel}
- Chapitre / Thème précis du programme algérien : ${topic}
- Durée prévue : ${durationMinutes || 60} minutes
- Inclure corrigé type et grille de barème : ${includeCorrection ? 'OUI, inclure à la fin une section séparée "Corrigé type et barème détaillé"' : 'NON'}
- Instructions complémentaires de l’enseignant : ${customInstructions || 'Aucune'}
${includeDiagram ? '- Génère également un schéma vectoriel SVG propre et lisible (viewBox="0 0 600 320", fond blanc, traits nets noirs/bleu/vert avec étiquettes claires) illustrant un concept clé ou une figure géométrique/scientifique du document.' : '- Mets svgDiagram à une chaîne vide "".'}

Règles strictes de rédaction :
1. Respecte scrupuleusement la terminologie, les compétences et la progression officielle du programme algérien (${level} ${subject}).
2. Rédige intégralement le titre et le contenu en ${languageLabel}.
3. Utilise un Markdown propre : titres (#, ##, ###), listes numérotées, tableaux Markdown (| ... |) pour les barèmes ou fiches techniques, et formules mathématiques claires (Unicode comme ×, ÷, √, ², π, ≤, ≥, °, →).
4. Ne mets pas d'en-tête administratif redondant en haut du Markdown (l'application affiche déjà l'en-tête officiel du CEM), commence directement par le titre et les sections pédagogiques.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          "Tu es un assistant pédagogique algérien expert du CEM. Tu produis des cours, fiches, devoirs et examens rigoureux, fidèles au curriculum officiel algérien, prêts pour l'impression A4.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Titre clair et concis du document dans la langue choisie.' },
            summary: { type: Type.STRING, description: 'Résumé court en 1 phrase de la compétence visée.' },
            contentMarkdown: { type: Type.STRING, description: 'Contenu complet du document en Markdown propre.' },
            svgDiagram: {
              type: Type.STRING,
              description: 'Code SVG complet (<svg viewBox="0 0 600 320" ...>...</svg>) ou chaîne vide.',
            },
          },
          required: ['title', 'summary', 'contentMarkdown', 'svgDiagram'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/generate-document:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
  }
});

app.post('/api/ai/generate-diagram', async (req, res) => {
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
- Traits précis (#0f172a, #047857, #1d4ed8), flèches, cotes, angles droits ou symboles normalisés si géométrie/physique
- Texte lisible (font-family="sans-serif", font-size="13" à "15"), sans chevauchement ni débordement hors de 0..640 x 0..360
- Pas de scripts ni d'images externes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING, description: 'Légende courte du schéma.' },
            svg: { type: Type.STRING, description: 'Code SVG complet et valide.' },
          },
          required: ['caption', 'svg'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
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
- Objectif : ${messageGoal} (ex: relance de paiement courtoise, envoi d'un nouveau pack cours/examen payant, suivi pédagogique)
- Document ou pack concerné : ${documentTitle || 'Pack pédagogique CEM'}
- Montant en Dinars Algériens : ${Number(amountDzd || 0)} DZD
- Langue du message : ${langLabel}

Donne un ton respectueux, clair, adapté au contexte éducatif algérien (avec mention BaridiMob / CCP / remise en main propre si paiement).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjectLine: { type: Type.STRING, description: 'Objet court du message.' },
            messageBody: { type: Type.STRING, description: 'Corps du message prêt à copier.' },
          },
          required: ['subjectLine', 'messageBody'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/correspondent-message:', error);
    const { status, message } = getFriendlyGeminiError(error);
    return res.status(status).json({ error: message });
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
