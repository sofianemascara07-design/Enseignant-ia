import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { SUBJECT_META } from '../data/algerianCurriculum';
import { HandwritingMode, LanguageType, LevelType, SubjectType } from '../types';
import { SheetHeaderConfig } from '../components/DocumentSheet';

interface ExportDocOptions {
  title: string;
  subject: SubjectType;
  level: LevelType;
  language: LanguageType;
  docType: string;
  trimester: string;
  schoolName?: string;
  teacherName?: string;
  contentMarkdown: string;
  svgDiagram?: string;
  attachedImageUrl?: string;
  handwritingMode: HandwritingMode;
  headerConfig?: SheetHeaderConfig;
}

const LEVEL_LABELS: Record<LevelType, { ar: string; fr: string; en: string }> = {
  '1AM': { ar: 'السنة الأولى متوسط', fr: '1ère Année Moyenne', en: '1st Year Middle School' },
  '2AM': { ar: 'السنة الثانية متوسط', fr: '2ème Année Moyenne', en: '2nd Year Middle School' },
  '3AM': { ar: 'السنة الثالثة متوسط', fr: '3ème Année Moyenne', en: '3rd Year Middle School' },
  '4AM': { ar: 'السنة الرابعة متوسط', fr: '4ème Année Moyenne (BEM)', en: '4th Year Middle School (BEM)' },
};

function formatDurationText(minutes: number, language: LanguageType): string {
  const m = Math.max(15, Number(minutes) || 60);
  if (language === 'ar') {
    if (m === 60) return 'ساعة واحدة';
    if (m === 90) return 'ساعة ونصف';
    if (m === 120) return 'ساعتان';
    return `${m} دقيقة`;
  }
  if (language === 'en') {
    if (m === 60) return '1 hour';
    if (m === 120) return '2 hours';
    return `${m} min`;
  }
  if (m === 60) return '1 heure';
  if (m === 120) return '2 heures';
  return `${m} min`;
}

async function svgOrImageToPngBytes(
  svgString?: string,
  imageUrl?: string
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (svgString && svgString.includes('<svg')) {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG load error'));
        img.src = url;
      });
      const w = 540;
      const h = Math.round((img.height || 300) * (w / (img.width || 600)));
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) return null;
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
    }

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load error'));
        img.src = imageUrl;
      });
      const w = 500;
      const h = Math.round((img.naturalHeight || 340) * (w / (img.naturalWidth || 480)));
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) return null;
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
    }

    return null;
  } catch (err) {
    console.warn('Could not rasterize image for DOCX:', err);
    return null;
  }
}

function parseInlineRuns(text: string, fontFamily: string, baseSize = 22): TextRun[] {
  const normalized = text.replace(/&nbsp;/gi, ' ');
  const parts = normalized.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: fontFamily,
          size: baseSize,
        });
      }
      return new TextRun({
        text: part,
        font: fontFamily,
        size: baseSize,
      });
    });
}

function buildMarkdownBlockParagraphs(
  markdown: string,
  fontFamily: string,
  isRtl: boolean
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tl = lines[i].trim();
        if (!/^\|[\s\-:|]+\|$/.test(tl)) {
          tableLines.push(tl);
        }
        i++;
      }

      if (tableLines.length > 0) {
        const rows = tableLines.map((rowStr, rowIdx) => {
          const cells = rowStr
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          return new TableRow({
            children: cells.map(
              (cellText) =>
                new TableCell({
                  shading: rowIdx === 0 ? { fill: 'F1F5F9' } : undefined,
                  children: [
                    new Paragraph({
                      bidirectional: isRtl,
                      children: parseInlineRuns(cellText, fontFamily, 20),
                    }),
                  ],
                })
            ),
          });
        });

        items.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            visuallyRightToLeft: isRtl,
            rows,
          })
        );
        items.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
      continue;
    }

    if (line.startsWith('### ')) {
      items.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          bidirectional: isRtl,
          spacing: { before: 160, after: 70 },
          children: parseInlineRuns(line.slice(4), fontFamily, 24),
        })
      );
    } else if (line.startsWith('## ')) {
      items.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          bidirectional: isRtl,
          spacing: { before: 200, after: 90 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } },
          children: parseInlineRuns(line.slice(3), fontFamily, 26),
        })
      );
    } else if (line.startsWith('# ')) {
      items.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          bidirectional: isRtl,
          spacing: { before: 220, after: 100 },
          children: parseInlineRuns(line.slice(2), fontFamily, 28),
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      items.push(
        new Paragraph({
          bullet: { level: 0 },
          bidirectional: isRtl,
          spacing: { after: 60 },
          children: parseInlineRuns(line.slice(2), fontFamily, 22),
        })
      );
    } else {
      items.push(
        new Paragraph({
          bidirectional: isRtl,
          spacing: { after: 90 },
          children: parseInlineRuns(line, fontFamily, 22),
        })
      );
    }
    i++;
  }

  return items;
}

