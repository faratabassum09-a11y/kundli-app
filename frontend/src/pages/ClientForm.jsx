import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ChartMark from '../components/ChartMark';
import LoadingOverlay from '../components/LoadingOverlay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FIELDS = [
  { name: 'name',       label: 'Full Name',                 type: 'text'  },
  { name: 'email',      label: 'Email',                     type: 'email' },
  { name: 'phone',      label: 'Phone Number',              type: 'tel'   },
  { name: 'gender',     label: 'Gender (Male / Female)',    type: 'text'  },
  { name: 'birthDate',  label: 'Birth Date (DD-MM-YYYY)',   type: 'text', data: true },
  { name: 'birthTime',  label: 'Birth Time (HH:MM, 24hr)', type: 'text', data: true },
  { name: 'birthPlace', label: 'Birth Place (City)',        type: 'text'  },
  { name: 'latitude',   label: 'Latitude  (e.g. 17.3850)', type: 'text', data: true },
  { name: 'longitude',  label: 'Longitude (e.g. 78.4867)', type: 'text', data: true },
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.name, '']));

export default function ClientForm() {
  const location = useLocation();
  const [view, setView] = useState(location.state?.view || 'lookup');

  const [lookupValue,   setLookupValue]   = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState(null);

  const [form,    setForm]    = useState(emptyForm());
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);

  const [client,     setClient]     = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus,  setPdfStatus]  = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Step 1: lookup ──────────────────────────────────────────────────────
  const checkExisting = async (e) => {
    e.preventDefault();
    const query = lookupValue.trim();
    if (!query) return;

    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await axios.get(`${API}/clients`);
      const match = res.data.find(
        (c) =>
          (c.email && c.email.toLowerCase() === query.toLowerCase()) ||
          (c.phone && c.phone.replace(/\s+/g, '') === query.replace(/\s+/g, ''))
      );

      if (match) {
        setClient({ rowIndex: match.rowIndex, name: match.name });
        setView('ready');
      } else {
        const prefill = emptyForm();
        if (query.includes('@')) prefill.email = query;
        else prefill.phone = query;
        setForm(prefill);
        setView('register');
      }
    } catch {
      setLookupError('Could not check existing clients. Is the backend running?');
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Poll sheet until Pabbly writes the new row ──────────────────────────
  const pollForClient = async (email, phone, retries = 10, intervalMs = 2000) => {
    for (let i = 0; i < retries; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const res = await axios.get(`${API}/clients`);
        const match = res.data.find(
          (c) =>
            (email && c.email?.toLowerCase() === email.toLowerCase()) ||
            (phone && c.phone?.replace(/\s+/g, '') === phone.replace(/\s+/g, ''))
        );
        if (match) return match;
      } catch { /* keep retrying */ }
    }
    return null;
  };

  // ── Step 2: register ────────────────────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await axios.post(`${API}/clients`, form);
      setStatus({ ok: true, message: 'Saved! Waiting for sheet to update…' });

      const matched = await pollForClient(form.email, form.phone);

      if (!matched) {
        setStatus({
          ok: false,
          message: 'Client saved but sheet update is taking longer than usual. Use the lookup to find them in a moment.',
        });
        return;
      }

      setClient({ rowIndex: matched.rowIndex, name: matched.name });
      setStatus(null);
      setView('ready');
    } catch {
      setStatus({ ok: false, message: 'Error saving. Check backend and Pabbly workflow are running.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: email the PDF ───────────────────────────────────────────────
  const generatePdf = async () => {
    if (!client?.rowIndex) return;

    setPdfLoading(true);
    setPdfStatus(null);

    try {
      const res = await axios.get(`${API}/kundli/${client.rowIndex}/generate`);

      if (!res.data.success) {
        throw new Error(res.data.error || res.data.detail || 'PDF generation failed');
      }

      setPdfStatus({ ok: true, message: `✨ ${client.name}'s Kundli has been emailed to ${res.data.email}.` });

    } catch (err) {
      let message = `PDF generation failed for ${client.name}.`;
      if (err.response?.data) {
        message = err.response.data.detail || err.response.data.error || message;
      } else if (err.message && !err.message.includes('Network')) {
        message = err.message;
      }
      setPdfStatus({ ok: false, message });

    } finally {
      setPdfLoading(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────
  const startOver = () => {
    setView('lookup');
    setLookupValue('');
    setLookupError(null);
    setForm(emptyForm());
    setStatus(null);
    setClient(null);
    setPdfStatus(null);
  };

  return (
    <div className="kundli-card">
      <ChartMark className="chart-mark-watermark" stroke="#4A1464" opacity={0.1} />

      {view === 'lookup' && (
        <>
          <p className="kundli-eyebrow">Start here</p>
          <h2 className="kundli-title">Find or register a client</h2>
          <p className="kundli-subtitle">
            Enter the email or phone number used at registration. Existing
            clients go straight to their Kundli PDF — no need to fill the
            form again.
          </p>

          <form onSubmit={checkExisting} className="lookup-row">
            <input
              className="field-input"
              type="text"
              placeholder="Email or phone number"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="btn btn-primary" disabled={lookupLoading}>
              {lookupLoading ? 'Checking…' : 'Continue'}
            </button>
          </form>

          {lookupError && (
            <p className="status-banner status-banner--error">{lookupError}</p>
          )}
        </>
      )}

      {view === 'register' && (
        <>
          <p className="kundli-eyebrow">Step 1 of 2 · New client</p>
          <h2 className="kundli-title">Register Client</h2>
          <p className="kundli-subtitle">
            Enter birth details exactly as recorded — the chart is calculated
            from these values.
          </p>

          <form onSubmit={submit}>
            {FIELDS.map((f) => (
              <div key={f.name} className="field-group">
                <label className="field-label">{f.label}</label>
                <input
                  className="field-input"
                  data-type={f.data ? 'data' : undefined}
                  name={f.name}
                  type={f.type}
                  value={form[f.name]}
                  onChange={handle}
                  required
                />
              </div>
            ))}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={startOver}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving & waiting for sheet…' : 'Submit'}
              </button>
            </div>
          </form>

          {status && (
            <p className={`status-banner status-banner--${status.ok ? 'success' : 'error'}`}>
              {status.message}
            </p>
          )}
        </>
      )}

      {view === 'ready' && client && (
        <>
          <p className="kundli-eyebrow">Step 2 of 2 · Client on file</p>
          <h2 className="kundli-title">{client.name}'s Kundli</h2>
          <p className="kundli-subtitle">
            This client is already registered. Email the birth chart PDF
            whenever you're ready.
          </p>

          <div className="next-step-panel">
            <div>
              <h3>Email {client.name}'s Kundli</h3>
              <p>Generates the PDF and sends it straight to their inbox.</p>
            </div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={generatePdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? 'Emailing…' : 'Email PDF'}
            </button>
          </div>

          {pdfStatus && (
            <p className={`status-banner status-banner--${pdfStatus.ok ? 'success' : 'error'}`}>
              {pdfStatus.message}
            </p>
          )}

          <div className="form-actions form-actions--end">
            <button type="button" className="btn btn-ghost" onClick={startOver}>
              Look up a different client
            </button>
          </div>
        </>
      )}
         {pdfLoading && <LoadingOverlay />}
    </div>
  );
}