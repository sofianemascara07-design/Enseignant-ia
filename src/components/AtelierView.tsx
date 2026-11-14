import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  PenTool,
  Printer,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ALGERIAN_CEM_CURRICULUM,
  buildSubjectStarterContent,
  CURATED_ILLUSTRATIONS,
  LEVELS,
  SUBJECTS,
  SUBJECT_META,
} from '../data/algerianCurriculum';
import {
  Correspondent,
  DocType,
  HandwritingMode,
  InkColor,
  LanguageType,
  LevelType,
  PaperStyle,
  SubjectType,
  TrimesterType,
} from '../types';
import { exportToWordDocx, triggerPrintPdf } from '../utils/exportUtils';
import { DocumentSheet, SheetHeaderConfig } from './DocumentSheet';

export interface ActiveDraft {
  id?: string;
  title: string;
  docType: DocType;
  subject: SubjectType;
  level: LevelType;
  language: LanguageType;
  trimester: TrimesterType;
  handwritingMode: HandwritingMode;
  paperStyle: PaperStyle;
  inkColor: InkColor;
  contentMarkdown: string;
  svgDiagram: string;
  attachedImageUrl: string;
  priceDzd: number;
  isPaidTemplate: boolean;
}

interface AtelierViewProps {
  draft: ActiveDraft;
  onUpdateDraft: (updater: (prev: ActiveDraft) => ActiveDraft) => void;
  schoolName: string;
  onChangeSchoolName: (val: string) => void;
  headerConfig: SheetHeaderConfig;
  onChangeHeaderConfig: (updater: (prev: SheetHeaderConfig) => SheetHeaderConfig) => void;
  teacherName: string;
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
  onSaveDocument: (draft: ActiveDraft) => Promise<void>;
  correspondents: Correspondent[];
  onCreatePaidShare: (params: {
    correspondentId: string;
    documentTitle: string;
    documentId?: string;
    amountDzd: number;
  }) => Promise<void>;
  licenseCode: string | null;
  licensePlan: string | null;
  isLicensed: boolean;
  trialsUsed: number;
  maxTrials: number;
  onIncrementTrial: () => void;
  onOpenActivationModal: () => void;
}

