const express = require('express');
const router  = express.Router();
const { sendToPabbly } = require('../services/pabbly');
const { getAllClients } = require('../services/sheets');

// POST /api/clients
// Called by the React ClientForm.jsx when the user submits the form.
// Forwards data to Pabbly Connect, which then writes the row into
// Google Sheets (and runs any other actions in that workflow).
router.post('/', async (req, res) => {
  try {
    await sendToPabbly(req.body);
    res.json({ success: true, message: 'Sent to Pabbly Connect' });
  } catch (err) {
    console.error('Pabbly forward error:', err.message);
    res.status(500).json({ error: 'Failed to send client data to Pabbly' });
  }
});

// GET /api/clients
// Reads clients back from Google Sheets (after Pabbly has written them)
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