export async function exportToWordDocx(opts: ExportDocOptions): Promise<void> {
  const isRtl = opts.language === 'ar';
  const fontFamily =
    opts.handwritingMode !== 'standard'
      ? isRtl
        ? 'Amiri'
        : 'Segoe Script'
      : isRtl
        ? 'Traditional Arabic'
        : 'Calibri';

  const cfg: SheetHeaderConfig = {
    wilayaDirectorate: opts.headerConfig?.wilayaDirectorate || (isRtl ? 'الجزائر شرق' : 'Alger Est'),
    schoolYear: opts.headerConfig?.schoolYear || '2026/2027',
    durationMinutes: opts.headerConfig?.durationMinutes || (opts.docType === 'examen' ? 120 : 60),
    showStudentBox: opts.headerConfig?.showStudentBox ?? (opts.docType === 'examen' || opts.docType === 'devoir'),
    separateCorrectionPage: opts.headerConfig?.separateCorrectionPage ?? true,
    answerSpaceMode: opts.headerConfig?.answerSpaceMode ?? false,
    closingPhrase:
      opts.headerConfig?.closingPhrase ||
      (isRtl ? 'انتهى — بالتوفيق' : opts.language === 'en' ? 'End — Good Luck' : 'Fin — Bon courage'),
  };

  const localizedSubject =
    opts.language === 'ar'
      ? SUBJECT_META[opts.subject].labelAr
      : opts.language === 'en'
        ? SUBJECT_META[opts.subject].labelEn
        : opts.subject;

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: isRtl
            ? 'الجمهورية الجزائرية الديمقراطية الشعبية'
            : opts.language === 'en'
              ? "People's Democratic Republic of Algeria"
              : 'République Algérienne Démocratique et Populaire',
          bold: true,
          size: 24,
          font: fontFamily,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: isRtl
            ? 'وزارة التربية الوطنية'
            : opts.language === 'en'
              ? 'Ministry of National Education'
              : 'Ministère de l’Éducation Nationale',
          bold: true,
          size: 22,
          font: fontFamily,
        }),
      ],
    }),
    // 2-Column Metadata Table (Directorate + School | Year + Level)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: isRtl,
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorder,
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  bidirectional: isRtl,
                  children: [
                    new TextRun({
                      text: isRtl
                        ? `مديرية التربية لولاية: ${cfg.wilayaDirectorate}`
                        : `Direction de l'Éducation : ${cfg.wilayaDirectorate}`,
                      size: 20,
                      font: fontFamily,
                    }),
                  ],
                }),
                new Paragraph({
                  bidirectional: isRtl,
                  children: [
                    new TextRun({
                      text: isRtl
                        ? `المؤسسة: ${opts.schoolName || 'متوسطة الخوارزمي'}`
                        : `Établissement : ${opts.schoolName || 'CEM El-Khawarizmi'}`,
                      size: 20,
                      font: fontFamily,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: noBorder,
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
                  bidirectional: isRtl,
                  children: [
                    new TextRun({
                      text: isRtl ? `السنة الدراسية: ${cfg.schoolYear}` : `Année : ${cfg.schoolYear}`,
                      size: 20,
                      font: fontFamily,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
                  bidirectional: isRtl,
                  children: [
                    new TextRun({
                      text: isRtl
                        ? `المستوى: ${LEVEL_LABELS[opts.level].ar}`
                        : `${LEVEL_LABELS[opts.level][opts.language]} · ${localizedSubject}`,
                      size: 20,
                      font: fontFamily,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
      bidirectional: isRtl,
      spacing: { before: 60, after: 80 },
      children: [
        new TextRun({
          text: isRtl
            ? `المدة: ${formatDurationText(cfg.durationMinutes, opts.language)}`
            : `Durée : ${formatDurationText(cfg.durationMinutes, opts.language)}`,
          size: 20,
          font: fontFamily,
        }),
      ],
    }),
    // Framed Title Banner
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { before: 80, after: 140 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 12, color: '0F172A' },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F172A' },
      },
      children: [
        new TextRun({
          text: opts.title,
          bold: true,
          size: 30,
          font: fontFamily,
          color: '0F172A',
        }),
      ],
    }),
  ];

  // 3-Cell Student Box Table
  if (cfg.showStudentBox) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        visuallyRightToLeft: isRtl,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 54, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    bidirectional: isRtl,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: isRtl
                          ? 'الاسم واللقب: ...........................................'
                          : 'Nom & Prénom : ...................................',
                        size: 20,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    bidirectional: isRtl,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: isRtl ? 'القسم: ............' : 'Classe : .........',
                        size: 20,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    bidirectional: isRtl,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: isRtl ? 'العلامة: ..... / 20' : 'Note : ..... / 20',
                        bold: true,
                        size: 20,
                        font: fontFamily,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 140 } })
    );
  }

  const [mainContent, correctionContent] = opts.contentMarkdown.includes('[[CORRECTION_PAGE]]')
    ? opts.contentMarkdown.split('[[CORRECTION_PAGE]]')
    : [opts.contentMarkdown, ''];

  children.push(...buildMarkdownBlockParagraphs(mainContent, fontFamily, isRtl));

  const imageAssets = await svgOrImageToPngBytes(opts.svgDiagram, opts.attachedImageUrl);
  if (imageAssets) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 120 },
        children: [
          new ImageRun({
            data: imageAssets.bytes,
            transformation: {
              width: imageAssets.width,
              height: imageAssets.height,
            },
            type: 'png',
          }),
        ],
      })
    );
  }

  if (cfg.closingPhrase) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: isRtl,
        spacing: { before: 240, after: 160 },
        children: [
          new TextRun({
            text: cfg.closingPhrase,
            bold: true,
            size: 24,
            font: fontFamily,
          }),
        ],
      })
    );
  }

  if (correctionContent && correctionContent.trim().length > 0) {
    if (cfg.separateCorrectionPage) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...buildMarkdownBlockParagraphs(correctionContent, fontFamily, isRtl));
  }

  if (opts.teacherName) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
        bidirectional: isRtl,
        spacing: { before: 240 },
        children: [
          new TextRun({
            text: isRtl ? `الأستاذ(ة): ${opts.teacherName}` : `Enseignant(e) : ${opts.teacherName}`,
            italics: true,
            size: 20,
            font: fontFamily,
            color: '475569',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  a.href = url;
  a.download = `${safeName || 'document_cem'}_${opts.level}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerPrintPdf(): void {
  window.print();
}
