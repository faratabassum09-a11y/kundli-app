import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import ClientForm from './pages/ClientForm';
import KundliPage from './pages/KundliPage';
import ChartMark from './components/ChartMark';
import './styles/theme.css';

function AppRoutes() {
  // location.key is unique per navigation entry, even when the path
  // ("/") doesn't change. Using it as ClientForm's key forces a full
  // remount whenever "Register Client" is clicked, so ClientForm's
  // `useState(location.state?.view || 'lookup')` initializer re-runs
  // fresh with the new state — no effect-driven setState needed.
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<ClientForm key={location.key} />} />
      <Route path="/kundli" element={<KundliPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="kundli-page-bg">
        <nav className="kundli-nav">
          <span className="kundli-brand">
            <ChartMark className="chart-mark" stroke="#E8CE7A" />
            Kundli App
          </span>
          <Link
            to="/"
            state={{ view: 'register' }}
            className="kundli-nav-right kundli-nav-cta"
          >
            Register Client
          </Link>
        </nav>
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}