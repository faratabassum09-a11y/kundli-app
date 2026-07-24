const axios = require('axios');
const FormData = require('form-data');

const DIVINE_PDF_URL = 'https://pdf.divineapi.com/indian-api/v2/kundali-sampoorna';

const BRAND = {
  company_name: 'MySoul',
  company_url: process.env.MYSOUL_COMPANY_URL,
  company_email: process.env.MYSOUL_COMPANY_EMAIL,
  company_mobile: process.env.MYSOUL_COMPANY_MOBILE,
  company_bio: 'MySoul brings personalized Vedic astrology insights to your fingertips — accurate Kundli, Dasha, and remedy guidance rooted in ancient wisdom, delivered instantly.',
  logo_url: process.env.MYSOUL_LOGO_URL,
  front_image: process.env.MYSOUL_FRONT_IMAGE_URL, // optional, 1425x2000px
  footer_text: 'MySoul',
  report_name: 'MySoul Personalized Kundli 2.0',
  background_color: '#FFFDF8',
  theme_color: '#DDA945',
  heading_color: '#AA5606',
  text_primary_color: '#333333',
  text_secondary_color: '#AA5606',
};

// Same DD/YYYY-vs-decimal-time parsing already used in prokerala.js's
// buildDateTime — kept separate here since DivineAPI wants components
// (day/month/year/hour/min/sec) instead of a single ISO datetime string.
function parseBirthComponents(client) {
  let year, month, day;
  const dateParts = String(client.birthDate).trim().split('-');
  if (dateParts[0].length === 4) {
    [year, month, day] = dateParts; // YYYY-MM-DD
  } else {
    [day, month, year] = dateParts; // DD-MM-YYYY
  }

  let hour, min;
  const rawTime = String(client.birthTime).trim();
  if (rawTime.includes(':')) {
    [hour, min] = rawTime.split(':');
  } else {
    const decimalTime = Number(rawTime);
    if (isNaN(decimalTime)) {
      throw new Error(`Invalid birth time: ${client.birthTime}`);
    }
    const totalMinutes = Math.round(decimalTime * 24 * 60);
    hour = Math.floor(totalMinutes / 60);
    min = totalMinutes % 60;
  }

  return {
    day: parseInt(day, 10),
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    hour: parseInt(hour, 10),
    min: parseInt(min, 10),
    sec: 0,
  };
}

// DivineAPI renders the PDF asynchronously — download_url exists immediately
// in the response but the actual file isn't ready yet. Sampoorna is the
// most detailed report type; full renders can take 60-120s. Poll for up
// to 2 minutes before giving up.
//
// IMPORTANT: the download_url's path contains "/generate/", which means
// each GET to it appears to trigger (re)generation server-side rather than
// serving a static file. So we deliberately fetch it only as many times as
// needed here, and — critically — we KEEP the bytes from the successful
// poll and return them, instead of discarding them and fetching the same
// URL again later. Fetching it a second time from elsewhere in the app
// re-triggers a full, slow regeneration for no reason.
async function waitForPdfReady(url, { maxAttempts = 24, intervalMs = 5000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        validateStatus: () => true,
        maxRedirects: 5,
        timeout: 30000,
      });
      const contentType = res.headers['content-type'] || '';
      console.log(`PDF poll ${attempt}/${maxAttempts} — status ${res.status}, content-type: ${contentType}`);

      if (contentType.includes('application/pdf')) {
        return Buffer.from(res.data);
      }
    } catch (err) {
      console.log(`PDF poll ${attempt}/${maxAttempts} — network error: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function generateKundaliPdf(client) {
  const { day, month, year, hour, min, sec } = parseBirthComponents(client);

  const form = new FormData();
  form.append('api_key', process.env.DIVINE_API_KEY);
  form.append('full_name', client.name);
  form.append('day', String(day));
  form.append('month', String(month));
  form.append('year', String(year));
  form.append('hour', String(hour));
  form.append('min', String(min));
  form.append('sec', String(sec));
  form.append('gender', String(client.gender).toLowerCase());
  form.append('place', client.birthPlace);
  form.append('lat', String(client.latitude));
  form.append('lon', String(client.longitude));
  form.append('tzone', process.env.MYSOUL_TZONE || '5.5'); // IST default, matches prokerala.js's +05:30 assumption
  form.append('lan', 'en');

  // `if (value)` — not just `!== undefined` — so empty strings ("") from
  // unset-but-present env vars don't get sent as invalid field values either.
  Object.entries(BRAND).forEach(([key, value]) => {
    if (value) form.append(key, value);
  });

  const { data } = await axios.post(DIVINE_PDF_URL, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.DIVINE_AUTH_TOKEN}`,
    },
  });

  if (data.status !== 'success') {
    throw new Error(data.message || 'DivineAPI Kundli PDF generation failed');
  }

  const pdfBuffer = await waitForPdfReady(data.data.download_url);
  if (!pdfBuffer) {
    throw new Error('PDF is taking longer than expected to generate. Please try again shortly.');
  }

  return {
    name: data.data.name,
    report_url: data.data.report_url,
    download_url: data.data.download_url,
    pdfBuffer,
  };
}

module.exports = { generateKundaliPdf };