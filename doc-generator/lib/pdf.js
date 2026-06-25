'use strict';
const { execFile } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/**
 * Converts a .docx Buffer to PDF Buffer using LibreOffice headless.
 * Writes to temp dir, converts, reads result, cleans up.
 */
async function docxToPdf(docxBuffer) {
  const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'agro-'));
  const docxPath = path.join(tmpDir, 'doc.docx');
  const pdfPath  = path.join(tmpDir, 'doc.pdf');

  try {
    fs.writeFileSync(docxPath, docxBuffer);

    await new Promise((resolve, reject) => {
      execFile('libreoffice', [
        '--headless', '--convert-to', 'pdf',
        '--outdir', tmpDir, docxPath,
      ], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(`LibreOffice: ${stderr || err.message}`));
        else resolve();
      });
    });

    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { docxToPdf };
