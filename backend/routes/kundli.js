const express = require('express');
const router  = express.Router();
const { generateKundaliPdf } = require('../services/divineApi');
const { sendKundliEmail } = require('../services/pabbly');

const pdfCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Everything slow happens here, off the request/response path entirely —
// generating (up to ~2 min for a fresh client) and emailing (a network
// call to Pabbly). Takes the already-known client object directly, so
// there's no Sheets lookup in this flow at all — the frontend already had
// this data from the lookup/list call that got the user here.
async function processGeneration(rowIndex, client) {
  try {
    let cached = pdfCache.get(rowIndex);
    const isFresh = cached && Date.now() - cached.generatedAt < CACHE_TTL_MS;

    if (!isFresh) {
      console.log(`[background] Generating Kundli PDF for row ${rowIndex} (${client.name})…`);
      const result = await generateKundaliPdf(client);
      cached = { buffer: result.pdfBuffer, name: result.name, generatedAt: Date.now() };
      pdfCache.set(rowIndex, cached);
    } else {
      console.log(`[background] Using cached PDF for row ${rowIndex} (${cached.name}).`);
    }

    const pdfUrl = `${process.env.PUBLIC_BACKEND_URL}/api/kundli/${rowIndex}/pdf`;
    await sendKundliEmail({ name: cached.name, email: client.email, pdfUrl });
    console.log(`[background] Emailed row ${rowIndex} (${cached.name}) to ${client.email}.`);
  } catch (err) {
    console.error(`[background] FAILED for row ${rowIndex}:`, err.response?.data || err.message);
  }
}

// ── POST /api/kundli/:rowIndex/generate ─────────────────────────────────────
// Client data comes in the request body — no Sheets lookup here, so this
// handler does zero I/O before responding. As fast as a request can be.
router.post('/:rowIndex/generate', (req, res) => {
  const rowIndex = parseInt(req.params.rowIndex, 10);
  if (isNaN(rowIndex)) {
    return res.status(400).json({ error: 'Invalid row index.' });
  }

  const client = req.body?.client;
  if (!client || !client.email) {
    return res.status(400).json({ error: 'Client details (including email) are required.' });
  }

  res.json({ success: true, status: 'queued', name: client.name, email: client.email });

  processGeneration(rowIndex, client);
});

// ── GET /api/kundli/:rowIndex/pdf ───────────────────────────────────────────
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