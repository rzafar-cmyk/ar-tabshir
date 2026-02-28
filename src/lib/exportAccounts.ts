import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface AccountEntry {
  country: string;
  fieldCode: string;
  topicEn: string;
  topicUr: string;
  text: string;
  dir: string;
}

function buildParagraphs(account: AccountEntry): Paragraph[] {
  const isRtl = account.dir === 'rtl';
  const paras: Paragraph[] = [];

  // Country + Topic header
  paras.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text: `${account.country}`, bold: true, size: 22, color: '1e3a5f' }),
      new TextRun({ text: `  —  ${account.topicEn}`, size: 20, color: '6b7280', italics: true }),
    ],
  }));

  // Account text — split by newlines
  const lines = account.text.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      paras.push(new Paragraph({ spacing: { before: 60 } }));
    } else {
      paras.push(new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: line,
            size: 21,
            font: isRtl ? { name: 'Jameel Noori Nastaleeq' } : undefined,
            rightToLeft: isRtl,
          }),
        ],
      }));
    }
  }

  // Separator line
  paras.push(new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' } },
  }));

  return paras;
}

export async function exportAccountsToWord(
  accounts: AccountEntry[],
  groupBy: 'topic' | 'country' = 'topic'
) {
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({ text: 'Faith-Inspiring Accounts & Incidents', bold: true, size: 32, color: '1e3a5f' }),
    ],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({ text: 'ایمان افروز واقعات', size: 28, color: '374151', font: { name: 'Jameel Noori Nastaleeq' }, rightToLeft: true }),
    ],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, size: 18, color: '9ca3af' }),
      new TextRun({ text: `  •  ${accounts.length} accounts`, size: 18, color: '9ca3af' }),
    ],
  }));

  if (groupBy === 'topic') {
    const grouped = new Map<string, AccountEntry[]>();
    for (const a of accounts) {
      const key = a.topicEn;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }
    for (const [topic, entries] of grouped) {
      const urdu = entries[0]?.topicUr || '';
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 100 },
        children: [
          new TextRun({ text: topic, bold: true, size: 26, color: '1e3a5f' }),
        ],
      }));
      if (urdu) {
        children.push(new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: urdu, size: 22, color: '6b7280', font: { name: 'Jameel Noori Nastaleeq' }, rightToLeft: true }),
          ],
        }));
      }
      for (const entry of entries) {
        children.push(...buildParagraphs(entry));
      }
    }
  } else {
    const grouped = new Map<string, AccountEntry[]>();
    for (const a of accounts) {
      if (!grouped.has(a.country)) grouped.set(a.country, []);
      grouped.get(a.country)!.push(a);
    }
    for (const [country, entries] of grouped) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({ text: country, bold: true, size: 26, color: '1e3a5f' }),
        ],
      }));
      for (const entry of entries) {
        children.push(...buildParagraphs(entry));
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `faith-inspiring-accounts-${new Date().toISOString().split('T')[0]}.docx`);
}
