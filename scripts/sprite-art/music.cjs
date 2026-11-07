'use strict';

const electricGuitar = require('./electric-guitar-raw.cjs');

module.exports = {
  Harmonica: `<rect x="8" y="27" width="56" height="20" rx="4" fill="#E5E7EB"/>
    <rect x="12" y="30" width="48" height="14" rx="2" fill="#F59E0B"/>
    <g fill="#78350F" stroke="none">
      <rect x="16" y="33" width="4" height="8" rx="1"/><rect x="23" y="33" width="4" height="8" rx="1"/>
      <rect x="30" y="33" width="4" height="8" rx="1"/><rect x="37" y="33" width="4" height="8" rx="1"/>
      <rect x="44" y="33" width="4" height="8" rx="1"/><rect x="51" y="33" width="4" height="8" rx="1"/>
    </g>
    <path d="M8 34h56m-56 6h56" stroke="#94A3B8" stroke-width="1.5"/>`,

  Tambourine: `<circle cx="36" cy="34" r="24" fill="#FDE68A"/>
    <circle cx="36" cy="34" r="19" fill="#FEF3C7"/>
    <g fill="#D97706" stroke="none">
      <circle cx="20" cy="20" r="3"/><circle cx="36" cy="14" r="3"/><circle cx="52" cy="20" r="3"/>
      <circle cx="16" cy="36" r="3"/><circle cx="56" cy="36" r="3"/>
      <circle cx="22" cy="50" r="3"/><circle cx="36" cy="56" r="3"/><circle cx="50" cy="50" r="3"/>
    </g>
    <path d="M18 26q18 8 36 0" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <path d="M36 58v6" stroke="#92400E" stroke-width="2"/>`,

  Trombone: `<path d="M5 24q-5 12 0 24l19-6V30Z" fill="#FACC15"/>
    <path d="M5 24q-5 12 0 24" fill="none" stroke="#B45309" stroke-width="2"/>
    <path d="M22 30h31v8H22Z" fill="#F59E0B"/>
    <path d="M29 38v14q0 8 8 8h13q8 0 8-8V38" fill="none" stroke="#FBBF24" stroke-width="5"/>
    <path d="M29 38v14q0 8 8 8h13q8 0 8-8V38" fill="none" stroke="#B45309" stroke-width="1.2"/>
    <path d="M24 30v8m5 0v5m29-5v6" stroke="#D97706" stroke-width="2"/>
    <path d="M53 32h6" stroke="#FEF3C7" stroke-width="2"/>
    <circle cx="18" cy="23" r="3" fill="#92400E"/>
    <path d="M18 26v4" stroke="#B45309" stroke-width="2"/>`,

  Flute: `<g transform="rotate(-10 36 36)">
    <rect x="6" y="32" width="58" height="8" rx="4" fill="#E5E7EB"/>
    <rect x="6" y="32" width="12" height="8" rx="4" fill="#CBD5E1"/>
    <circle cx="12" cy="36" r="2.5" fill="#64748B"/>
    <rect x="60" y="30" width="6" height="12" rx="3" fill="#CBD5E1"/>
    <g fill="#F8FAFC" stroke="#64748B" stroke-width="1.2">
      <circle cx="24" cy="32" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="40" cy="32" r="3"/><circle cx="48" cy="32" r="3"/><circle cx="56" cy="32" r="3"/>
    </g>
    <path d="M24 35v4m8-4v4m8-4v4m8-4v4m8-4v4" stroke="#94A3B8" stroke-width="1.5"/>
    <path d="M18 40h34" stroke="#CBD5E1" stroke-width="1.5"/>
  </g>`,

  Harp: `<path d="M14 58V20q0-6 6-6h4v44Z" fill="#D97706"/>
    <path d="M20 14q18-4 34 10l-2 6Q38 18 22 20Z" fill="#F59E0B"/>
    <path d="M14 58h44l-4-8H18Z" fill="#B45309"/>
    <path d="M24 20v30M30 21v29M36 23v27M42 25v25M48 27v23M54 30v20" stroke="#FEF3C7" stroke-width="1.3"/>
    <circle cx="18" cy="14" r="3" fill="#F59E0B"/>
    <path d="M10 62h52" stroke="#92400E" stroke-width="3"/>`,

  Clarinet: `<g transform="rotate(8 36 36)">
    <path d="M32 4h8v6l-4 4-4-4Z" fill="#1F2937"/>
    <rect x="31" y="14" width="10" height="8" rx="2" fill="#374151"/>
    <rect x="31" y="22" width="10" height="20" rx="3" fill="#111827"/>
    <rect x="30" y="42" width="12" height="14" rx="3" fill="#111827"/>
    <path d="M30 56h12l4 10H26Z" fill="#111827"/>
    <path d="M26 66q10 4 20 0" fill="none" stroke="#4B5563" stroke-width="2"/>
    <g fill="#D1D5DB" stroke="#6B7280" stroke-width="1">
      <circle cx="36" cy="28" r="2"/><circle cx="36" cy="34" r="2"/><circle cx="36" cy="40" r="2"/><circle cx="36" cy="48" r="2"/>
    </g>
    <path d="M30 30h-3m9 6h-3m9 6h-3" stroke="#9CA3AF" stroke-width="1.5"/>
    <path d="M31 18h10" stroke="#9CA3AF" stroke-width="1.2"/>
  </g>`,

  'Snare Drum': `<ellipse cx="36" cy="54" rx="22" ry="7" fill="#B91C1C"/>
    <rect x="14" y="32" width="44" height="22" rx="3" fill="#DC2626"/>
    <ellipse cx="36" cy="32" rx="22" ry="7" fill="#F8FAFC"/>
    <ellipse cx="36" cy="32" rx="22" ry="7" fill="none" stroke="#CBD5E1" stroke-width="2.5"/>
    <path d="M14 54q22 8 44 0" fill="none" stroke="#CBD5E1" stroke-width="2.5"/>
    <path d="M20 34v18m8-20v20m8-20v20m8-20v20m8-20v20" stroke="#94A3B8" stroke-width="1.5"/>
    <path d="M10 16 34 31M62 16 38 31" stroke="#C27A3A" stroke-width="3.5"/>
    <circle cx="10" cy="16" r="3" fill="#92400E"/>
    <circle cx="62" cy="16" r="3" fill="#92400E"/>
    <circle cx="34" cy="31" r="2" fill="#FDE68A"/>
    <circle cx="38" cy="31" r="2" fill="#FDE68A"/>`,

  Maracas: `<g transform="rotate(-18 24 30)">
    <ellipse cx="24" cy="26" rx="10" ry="14" fill="#F97316"/>
    <path d="M24 12v28" stroke="#FDBA74" stroke-width="3"/>
    <rect x="20" y="38" width="8" height="6" rx="2" fill="#FDE68A"/>
    <rect x="21" y="42" width="6" height="20" rx="3" fill="#92400E"/>
    <g fill="#EA580C" stroke="none"><circle cx="20" cy="22" r="1.5"/><circle cx="28" cy="28" r="1.5"/><circle cx="20" cy="32" r="1.5"/></g>
  </g>
  <g transform="rotate(18 48 30)">
    <ellipse cx="48" cy="26" rx="10" ry="14" fill="#22C55E"/>
    <path d="M48 12v28" stroke="#86EFAC" stroke-width="3"/>
    <rect x="44" y="38" width="8" height="6" rx="2" fill="#FDE68A"/>
    <rect x="45" y="42" width="6" height="20" rx="3" fill="#92400E"/>
    <g fill="#16A34A" stroke="none"><circle cx="44" cy="22" r="1.5"/><circle cx="52" cy="28" r="1.5"/><circle cx="44" cy="32" r="1.5"/></g>
  </g>`,

  Cello: `<path d="M33 11h6v17h-6Z" fill="#78350F"/>
    <path d="M31 9q0-5 5-5t5 5v3h-3V9h-4v3h-3Z" fill="#92400E"/>
    <path d="M31 9h10" stroke="#FCD34D" stroke-width="1.5"/>
    <path d="M33 28h6c7 0 12 4 12 9 0 3-2 5-5 6 3 1 5 4 5 8 0 6-6 10-15 10s-15-4-15-10c0-4 2-7 5-8-3-1-5-3-5-6 0-5 5-9 12-9Z" fill="#B45309"/>
    <path d="M34.5 14v44m3-44v44" stroke="#FEF3C7" stroke-width="1.1"/>
    <path d="M28 49h16" stroke="#78350F" stroke-width="2.5"/>
    <path d="M27 44q-4 5-2 11m20-11q4 5 2 11" fill="none" stroke="#78350F" stroke-width="1.5"/>
    <path d="M32 57h8l2 4H30Z" fill="#78350F"/>
    <path d="M36 61v6m-4 0h8" stroke="#374151" stroke-width="2"/>`,

  Ukulele: `<g transform="rotate(30 36 36)">
    <path d="M32 28c-8 0-14 5-14 11 0 4 2 7 5 8-2 3-3 5-3 8 0 6 5 11 12 11s12-5 12-11c0-3-1-5-3-8 3-1 5-4 5-8 0-6-6-11-14-11Z" fill="#D97706"/>
    <circle cx="32" cy="46" r="4" fill="#451A03"/>
    <rect x="27" y="58" width="10" height="2.5" rx="1" fill="#78350F"/>
    <rect x="29" y="10" width="6" height="20" fill="#92400E"/>
    <rect x="26" y="3" width="12" height="9" rx="2" fill="#78350F"/>
    <path d="M29 16h6M29 20h6M29 24h6" stroke="#FDE68A" stroke-width="1"/>
    <path d="M30 8v52M32 8v52M34 8v52" stroke="#FEF3C7" stroke-width="0.8"/>
    <circle cx="25" cy="6" r="1.5" fill="#FDE68A"/><circle cx="25" cy="10" r="1.5" fill="#FDE68A"/>
    <circle cx="39" cy="6" r="1.5" fill="#FDE68A"/><circle cx="39" cy="10" r="1.5" fill="#FDE68A"/>
  </g>`,

  'Acoustic Guitar': `<g transform="rotate(30 36 36)">
    <path d="M32 30c-8 0-14 5-14 10 0 4 2 7 5 9-2 3-3 5-3 8 0 5 5 9 12 9s12-4 12-9c0-3-1-5-3-8 3-2 5-5 5-9 0-5-6-10-14-10Z" fill="#D97706"/>
    <circle cx="32" cy="48" r="5" fill="#451A03"/>
    <circle cx="32" cy="48" r="6.5" fill="none" stroke="#FDE68A" stroke-width="1.2"/>
    <rect x="27" y="57" width="10" height="2.5" rx="1" fill="#78350F"/>
    <path d="M38 46q7 1 5 8-2 5-7 3-4-2 2-11Z" fill="#292524" opacity=".7"/>
    <rect x="29" y="10" width="6" height="20" fill="#92400E"/>
    <rect x="26" y="3" width="12" height="9" rx="2" fill="#78350F"/>
    <path d="M29 16h6M29 20h6M29 24h6" stroke="#FDE68A" stroke-width="1"/>
    <path d="M30 8v52M32 8v52M34 8v52" stroke="#FEF3C7" stroke-width="0.8"/>
    <circle cx="25" cy="6" r="1.5" fill="#FDE68A"/><circle cx="25" cy="10" r="1.5" fill="#FDE68A"/>
    <circle cx="39" cy="6" r="1.5" fill="#FDE68A"/><circle cx="39" cy="10" r="1.5" fill="#FDE68A"/>
  </g>`,

  'Electric Guitar': electricGuitar,

  'Drum Kit': `<ellipse cx="36" cy="44" rx="16" ry="9" fill="#EF4444"/>
    <path d="M20 32h32v12H20Z" fill="#DC2626"/>
    <ellipse cx="36" cy="32" rx="16" ry="7" fill="#FEF3C7"/>
    <circle cx="20" cy="20" r="9" fill="#FACC15"/>
    <circle cx="52" cy="18" r="9" fill="#FACC15"/>
    <path d="M20 29v8m32-10v8" stroke="#92400E" stroke-width="2"/>
    <path d="M14 16 28 28m28-14L44 28" stroke="#92400E" stroke-width="3"/>
    <path d="M24 53 20 64m28-11 4 11" stroke="#374151" stroke-width="2"/>`
};
