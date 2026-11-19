import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Globe,
  Grid2x2,
  Grid3x3,
  Layers,
  Loader2,
  Lock,
  Plus,
  Printer,
  QrCode,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { LevelType } from '../types';
import { ADMIN_PIN_STORAGE_KEY, buildApiHeaders, getApiBase, parseJsonSafe } from '../utils/authHeaders';

export type FlashcardCategory = 'Nom' | 'Verbe' | 'Adjectif' | 'Expression';

export interface FlashcardItem {
  id: string;
  english: string;
  french: string;
  example?: string;
  category: FlashcardCategory;
  level: LevelType;
  emoji: string;
  imageUrl?: string;
}

interface FlashcardsViewProps {
  licenseCode: string | null;
  adminToken?: string | null;
  isAdmin?: boolean;
  isLicensed: boolean;
  trialsUsed: number;
  maxTrials: number;
  openDirectSiteSignal?: number;
  onIncrementTrial: () => void;
  onOpenActivationModal: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAdminQuickUnlock?: () => void;
  onUnlockAdminPin?: (pin: string) => Promise<void>;
}

const CATEGORY_COLORS: Record<
  FlashcardCategory,
  { hex: string; border: string; bgSoft: string; text: string }
> = {
  Verbe: {
    hex: '#2563EB',
    border: 'border-[#2563EB]',
    bgSoft: 'bg-blue-50',
    text: 'text-[#2563EB]',
  },
  Nom: {
    hex: '#16A34A',
    border: 'border-[#16A34A]',
    bgSoft: 'bg-emerald-50',
    text: 'text-[#16A34A]',
  },
  Adjectif: {
    hex: '#D97706',
    border: 'border-[#D97706]',
    bgSoft: 'bg-amber-50',
    text: 'text-[#D97706]',
  },
  Expression: {
    hex: '#7C3AED',
    border: 'border-[#7C3AED]',
    bgSoft: 'bg-violet-50',
    text: 'text-[#7C3AED]',
  },
};

const QUICK_EMOJIS = [
  '⏰',
  '📚',
  '🍎',
  '🏫',
  '✏️',
  '⚽',
  '🌞',
  '🚌',
  '🧪',
  '🌍',
  '🗣️',
  '💡',
  '🏃',
  '🍲',
  '📖',
  '🎒',
];

const CEM_SAMPLE_CARDS: Omit<FlashcardItem, 'id'>[] = [
  {
    english: 'Wake up',
    french: 'Se réveiller',
    example: 'I wake up at 6:30 a.m.',
    category: 'Verbe',
    level: '1AM',
    emoji: '⏰',
  },
  {
    english: 'Schoolbag',
    french: 'Cartable',
    example: 'My schoolbag is on the desk.',
    category: 'Nom',
    level: '1AM',
    emoji: '🎒',
  },
  {
    english: 'Healthy',
    french: 'Sain / En bonne santé',
    example: 'Eat healthy food every day.',
    category: 'Adjectif',
    level: '2AM',
    emoji: '🍎',
  },
  {
    english: 'Good morning!',
    french: 'Bonjour !',
    example: 'Good morning, teacher!',
    category: 'Expression',
    level: '1AM',
    emoji: '🌞',
  },
  {
    english: 'Whiteboard',
    french: 'Tableau blanc',
    example: 'Look at the whiteboard, please.',
    category: 'Nom',
    level: '1AM',
    emoji: '🏫',
  },
  {
    english: 'Study',
    french: 'Étudier',
    example: 'We study English at middle school.',
    category: 'Verbe',
    level: '2AM',
    emoji: '📚',
  },
  {
    english: 'Curious',
    french: 'Curieux / Passionné',
    example: 'She is curious about science.',
    category: 'Adjectif',
    level: '3AM',
    emoji: '💡',
  },
  {
    english: 'Take care of',
    french: 'Prendre soin de',
    example: 'We must take care of nature.',
    category: 'Expression',
    level: '4AM',
    emoji: '🌍',
  },
];

