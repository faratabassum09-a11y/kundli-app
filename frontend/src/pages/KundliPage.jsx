import { useState, useEffect } from 'react';
import axios from 'axios';
import ChartMark from '../components/ChartMark';
import LoadingOverlay from '../components/LoadingOverlay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function KundliPage() {
  const [clients, setClients]     = useState([]);
  const [loadingRow, setLoadingRow] = useState(null);
  const [message, setMessage]     = useState(null);

  useEffect(() => {
    axios.get(`${API}/clients`)
      .then((r) => setClients(r.data))
      .catch(() => setMessage({ ok: false, text: 'Could not load clients. Is the backend running?' }));
  }, []);

  const generate = async (rowIndex, name) => {
    setLoadingRow(rowIndex);
    setMessage(null);
    try {
      const res = await axios.get(`${API}/kundli/${rowIndex}/generate`);

      if (!res.data.success) {
        throw new Error(res.data.error || 'PDF generation failed');
      }

      setMessage({ ok: true, text: `Kundli emailed to ${res.data.email} for ${name}.` });
    } catch {
      setMessage({ ok: false, text: `PDF generation failed for ${name}.` });
    } finally {
      setLoadingRow(null);
    }
  };

  return (
    <div className="kundli-card kundli-card--wide">
      <ChartMark className="chart-mark-watermark" stroke="#4A1464" />
      <p className="kundli-eyebrow">Step 2 of 2</p>
      <h2 className="kundli-title">Email Kundli PDF</h2>
      <p className="kundli-subtitle">
        Clients below are fetched live from the Google Sheet. Choose a row to
        generate and email its chart.
      </p>

      {message && (
        <p className={`status-banner status-banner--${message.ok ? 'success' : 'error'}`}>
          {message.text}
        </p>
      )}

      {clients.length === 0 ? (
        <div className="empty-state">No clients yet. Register one to get started.</div>
      ) : (
        <div className="kundli-table-wrap">
          <table className="kundli-table">
            <thead>
              <tr>
                {['Row', 'Name', 'Birth Date', 'Birth Time', 'Birth Place', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.rowIndex}>
                  <td className="mono">{c.rowIndex}</td>
                  <td>{c.name}</td>
                  <td className="mono">{c.birthDate}</td>
                  <td className="mono">{c.birthTime}</td>
                  <td>{c.birthPlace}</td>
                  <td>
                    <button
                      className="btn btn-gold btn-small"
                      onClick={() => generate(c.rowIndex, c.name)}
                      disabled={loadingRow === c.rowIndex}
                    >
                      {loadingRow === c.rowIndex ? 'Emailing…' : 'Email PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
       {loadingRow !== null && <LoadingOverlay />}
    </div>
  );
}