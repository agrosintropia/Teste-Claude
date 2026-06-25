'use strict';

const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak, VerticalAlign, Footer, Header,
} = require('docx');

const { THEME, CELL_BORDERS, HEAD_BORDERS } = require('./theme');

/** TextRun with theme defaults; accepts overrides via opts. */
function run(text, opts = {}) {
  return new TextRun({ text, font: THEME.font, size: THEME.size.body, ...opts });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [run(text, { bold: true, size: THEME.size.h1, color: THEME.color.dark })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [run(text, { bold: true, size: THEME.size.h2, color: THEME.color.mid })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [run(text, { bold: true, size: THEME.size.h3, color: THEME.color.light })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [run(text, opts)],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [run('')] });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.color.mid, space: 1 } },
    spacing: { before: 120, after: 120 },
    children: [run('')],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Bullet list item */
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 60, after: 60 },
    children: [run(text)],
  });
}

function makeTable(headers, rows, colWidths, rowShading) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((label, i) =>
      new TableCell({
        borders: HEAD_BORDERS,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: THEME.color.mid, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [run(label, { bold: true, size: THEME.size.small, color: THEME.color.white })],
        })],
      })
    ),
  });

  const dataRows = rows.map((cells, rowIdx) => {
    const shade = rowShading && rowShading[rowIdx]
      ? rowShading[rowIdx]
      : (rowIdx % 2 === 0 ? THEME.color.rowEven : THEME.color.white);

    return new TableRow({
      children: cells.map((cellContent, colIdx) => {
        // cellContent can be string or { text, bold, color }
        const isObj = typeof cellContent === 'object' && cellContent !== null && !Array.isArray(cellContent);
        const cellText = isObj ? cellContent.text : String(cellContent);
        const cellBold = isObj ? !!cellContent.bold : false;
        const cellColor = isObj ? cellContent.color : undefined;

        return new TableCell({
          borders: CELL_BORDERS,
          width: { size: colWidths[colIdx], type: WidthType.DXA },
          shading: { fill: shade, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            children: [run(cellText, { size: THEME.size.small, bold: cellBold, color: cellColor })],
          })],
        });
      }),
    });
  });

  return new Table({
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function makeHeader(title = 'Base Técnica de Referência — Adubação Orgânica em SAFs') {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: THEME.color.mid, space: 1 } },
        spacing: { after: 80 },
        children: [
          run('AGROSINTROPIA', { bold: true, size: THEME.size.small, color: THEME.color.mid }),
          run(`   |   ${title}`, { size: THEME.size.small, color: THEME.color.gray }),
        ],
      }),
    ],
  });
}

function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: THEME.color.border, space: 1 } },
        spacing: { before: 80 },
        alignment: AlignmentType.RIGHT,
        children: [
          run('Página ', { size: THEME.size.small, color: THEME.color.gray }),
          new TextRun({ children: [PageNumber.CURRENT], size: THEME.size.small, font: THEME.font, color: THEME.color.gray }),
          run(' de ', { size: THEME.size.small, color: THEME.color.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: THEME.size.small, font: THEME.font, color: THEME.color.gray }),
        ],
      }),
    ],
  });
}

module.exports = { run, h1, h2, h3, p, spacer, divider, pageBreak, bullet, makeTable, makeHeader, makeFooter };
