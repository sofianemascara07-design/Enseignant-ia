import React from 'react';
import { SUBJECT_META } from '../data/algerianCurriculum';
import {
  DocType,
  HandwritingMode,
  InkColor,
  LanguageType,
  LevelType,
  PaperStyle,
  SubjectType,
  TrimesterType,
} from '../types';

export interface SheetHeaderConfig {
  wilayaDirectorate: string;
  schoolYear: string;
  durationMinutes: number;
  showStudentBox: boolean;
  separateCorrectionPage: boolean;
  answerSpaceMode: boolean;
  closingPhrase: string;
}

interface DocumentSheetProps {
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
  svgDiagram?: string;
  attachedImageUrl?: string;
  schoolName?: string;
  teacherName?: string;
  headerConfig?: SheetHeaderConfig;
  isEditing: boolean;
  onChangeTitle: (val: string) => void;
  onChangeMarkdown: (val: string) => void;
}

const LEVEL_LABELS: Record<LevelType, { ar: string; fr: string; en: string }> = {
  '1AM': { ar: 'السنة الأولى متوسط', fr: '1ère Année Moyenne (1AM)', en: '1st Year Middle School (1MS)' },
  '2AM': { ar: 'السنة الثانية متوسط', fr: '2ème Année Moyenne (2AM)', en: '2nd Year Middle School (2MS)' },
  '3AM': { ar: 'السنة الثالثة متوسط', fr: '3ème Année Moyenne (3AM)', en: '3rd Year Middle School (3MS)' },
  '4AM': { ar: 'السنة الرابعة متوسط', fr: '4ème Année Moyenne (4AM · BEM)', en: '4th Year Middle School (4MS · BEM)' },
};

function formatDurationLabel(minutes: number, language: LanguageType): string {
  const m = Math.max(15, Number(minutes) || 60);
  if (language === 'ar') {
    if (m === 60) return 'ساعة واحدة';
    if (m === 90) return 'ساعة ونصف';
    if (m === 120) return 'ساعتان';
    if (m === 45) return '45 دقيقة';
    return `${m} دقيقة`;
  }
  if (language === 'en') {
    if (m === 60) return '1 hour';
    if (m === 90) return '1h 30min';
    if (m === 120) return '2 hours';
    return `${m} min`;
  }
  if (m === 60) return '1 heure';
  if (m === 90) return '1h 30';
  if (m === 120) return '2 heures';
  return `${m} min`;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const normalized = text.replace(/&nbsp;/gi, ' ');
  const parts = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded bg-slate-100/80 font-mono-tabular text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function MarkdownDocumentBody({ markdown, isHandwriting }: { markdown: string; isHandwriting: boolean }) {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Markdown table
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableRows: string[][] = [];
      let hasHeader = false;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tl = lines[i].trim();
        if (/^\|[\s\-:|]+\|$/.test(tl)) {
          hasHeader = true;
        } else {
          tableRows.push(
            tl
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim())
          );
        }
        i++;
      }

      if (tableRows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="my-3.5 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-700 text-[0.92em]">
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 && hasHeader ? 'bg-slate-100 font-bold' : ''}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border border-slate-700 px-3 py-1.5 align-top">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className={`mt-4 mb-1.5 font-bold ${isHandwriting ? 'text-xl underline decoration-1 underline-offset-4' : 'text-base'}`}
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className={`mt-5 mb-2 font-bold border-b border-slate-800/30 pb-1 ${isHandwriting ? 'text-2xl' : 'text-[17px]'}`}
        >
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className={`mt-4 mb-2 font-bold ${isHandwriting ? 'text-3xl' : 'text-xl'}`}>
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 my-1 ps-3">
          <span aria-hidden="true" className="mt-0.5 select-none">
            •
          </span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const match = line.match(/^(\d+\.)\s+(.*)$/);
      elements.push(
        <div key={`ol-${i}`} className="flex items-start gap-2 my-1 ps-2">
          <span className="font-bold tabular-nums shrink-0">{match?.[1]}</span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(match?.[2] ?? line)}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-400" />);
    } else if (/^\.{10,}$/.test(line)) {
      elements.push(
        <div
          key={`dots-${i}`}
          className="my-2.5 border-b border-dotted border-slate-500 h-4 w-full"
          aria-hidden="true"
        />
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
    i++;
  }

  return <>{elements}</>;
}

