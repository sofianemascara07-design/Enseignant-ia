import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { SUBJECT_META } from '../data/algerianCurriculum';
import { HandwritingMode, LanguageType, LevelType, SubjectType } from '../types';

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
      const w = 560;
      const h = Math.round((img.height || 320) * (w / (img.width || 600)));
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
      const w = 520;
      const h = Math.round((img.naturalHeight || 360) * (w / (img.naturalWidth || 480)));
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
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
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

export async function exportToWordDocx(opts: ExportDocOptions): Promise<void> {
  const isRtl = opts.language === 'ar';
  const fontFamily =
    opts.handwritingMode !== 'standard'
      ? isRtl
        ? 'Amiri'
        : 'Segoe Script'
      : isRtl
        ? 'Cairo'
        : 'Calibri';

  const ministryHeader = isRtl
    ? 'الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية (التعليم المتوسط)'
    : opts.language === 'en'
      ? "People's Democratic Republic of Algeria — Ministry of National Education (Middle School)"
      : 'République Algérienne Démocratique et Populaire — Ministère de l’Éducation Nationale (CEM)';

  const localizedSubject =
    opts.language === 'ar'
      ? SUBJECT_META[opts.subject].labelAr
      : opts.language === 'en'
        ? SUBJECT_META[opts.subject].labelEn
        : opts.subject;

  const metaLine = isRtl
    ? `المستوى: ${opts.level} | المادة: ${localizedSubject} | الفصل: ${opts.trimester}${opts.schoolName ? ` | المؤسسة: ${opts.schoolName}` : ''}`
    : `Niveau : ${opts.level} · Matière : ${localizedSubject} · Période : ${opts.trimester}${opts.schoolName ? ` · ${opts.schoolName}` : ''}`;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: ministryHeader,
          bold: true,
          size: 20,
          font: fontFamily,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '059669' },
      },
      children: [
        new TextRun({
          text: metaLine,
          size: 20,
          font: fontFamily,
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      bidirectional: isRtl,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: opts.title,
          bold: true,
          size: 32,
          font: fontFamily,
          color: '0F172A',
        }),
      ],
    }),
  ];

  const lines = opts.contentMarkdown.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Markdown table block
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

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          })
        );
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
      continue;
    }

    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          bidirectional: isRtl,
          spacing: { before: 180, after: 80 },
          children: parseInlineRuns(line.slice(4), fontFamily, 24),
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          bidirectional: isRtl,
          spacing: { before: 220, after: 100 },
          children: parseInlineRuns(line.slice(3), fontFamily, 26),
        })
      );
    } else if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          bidirectional: isRtl,
          spacing: { before: 240, after: 120 },
          children: parseInlineRuns(line.slice(2), fontFamily, 28),
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          bidirectional: isRtl,
          spacing: { after: 60 },
          children: parseInlineRuns(line.slice(2), fontFamily, 22),
        })
      );
    } else {
      children.push(
        new Paragraph({
          bidirectional: isRtl,
          spacing: { after: 100 },
          children: parseInlineRuns(line, fontFamily, 22),
        })
      );
    }
    i++;
  }

  const imageAssets = await svgOrImageToPngBytes(opts.svgDiagram, opts.attachedImageUrl);
  if (imageAssets) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
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

  if (opts.teacherName) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
        bidirectional: isRtl,
        spacing: { before: 280 },
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
