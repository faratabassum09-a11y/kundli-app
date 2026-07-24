import { useState, useEffect } from 'react';
import ChartMark from './ChartMark';

const MESSAGES = [
  'Consulting the planetary positions…',
  'Calculating your Dasha periods…',
  'Aligning the houses of your chart…',
  'Finalizing your personalized report…',
];

export default function LoadingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="loading-overlay__card">
        <div className="loading-overlay__spinner">
          <ChartMark className="chart-mark" stroke="#E8CE7A" />
        </div>
        <p className="loading-overlay__title">Generating your Kundli</p>
        <p className="loading-overlay__message">{MESSAGES[msgIndex]}</p>
      </div>
    </div>
  );
}