function makeCardId(): string {
  return `fc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Deterministic lightweight visual matrix SVG (zero external QR library required)
function MiniQrSvg({ seed }: { seed: string }) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isCorner = (r < 2 && c < 2) || (r < 2 && c > 2) || (r > 2 && c < 2);
      const bit = ((hash >> ((r * 5 + c) % 24)) & 1) === 1;
      if (isCorner || bit) {
        cells.push(<rect key={`${r}-${c}`} x={c * 4 + 2} y={r * 4 + 2} width={3.2} height={3.2} fill="#0f172a" />);
      }
    }
  }
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 border border-slate-300 bg-white rounded-xs shrink-0" aria-hidden="true">
      <rect width="24" height="24" fill="#ffffff" />
      {cells}
    </svg>
  );
}

function reverseRowsForDuplex<T>(pageCards: (T | null)[], cols: number): (T | null)[] {
  const result: (T | null)[] = [];
  for (let i = 0; i < pageCards.length; i += cols) {
    const row = pageCards.slice(i, i + cols);
    while (row.length < cols) row.push(null);
    result.push(...row.reverse());
  }
  return result;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  licenseCode,
  adminToken,
  isAdmin = false,
  isLicensed,
  trialsUsed,
  maxTrials,
  openDirectSiteSignal = 0,
  onIncrementTrial,
  onOpenActivationModal,
  onOpenAdminPanel,
}) => {
  const hasProOrAdmin = Boolean(isAdmin || isLicensed);
  const [cards, setCards] = useState<FlashcardItem[]>(() =>
    CEM_SAMPLE_CARDS.map((c, idx) => ({ ...c, id: `init_${idx}` }))
  );

  // Manual entry form
  const [english, setEnglish] = useState('');
  const [french, setFrench] = useState('');
  const [example, setExample] = useState('');
  const [category, setCategory] = useState<FlashcardCategory>('Nom');
  const [level, setLevel] = useState<LevelType>('1AM');
  const [emoji, setEmoji] = useState('📚');
  const [imageUrl, setImageUrl] = useState('');
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Bulk CSV & External Connector state
  const [inputMode, setInputMode] = useState<'external' | 'manual' | 'bulk' | 'ai'>('external');
  const [bulkText, setBulkText] = useState(
    'Breakfast ; Petit-déjeuner ; Nom\nWrite ; Écrire ; Verbe\nHelpful ; Serviable ; Adjectif\nHow are you? ; Comment allez-vous ? ; Expression'
  );

  // External kids-flashcards.com state
  const [externalPacks, setExternalPacks] = useState<
    { path: string; titleFr: string; titleEn: string; count: number; thumbUrl: string }[]
  >([]);
  const [extLoadingCatalog, setExtLoadingCatalog] = useState(false);
  const [extImportingPath, setExtImportingPath] = useState<string | null>(null);
  const [extSearch, setExtSearch] = useState('');
  const [extLevel, setExtLevel] = useState<LevelType>('1AM');
  const [extUseAi, setExtUseAi] = useState(true);
  const [extError, setExtError] = useState<string | null>(null);
  const [extInfo, setExtInfo] = useState<string | null>(null);
  const [extCatalogAttempt, setExtCatalogAttempt] = useState(0);
  const [extWorkspaceMode, setExtWorkspaceMode] = useState<'site' | 'picker' | 'sheet'>('site');
  const [extSitePath, setExtSitePath] = useState<string>('/fr/flashcards-en-anglais');
  const [pickerPack, setPickerPack] = useState<{
    path: string;
    title: string;
    cards: { english: string; imageUrl: string }[];
    pdfDownloads?: { label: string; format: string; url: string }[];
  } | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<string[]>([]);

  // Print & Sheet settings
  const [gridMode, setGridMode] = useState<'8' | '9'>('8');
  const [printMode, setPrintMode] = useState<'single' | 'duplex'>('single');
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [showLevelBadge, setShowLevelBadge] = useState(true);
  const [showQrZone, setShowQrZone] = useState(false);
  const [zoomPercent, setZoomPercent] = useState<number>(80);

  const cols = gridMode === '8' ? 2 : 3;
  const rowsPerPage = gridMode === '8' ? 4 : 3;
  const cardsPerPage = cols * rowsPerPage;

  useEffect(() => {
    if (isAdmin) {
      setInputMode('external');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (openDirectSiteSignal > 0) {
      setInputMode('external');
      setExtSitePath('/fr/flashcards-en-anglais');
      setExtWorkspaceMode('site');
    }
  }, [openDirectSiteSignal]);

  useEffect(() => {
    if (inputMode !== 'external' || externalPacks.length > 0) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setExtLoadingCatalog(true);
    setExtError(null);
    const apiBase = getApiBase();

    const loadCatalog = async (attempt: number) => {
      try {
        const headers = await buildApiHeaders({ licenseCode, adminToken });
        const r = await fetch(`${apiBase}/api/flashcards/external-catalog`, { headers, credentials: 'include' });
        const d = await parseJsonSafe<{ error?: string; packs?: typeof externalPacks }>(r);
        if (cancelled) return;
        if (!r.ok) throw new Error(d.error || 'Impossible de charger les cartes françaises-anglais.');
        setExternalPacks(Array.isArray(d.packs) ? d.packs : []);
        setExtLoadingCatalog(false);
      } catch (err) {
        if (cancelled) return;
        if (attempt < 1) {
          retryTimer = setTimeout(() => {
            if (!cancelled) loadCatalog(attempt + 1);
          }, 1200);
          return;
        }
        setExtError(err instanceof Error ? err.message : 'Erreur chargement catalogue.');
        setExtLoadingCatalog(false);
      }
    };

    loadCatalog(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [inputMode, externalPacks.length, licenseCode, adminToken, extCatalogAttempt]);

  const handleOpenPackPicker = async (packPath: string, fallbackTitle: string) => {
    setPickerLoading(true);
    setExtError(null);
    setExtWorkspaceMode('picker');
    try {
      const apiBase = getApiBase();
      const headers = await buildApiHeaders({ licenseCode, adminToken });
      const res = await fetch(
        `${apiBase}/api/flashcards/external-pack-preview?path=${encodeURIComponent(packPath)}`,
        { headers, credentials: 'include' }
      );
      const data = await parseJsonSafe<{
        error?: string;
        packTitle?: string;
        cards?: { english: string; imageUrl: string }[];
        pdfDownloads?: { label: string; format: string; url: string }[];
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Erreur ouverture du pack.');
      const list = Array.isArray(data.cards) ? data.cards : [];
      const pdfDownloads = Array.isArray(data.pdfDownloads) ? data.pdfDownloads : [];
      setPickerPack({
        path: packPath,
        title: data.packTitle || fallbackTitle,
        cards: list,
        pdfDownloads,
      });
      setPickerSelected(list.slice(0, cardsPerPage).map((c) => c.english));
    } catch (err) {
      setExtError(err instanceof Error ? err.message : 'Erreur ouverture du pack.');
    } finally {
      setPickerLoading(false);
    }
  };

  const handleImportExternalPack = async (packPath: string, selectedWords?: string[]) => {
    setExtImportingPath(packPath);
    setExtError(null);
    setExtInfo(null);
    try {
      const apiBase = getApiBase();
      const headers = await buildApiHeaders({ licenseCode, adminToken });
      const res = await fetch(`${apiBase}/api/flashcards/external-pack`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          packPath,
          level: extLevel,
          maxCards: selectedWords?.length || cardsPerPage * 2,
          useAiEnrichment: extUseAi,
          selectedWords,
        }),
      });
      const data = await parseJsonSafe<{ error?: string; cards?: Record<string, string>[]; aiEnriched?: boolean }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Erreur import du pack.');
      }
      const list = Array.isArray(data.cards) ? data.cards : [];
      const mapped: FlashcardItem[] = list.map((item: Record<string, string>) => {
        const cat = (['Nom', 'Verbe', 'Adjectif', 'Expression'].includes(item.category)
          ? item.category
          : 'Nom') as FlashcardCategory;
        return {
          id: makeCardId(),
          english: String(item.english || ''),
          french: String(item.french || ''),
          category: cat,
          level: extLevel,
          emoji: String(item.emoji || '📘'),
          imageUrl: item.imageUrl || undefined,
          example: String(item.example || ''),
        };
      });
      if (mapped.length > 0) {
        setCards(mapped);
        setExtWorkspaceMode('sheet');
        if (extUseAi && data.aiEnriched === false && !hasProOrAdmin) {
          setExtInfo('Pack chargé directement sans publicité. Connectez l’accès Admin pour la traduction IA.');
        } else {
          setExtInfo(`${mapped.length} cartes ajoutées à la planche A4.`);
        }
      }
    } catch (err) {
      setExtError(err instanceof Error ? err.message : 'Erreur import pack.');
    } finally {
      setExtImportingPath(null);
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'kf-select-card' && payload.english && payload.imageUrl) {
        const word = String(payload.english).trim();
        const img = String(payload.imageUrl).trim();
        setCards((prev) => {
          const exists = prev.some((c) => c.english.toLowerCase() === word.toLowerCase());
          const next = exists
            ? prev
            : [
                ...prev.filter((c) => !c.id.startsWith('init_')),
                {
                  id: makeCardId(),
                  english: word,
                  french: word,
                  category: 'Nom' as FlashcardCategory,
                  level: extLevel,
                  emoji: '📘',
                  imageUrl: img,
                  example: '',
                },
              ];
          setExtInfo(`Carte « ${word} » ajoutée à votre planche A4 (${next.length} cartes).`);
          return next;
        });
      } else if (payload.type === 'kf-import-pack' && typeof payload.packPath === 'string') {
        handleImportExternalPack(payload.packPath);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [extLevel, extUseAi, cardsPerPage, licenseCode, adminToken]);

  // AI Deck generator
  const [aiTopic, setAiTopic] = useState('Daily routines & School life');
  const [aiLevel, setAiLevel] = useState<LevelType>('1AM');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const pages = useMemo(() => {
    const chunks: FlashcardItem[][] = [];
    for (let i = 0; i < cards.length; i += cardsPerPage) {
      chunks.push(cards.slice(i, i + cardsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
  }, [cards, cardsPerPage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !french.trim()) return;
    setCards((prev) => [
      ...prev,
      {
        id: makeCardId(),
        english: english.trim(),
        french: french.trim(),
        example: example.trim(),
        category,
        level,
        emoji: emoji || '📌',
        imageUrl: imageUrl || undefined,
      },
    ]);
    setEnglish('');
    setFrench('');
    setExample('');
    setImageUrl('');
  };

  const handleBulkImport = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: FlashcardItem[] = [];
    for (const line of lines) {
      const parts = line.split(/[;|,]/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const rawCat = (parts[2] || 'Nom').toLowerCase();
        let cat: FlashcardCategory = 'Nom';
        if (rawCat.startsWith('verb')) cat = 'Verbe';
        else if (rawCat.startsWith('adj')) cat = 'Adjectif';
        else if (rawCat.startsWith('exp')) cat = 'Expression';
        parsed.push({
          id: makeCardId(),
          english: parts[0],
          french: parts[1],
          category: cat,
          level,
          emoji: cat === 'Verbe' ? '🏃' : cat === 'Adjectif' ? '✨' : cat === 'Expression' ? '💬' : '📌',
          example: parts[3] || '',
        });
      }
    }
    if (parsed.length > 0) {
      setCards((prev) => [...prev, ...parsed]);
      setBulkText('');
    }
  };

  const handleLoadSampleCem = () => {
    setCards(CEM_SAMPLE_CARDS.map((c) => ({ ...c, id: makeCardId() })));
  };

  const handleGenerateAiDeck = async () => {
    if (!hasProOrAdmin && trialsUsed >= maxTrials) {
      onOpenActivationModal();
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const apiBase = getApiBase();
      const headers = await buildApiHeaders({ licenseCode, trialsUsed, adminToken });
      const res = await fetch(`${apiBase}/api/ai/generate-flashcards`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: aiTopic,
          level: aiLevel,
          count: cardsPerPage,
        }),
      });
      const data = await parseJsonSafe<{ error?: string; locked?: boolean; cards?: Record<string, string>[] }>(res);
      if (!res.ok) {
        if (res.status === 402 || data.locked) onOpenActivationModal();
        throw new Error(data.error || 'Erreur génération flashcards IA.');
      }
      const list = Array.isArray(data.cards) ? data.cards : [];
      const mapped: FlashcardItem[] = list.map((item: Record<string, string>) => {
        const cat = (['Nom', 'Verbe', 'Adjectif', 'Expression'].includes(item.category)
          ? item.category
          : 'Nom') as FlashcardCategory;
        const lvl = (['1AM', '2AM', '3AM', '4AM'].includes(item.level) ? item.level : aiLevel) as LevelType;
        return {
          id: makeCardId(),
          english: String(item.english || ''),
          french: String(item.french || ''),
          category: cat,
          level: lvl,
          emoji: String(item.emoji || '📘'),
          example: String(item.example || ''),
        };
      });
      if (mapped.length > 0) {
        setCards(mapped);
        if (!hasProOrAdmin) onIncrementTrial();
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur lors de la génération IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderCard = (card: FlashcardItem | null, side: 'front' | 'back', keyId: string) => {
    if (!card) {
      return (
        <div
          key={keyId}
          className={`flashcard-item rounded-lg ${
            showCutMarks ? 'border border-dashed border-slate-300/70' : ''
          }`}
        />
      );
    }

    const palette = CATEGORY_COLORS[card.category];

    return (
      <div
        key={keyId}
        className={`flashcard-item relative bg-white rounded-lg p-3 flex flex-col justify-between overflow-hidden ${
          showCutMarks ? 'border border-dashed border-slate-400' : 'border border-slate-200'
        }`}
      >
        {/* Cut corner marks for guillotine / scissors */}
        {showCutMarks && (
          <>
            <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-700 pointer-events-none" />
            <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-700 pointer-events-none" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-700 pointer-events-none" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-700 pointer-events-none" />
          </>
        )}

        {/* Inner color-coded magnetic/adhesive frame */}
        <div
          className={`h-full w-full rounded-md border-[2.5px] ${palette.border} px-3 py-2.5 flex flex-col justify-between bg-white`}
        >
          {/* Card Top Header: Category Tag + Level Badge / QR */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${palette.bgSoft} ${palette.text}`}
            >
              {card.category}
            </span>

            <div className="flex items-center gap-1.5">
              {showQrZone && <MiniQrSvg seed={`${card.english}-${card.french}`} />}
              {showLevelBadge && (
                <span className="text-[11px] font-bold font-mono-tabular px-1.5 py-0.5 rounded bg-slate-900 text-white">
                  {card.level}
                </span>
              )}
            </div>
          </div>

          {/* Main Card Body (Readable at 3 meters on whiteboard!) */}
          {side === 'front' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-1">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.english}
                  className="max-h-20 w-auto object-contain rounded"
                />
              ) : (
                <div className={gridMode === '8' ? 'text-5xl leading-none' : 'text-4xl leading-none'}>
                  {card.emoji}
                </div>
              )}

              <div
                className={`font-extrabold text-slate-900 tracking-tight leading-tight break-words ${
                  gridMode === '8' ? 'text-[26px]' : 'text-[21px]'
                }`}
              >
                {card.english}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-1">
              <div
                className={`font-extrabold text-slate-900 tracking-tight leading-tight break-words ${
                  gridMode === '8' ? 'text-[24px]' : 'text-[19px]'
                }`}
              >
                {card.french}
              </div>
              {card.example && (
                <p className="text-xs text-slate-600 italic leading-snug max-w-[95%]">
                  « {card.example} »
                </p>
              )}
            </div>
          )}

          {/* Card Footer */}
          {printMode === 'single' ? (
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700 truncate">{card.french}</span>
              <span className="text-[10px] font-medium text-slate-400 shrink-0">Tableau aimanté</span>
            </div>
          ) : (
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
              <span>{side === 'front' ? 'RECTO · EN' : 'VERSO · FR'}</span>
              <span>{card.english}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Sidebar (Hidden when printing) */}
        <aside className="no-print print:hidden lg:col-span-4 space-y-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Flashcards Tableau Blanc & Aimant
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Planches A4 prêtes pour papier adhésif ou magnétique (1AM–4AM)
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleCem}
              className="h-8 px-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0"
            >
              Exemple CEM (8)
            </button>
          </div>

          {/* Input Mode Switcher */}
          <div className="space-y-1.5 p-1.5 bg-slate-100 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setInputMode('external')}
              className={`w-full py-2 px-2.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                inputMode === 'external' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {isAdmin ? <Globe className="w-3.5 h-3.5 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              <span>Télécharger cartes françaises anglais</span>
            </button>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`py-1.5 px-1 rounded-md transition-colors whitespace-nowrap ${
                  inputMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Manuel
              </button>
              <button
                type="button"
                onClick={() => setInputMode('bulk')}
                className={`py-1.5 px-1 rounded-md transition-colors whitespace-nowrap ${
                  inputMode === 'bulk' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => setInputMode('ai')}
                className={`py-1.5 px-1 rounded-md transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  inputMode === 'ai' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Pack IA</span>
              </button>
            </div>
          </div>

          {inputMode === 'manual' && (
            <form onSubmit={handleAddManualCard} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Mot / Expression (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={english}
                    onChange={(e) => setEnglish(e.target.value)}
                    placeholder="Ex: Whiteboard"
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Traduction (FR)
                  </label>
                  <input
                    type="text"
                    required
                    value={french}
                    onChange={(e) => setFrench(e.target.value)}
                    placeholder="Ex: Tableau blanc"
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FlashcardCategory)}
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Nom">Nom (Vert)</option>
                    <option value="Verbe">Verbe (Bleu)</option>
                    <option value="Adjectif">Adjectif (Ambre)</option>
                    <option value="Expression">Expression (Violet)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Niveau CEM
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as LevelType)}
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="1AM">1AM</option>
                    <option value="2AM">2AM</option>
                    <option value="3AM">3AM</option>
                    <option value="4AM">4AM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Exemple en anglais (pour verso)
                </label>
                <input
                  type="text"
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  placeholder="Ex: Look at the whiteboard."
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Icône / Image locale
                  </label>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    className="text-[11px] font-medium text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{imageUrl ? 'Image chargée' : 'Importer image'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setEmoji(em);
                        setImageUrl('');
                      }}
                      className={`w-7 h-7 rounded text-sm flex items-center justify-center border ${
                        emoji === em && !imageUrl
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter à la planche</span>
              </button>
            </form>
          )}

          {inputMode === 'bulk' && (
            <div className="space-y-3">
              <label className="block text-[11px] text-slate-600">
                Format par ligne : <code className="font-mono-tabular">Anglais ; Français ; Catégorie</code>
              </label>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-2.5 text-xs font-mono-tabular border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleBulkImport}
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Importer les cartes
              </button>
            </div>
          )}

          {inputMode === 'ai' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Thème CEM Anglais
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ex: Daily routines, Food, Travel..."
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Niveau cible
                </label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value as LevelType)}
                  className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="1AM">1AM</option>
                  <option value="2AM">2AM</option>
                  <option value="3AM">3AM</option>
                  <option value="4AM">4AM</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateAiDeck}
                disabled={aiLoading}
                className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                <span>Générer {cardsPerPage} cartes par IA</span>
              </button>
              {aiError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                  {aiError}
                </div>
              )}
            </div>
          )}

          {inputMode === 'external' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-800">Cartes françaises-anglais · Accès ouvert</span>
                {isAdmin && onOpenAdminPanel && (
                  <button
                    type="button"
                    onClick={onOpenAdminPanel}
                    className="font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin · Accès Ouvert</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setExtSitePath('/fr/flashcards-en-anglais');
                    setExtWorkspaceMode('site');
                  }}
                  className={`h-8 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border ${
                    extWorkspaceMode === 'site'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Site Direct (Sans pub)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtWorkspaceMode('picker')}
                  className={`h-8 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border ${
                    extWorkspaceMode === 'picker'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                  <span>Choisir par thème</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={extSearch}
                    onChange={(e) => setExtSearch(e.target.value)}
                    placeholder="Rechercher thème (School, Food...)"
                    className="w-full h-9 pl-8 pr-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <select
                  value={extLevel}
                  onChange={(e) => setExtLevel(e.target.value as LevelType)}
                  className="h-9 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="1AM">1AM</option>
                  <option value="2AM">2AM</option>
                  <option value="3AM">3AM</option>
                  <option value="4AM">4AM</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extUseAi}
                  onChange={(e) => setExtUseAi(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded"
                />
                <span>Traduction FR &amp; exemples par IA (Admin / Abonné)</span>
              </label>

              {extInfo && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between gap-2">
                  <span>{extInfo}</span>
                  <button
                    type="button"
                    onClick={() => setExtWorkspaceMode('sheet')}
                    className="font-bold underline whitespace-nowrap"
                  >
                    Planche A4
                  </button>
                </div>
              )}

              {extError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center justify-between gap-2">
                  <span>{extError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setExtError(null);
                      setExtCatalogAttempt((n) => n + 1);
                    }}
                    className="font-bold underline whitespace-nowrap"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {extLoadingCatalog ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement des packs françaises-anglais...</span>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {externalPacks
                    .filter(
                      (p) =>
                        !extSearch.trim() ||
                        p.titleFr.toLowerCase().includes(extSearch.toLowerCase()) ||
                        p.titleEn.toLowerCase().includes(extSearch.toLowerCase())
                    )
                    .map((pack) => (
                      <div key={pack.path} className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          {pack.thumbUrl && (
                            <img
                              src={pack.thumbUrl}
                              alt={pack.titleEn}
                              className="w-10 h-8 object-cover rounded border border-slate-200 shrink-0 bg-slate-100"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {pack.titleEn}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {pack.titleFr} · {pack.count} cartes
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPackPicker(pack.path, pack.titleFr || pack.titleEn)}
                            className="h-7 px-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md whitespace-nowrap"
                          >
                            Choisir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImportExternalPack(pack.path)}
                            disabled={extImportingPath !== null}
                            className="h-7 px-2 disabled:opacity-60 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-md whitespace-nowrap flex items-center gap-1"
                          >
                            {extImportingPath === pack.path && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <span>Importer</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Print & Adhesive/Magnet Sheet Configuration */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Support A4 · Adhésif & Aimant
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGridMode('8')}
                className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  gridMode === '8'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <Grid2x2 className="w-3.5 h-3.5" />
                <span>8 cartes (2×4)</span>
              </button>
              <button
                type="button"
                onClick={() => setGridMode('9')}
                className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  gridMode === '9'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>9 cartes (3×3)</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-700">Mode d’impression</label>
              <button
                type="button"
                onClick={() => setPrintMode('single')}
                className={`w-full p-2.5 rounded-lg border text-left text-xs ${
                  printMode === 'single'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Recto simple (Adhésif / Aimant tableau)</span>
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Anglais géant + illustration + traduction discrète en bas.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('duplex')}
                className={`w-full p-2.5 rounded-lg border text-left text-xs ${
                  printMode === 'duplex'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Recto-Verso synchronisé (Double face)</span>
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Page 1 Anglais + Page 2 inversée horizontalement (Français).
                </div>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCutMarks}
                  onChange={(e) => setShowCutMarks(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>Repères de découpe & marge 5mm</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLevelBadge}
                  onChange={(e) => setShowLevelBadge(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>Pastille de niveau (1AM–4AM)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQrZone}
                  onChange={(e) => setShowQrZone(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Zone QR repère visuel</span>
              </label>
            </div>
          </div>

          {/* Active Card List Manager */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Cartes sur la planche ({cards.length})</span>
              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCards([])}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Tout vider
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {cards.map((c) => (
                <div key={c.id} className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
                  <div className="truncate">
                    <span className="mr-1.5">{c.emoji}</span>
                    <span className="font-semibold text-slate-900">{c.english}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className="text-slate-600">{c.french}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCards((prev) => prev.filter((item) => item.id !== c.id))}
                    className="text-slate-400 hover:text-rose-600 shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Workspace: Télécharger cartes françaises anglais (Admin only) / Teacher Request / A4 Print Sheet */}
        <section className="lg:col-span-8 space-y-4">
          {inputMode === 'external' && (
            <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExtWorkspaceMode('site')}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                    extWorkspaceMode === 'site'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>kids-flashcards.com Direct (Sans pub)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtWorkspaceMode('picker')}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                    extWorkspaceMode === 'picker'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                  <span>Choisir par thème</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtWorkspaceMode('sheet')}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                    extWorkspaceMode === 'sheet'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Planche A4 ({cards.length} cartes)</span>
                </button>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 px-2 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Accès Ouvert Sans Pub</span>
              </span>
            </div>
          )}

          {inputMode === 'external' && extWorkspaceMode === 'site' && (
            <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                <span>
                  Naviguez librement sur <strong>kids-flashcards.com</strong> (publicités &amp; Hercule IA bloqués). Cliquez sur <strong>Téléchargez le PDF</strong> ou sur une image pour votre planche A4.
                </span>
                <button
                  type="button"
                  onClick={() => setExtWorkspaceMode('sheet')}
                  className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap"
                >
                  Voir ma planche A4 ({cards.length})
                </button>
              </div>
              <iframe
                key={extSitePath}
                title="kids-flashcards.com sans publicités"
                src={`${getApiBase()}/api/flashcards/site-proxy?path=${encodeURIComponent(extSitePath)}`}
                className="w-full h-[760px] bg-white border-0"
              />
            </div>
          )}

          {inputMode === 'external' && extWorkspaceMode === 'picker' && (
            <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              {pickerLoading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Chargement des flashcards du thème...</span>
                </div>
              ) : pickerPack ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{pickerPack.title}</h2>
                      <p className="text-xs text-slate-500">
                        Cliquez sur les cartes à inclure ({pickerSelected.length}/{pickerPack.cards.length} sélectionnées)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPickerPack(null)}
                        className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                      >
                        ← Catégories
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtSitePath(pickerPack.path);
                          setExtWorkspaceMode('site');
                        }}
                        className="h-8 px-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Ouvrir page directe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPickerSelected(
                            pickerSelected.length === pickerPack.cards.length
                              ? []
                              : pickerPack.cards.map((c) => c.english)
                          )
                        }
                        className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                      >
                        {pickerSelected.length === pickerPack.cards.length ? 'Tout décocher' : 'Tout cocher'}
                      </button>
                      <button
                        type="button"
                        disabled={pickerSelected.length === 0 || extImportingPath !== null}
                        onClick={() => handleImportExternalPack(pickerPack.path, pickerSelected)}
                        className="h-8 px-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                      >
                        {extImportingPath === pickerPack.path && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Ajouter {pickerSelected.length} carte(s) à A4</span>
                      </button>
                    </div>
                  </div>

                  {pickerPack.pdfDownloads && pickerPack.pdfDownloads.length > 0 && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-950">
                        Téléchargement PDF original instantané :
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pickerPack.pdfDownloads.slice(0, 4).map((dl, idx) => {
                          const apiBase = getApiBase();
                          const storedPin =
                            typeof window !== 'undefined'
                              ? window.localStorage.getItem(ADMIN_PIN_STORAGE_KEY) || ''
                              : '';
                          const authQuery = adminToken
                            ? `&adminToken=${encodeURIComponent(adminToken)}`
                            : storedPin
                              ? `&pin=${encodeURIComponent(storedPin)}`
                              : '';
                          return (
                            <a
                              key={`${dl.url}-${idx}`}
                              href={`${apiBase}${dl.url}${authQuery}`}
                              download
                              className="h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg inline-flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{dl.format || dl.label}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[680px] overflow-y-auto pr-1">
                    {pickerPack.cards.map((card) => {
                      const isChecked = pickerSelected.includes(card.english);
                      return (
                        <button
                          key={card.english}
                          type="button"
                          onClick={() =>
                            setPickerSelected((prev) =>
                              prev.includes(card.english)
                                ? prev.filter((w) => w !== card.english)
                                : [...prev, card.english]
                            )
                          }
                          className={`relative p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                            isChecked
                              ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <img
                            src={card.imageUrl}
                            alt={card.english}
                            className="h-24 w-full object-contain rounded"
                          />
                          <span className="text-xs font-bold text-slate-900">{card.english}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Télécharger cartes françaises anglais · Catégories ({externalPacks.length})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Choisissez une catégorie pour voir et sélectionner ses images, ou importez le pack complet.
                      </p>
                    </div>
                  </div>
                  {extLoadingCatalog && externalPacks.length === 0 ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement des cartes françaises-anglais...</span>
                    </div>
                  ) : extError && externalPacks.length === 0 ? (
                    <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-3">
                      <p className="text-xs text-rose-700 font-medium">{extError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setExtError(null);
                          setExtCatalogAttempt((n) => n + 1);
                        }}
                        className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                      >
                        Réessayer le chargement
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[680px] overflow-y-auto pr-1">
                    {externalPacks
                      .filter(
                        (p) =>
                          !extSearch.trim() ||
                          p.titleFr.toLowerCase().includes(extSearch.toLowerCase()) ||
                          p.titleEn.toLowerCase().includes(extSearch.toLowerCase())
                      )
                      .map((pack) => (
                        <div
                          key={pack.path}
                          className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenPackPicker(pack.path, pack.titleFr || pack.titleEn)}
                            className="text-left group"
                          >
                            {pack.thumbUrl && (
                              <img
                                src={pack.thumbUrl}
                                alt={pack.titleEn}
                                className="w-full h-32 object-cover bg-slate-100 group-hover:opacity-95"
                              />
                            )}
                            <div className="p-2.5">
                              <div className="text-xs font-bold text-slate-900 truncate">{pack.titleEn}</div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {pack.titleFr} · {pack.count} cartes
                              </div>
                            </div>
                          </button>
                          <div className="px-2.5 pb-2.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPackPicker(pack.path, pack.titleFr || pack.titleEn)}
                              className="flex-1 h-8 border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-semibold rounded-lg"
                            >
                              Choisir cartes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleImportExternalPack(pack.path)}
                              disabled={extImportingPath !== null}
                              className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-semibold rounded-lg"
                            >
                              Tout importer
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                  )}
                </>
              )}
            </div>
          )}

          <div
            className={
              inputMode === 'external' && extWorkspaceMode !== 'sheet'
                ? 'hidden print:block space-y-4'
                : 'space-y-4'
            }
          >
          <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Format A4 (210 × 297 mm)</span>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <span>Zoom :</span>
                {[60, 80, 100].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoomPercent(z)}
                    className={`px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold ${
                      zoomPercent === z
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {z}%
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!hasProOrAdmin) {
                  onOpenActivationModal();
                  return;
                }
                window.print();
              }}
              className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
            >
              {!hasProOrAdmin ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>
                {hasProOrAdmin
                  ? 'Imprimer / Exporter PDF A4'
                  : 'Débloquer PDF A4 (CCP)'}
              </span>
            </button>
          </div>

          <div className="flashcard-print-area space-y-6 flex flex-col items-center">
            {pages.map((pageCards, pageIdx) => {
              const padded: (FlashcardItem | null)[] = [...pageCards];
              while (padded.length < cardsPerPage) padded.push(null);

              const duplexBackCards =
                printMode === 'duplex' ? reverseRowsForDuplex(padded, cols) : [];

              return (
                <React.Fragment key={`page-${pageIdx}`}>
                  {/* Recto Page */}
                  <div
                    style={{
                      width: '210mm',
                      height: '297mm',
                      padding: '5mm',
                      transform: `scale(${zoomPercent / 100})`,
                      transformOrigin: 'top center',
                      marginBottom: zoomPercent < 100 ? `${(zoomPercent / 100 - 1) * 297}mm` : undefined,
                    }}
                    className="flashcard-a4-page bg-white border border-slate-300 shadow-sm box-border"
                  >
                    <div
                      className={`h-full w-full grid gap-2 ${
                        cols === 2 ? 'grid-cols-2 grid-rows-4' : 'grid-cols-3 grid-rows-3'
                      }`}
                    >
                      {padded.map((card, idx) =>
                        renderCard(card, 'front', `front-${pageIdx}-${idx}`)
                      )}
                    </div>
                  </div>

                  {/* Verso Synchronized Page (horizontally mirrored per row) */}
                  {printMode === 'duplex' && (
                    <div
                      style={{
                        width: '210mm',
                        height: '297mm',
                        padding: '5mm',
                        transform: `scale(${zoomPercent / 100})`,
                        transformOrigin: 'top center',
                        marginBottom: zoomPercent < 100 ? `${(zoomPercent / 100 - 1) * 297}mm` : undefined,
                      }}
                      className="flashcard-a4-page bg-white border border-slate-300 shadow-sm box-border"
                    >
                      <div
                        className={`h-full w-full grid gap-2 ${
                          cols === 2 ? 'grid-cols-2 grid-rows-4' : 'grid-cols-3 grid-rows-3'
                        }`}
                      >
                        {duplexBackCards.map((card, idx) =>
                          renderCard(card, 'back', `back-${pageIdx}-${idx}`)
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          </div>
        </section>
      </div>
    </div>
  );
};