export const DocumentSheet: React.FC<DocumentSheetProps> = ({
  title,
  docType,
  subject,
  level,
  language,
  trimester,
  handwritingMode,
  paperStyle,
  inkColor,
  contentMarkdown,
  svgDiagram,
  attachedImageUrl,
  schoolName,
  teacherName,
  headerConfig,
  isEditing,
  onChangeTitle,
  onChangeMarkdown,
}) => {
  const isRtl = language === 'ar';
  const isHandwriting = handwritingMode !== 'standard';

  const cfg: SheetHeaderConfig = {
    wilayaDirectorate: headerConfig?.wilayaDirectorate || (isRtl ? 'الجزائر شرق' : 'Alger Est'),
    schoolYear: headerConfig?.schoolYear || '2026/2027',
    durationMinutes: headerConfig?.durationMinutes || (docType === 'examen' ? 120 : 60),
    showStudentBox: headerConfig?.showStudentBox ?? (docType === 'examen' || docType === 'devoir'),
    separateCorrectionPage: headerConfig?.separateCorrectionPage ?? true,
    answerSpaceMode: headerConfig?.answerSpaceMode ?? false,
    closingPhrase:
      headerConfig?.closingPhrase ||
      (isRtl ? 'انتهى — بالتوفيق' : language === 'en' ? 'End of Paper — Good Luck' : 'Fin du sujet — Bon courage'),
  };

  const fontClass = (() => {
    if (language === 'ar') {
      if (handwritingMode === 'handwriting_cursive' || handwritingMode === 'handwriting_print') {
        return 'font-handwriting-arabic text-[18px]';
      }
      return 'font-arabic text-[14.5px]';
    }
    if (handwritingMode === 'handwriting_cursive') {
      return 'font-handwriting-cursive text-[21px] leading-[32px]';
    }
    if (handwritingMode === 'handwriting_print') {
      return 'font-handwriting-latin text-[18px] leading-[30px]';
    }
    return 'text-[14px] leading-relaxed';
  })();

  const paperClass =
    paperStyle === 'seyes'
      ? 'paper-seyes'
      : paperStyle === 'lined'
        ? 'paper-lined'
        : paperStyle === 'grid'
          ? 'paper-grid'
          : 'bg-white';

  const inkClass =
    inkColor === 'navy'
      ? 'text-[#1E3A8A]'
      : inkColor === 'emerald'
        ? 'text-[#14532D]'
        : 'text-slate-900';

  const localizedSubject =
    language === 'ar'
      ? SUBJECT_META[subject].labelAr
      : language === 'en'
        ? SUBJECT_META[subject].labelEn
        : subject;

  const durationText = formatDurationLabel(cfg.durationMinutes, language);
  const levelLabel = LEVEL_LABELS[level][language];

  const [mainContent, correctionContent] = contentMarkdown.includes('[[CORRECTION_PAGE]]')
    ? contentMarkdown.split('[[CORRECTION_PAGE]]')
    : [contentMarkdown, ''];

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`print-sheet mx-auto w-full max-w-[820px] min-h-[1040px] border border-slate-300 shadow-sm rounded-sm px-8 py-9 sm:px-12 sm:py-10 transition-colors ${paperClass} ${inkClass} ${fontClass}`}
    >
      {/* Official Algerian Middle School 2-Column Header (Matching Reference Screenshots) */}
      <header className="mb-5 font-arabic">
        <div className="text-center space-y-0.5 mb-3">
          <div className="text-[13px] font-bold">
            {language === 'ar'
              ? 'الجمهورية الجزائرية الديمقراطية الشعبية'
              : language === 'en'
                ? "People's Democratic Republic of Algeria"
                : 'République Algérienne Démocratique et Populaire'}
          </div>
          <div className="text-[12.5px] font-bold">
            {language === 'ar'
              ? 'وزارة التربية الوطنية'
              : language === 'en'
                ? 'Ministry of National Education'
                : 'Ministère de l’Éducation Nationale'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12px] leading-snug mb-2">
          <div className="space-y-0.5">
            <div>
              {language === 'ar'
                ? `مديرية التربية لولاية: ${cfg.wilayaDirectorate}`
                : `Direction de l’Éducation : ${cfg.wilayaDirectorate}`}
            </div>
            <div>
              {language === 'ar'
                ? `المؤسسة: ${schoolName || 'متوسطة الخوارزمي'}`
                : `Établissement : ${schoolName || 'CEM El-Khawarizmi'}`}
            </div>
          </div>

          <div className={`space-y-0.5 ${isRtl ? 'text-left' : 'text-right'}`}>
            <div>
              {language === 'ar'
                ? `السنة الدراسية: ${cfg.schoolYear}`
                : language === 'en'
                  ? `Academic Year: ${cfg.schoolYear}`
                  : `Année scolaire : ${cfg.schoolYear}`}
            </div>
            <div>
              {language === 'ar' ? `المستوى: ${levelLabel}` : language === 'en' ? `Level: ${levelLabel}` : `Niveau : ${levelLabel}`}
            </div>
          </div>
        </div>

        <div className={`text-[11.5px] mb-1.5 ${isRtl ? 'text-left' : 'text-right'}`}>
          {language === 'ar' ? `المدة: ${durationText}` : language === 'en' ? `Duration: ${durationText}` : `Durée : ${durationText}`}
        </div>

        {/* Framed Title Banner */}
        {!isEditing && (
          <div className="border-y-2 border-slate-900 py-2 px-4 text-center my-2 bg-slate-50/40">
            <h1 className={`font-bold ${isHandwriting ? 'text-2xl' : 'text-[18px]'}`}>{title}</h1>
          </div>
        )}

        {/* 3-Cell Student Box */}
        {cfg.showStudentBox && (
          <table className="w-full border-collapse border border-slate-800 text-[12px] mt-2.5 mb-4">
            <tbody>
              <tr>
                <td className="border border-slate-800 px-3 py-2 w-[55%]">
                  {language === 'ar'
                    ? 'الاسم واللقب: ................................................'
                    : language === 'en'
                      ? 'Full Name: ........................................'
                      : 'Nom & Prénom : ........................................'}
                </td>
                <td className="border border-slate-800 px-3 py-2 w-[23%]">
                  {language === 'ar' ? 'القسم: ................' : language === 'en' ? 'Class: ............' : 'Classe : ............'}
                </td>
                <td className="border border-slate-800 px-3 py-2 w-[22%] font-bold text-center">
                  {language === 'ar' ? 'العلامة: ....... / 20' : language === 'en' ? 'Mark: ...... / 20' : 'Note : ...... / 20'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </header>

      {/* Body or Direct Markdown Editor */}
      {isEditing ? (
        <div className="space-y-4 no-print">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Titre du document
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white/90 text-slate-900 text-lg font-bold font-sans focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Contenu Markdown (utilisez [[CORRECTION_PAGE]] pour séparer le corrigé)
            </label>
            <textarea
              value={contentMarkdown}
              onChange={(e) => onChangeMarkdown(e.target.value)}
              rows={24}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white/95 text-slate-900 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <MarkdownDocumentBody markdown={mainContent.trim()} isHandwriting={isHandwriting} />
          </div>

          {/* Embedded Vector Diagram (SVG) */}
          {svgDiagram && svgDiagram.includes('<svg') && (
            <figure className="my-5 p-3 bg-white border border-slate-300/80 rounded-md flex flex-col items-center">
              <div
                className="w-full max-w-[560px] overflow-hidden flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgDiagram }}
              />
              <figcaption className="mt-1.5 text-xs text-slate-500 font-sans">
                {language === 'ar' ? 'وثيقة / شكل توضيحي' : language === 'en' ? 'Pedagogical Diagram' : 'Schéma pédagogique'}
              </figcaption>
            </figure>
          )}

          {/* Attached Photo or Curated Illustration */}
          {attachedImageUrl && (
            <figure className="my-5 p-3 bg-white border border-slate-300/80 rounded-md flex flex-col items-center">
              <img
                src={attachedImageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-[320px] w-auto object-contain rounded-sm"
              />
              <figcaption className="mt-1.5 text-xs text-slate-500 font-sans">
                {language === 'ar' ? 'سند بصري' : language === 'en' ? 'Visual Support' : 'Support visuel'}
              </figcaption>
            </figure>
          )}

          {/* Closing Phrase */}
          {cfg.closingPhrase && (
            <div className="mt-6 mb-4 text-center font-bold text-sm tracking-wide">
              {cfg.closingPhrase}
            </div>
          )}

          {/* Separate Model Answer & Grading Scale Page */}
          {correctionContent && correctionContent.trim().length > 0 && (
            <div className={cfg.separateCorrectionPage ? 'print-page-break mt-8 pt-6 border-t-2 border-dashed border-slate-300' : 'mt-6 pt-4 border-t border-slate-300'}>
              <div className="no-print text-[11px] font-sans font-semibold text-emerald-700 mb-3">
                {cfg.separateCorrectionPage
                  ? isRtl
                    ? '— بداية صفحة التصحيح النموذجي وسلّم التنقيط المنفصلة عند الطباعة —'
                    : '— Nouvelle page à l’impression : Corrigé type & Barème —'
                  : null}
              </div>
              <MarkdownDocumentBody markdown={correctionContent.trim()} isHandwriting={isHandwriting} />
            </div>
          )}
        </>
      )}

      {/* Teacher Signature Footer */}
      {teacherName && (
        <footer className="mt-8 pt-3 border-t border-slate-300/60 flex justify-between items-center text-[11.5px] opacity-75 font-sans">
          <span>
            {language === 'ar' ? `إعداد الأستاذ(ة): ${teacherName}` : `Préparé par : ${teacherName}`}
          </span>
          <span>
            {level} · {localizedSubject} · {trimester}
          </span>
        </footer>
      )}
    </div>
  );
};