export const AtelierView: React.FC<AtelierViewProps> = ({
  draft,
  onUpdateDraft,
  schoolName,
  onChangeSchoolName,
  headerConfig,
  onChangeHeaderConfig,
  teacherName,
  isAuthenticated,
  onRequestSignIn,
  onSaveDocument,
  correspondents,
  onCreatePaidShare,
  licenseCode,
  licensePlan,
  isLicensed,
  trialsUsed,
  maxTrials,
  onIncrementTrial,
  onOpenActivationModal,
}) => {
  const topics = ALGERIAN_CEM_CURRICULUM[draft.subject][draft.level] || [];
  const [selectedTopic, setSelectedTopic] = useState<string>(topics[0]?.title || '');
  const [customInstructions, setCustomInstructions] = useState('');
  const [includeCorrection, setIncludeCorrection] = useState(true);
  const [includeDiagram, setIncludeDiagram] = useState(true);
  const [diagramPrompt, setDiagramPrompt] = useState('');

  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasGeneratedCustomContent, setHasGeneratedCustomContent] = useState(Boolean(draft.id));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCorrespondentId, setShareCorrespondentId] = useState('');
  const [sharePriceDzd, setSharePriceDzd] = useState(draft.priceDzd || 300);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const validTopic = ALGERIAN_CEM_CURRICULUM[draft.subject][draft.level]?.[0];
    setSelectedTopic((curr) => {
      const stillExists = ALGERIAN_CEM_CURRICULUM[draft.subject][draft.level]?.some(
        (t) => t.title === curr
      );
      return stillExists ? curr : validTopic?.title || '';
    });
  }, [draft.subject, draft.level]);

  const applyStarterIfNeeded = (
    nextSubject: SubjectType,
    nextLevel: LevelType,
    nextDocType: DocType,
    nextLang: LanguageType,
    nextTrimester: TrimesterType,
    topicTitle: string,
    forceReplace: boolean
  ) => {
    const starter = buildSubjectStarterContent({
      subject: nextSubject,
      level: nextLevel,
      docType: nextDocType,
      language: nextLang,
      topicTitle: topicTitle || `${nextSubject} ${nextLevel}`,
    });
    onUpdateDraft((prev) => ({
      ...prev,
      id: forceReplace ? undefined : prev.id,
      subject: nextSubject,
      level: nextLevel,
      docType: nextDocType,
      language: nextLang,
      trimester: nextTrimester,
      ...(forceReplace || !hasGeneratedCustomContent
        ? {
            title: starter.title,
            contentMarkdown: starter.contentMarkdown,
            svgDiagram: starter.svgDiagram,
          }
        : {}),
    }));
  };

  const handleSubjectChange = (newSubject: SubjectType) => {
    const firstTopic = ALGERIAN_CEM_CURRICULUM[newSubject][draft.level]?.[0];
    const nextTopicTitle = firstTopic?.title || `${newSubject} ${draft.level}`;
    const nextLang = SUBJECT_META[newSubject].defaultLang;
    setSelectedTopic(nextTopicTitle);
    setHasGeneratedCustomContent(false);
    setErrorMsg(null);
    onChangeHeaderConfig((prev) => ({
      ...prev,
      closingPhrase:
        nextLang === 'ar'
          ? 'انتهى — بالتوفيق'
          : nextLang === 'en'
            ? 'End of Paper — Good Luck'
            : 'Fin du sujet — Bon courage',
    }));
    applyStarterIfNeeded(
      newSubject,
      draft.level,
      draft.docType,
      nextLang,
      firstTopic?.trimester || draft.trimester,
      nextTopicTitle,
      true
    );
  };

  const handleLevelChange = (newLevel: LevelType) => {
    const firstTopic = ALGERIAN_CEM_CURRICULUM[draft.subject][newLevel]?.[0];
    const nextTopicTitle = firstTopic?.title || `${draft.subject} ${newLevel}`;
    setSelectedTopic(nextTopicTitle);
    setErrorMsg(null);
    applyStarterIfNeeded(
      draft.subject,
      newLevel,
      draft.docType,
      draft.language,
      firstTopic?.trimester || draft.trimester,
      nextTopicTitle,
      false
    );
  };

  const parseApiResponse = async (res: Response) => {
    const raw = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      throw new Error(
        res.ok
          ? 'Réponse serveur inattendue.'
          : `Erreur serveur (${res.status}). Veuillez réessayer.`
      );
    }
    if (!res.ok) {
      if (res.status === 402 || data.locked) {
        onOpenActivationModal();
      }
      throw new Error(String(data.error || `Erreur serveur (${res.status}).`));
    }
    return data;
  };

  const handleGenerateDocument = async () => {
    if (!isLicensed && trialsUsed >= maxTrials) {
      onOpenActivationModal();
      return;
    }

    setErrorMsg(null);
    setIsGeneratingDoc(true);
    try {
      const topicToUse = selectedTopic.trim() || `${draft.subject} ${draft.level}`;
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/ai/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(licenseCode ? { 'X-Activation-Code': licenseCode } : {}),
          'X-Trial-Count': String(trialsUsed),
        },
        body: JSON.stringify({
          subject: draft.subject,
          level: draft.level,
          docType: draft.docType,
          language: draft.language,
          trimester: draft.trimester,
          topic: topicToUse,
          customInstructions,
          includeCorrection,
          includeDiagram,
          durationMinutes: headerConfig.durationMinutes,
          answerSpaceMode: headerConfig.answerSpaceMode,
        }),
      });
      const data = await parseApiResponse(res);
      onUpdateDraft((prev) => ({
        ...prev,
        title: String(data.title || topicToUse),
        contentMarkdown: String(data.contentMarkdown || prev.contentMarkdown),
        svgDiagram: String(data.svgDiagram || ''),
      }));
      if (!isLicensed) {
        onIncrementTrial();
      }
      setHasGeneratedCustomContent(true);
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la génération.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateDiagram = async () => {
    if (!isLicensed && trialsUsed >= maxTrials) {
      onOpenActivationModal();
      return;
    }
    const desc = diagramPrompt.trim() || selectedTopic || draft.title;
    if (!desc) return;
    setErrorMsg(null);
    setIsGeneratingDiagram(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/ai/generate-diagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(licenseCode ? { 'X-Activation-Code': licenseCode } : {}),
          'X-Trial-Count': String(trialsUsed),
        },
        body: JSON.stringify({
          subject: draft.subject,
          level: draft.level,
          language: draft.language,
          description: desc,
        }),
      });
      const data = await parseApiResponse(res);
      onUpdateDraft((prev) => ({
        ...prev,
        svgDiagram: String(data.svg || ''),
      }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la création du schéma.');
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateDraft((prev) => ({ ...prev, attachedImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadWord = async () => {
    if (!isLicensed) {
      onOpenActivationModal();
      return;
    }
    setIsExportingWord(true);
    setErrorMsg(null);
    try {
      await exportToWordDocx({
        title: draft.title,
        subject: draft.subject,
        level: draft.level,
        language: draft.language,
        docType: draft.docType,
        trimester: draft.trimester,
        schoolName,
        teacherName,
        contentMarkdown: draft.contentMarkdown,
        svgDiagram: draft.svgDiagram,
        attachedImageUrl: draft.attachedImageUrl,
        handwritingMode: draft.handwritingMode,
        headerConfig,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur export Word.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handlePrintPdf = () => {
    if (!isLicensed) {
      onOpenActivationModal();
      return;
    }
    triggerPrintPdf();
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      onRequestSignIn();
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveDocument(draft);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible d’enregistrer le document.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenShare = () => {
    if (!isAuthenticated) {
      onRequestSignIn();
      return;
    }
    setSharePriceDzd(draft.priceDzd || 300);
    setShareCorrespondentId(correspondents[0]?.id || '');
    setShareDone(false);
    setShowShareModal(true);
  };

  const handleConfirmShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCorrespondentId) return;
    setIsSharing(true);
    setErrorMsg(null);
    try {
      await onCreatePaidShare({
        correspondentId: shareCorrespondentId,
        documentTitle: draft.title,
        documentId: draft.id,
        amountDzd: Number(sharePriceDzd) || 0,
      });
      setShareDone(true);
      setTimeout(() => {
        setShowShareModal(false);
        setShareDone(false);
      }, 1400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du partage facturé.');
    } finally {
      setIsSharing(false);
    }
  };

  const trialsRemaining = Math.max(0, maxTrials - trialsUsed);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pedagogical Control Panel */}
        <aside className="no-print lg:col-span-4 space-y-5 bg-white border border-slate-200 rounded-xl p-5">
          {/* License / Trial Banner */}
          <div className={`p-3.5 rounded-lg border text-xs ${isLicensed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200 text-amber-950'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold flex items-center gap-1.5">
                {isLicensed ? <KeyRound className="w-3.5 h-3.5 text-emerald-700" /> : <Lock className="w-3.5 h-3.5 text-amber-700" />}
                <span>{isLicensed ? `Licence Pro active (${licensePlan || 'PRO'})` : `Mode Découverte : ${trialsRemaining}/${maxTrials} essais IA`}</span>
              </div>
              <button
                type="button"
                onClick={onOpenActivationModal}
                className="font-semibold underline hover:opacity-80 whitespace-nowrap"
              >
                {isLicensed ? 'Détails' : 'Activer CCP'}
              </button>
            </div>
            {!isLicensed && (
              <p className="mt-1 text-[11px] opacity-85">
                L’export Word (.docx), l’impression PDF et la génération illimitée requièrent un code d’activation via CCP / WhatsApp 05 57 76 78 04.
              </p>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900">01. Paramètres du programme CEM</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Curriculum officiel algérien (2e génération · 1AM à 4AM)
            </p>
          </div>

          {/* Level Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Niveau (Moyen)</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleLevelChange(lvl)}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    draft.level === lvl
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Matière</label>
              <select
                value={draft.subject}
                onChange={(e) => handleSubjectChange(e.target.value as SubjectType)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Langue de rédaction</label>
              <select
                value={draft.language}
                onChange={(e) => {
                  const nextLang = e.target.value as LanguageType;
                  applyStarterIfNeeded(
                    draft.subject,
                    draft.level,
                    draft.docType,
                    nextLang,
                    draft.trimester,
                    selectedTopic,
                    false
                  );
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="fr">Français</option>
                <option value="ar">Arabe (العربية)</option>
                <option value="en">Anglais (English)</option>
              </select>
            </div>
          </div>

          {/* Document Type & Trimester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Type de support</label>
              <select
                value={draft.docType}
                onChange={(e) => {
                  const nextDocType = e.target.value as DocType;
                  applyStarterIfNeeded(
                    draft.subject,
                    draft.level,
                    nextDocType,
                    draft.language,
                    draft.trimester,
                    selectedTopic,
                    false
                  );
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="cours">Cours complet</option>
                <option value="fiche">Fiche pédagogique</option>
                <option value="examen">Sujet d’examen (/20)</option>
                <option value="devoir">Devoir surveillé (/20)</option>
                <option value="exercice">Série d’exercices</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Trimestre / BEM</label>
              <select
                value={draft.trimester}
                onChange={(e) =>
                  onUpdateDraft((prev) => ({ ...prev, trimester: e.target.value as TrimesterType }))
                }
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="T1">1er Trimestre</option>
                <option value="T2">2e Trimestre</option>
                <option value="T3">3e Trimestre</option>
                <option value="BEM">Préparation BEM (4AM)</option>
              </select>
            </div>
          </div>

          {/* Official Curriculum Topic Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Chapitre du programme officiel
            </label>
            <select
              value={topics.some((t) => t.title === selectedTopic) ? selectedTopic : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  setSelectedTopic(e.target.value);
                  const found = topics.find((t) => t.title === e.target.value);
                  if (found) {
                    onUpdateDraft((prev) => ({ ...prev, trimester: found.trimester }));
                  }
                }
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 mb-2"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.title}>
                  {t.trimester} · {t.title}
                </option>
              ))}
              <option value="__custom__">Sujet personnalisé...</option>
            </select>
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="Intitulé précis du cours ou de l’examen"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Official Header Fields (الترويسة) */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              الترويسة الرسمية · En-tête CEM
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Direction (مديرية التربية)</label>
                <input
                  type="text"
                  value={headerConfig.wilayaDirectorate}
                  onChange={(e) =>
                    onChangeHeaderConfig((p) => ({ ...p, wilayaDirectorate: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Année scolaire</label>
                <input
                  type="text"
                  value={headerConfig.schoolYear}
                  onChange={(e) =>
                    onChangeHeaderConfig((p) => ({ ...p, schoolYear: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 text-xs font-mono-tabular bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-600 mb-1">Établissement (المؤسسة)</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => onChangeSchoolName(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Durée (min)</label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={headerConfig.durationMinutes}
                  onChange={(e) =>
                    onChangeHeaderConfig((p) => ({
                      ...p,
                      durationMinutes: Number(e.target.value) || 60,
                    }))
                  }
                  className="w-full h-9 px-2.5 text-xs font-mono-tabular bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Paper Options (خيارات الورقة) */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              خيارات الورقة · Options de la feuille
            </h3>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.showStudentBox}
                onChange={(e) =>
                  onChangeHeaderConfig((p) => ({ ...p, showStudentBox: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Case Nom, Prénom & Classe (خانة الاسم واللقب)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCorrection}
                onChange={(e) => setIncludeCorrection(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Inclure Corrigé type & Barème (/20)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.separateCorrectionPage}
                onChange={(e) =>
                  onChangeHeaderConfig((p) => ({ ...p, separateCorrectionPage: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Page séparée pour le Corrigé (صفحة التصحيح النموذجي)</span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.answerSpaceMode}
                onChange={(e) =>
                  onChangeHeaderConfig((p) => ({ ...p, answerSpaceMode: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5"
              />
              <div>
                <div className="font-semibold">Feuille Questions & Réponses (ورقة أسئلة وإجابة)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Ajoute des lignes pointillées sous chaque question pour répondre sur la feuille.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDiagram}
                onChange={(e) => setIncludeDiagram(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Générer un schéma vectoriel intégré</span>
            </label>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                Formule de clôture (عبارة الختام)
              </label>
              <input
                type="text"
                value={headerConfig.closingPhrase}
                onChange={(e) =>
                  onChangeHeaderConfig((p) => ({ ...p, closingPhrase: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Consignes spécifiques (optionnel)
            </label>
            <textarea
              rows={2}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: QCM à cocher, tableau de données, niveau BEM..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateDocument}
            disabled={isGeneratingDoc}
            className="w-full h-11 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isGeneratingDoc ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rédaction IA en cours...</span>
              </>
            ) : !isLicensed && trialsUsed >= maxTrials ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Débloquer IA Pro (CCP / WhatsApp)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Générer avec l’Enseignant IA</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Handwriting & Paper Style Studio */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-600" />
              <span>02. Écriture à la main & Papier</span>
            </h3>

            <div>
              <label className="block text-xs text-slate-600 mb-1.5">
                Style d’écriture ({draft.language.toUpperCase()})
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => onUpdateDraft((p) => ({ ...p, handwritingMode: 'standard' }))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    draft.handwritingMode === 'standard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Imprimé
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDraft((p) => ({ ...p, handwritingMode: 'handwriting_print' }))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    draft.handwritingMode === 'handwriting_print'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Script main
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDraft((p) => ({ ...p, handwritingMode: 'handwriting_cursive' }))}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    draft.handwritingMode === 'handwriting_cursive'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cursive
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Fond de page</label>
                <select
                  value={draft.paperStyle}
                  onChange={(e) =>
                    onUpdateDraft((p) => ({ ...p, paperStyle: e.target.value as PaperStyle }))
                  }
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="white">Feuille blanche A4</option>
                  <option value="seyes">Cahier Seyès (carreaux)</option>
                  <option value="lined">Feuille lignée</option>
                  <option value="grid">Papier quadrillé Math</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Couleur d’encre</label>
                <select
                  value={draft.inkColor}
                  onChange={(e) =>
                    onUpdateDraft((p) => ({ ...p, inkColor: e.target.value as InkColor }))
                  }
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="black">Noir classique</option>
                  <option value="navy">Stylo bleu scolaire</option>
                  <option value="emerald">Encre verte correction</option>
                </select>
              </div>
            </div>
          </div>

          {/* Images, Photos & AI Vector Diagram */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-600" />
              <span>03. Images, Photos & Schémas</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={diagramPrompt}
                onChange={(e) => setDiagramPrompt(e.target.value)}
                placeholder="Décrire un schéma (triangle Thalès, carte, circuit...)"
                className="flex-1 h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={handleGenerateDiagram}
                disabled={isGeneratingDiagram}
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-medium rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                {isGeneratingDiagram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Schéma IA</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer photo</span>
              </button>

              {CURATED_ILLUSTRATIONS.slice(0, 2).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    onUpdateDraft((p) => ({ ...p, attachedImageUrl: asset.imagePath }))
                  }
                  className="h-9 px-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-lg truncate max-w-[140px]"
                  title={asset.title}
                >
                  + {asset.subject}
                </button>
              ))}

              {(draft.svgDiagram || draft.attachedImageUrl) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDraft((p) => ({ ...p, svgDiagram: '', attachedImageUrl: '' }))
                  }
                  className="h-9 px-2.5 text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Retirer visuel</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Right A4 Document Toolbar & Live Sheet */}
        <section className="lg:col-span-8 space-y-4">
          {errorMsg && (
            <div className="no-print p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}
          <div className="no-print bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{draft.level}</span>
              <span aria-hidden="true">·</span>
              <span>{draft.subject}</span>
              <span aria-hidden="true">·</span>
              <span>{draft.language.toUpperCase()}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing((v) => !v)}
                className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditing ? 'Aperçu A4' : 'Éditer texte'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                {!isLicensed ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Printer className="w-3.5 h-3.5" />}
                <span>Imprimer / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={isExportingWord}
                className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                {isExportingWord ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : !isLicensed ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                {saveSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saveSuccess ? 'Enregistré' : 'Enregistrer'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenShare}
                className="h-9 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Facturer & Partager</span>
              </button>
            </div>
          </div>

          <DocumentSheet
            title={draft.title}
            docType={draft.docType}
            subject={draft.subject}
            level={draft.level}
            language={draft.language}
            trimester={draft.trimester}
            handwritingMode={draft.handwritingMode}
            paperStyle={draft.paperStyle}
            inkColor={draft.inkColor}
            contentMarkdown={draft.contentMarkdown}
            svgDiagram={draft.svgDiagram}
            attachedImageUrl={draft.attachedImageUrl}
            schoolName={schoolName}
            teacherName={teacherName}
            headerConfig={headerConfig}
            isEditing={isEditing}
            onChangeTitle={(title) => onUpdateDraft((p) => ({ ...p, title }))}
            onChangeMarkdown={(contentMarkdown) =>
              onUpdateDraft((p) => ({ ...p, contentMarkdown }))
            }
          />
        </section>
      </div>

      {/* Paid Share Modal */}
      {showShareModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Partage payant avec un correspondant</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            {correspondents.length === 0 ? (
              <p className="text-sm text-slate-600">
                Ajoutez d’abord un correspondant dans l’onglet <strong>Correspondants</strong> pour lui émettre une facture ou un pack payant.
              </p>
            ) : (
              <form onSubmit={handleConfirmShare} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Document</label>
                  <p className="text-sm font-medium text-slate-900 truncate">{draft.title}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correspondant destinataire
                  </label>
                  <select
                    value={shareCorrespondentId}
                    onChange={(e) => setShareCorrespondentId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {correspondents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.roleType} · {c.levelFocus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Montant à facturer (DZD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={50}
                    value={sharePriceDzd}
                    onChange={(e) => setSharePriceDzd(Number(e.target.value))}
                    className="w-full h-10 px-3 text-sm font-mono-tabular border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSharing}
                    className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    {shareDone ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Facture créée</span>
                      </>
                    ) : isSharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Créer la facture DZD</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
