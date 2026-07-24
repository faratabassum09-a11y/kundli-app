const axios = require('axios');
const NodeCache = require('node-cache');

const tokenCache = new NodeCache();

// ── Get OAuth2 Access Token (cached) ────────────────
async function getAccessToken() {
  const cached = tokenCache.get('pk_token');
  if (cached) return cached;
  const params = new URLSearchParams();

  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.PROKERALA_CLIENT_ID);
  params.append('client_secret', process.env.PROKERALA_CLIENT_SECRET);

  const res = await axios.post(
    'https://api.prokerala.com/token',
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const token = res.data.access_token;
  tokenCache.set(
    'pk_token',
    token,
    (res.data.expires_in || 3600) - 300
  );

  return token;
}

// ── Convert Google Sheet Date + Time ────────────────
function buildDateTime(client) {
  let year;
  let month;
  let day;

  const dateParts =
    String(client.birthDate)
    .trim()
    .split('-');

  if (dateParts[0].length === 4) {
    // YYYY-MM-DD
    [year, month, day] = dateParts;

  } else {
    // DD-MM-YYYY
    [day, month, year] = dateParts;

  }

  let time;
  const rawTime =
    String(client.birthTime)
    .trim();
  if (rawTime.includes(':')) {

    // Example: 10:30
    let [hour, minute] =
      rawTime.split(':');
    time =
      `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  } else {
    // Google Sheets stores time as decimal string
    // Example:
    // 0.625 = 15:00


    const decimalTime =
      Number(rawTime);

    if (isNaN(decimalTime)) {

      throw new Error(
        `Invalid birth time: ${client.birthTime}`
      );

    }
    const totalMinutes =
      Math.round(decimalTime * 24 * 60);

    const hour =
      Math.floor(totalMinutes / 60);

    const minute =
      totalMinutes % 60;

    time =
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  }
  const datetime =
    `${year}-${month}-${day}T${time}:00+05:30`;

  // console.log('------------------------------');
  // console.log('Birth Date:', client.birthDate);
  // console.log('Birth Time:', client.birthTime);
  // console.log('Converted Time:', time);
  // console.log('Prokerala datetime:', datetime);
  // console.log('------------------------------');

  return datetime;

}

// ── Get Kundli Data from Prokerala ─────────────────
async function getKundliData(client) {

  const token =
    await getAccessToken();

  const datetime =
    buildDateTime(client);

  const baseParams = {
    ayanamsa: 1,
    coordinates:
      `${client.latitude},${client.longitude}`,
    datetime,

  };

  const headers = {
    Authorization:
      `Bearer ${token}`,

  };

  const base =
    'https://api.prokerala.com/v2/astrology';

  const [
    planets,
    mangal,
    dasha

  ] = await Promise.all([
    axios.get(
      `${base}/planet-position`,
      {
        params: baseParams,
        headers,
      }
    ),

    axios.get(
      `${base}/mangal-dosha`,
      {
        params: baseParams,
        headers,
      }
    ),

    axios.get(
      `${base}/dasha-periods`,
      {
        params: baseParams,
        headers,
      }
    )

  ]);


  return {
    planets:
      planets.data.data,

    mangalDosha:
      mangal.data.data,

    dasha:
      dasha.data.data,


  };


}


module.exports = {
  getKundliData
};