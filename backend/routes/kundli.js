const express = require('express');
const router  = express.Router();
const { getClientByRow } = require('../services/sheets');
const { generateKundaliPdf } = require('../services/divineApi');
const { sendKundliEmail } = require('../services/pabbly');

const pdfCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ── GET /api/kundli/:rowIndex/generate ─────────────────────────────────────
// Generates (or reuses a cached) PDF, then tells Pabbly to email it.
router.get('/:rowIndex/generate', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    if (isNaN(rowIndex)) {
      return res.status(400).json({ error: 'Invalid row index.' });
    }

    const client = await getClientByRow(rowIndex);
    if (!client) {
      return res.status(404).json({ error: 'Client not found in sheet.' });
    }
    if (!client.email) {
      return res.status(400).json({ error: 'This client has no email on file — cannot send the PDF.' });
    }

    let cached = pdfCache.get(rowIndex);
    const isFresh = cached && Date.now() - cached.generatedAt < CACHE_TTL_MS;

    if (!isFresh) {
      console.log(`Generating DivineAPI Kundli PDF for row ${rowIndex} (${client.name})…`);
      const result = await generateKundaliPdf(client);
      cached = { buffer: result.pdfBuffer, name: result.name, generatedAt: Date.now() };
      pdfCache.set(rowIndex, cached);
    } else {
      console.log(`Using cached Kundli PDF for row ${rowIndex} (${cached.name}) — skipping DivineAPI.`);
    }

    const pdfUrl = `${process.env.PUBLIC_BACKEND_URL}/api/kundli/${rowIndex}/pdf`;

    console.log(`Emailing Kundli PDF to ${client.email} via Pabbly…`);
    await sendKundliEmail({ name: cached.name, email: client.email, pdfUrl });

    res.json({
      success: true,
      name: cached.name,
      email: client.email,
    });

  } catch (err) {
    console.error('Kundli PDF/email error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Kundli PDF generation or email failed.',
      detail: err.response?.data?.message || err.message,
    });
  }
});

// ── GET /api/kundli/:rowIndex/pdf ───────────────────────────────────────────
// Public endpoint — this is the URL Pabbly's Gmail action fetches the
// attachment from, so it must stay unauthenticated once deployed.
router.get('/:rowIndex/pdf', (req, res) => {
  const rowIndex = parseInt(req.params.rowIndex, 10);
  const cached = pdfCache.get(rowIndex);

  if (!cached) {
    return res.status(404).json({ error: 'No PDF generated yet for this client. Click Email PDF first.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${cached.name.replace(/[^a-z0-9]/gi, '_')}-kundli.pdf"`);
  res.send(cached.buffer);
});

module.exports = router;