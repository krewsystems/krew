import type { WorkSampleKind } from '@/data/personas'

/** Portfolio thumbnails drawn in SVG: ink lines on paper, with the agent's tint as the only colour. */
export function WorkSampleArt({ kind, tint }: { kind: WorkSampleKind; tint: string }) {
  const ink = 'var(--foreground)'
  const faint = 'var(--border-strong)'
  const soft = 'var(--border)'
  switch (kind) {
    case 'line': {
      const a = [62, 58, 60, 52, 55, 46, 48, 38, 42, 30, 26, 18]
      const b = [66, 64, 66, 62, 63, 60, 61, 58, 60, 56, 57, 54]
      const p = (arr: number[]) => arr.map((v, i) => `${14 + i * 15.5},${v}`).join(' ')
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          {[24, 44, 64].map((y) => (
            <line key={y} x1="14" x2="186" y1={y} y2={y} stroke={soft} strokeDasharray="2 3" />
          ))}
          <polyline points={`${p(a)} 184.5,80 14,80`} fill={tint} fillOpacity="0.14" stroke="none" />
          <polyline points={p(b)} fill="none" stroke={faint} strokeWidth="1.4" strokeDasharray="3 3" />
          <polyline points={p(a)} fill="none" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="184.5" cy="18" r="3" fill={tint} stroke="var(--surface)" strokeWidth="1.5" />
        </svg>
      )
    }
    case 'bars': {
      const v = [50, 34, 20, 44, 28, 14]
      const pid = `ws-h-${tint.replace(/[^a-z0-9]/gi, '')}`
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          <defs>
            <pattern id={pid} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill={ink} />
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--surface)" strokeOpacity="0.35" strokeWidth="1.3" />
            </pattern>
          </defs>
          {v.map((h, i) => (
            <g key={i}>
              <rect x={22 + i * 28} y={80 - h} width="7" height={h} rx="2" fill={i === 0 ? tint : `url(#${pid})`} />
              <rect x={31 + i * 28} y={80 - h * 0.7} width="7" height={h * 0.7} rx="2" fill={faint} />
            </g>
          ))}
          <line x1="14" x2="186" y1="80.5" y2="80.5" stroke={soft} />
        </svg>
      )
    }
    case 'report':
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          <rect x="44" y="8" width="112" height="78" rx="5" fill="var(--surface)" stroke={soft} />
          <rect x="56" y="18" width="40" height="5" rx="2" fill={ink} />
          <rect x="56" y="27" width="64" height="3" rx="1.5" fill={faint} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={56 + i * 30} y="38" width="24" height="16" rx="3" fill={i === 0 ? tint : 'var(--surface-muted)'} fillOpacity={i === 0 ? 0.3 : 1} stroke={soft} />
            </g>
          ))}
          {[60, 66, 72].map((y, i) => (
            <rect key={y} x="56" y={y} width={i === 2 ? 50 : 86} height="2.5" rx="1.25" fill={soft} />
          ))}
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          <circle cx="30" cy="22" r="7" fill={tint} fillOpacity="0.5" />
          <rect x="42" y="12" width="92" height="20" rx="9" fill="var(--surface)" stroke={soft} />
          <rect x="50" y="19" width="60" height="3" rx="1.5" fill={faint} />
          <rect x="50" y="25" width="40" height="3" rx="1.5" fill={soft} />
          <rect x="88" y="40" width="96" height="18" rx="9" fill={ink} />
          <rect x="98" y="47.5" width="64" height="3" rx="1.5" fill="var(--surface)" fillOpacity="0.6" />
          <circle cx="30" cy="72" r="7" fill={tint} fillOpacity="0.5" />
          <rect x="42" y="64" width="70" height="16" rx="8" fill="var(--surface)" stroke={soft} />
          <rect x="50" y="70.5" width="44" height="3" rx="1.5" fill={faint} />
        </svg>
      )
    case 'table':
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          <rect x="18" y="10" width="164" height="72" rx="5" fill="var(--surface)" stroke={soft} />
          <rect x="18" y="10" width="164" height="14" rx="5" fill="var(--surface-muted)" />
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <line x1="18" x2="182" y1={24 + r * 14.5} y2={24 + r * 14.5} stroke={soft} />
              <rect x="28" y={29 + r * 14.5} width={40 - r * 4} height="3" rx="1.5" fill={faint} />
              <rect x="112" y={29 + r * 14.5} width="18" height="3" rx="1.5" fill={ink} />
              <rect x="146" y={29 + r * 14.5} width="22" height="3" rx="1.5" fill={r === 0 ? tint : soft} />
            </g>
          ))}
        </svg>
      )
    case 'diff':
      return (
        <svg viewBox="0 0 200 90" className="h-full w-full">
          <rect x="14" y="12" width="82" height="66" rx="5" fill="var(--surface)" stroke={soft} />
          <rect x="104" y="12" width="82" height="66" rx="5" fill="var(--surface)" stroke={tint} strokeOpacity="0.7" />
          {[24, 32, 40].map((y) => (
            <rect key={y} x="24" y={y} width="56" height="3" rx="1.5" fill={soft} />
          ))}
          <line x1="24" x2="70" y1="33.5" y2="33.5" stroke={faint} />
          {[24, 32, 40, 48, 56].map((y, i) => (
            <rect key={y} x="114" y={y} width={i > 2 ? 44 : 60} height="3" rx="1.5" fill={i > 2 ? tint : faint} fillOpacity={i > 2 ? 0.8 : 1} />
          ))}
        </svg>
      )
  }
}
