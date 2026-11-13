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
  isEditing: boolean;
  onChangeTitle: (val: string) => void;
  onChangeMarkdown: (val: string) => void;
}

const DOC_TYPE_LABELS: Record<DocType, { fr: string; ar: string; en: string }> = {
  cours: { fr: 'Cours structuré', ar: 'ملخص الدرس', en: 'Lesson Sheet' },
  fiche: { fr: 'Fiche pédagogique', ar: 'مذكرة بيداغوجية', en: 'Lesson Plan' },
  examen: { fr: 'Sujet d’examen', ar: 'اختبار فصلي', en: 'Term Exam' },
  devoir: { fr: 'Devoir surveillé', ar: 'فرض محروس', en: 'Class Test' },
  exercice: { fr: 'Série d’exercices', ar: 'سلسلة تمارين', en: 'Worksheet' },
};

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
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
      elements.push(<div key={`sp-${i}`} className="h-2.5" />);
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
          <div key={`tbl-${i}`} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400/70 text-[0.92em]">
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 && hasHeader ? 'bg-slate-100/80 font-semibold' : ''}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border border-slate-400/70 px-3 py-1.5 align-top">
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
          className={`mt-4 mb-1.5 font-semibold ${isHandwriting ? 'text-xl underline decoration-1 underline-offset-4' : 'text-base'}`}
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className={`mt-5 mb-2 font-bold border-b border-current/20 pb-1 ${isHandwriting ? 'text-2xl' : 'text-lg'}`}
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
        <div key={`ol-${i}`} className="flex items-start gap-2 my-1 ps-3">
          <span className="font-semibold tabular-nums shrink-0">{match?.[1]}</span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(match?.[2] ?? line)}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-300" />);
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
  isEditing,
  onChangeTitle,
  onChangeMarkdown,
}) => {
  const isRtl = language === 'ar';
  const isHandwriting = handwritingMode !== 'standard';

  const fontClass = (() => {
    if (language === 'ar') {
      if (handwritingMode === 'handwriting_cursive' || handwritingMode === 'handwriting_print') {
        return 'font-handwriting-arabic text-[18px]';
      }
      return 'font-arabic text-[15px]';
    }
    if (handwritingMode === 'handwriting_cursive') {
      return 'font-handwriting-cursive text-[21px] leading-[32px]';
    }
    if (handwritingMode === 'handwriting_print') {
      return 'font-handwriting-latin text-[18px] leading-[30px]';
    }
    return 'text-[14.5px] leading-relaxed';
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

  const docTypeLabel = DOC_TYPE_LABELS[docType][language];
  const localizedSubject =
    language === 'ar'
      ? SUBJECT_META[subject].labelAr
      : language === 'en'
        ? SUBJECT_META[subject].labelEn
        : subject;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`print-sheet mx-auto w-full max-w-[820px] min-h-[1040px] border border-slate-200 shadow-sm rounded-sm px-10 py-10 sm:px-14 sm:py-12 transition-colors ${paperClass} ${inkClass} ${fontClass}`}
    >
      {/* Official Algerian Middle School Header */}
      <header className="border-b-2 border-slate-800/30 pb-4 mb-6">
        <div className="text-center text-xs font-semibold tracking-wide opacity-80 mb-2 font-sans">
          {language === 'ar'
            ? 'الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية'
            : language === 'en'
              ? "People's Democratic Republic of Algeria — Ministry of National Education"
              : 'République Algérienne Démocratique et Populaire — Ministère de l’Éducation Nationale'}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-85 font-sans">
          <span>
            {schoolName || (language === 'ar' ? 'متوسطة (التعليم المتوسط)' : 'Établissement : CEM')}
          </span>
          <span className="font-mono-tabular">
            {level} · {localizedSubject} · {trimester} · {docTypeLabel}
          </span>
        </div>

        {(docType === 'examen' || docType === 'devoir') && (
          <div className="mt-3 pt-2 border-t border-slate-300/70 flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
            <span>
              {language === 'ar' ? 'الاسم واللقب: ................................................' : language === 'en' ? 'Full Name: ........................................' : 'Nom & Prénom : ........................................'}
            </span>
            <span>
              {language === 'ar' ? 'القسم: ...............' : language === 'en' ? 'Class: ............' : 'Classe : ............'}
            </span>
            <span className="font-semibold">
              {language === 'ar' ? 'العلامة: ...... / 20' : language === 'en' ? 'Mark: ...... / 20' : 'Note : ...... / 20'}
            </span>
          </div>
        )}
      </header>

      {/* Document Title */}
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
              Contenu Markdown (modifiable directement)
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
          <h1
            className={`text-center font-bold mb-6 ${
              isHandwriting ? (language === 'ar' ? 'text-3xl' : 'text-4xl') : 'text-2xl'
            }`}
          >
            {title}
          </h1>

          {/* Main Rendered Pedagogical Body */}
          <div className="space-y-1">
            <MarkdownDocumentBody markdown={contentMarkdown} isHandwriting={isHandwriting} />
          </div>
        </>
      )}

      {/* Embedded Vector Diagram (SVG) */}
      {svgDiagram && svgDiagram.includes('<svg') && (
        <figure className="my-6 p-3 bg-white border border-slate-300/80 rounded-md flex flex-col items-center">
          <div
            className="w-full max-w-[580px] overflow-hidden flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgDiagram }}
          />
          <figcaption className="mt-2 text-xs text-slate-500 font-sans">
            {language === 'ar' ? 'وثيقة / مخطط توضيحي' : language === 'en' ? 'Pedagogical Diagram' : 'Schéma pédagogique'}
          </figcaption>
        </figure>
      )}

      {/* Attached Photo or Curated Illustration */}
      {attachedImageUrl && (
        <figure className="my-6 p-3 bg-white border border-slate-300/80 rounded-md flex flex-col items-center">
          <img
            src={attachedImageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-h-[340px] w-auto object-contain rounded-sm"
          />
          <figcaption className="mt-2 text-xs text-slate-500 font-sans">
            {language === 'ar' ? 'صورة / سند بيداغوجي' : language === 'en' ? 'Illustration / Visual Support' : 'Support visuel pédagogique'}
          </figcaption>
        </figure>
      )}

      {/* Teacher Signature Footer */}
      {teacherName && (
        <footer className="mt-10 pt-4 border-t border-slate-300/60 flex justify-between items-center text-xs opacity-75 font-sans">
          <span>
            {language === 'ar' ? `إعداد الأستاذ(ة): ${teacherName}` : `Préparé par : ${teacherName}`}
          </span>
          <span>{level} · {localizedSubject}</span>
        </footer>
      )}
    </div>
  );
};
