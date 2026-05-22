const pdfParse = require('pdf-parse');
const fs = require('fs');

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
      wordCount: data.text.split(/\s+/).filter(Boolean).length
    };
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  } finally {
    // Clean up uploaded file
    try { fs.unlinkSync(filePath); } catch {}
  }
}

async function extractTextFromBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
      wordCount: data.text.split(/\s+/).filter(Boolean).length
    };
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
}

module.exports = { extractTextFromPDF, extractTextFromBuffer };
