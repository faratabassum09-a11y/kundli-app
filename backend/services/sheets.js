const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1';

async function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return auth.getClient();
}

// ── Get all clients (skip header row) ───────────────
async function getAllClients() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = res.data.values || [];
  return rows.map((row, index) => ({
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
}

// ── Get single client by sheet row number ───────────
async function getClientByRow(rowIndex) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A${rowIndex}:I${rowIndex}`,
  });

  const row = res.data.values?.[0];
  if (!row) return null;

  return {
    rowIndex,
    name:       row[0] || '',
    email:      row[1] || '',
    phone:      row[2] || '',
    gender:     row[3] || '',
    birthDate:  row[4] || '',
    birthTime:  row[5] || '',
    birthPlace: row[6] || '',
    latitude:   row[7] || '',
    longitude:  row[8] || '',
  };
}

module.exports = { getAllClients, getClientByRow };