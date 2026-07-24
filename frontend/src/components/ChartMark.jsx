export default function ChartMark({ className, stroke = '#C9A227', opacity = 1 }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="92" height="92" fill="none" stroke={stroke} strokeWidth="2.5" />
      <line x1="4" y1="4" x2="96" y2="96" stroke={stroke} strokeWidth="1.5" />
      <line x1="96" y1="4" x2="4" y2="96" stroke={stroke} strokeWidth="1.5" />
      <line x1="50" y1="4" x2="4" y2="50" stroke={stroke} strokeWidth="1.5" />
      <line x1="50" y1="4" x2="96" y2="50" stroke={stroke} strokeWidth="1.5" />
      <line x1="50" y1="96" x2="4" y2="50" stroke={stroke} strokeWidth="1.5" />
      <line x1="50" y1="96" x2="96" y2="50" stroke={stroke} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="3" fill={stroke} />
    </svg>
  );
}