const express = require('express');
const cors = require('cors');
require('dotenv').config();

const clientRoutes = require('./routes/clients');
const kundliRoutes = require('./routes/kundli');

const app = express();

// Allow local dev (5173) and the deployed frontend (set FRONTEND_URL in
// Render's env vars once you know your Vercel URL). No FRONTEND_URL set
// just falls back to localhost only.
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // origin is undefined for same-origin/non-browser requests (curl, Postman) — allow those too.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin} is not an allowed origin`));
    }
  },
}));
app.use(express.json());

app.use('/api/clients', clientRoutes);
app.use('/api/kundli', kundliRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});