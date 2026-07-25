const express = require('express');
const router  = express.Router();
const { sendToPabbly } = require('../services/pabbly');
const { getAllClients, invalidateClientsCache } = require('../services/sheets');

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    await sendToPabbly(req.body);
    // The sheet is about to get a new row from Pabbly — drop the cache
    // so the upcoming poll loop sees fresh data instead of the pre-registration list.
    invalidateClientsCache();
    res.json({ success: true, message: 'Sent to Pabbly Connect' });
  } catch (err) {
    console.error('Pabbly forward error:', err.message);
    res.status(500).json({ error: 'Failed to send client data to Pabbly' });
  }
});

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const clients = await getAllClients();
    res.json(clients);
  } catch (err) {
    console.error('Fetch clients error:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

module.exports = router;