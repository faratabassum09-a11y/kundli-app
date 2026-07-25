const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1';

// The auth client only needs to be created once — GoogleAuth internally
// caches and refreshes the OAuth token as needed. Recreating it on every
// call (as before) meant redoing the credential parse + token exchange on
// every single request, which was most of the perceived lag.
let sheetsClientPromise = null;

async function getSheetsClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const authClient = await auth.getClient();
      return google.sheets({ version: 'v4', auth: authClient });
    })();
  }
  return sheetsClientPromise;
}

// Short-lived cache of the full client list. checkExisting (lookup),
// pollForClient (up to 10x every 2s after registration), and KundliPage's
// table load were each triggering a fresh Sheets API round-trip — most of
// those calls happen within a few seconds of each other, so a short TTL
// removes almost all of the redundant network time without ever serving
// data more than a few seconds stale.
let clientsCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 4000;

function invalidateClientsCache() {
  clientsCache = { data: null, fetchedAt: 0 };
}

// ── Get all clients (skip header row) ───────────────
async function getAllClients({ fresh = false } = {}) {
  const isFresh = clientsCache.data && (Date.now() - clientsCache.fetchedAt < CACHE_TTL_MS);
  if (isFresh && !fresh) return clientsCache.data;

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = res.data.values || [];
  const clients = rows.map((row, index) => ({
    rowIndex: index + 2,
    name:       row[0] || '',
    email:      row[1] || '',
    phone:      row[2] || '',
    gender:     row[3] || '',
    birthDate:  row[4] || '',
    birthTime:  row[5] || '',
    birthPlace: row[6] || '',
    latitude:   row[7] || '',
    longitude:  row[8] || '',
  }));

  clientsCache = { data: clients, fetchedAt: Date.now() };
  return clients;
}

// ── Get single client by sheet row number ───────────
// Reads from the same cached list instead of making its own separate
// Sheets API call — getAllClients() already has every field this needs.
async function getClientByRow(rowIndex) {
  const clients = await getAllClients();
  return clients.find((c) => c.rowIndex === rowIndex) || null;
}

module.exports = { getAllClients, getClientByRow, invalidateClientsCache };