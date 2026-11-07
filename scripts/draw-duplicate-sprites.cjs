'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const stroke = '#374151';
const wrap = (art) => `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><g stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>\n`;

function spacecraft(name) {
  const drawings = {
    'Space Shuttle': '<path d="M12 47 28 31 52 21 45 45 27 60 24 48Z" fill="#e5e7eb"/><path d="m28 31 5 17 12-3 7-24-24 10Z" fill="#f97316"/><path d="m23 47-8 9 13-4m17-7 12 6-7-15" fill="#38bdf8"/><circle cx="39" cy="36" r="4" fill="#60a5fa"/><path d="m21 53-8 8m13-5-4 9" stroke="#fb923c"/>',
    'Toy Rocket': '<path d="M36 8q18 10 13 36L36 54 23 44Q18 18 36 8Z" fill="#f472b6"/><path d="m23 35-11 13 14-3m23-10 11 13-14-4" fill="#facc15"/><circle cx="36" cy="29" r="6" fill="#bae6fd"/><path d="M31 51q-3 8 0 12l5-5 5 5q3-5 0-12" fill="#fb923c"/>',
    'Spaceship': '<path d="M8 39q6-19 28-23 22 4 28 23-8 13-28 15Q22 52 8 39Z" fill="#a78bfa"/><ellipse cx="36" cy="35" rx="11" ry="8" fill="#bae6fd"/><path d="M15 43 9 55l17-7m31-5 6 12-17-7" fill="#f97316"/><circle cx="36" cy="35" r="3" fill="#38bdf8"/><path d="M25 53q-2 7 1 11m20-11q2 7-1 11" stroke="#fbbf24"/>'
  };
  return drawings[name];
}

function satellite(name) {
  if (name === 'Lunar Lander') return '<path d="M25 24h22l5 22H20Z" fill="#d1d5db"/><path d="m25 46-9 13m31-13 9 13M21 59h-8m47 0h-8M36 24V14m-7 0h14" fill="none"/><path d="m25 32-13-3m35 3 13-3" stroke="#facc15" stroke-width="4"/><circle cx="36" cy="34" r="5" fill="#fb923c"/><path d="m31 46 5 5 5-5" fill="#fbbf24"/>'
  if (name === 'Space Probe') return '<path d="M36 12 43 21 36 30 29 21Z" fill="#facc15"/><rect x="28" y="27" width="16" height="19" rx="4" fill="#cbd5e1"/><circle cx="36" cy="34" r="4" fill="#38bdf8"/><path d="M28 30H11v14h17m16-14h17v14H44" fill="#60a5fa"/><path d="M15 30v14m8-14v14m26-14v14m8-14v14M36 46v13m-8 0h16" fill="none"/><circle cx="36" cy="58" r="3" fill="#fb923c"/>'
  return null;
}

function planet(name) {
  const p = {
    Saturn: ['#fbbf24', '<ellipse cx="36" cy="36" rx="29" ry="9" fill="none" stroke="#a16207" stroke-width="5"/><circle cx="36" cy="36" r="16" fill="#fcd34d"/><path d="M23 31q13 5 26 0m-25 10q12-4 24 1" fill="none" stroke="#d97706"/>'],
    Jupiter: ['#fb923c', '<circle cx="36" cy="36" r="25" fill="#f59e0b"/><path d="M13 27h46m-48 8h50M14 45h44m-38-17q8 6 15 0m5 17q8-5 15 0" fill="none" stroke="#b45309" stroke-width="4"/><ellipse cx="44" cy="39" rx="6" ry="4" fill="#dc2626"/>'],
    Venus: ['#fcd34d', '<circle cx="36" cy="36" r="24" fill="#fbbf24"/><path d="M17 28q13 9 37 0M14 38q18-8 44 2M21 48q12-7 31 1" fill="none" stroke="#d97706" stroke-width="4"/><path d="M36 58v9m-7-4h14" fill="none"/>'],
    Mercury: ['#9ca3af', '<circle cx="36" cy="36" r="24" fill="#9ca3af"/><circle cx="27" cy="27" r="5" fill="#6b7280"/><circle cx="44" cy="32" r="4" fill="#d1d5db"/><circle cx="31" cy="45" r="7" fill="#6b7280"/><circle cx="47" cy="46" r="3" fill="#4b5563"/>'],
    Neptune: ['#38bdf8', '<circle cx="36" cy="36" r="24" fill="#2563eb"/><path d="M18 27q15 8 36 0m-39 9q20-6 42 3m-37 12q14-8 33-3" fill="none" stroke="#93c5fd" stroke-width="4"/><path d="m24 22 4 2m20 25 3-2" stroke="#fff"/>'],
    Uranus: ['#67e8f9', '<ellipse cx="36" cy="36" rx="10" ry="25" fill="#22d3ee"/><ellipse cx="36" cy="36" rx="24" ry="8" fill="none" stroke="#0e7490" stroke-width="4"/><path d="M20 33q16 4 32 0m-29 8q13-4 26 0" fill="none" stroke="#a5f3fc" stroke-width="3"/>'],
    'Solar System': ['#fbbf24', '<circle cx="36" cy="36" r="8" fill="#facc15"/><ellipse cx="36" cy="36" rx="19" ry="9" fill="none"/><ellipse cx="36" cy="36" rx="29" ry="16" fill="none"/><circle cx="55" cy="36" r="4" fill="#38bdf8"/><circle cx="15" cy="36" r="5" fill="#f97316"/><circle cx="44" cy="22" r="3" fill="#a78bfa"/><circle cx="27" cy="50" r="3" fill="#22c55e"/>'],
    'Planet Ring': ['#a78bfa', '<ellipse cx="36" cy="37" rx="29" ry="10" fill="none" stroke="#f59e0b" stroke-width="7"/><circle cx="36" cy="36" r="15" fill="#8b5cf6"/><path d="M25 30q11 6 22 0m-22 12q11-5 22 0" fill="none" stroke="#c4b5fd" stroke-width="3"/>']
  }[name];
  return `<g>${p[1]}</g>`;
}

function animal(name) {
  const birds = {
    Puffin: '<path d="M20 56q-8-27 4-40 12-12 25 0 12 13 4 40Z" fill="#263238"/><ellipse cx="36" cy="40" rx="13" ry="16" fill="#fff7ed"/><path d="m46 29 16 6-16 7-5-6Z" fill="#fb923c"/><circle cx="43" cy="25" r="2" fill="#fff"/><path d="m25 56-3 6m23-6 3 6" fill="none"/>',
    Robin: '<path d="M14 49q3-25 24-29 19 2 23 20L47 48 34 44l-9 12Z" fill="#8b5a2b"/><path d="M26 42q11-10 24 1l-4 16H27Z" fill="#ef4444"/><path d="m56 35 12 4-12 4Z" fill="#facc15"/><circle cx="51" cy="31" r="2" fill="#111827"/><path d="m29 56-2 8m13-8v8" fill="none"/>',
    'Blue Jay': '<path d="M14 48q4-22 23-25l8-13 5 14q12 7 8 21L42 48 29 58 22 52Z" fill="#2563eb"/><path d="m47 34 19 3-17 8Z" fill="#111827"/><path d="M19 48q13-7 25 2l-5 9-12-2Z" fill="#fff"/><path d="m29 58-2 7m13-7 2 7" fill="none"/><circle cx="49" cy="29" r="2" fill="#fff"/>',
    Woodpecker: '<path d="M22 58q-8-25 4-39 11-11 25-2l-5 20 12 9-13 12Z" fill="#374151"/><path d="M26 22q10-15 24-6l-4 9-18 4Z" fill="#ef4444"/><path d="m44 34 24-8-17 14Z" fill="#facc15"/><path d="M28 41q9-7 17 1l-4 13H29Z" fill="#fff"/><circle cx="46" cy="29" r="2" fill="#111827"/>',
    Hummingbird: '<path d="M21 41q13-13 25-4l11 8-15 3-9 13Z" fill="#14b8a6"/><path d="m41 39 27-16-20 22Z" fill="#374151"/><path d="M32 38q-8-17-20-19 3 18 18 25" fill="#a7f3d0"/><path d="m35 51-5 11m12-11 2 10" fill="none"/><circle cx="43" cy="37" r="2" fill="#111827"/>',
    Pelican: '<path d="M13 44q6-21 27-22 18 3 20 21L45 53 24 55Z" fill="#e5e7eb"/><path d="m48 32 20 7-18 7-4-7Z" fill="#fbbf24"/><path d="M52 43q-4 16-18 12" fill="none" stroke="#f97316" stroke-width="5"/><path d="m29 54-3 10m18-10 4 10" fill="none"/><circle cx="48" cy="29" r="2" fill="#111827"/>',
    Seagull: '<path d="M13 43q13-18 24-6 11-12 22 6L46 49 36 44 26 50Z" fill="#f8fafc"/><path d="M21 43q13-17 17-6m0 0q11-13 19 6" fill="none" stroke="#64748b" stroke-width="5"/><path d="m53 39 14 4-14 4Z" fill="#fbbf24"/><circle cx="50" cy="35" r="2" fill="#111827"/><path d="m30 49-2 12m14-12 2 12m-18 1h8m7 0h8" fill="none"/>',
    Sparrow: '<path d="M14 48q5-22 23-24 20 3 22 22L43 52 27 57Z" fill="#a16207"/><path d="M25 29 38 38 22 43Z" fill="#78350f"/><ellipse cx="39" cy="46" rx="10" ry="8" fill="#fef3c7"/><path d="m53 39 14 4-14 4Z" fill="#fbbf24"/><circle cx="49" cy="35" r="2" fill="#111827"/><path d="m31 55-2 8m13-9 2 9" fill="none"/>',
    Heron: '<path d="M32 57q-2-10 4-17-12-11-6-25 5-11 15-6 5 5 0 13l-6 10q12 7 9 25Z" fill="#94a3b8"/><path d="m44 19 24 2-23 4Z" fill="#facc15"/><path d="M34 56 31 66m14-10 4 10m-20 0h7m12 0h7" fill="none"/><circle cx="44" cy="14" r="2" fill="#111827"/>'
  };
  if (birds[name]) return birds[name];
  const sea = {
    Swordfish: '<path d="M12 38q18-20 41-5l-22 8q-8 7-19-3Z" fill="#38bdf8"/><path d="m51 33 17-11-12 17m-36-5-8-10 2 17 10-1" fill="#64748b"/><path d="m35 42 5 10 5-9m-17-10 6 8m6-11 6 7" fill="none" stroke="#1e3a8a" stroke-width="2"/><circle cx="49" cy="33" r="2" fill="#111827"/>',
    'Sea Turtle': '<ellipse cx="36" cy="39" rx="18" ry="14" fill="#65a30d"/><path d="m21 31-9-8-2 11 11 5m29-8 9-8 2 11-11 5M24 49l-8 9 12-2m20-7 8 9-12-2" fill="#84cc16"/><path d="M25 31q11-10 22 0v16q-11 10-22 0Z" fill="#a16207"/><path d="m27 35 8-5 9 5-2 9-8 4-8-5Z" fill="none" stroke="#fef3c7"/><circle cx="59" cy="37" r="2" fill="#111827"/>',
    Seahorse: '<path d="M44 16q-14-9-21 2-7 11 3 19 8 7 1 14-6 6 2 10 9 3 15-5 4-7-4-11-6-4-1-8 9-8 10-15 1-9-7-12Z" fill="#fb923c"/><path d="m44 18 14-5-7 10m-22-7-5-7m-2 16-7-4m9 12-7 2m24-14 8 4m-13 18 8 5" fill="#fbbf24"/><circle cx="43" cy="20" r="2" fill="#111827"/><path d="M31 55q-8 7-2 10" fill="none"/>',
    Stingray: '<path d="M36 15q8 12 30 18-9 14-26 8l-4 19-4-19q-17 6-26-8 22-6 30-18Z" fill="#64748b"/><path d="M30 43q6 5 12 0m-6 17 5 9" fill="none"/><circle cx="30" cy="34" r="2" fill="#fff"/><circle cx="42" cy="34" r="2" fill="#fff"/>',
    Orca: '<path d="M10 40q10-19 36-15 12 2 16 12l-8 11-13-4-9 8-12-8-10 3Z" fill="#111827"/><path d="M18 34q12-6 22 0l-3 13q-9-5-19-1Z" fill="#fff"/><path d="m57 39 11 9-16-2m-11-20 7-10 7 13" fill="#111827"/><circle cx="52" cy="34" r="2" fill="#fff"/>',
    Nautilus: '<path d="M18 47q-8-10 1-23 11-14 30-8 15 5 13 19-1 12-15 17l-13 4-16-9Z" fill="#fef3c7"/><path d="M36 43q-8-4-5-12 4-9 12-5 6 4 1 9-4 4-7 0-2-3 1-4" fill="none" stroke="#d97706" stroke-width="4"/><path d="m45 50 14 8-4-15m-4-1 13 3" fill="#fb923c"/>'
  };
  return sea[name];
}

function plant(name) {
  const drawings = {
    'Oak Tree': '<path d="M33 42h8v23h-8Z" fill="#92400e"/><circle cx="25" cy="30" r="15" fill="#65a30d"/><circle cx="42" cy="24" r="16" fill="#4d7c0f"/><circle cx="51" cy="36" r="12" fill="#84cc16"/><path d="m23 25 3 3-3 3m18-12 3 4-4 2m11 10 3 3-4 2" fill="none" stroke="#d9f99d"/>',
    Sunflower: '<path d="M34 38h5v29h-5Z" fill="#15803d"/><path d="M36 56q-13-12-19 1 12 5 19 1m1-8q12-13 20-3-7 12-20 7" fill="#4ade80"/><circle cx="36" cy="28" r="9" fill="#78350f"/><g fill="#facc15"><ellipse cx="36" cy="13" rx="5" ry="9"/><ellipse cx="36" cy="43" rx="5" ry="9"/><ellipse cx="21" cy="28" rx="9" ry="5"/><ellipse cx="51" cy="28" rx="9" ry="5"/><ellipse cx="25" cy="17" rx="5" ry="9" transform="rotate(-45 25 17)"/><ellipse cx="47" cy="17" rx="5" ry="9" transform="rotate(45 47 17)"/><ellipse cx="25" cy="39" rx="5" ry="9" transform="rotate(45 25 39)"/><ellipse cx="47" cy="39" rx="5" ry="9" transform="rotate(-45 47 39)"/></g>',
    Dandelion: '<path d="M35 38h4v28h-4Zm2-1L22 20m15 17 15-19m-15 19V12m0 25L14 33m23 4 22-6" fill="none" stroke="#4d7c0f" stroke-width="3"/><g fill="#fff"><circle cx="37" cy="12" r="4"/><circle cx="22" cy="20" r="4"/><circle cx="52" cy="18" r="4"/><circle cx="14" cy="33" r="4"/><circle cx="59" cy="31" r="4"/><circle cx="29" cy="24" r="3"/><circle cx="46" cy="25" r="3"/></g><g fill="#facc15"><circle cx="37" cy="12" r="2"/><circle cx="22" cy="20" r="2"/><circle cx="52" cy="18" r="2"/><circle cx="14" cy="33" r="2"/><circle cx="59" cy="31" r="2"/></g>',
    Vine: '<path d="M17 64q42-13 15-31-16-11 13-25m-2 51q-9-13 11-22" fill="none" stroke="#15803d" stroke-width="4"/><path d="M28 46q-16 3-17-9 15-5 17 9Zm10-17q-2-16 11-18 5 14-11 18Zm1 16q14-13 24-4-8 13-24 4Zm-8-18Q15 25 17 14q14 0 14 13Z" fill="#4ade80"/><path d="m15 38 13 8m-1-25 13 7m-1 19 16-4" fill="none" stroke="#166534"/>',
    Lotus: '<path d="M36 58Q18 51 20 36q11 2 16 18-4-23 0-37 9 13 2 37 7-19 19-18 1 15-18 22Z" fill="#f472b6"/><path d="M12 53q24-9 48 0-5 13-24 13T12 53Z" fill="#34d399"/><path d="M21 54q15 6 30 0" fill="none" stroke="#15803d"/><circle cx="36" cy="51" r="5" fill="#facc15"/>',
    'Pitcher Plant': '<path d="M31 64q2-17-3-29-8-13-1-22 12-8 20 3 3 10-6 18-5 13-4 30Z" fill="#dc2626"/><path d="M29 36q-12-8-13-22 15 3 18 17m7-8q8-13 19-11-1 13-16 19" fill="#4ade80"/><path d="M26 31q8 5 17 0m-16-14q6 6 7 14m11-6 11-8m-8 11 9-4" fill="none" stroke="#166534"/><path d="M28 22q8-5 15 1" fill="none" stroke="#fef08a" stroke-width="3"/>'
  };
  return drawings[name];
}

function building(name) {
  const drawings = {
    Cottage: '<path d="M10 34 36 13l26 21v30H10Z" fill="#fca5a5"/><path d="m6 35 30-25 30 25" fill="#7f1d1d"/><path d="M29 64V44q7-11 14 0v20" fill="#92400e"/><rect x="15" y="39" width="10" height="10" fill="#bae6fd"/><path d="M20 39v10m-5-5h10" stroke="#fff"/><path d="M49 22V12h8v17" fill="#d1d5db"/>',
    Lighthouse: '<path d="m23 25 7 39h13l7-39Z" fill="#f8fafc"/><path d="m26 42 18 4-2 10-14-3Z" fill="#ef4444"/><path d="M22 25h29l-4-8H26Z" fill="#dc2626"/><path d="M29 17V8h15v9" fill="#facc15"/><path d="M36 8V3m8 7 8-5M28 10l-8-5" stroke="#fbbf24" stroke-width="3"/><rect x="33" y="28" width="7" height="10" fill="#bae6fd"/><path d="M12 65q12-7 24 0t24 0" fill="none" stroke="#38bdf8" stroke-width="4"/>',
    Apartment: '<path d="M19 64V9h35v55Z" fill="#94a3b8"/><path d="M15 9h43v7H15Z" fill="#475569"/><g fill="#bae6fd"><rect x="25" y="20" width="8" height="9"/><rect x="40" y="20" width="8" height="9"/><rect x="25" y="36" width="8" height="9"/><rect x="40" y="36" width="8" height="9"/></g><path d="M34 64V51q3-6 7 0v13m-24 0h39" fill="#334155"/><path d="M27 33h19" stroke="#64748b"/>'
  };
  return drawings[name];
}

function vehicle(name) {
  const drawings = {
    'Fire Station': '<path d="M8 31 36 12l28 19v34H8Z" fill="#ef4444"/><path d="m5 32 31-23 31 23" fill="#991b1b"/><path d="M17 38h38v17H17Z" fill="#fef3c7"/><path d="M23 38v17m13-17v17m13-17v17" stroke="#dc2626"/><path d="M30 64V48q6-8 12 0v16" fill="#7f1d1d"/><path d="M32 25h8v8h-8Z" fill="#facc15"/>',
    'Train Station': '<path d="M9 29 36 11l27 18v34H9Z" fill="#fef3c7"/><path d="m5 30 31-23 31 23" fill="#7c3aed"/><path d="M18 37h36v6H18Z" fill="#7c3aed"/><path d="M32 63V46q4-6 8 0v17" fill="#92400e"/><circle cx="23" cy="52" r="3" fill="#60a5fa"/><circle cx="49" cy="52" r="3" fill="#60a5fa"/><path d="M20 24h32" stroke="#fff" stroke-width="3"/>',
    'Toy Train': '<path d="M12 34h35v22H12Z" fill="#3b82f6"/><path d="M47 41h12l6 9v6H47Z" fill="#ef4444"/><rect x="19" y="25" width="13" height="10" fill="#bae6fd"/><path d="M35 25V16h8l6 9" fill="#facc15"/><circle cx="22" cy="58" r="6" fill="#374151"/><circle cx="52" cy="58" r="6" fill="#374151"/><path d="M22 58h30" fill="none"/>',
    'Toy Airplane': '<path d="M36 8q5 0 6 12l2 15 17 9v7l-17-5-2 13-7 6-7-6-2-13-17 5v-7l17-9 2-15q1-12 8-12Z" fill="#facc15"/><path d="m30 35 6 4 6-4m-9 12 3 2 3-2" fill="none" stroke="#ef4444" stroke-width="3"/><circle cx="36" cy="25" r="3" fill="#38bdf8"/>',
    'Shooting Star': '<path d="M20 52q-9-15 2-31 13-17 33-11Q42 22 43 35q0 12-12 18Z" fill="#fbbf24"/><path d="m12 62 12-18m-2 20 14-20m-29 11 11-15" stroke="#fb923c" stroke-width="4"/><path d="m37 28 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#fff"/>',
    Treehouse: '<path d="m12 34 24-20 24 20v29H12Z" fill="#a16207"/><path d="m8 35 28-24 28 24" fill="#65a30d"/><rect x="28" y="41" width="16" height="22" fill="#78350f"/><circle cx="36" cy="31" r="8" fill="#bae6fd"/><path d="M10 64h52M18 58l-8 6m44-6 8 6" fill="none" stroke="#92400e" stroke-width="4"/>',
    Barn: '<path d="M9 29 36 10l27 19v35H9Z" fill="#ef4444"/><path d="M5 30 36 7l31 23" fill="#7f1d1d"/><path d="M22 64V39l14-10 14 10v25Z" fill="#fef2f2"/><path d="m22 39 14 11 14-11M36 50v14" fill="none" stroke="#991b1b" stroke-width="4"/><rect x="32" y="17" width="8" height="8" fill="#fef3c7"/>',
    Greenhouse: '<path d="M9 32 36 10l27 22v32H9Z" fill="#bbf7d0"/><path d="M5 33 36 7l31 26" fill="none" stroke="#166534" stroke-width="5"/><path d="M36 11v53M10 36h52" fill="none" stroke="#166534" stroke-width="3"/><path d="M18 60V47m18 13V43m18 17V49" stroke="#15803d" stroke-width="3"/><circle cx="18" cy="45" r="5" fill="#f472b6"/><circle cx="36" cy="41" r="5" fill="#facc15"/><circle cx="54" cy="47" r="5" fill="#a78bfa"/>'
  };
  return drawings[name];
}

function instrument(name) {
  const strings = {
    'Electric Guitar': '<path d="M26 42q-12-12-19 0-5 9 4 15 10 6 18-4l8-9-6-7Z" fill="#ef4444"/><path d="m31 39 25-25 7 7-25 25" fill="#facc15"/><path d="m51 16 7-7 8 8-7 7m-29 17 7 7m-21-5 5 5m3-10 5 5" fill="none"/><path d="m34 38 8 8" stroke="#fff"/>',
    Ukulele: '<path d="M31 43q-14-8-19 4-4 10 7 15 10 4 16-7l5-8-6-6Z" fill="#d97706"/><path d="m36 41 22-22 6 6-22 22" fill="#92400e"/><path d="m57 19 6-6 5 5-6 6" fill="#facc15"/><path d="m35 42 8 8m-22 3 14-9m-8 15 14-11" fill="none" stroke="#fef3c7"/>',
    Harp: '<path d="M15 61q10-3 13-19l7-31q3-7 11-3l11 7q4 3 0 7l-6 4q-5 3-8-2l-5-5-8 27q-4 19-14 21Z" fill="#fbbf24"/><path d="M36 17 23 58m18-39L27 57m19-36L31 57m11-42L35 56m11-34L39 55m10-35L43 54m10-31L47 52" fill="none" stroke="#92400e" stroke-width="1"/>'
  };
  if (strings[name]) return strings[name];
  const drums = {
    'Drum Kit': '<ellipse cx="36" cy="45" rx="15" ry="8" fill="#ef4444"/><path d="M21 31h30v14H21Z" fill="#dc2626"/><ellipse cx="36" cy="31" rx="15" ry="7" fill="#fef3c7"/><path d="M16 20h17v9H16Zm24-7h17v9H40Z" fill="#facc15"/><path d="M24 53 19 66m29-13 5 13M16 29l-4-5m46 5 4-5" fill="none"/><path d="m19 13 15 10m20-18L40 23" stroke="#92400e" stroke-width="3"/>',
    'Snare Drum': '<path d="M16 29h40v25H16Z" fill="#d1d5db"/><ellipse cx="36" cy="29" rx="20" ry="8" fill="#f8fafc"/><path d="M16 53q20 10 40 0m-35 5 30-8m-30 4 30-8" fill="none" stroke="#64748b"/><path d="M22 54 18 66m32-12 4 12M13 20l22 10m25-17L40 29" fill="none" stroke="#92400e" stroke-width="3"/>'
  };
  if (drums[name]) return drums[name];
  const wind = {
    Cello: '<path d="M33 19h8v23q13-4 14 8 1 8-8 10l-4 5H30l-4-5q-9-2-8-10 1-10 15-8Z" fill="#a16207"/><path d="M36 10h3v48m-6-39h9m-9 7h9m-9 8h9" fill="none" stroke="#fef3c7" stroke-width="1.5"/><path d="M31 14h12v5H31Z" fill="#78350f"/>',
    Trombone: '<path d="M14 22h20v7H14Zm19 0h8v30h-8Zm0 23h26v7H33Z" fill="#facc15"/><path d="M58 45v7q0 8-9 8h-5v-7h5q2 0 2-2v-6" fill="#fbbf24"/><path d="M14 21v9m-5-9h10M38 52v13m-7 0h14" fill="none"/>',
    Flute: '<path d="M10 34h50v8H10Z" fill="#cbd5e1"/><path d="m60 34 6-4v16l-6-4Z" fill="#94a3b8"/><path d="M18 34v8m9-8v8m9-8v8m9-8v8m9-8v8" fill="none" stroke="#64748b"/><circle cx="22" cy="30" r="3" fill="#f8fafc"/>'
  };
  return wind[name];
}

function sports(name) {
  const drawings = {
    'Skateboard Helmet': '<path d="M13 42q1-22 23-25 22 1 24 25H13Z" fill="#facc15"/><path d="M21 42q4-13 15-13t15 13" fill="#fef3c7"/><path d="m22 43-6 12m34-12 6 12m-34 0q20 8 34 0" fill="none"/><circle cx="19" cy="59" r="3" fill="#374151"/><circle cx="53" cy="59" r="3" fill="#374151"/>',
    'Soccer Goal': '<path d="M10 24h52v36H10Z" fill="#f8fafc"/><path d="M10 24v36m52-36v36M10 24h52m-52 36h52M23 24v36m13-36v36m13-36v36M10 36h52m-52 12h52" fill="none" stroke="#64748b" stroke-width="1.5"/><path d="M31 39q5-6 10 0l-2 9h-7Z" fill="#111827"/><path d="m31 39 5 3 5-3m-8 9 3-6 4 6" fill="none" stroke="#fff"/>',
    'Basketball Hoop': '<path d="M18 9h37v25H18Z" fill="#f8fafc"/><path d="M25 15h23v13H25Z" fill="none" stroke="#ef4444" stroke-width="3"/><path d="M36 34v4m-16 1q16 8 32 0l-3 19q-13 10-26 0Z" fill="none" stroke="#f97316" stroke-width="3"/><path d="M24 43q12 5 24 0m-21 7q9 4 18 0m-14-12 1 18m10-18-1 18" fill="none" stroke="#f97316"/>',
    'Tennis Racket': '<ellipse cx="34" cy="26" rx="18" ry="22" transform="rotate(-35 34 26)" fill="#86efac"/><path d="m42 41 18 21-6 5-18-22" fill="#92400e"/><path d="m21 11 26 28m1-32L18 34m-3-12 38 10M18 12l35 28" fill="none" stroke="#166534" stroke-width="1.2"/><circle cx="19" cy="58" r="7" fill="#facc15"/>',
    'Baseball Bat': '<path d="M16 61q-4-3 0-9l28-38q6-7 12-2 5 5 0 11L26 61q-5 5-10 0Z" fill="#b45309"/><path d="m22 54 7 5m-2-13 7 5m-2-13 7 5m-2-13 7 5m-2-13 7 5" fill="none" stroke="#fef3c7" stroke-width="2"/><path d="m13 62 8-10" fill="none" stroke="#78350f" stroke-width="4"/>'
  };
  return drawings[name];
}

function other(name) {
  const drawings = {
    'Comet Trail': '<path d="M16 51q2-17 22-35-9 18-5 28 6 10 24 12-22 7-35 1Z" fill="#38bdf8"/><path d="M11 60q15-9 26-9m-31 0q14-12 28-13M17 40q9-11 19-14" fill="none" stroke="#93c5fd" stroke-width="4"/><circle cx="47" cy="43" r="10" fill="#fbbf24"/><path d="m45 36 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1Z" fill="#fff"/>',
    Starfish: '<path d="m36 8 8 19 20 1-15 13 5 20-18-11-18 11 5-20L8 28l20-1Z" fill="#fb923c"/><circle cx="31" cy="32" r="2" fill="#fff"/><circle cx="41" cy="32" r="2" fill="#fff"/><path d="M32 39q4 4 8 0m-15-8 3 2m20-2-3 2m-15 9 2 3m8-3-2 3" fill="none" stroke="#7c2d12"/>',
    Robot: '<rect x="16" y="24" width="40" height="33" rx="8" fill="#60a5fa"/><path d="M36 24V14m-7 0h14" fill="none"/><circle cx="36" cy="11" r="4" fill="#f87171"/><rect x="22" y="31" width="28" height="12" rx="4" fill="#dbeafe"/><circle cx="29" cy="37" r="3" fill="#1d4ed8"/><circle cx="43" cy="37" r="3" fill="#1d4ed8"/><path d="M29 49q7 5 14 0m-22-7-8 5m43-5 8 5M25 57v7m22-7v7" fill="none"/>',
    'Moon Rover': '<path d="M14 29h44v18H14Z" fill="#d1d5db"/><path d="m18 29 8-11h24l8 11" fill="#facc15"/><rect x="29" y="21" width="14" height="8" fill="#bae6fd"/><circle cx="21" cy="51" r="8" fill="#374151"/><circle cx="51" cy="51" r="8" fill="#374151"/><circle cx="21" cy="51" r="3" fill="#cbd5e1"/><circle cx="51" cy="51" r="3" fill="#cbd5e1"/><path d="M36 18V9m-6 0h12m-1 12 9-9" fill="none"/><rect x="47" y="7" width="13" height="9" fill="#60a5fa"/>',
    'Rocket Bot': '<rect x="21" y="20" width="30" height="34" rx="9" fill="#c4b5fd"/><path d="M28 20V12l8-7 8 7v8" fill="#f472b6"/><path d="m22 41-10 10 12 1m26-11 10 10-12 1" fill="#fb923c"/><rect x="27" y="29" width="18" height="10" rx="4" fill="#e0f2fe"/><circle cx="32" cy="34" r="2" fill="#2563eb"/><circle cx="40" cy="34" r="2" fill="#2563eb"/><path d="M30 46q6 5 12 0m-8 8-4 11m8-11 4 11" fill="none"/><path d="m29 58-3 8m17-8 3 8" stroke="#f97316" stroke-width="4"/>',
    'Toy Robot': '<rect x="18" y="23" width="36" height="34" rx="5" fill="#f97316"/><rect x="23" y="29" width="26" height="14" rx="3" fill="#bae6fd"/><circle cx="31" cy="36" r="3" fill="#2563eb"/><circle cx="41" cy="36" r="3" fill="#2563eb"/><path d="M30 49q6 4 12 0M36 23V14m-6 0h12M18 39h-8m44 0h8m-36 18v8m20-8v8" fill="none"/><circle cx="36" cy="11" r="3" fill="#facc15"/>',
    'Space Helmet': '<path d="M12 37a24 24 0 0 1 48 0v18H12Z" fill="#e5e7eb"/><path d="M18 36a18 18 0 0 1 36 0v11H18Z" fill="#38bdf8"/><path d="M20 39q15-10 31-1v9H20Z" fill="#bae6fd"/><path d="M12 51h48v9H12Z" fill="#94a3b8"/><circle cx="48" cy="29" r="3" fill="#fff"/><path d="M22 60v5m28-5v5" fill="none"/>',
    'Jack-in-the-Box': '<path d="M14 36h44v29H14Z" fill="#60a5fa"/><path d="m14 36 22 12 22-12M36 48v17" fill="none" stroke="#1d4ed8"/><path d="M33 36q-6-15 3-20 7-4 8 3 1 5-5 6" fill="none" stroke="#92400e" stroke-width="4"/><circle cx="39" cy="11" r="10" fill="#facc15"/><path d="M34 10h2m7 0h2m-10 5q4 4 8 0" fill="none"/><path d="m20 36 4-7h24l4 7" fill="#f472b6"/>',
    'Rubber Duck': '<path d="M13 48q0-12 15-15 3-15 17-13 12 2 11 15 10 8 3 20-6 9-27 8-19-1-19-15Z" fill="#facc15"/><path d="m47 34 17 4-16 6Z" fill="#f97316"/><circle cx="46" cy="28" r="2" fill="#111827"/><path d="M21 50q15 6 31 0" fill="none" stroke="#eab308"/>',
    Pinwheel: '<path d="M36 34V67" fill="none" stroke="#92400e" stroke-width="4"/><path d="M36 34 12 25q1 14 19 15L36 34Zm0 0 10-24q-14 1-16 19l6 5Zm0 0 24-10q-1 14-19 16l-5-6Zm0 0-10 24q14-1 16-19l-6-5Z" fill="#fb7185"/><circle cx="36" cy="34" r="5" fill="#facc15"/><path d="M36 39v28" fill="none" stroke="#92400e"/>',
    Aurora: '<path d="M9 58q13-22 25-3 12 17 29-8" fill="none" stroke="#22c55e" stroke-width="9"/><path d="M8 48q14-24 28-3 12 16 26-12" fill="none" stroke="#38bdf8" stroke-width="7"/><path d="M11 38q13-18 26-4 13 14 22-8" fill="none" stroke="#a78bfa" stroke-width="6"/><path d="M15 29q12-13 23-3 9 9 18-4" fill="none" stroke="#f472b6" stroke-width="4"/><g fill="#facc15"><circle cx="16" cy="15" r="2"/><circle cx="51" cy="18" r="2"/><circle cx="34" cy="9" r="2"/></g>',
    Raincoat: '<path d="M25 14q11-8 22 0l8 13-8 5v32H25V32l-8-5Z" fill="#facc15"/><path d="m25 17-12 12 8 8 7-7m19-13 12 12-8 8-7-7" fill="#eab308"/><path d="M36 22v38m-4-29h8m-8 9h8m-8 9h8" fill="none"/><path d="M30 14q6 8 12 0" fill="none" stroke="#fff"/>',
    Maracas: '<path d="M17 21q0-11 11-11t11 11q0 12-11 25-11-13-11-25Z" fill="#f97316"/><path d="m25 42 5 5-9 17-5-3Z" fill="#92400e"/><path d="M41 25q0-11 11-11t11 11q0 12-11 25-11-13-11-25Z" fill="#22c55e"/><path d="m49 46 5 4-9 15-5-3Z" fill="#92400e"/><path d="M20 20h16m9 4h16m-34 2h13m9 5h12" stroke="#fef3c7"/>',
    'Snowy Mountain': '<path d="m5 62 22-43 11 19 9-28 20 52Z" fill="#64748b"/><path d="m29 23-5 10 6-2 4 5 5-1Zm17-7-5 11 7-2 4 5 4-2Z" fill="#f8fafc"/><path d="M5 62h62" fill="none" stroke="#334155" stroke-width="3"/>',
    Skirt: '<path d="M26 13h20l-2 18 13 30H15l13-30Z" fill="#f472b6"/><path d="M28 31h16m-21 19h34m-38 7h42" fill="none" stroke="#be185d" stroke-width="2"/><path d="M27 14h18v6H27Z" fill="#fbcfe8"/><circle cx="36" cy="24" r="2" fill="#fef08a"/>'
  };
  return drawings[name];
}

function draw(name) {
  return spacecraft(name) || satellite(name) || (['Saturn', 'Jupiter', 'Venus', 'Mercury', 'Neptune', 'Uranus', 'Solar System', 'Planet Ring'].includes(name) ? planet(name) : null) ||
    animal(name) || plant(name) || building(name) || vehicle(name) || instrument(name) || sports(name) || other(name);
}

async function main() {
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, 'assets', 'block-pack.js'), 'utf8'), { window });
  const sprites = [...window.BLOCK_PACK.sprites.list, ...window.BLOCK_PACK.sprites.library];
  const names = [
    'Space Shuttle', 'Toy Rocket', 'Lunar Lander', 'Space Probe', 'Spaceship', 'Space Helmet',
    'Saturn', 'Jupiter', 'Venus', 'Mercury', 'Neptune', 'Uranus', 'Solar System', 'Planet Ring',
    'Comet Trail', 'Starfish', 'Robot', 'Moon Rover', 'Rocket Bot', 'Toy Robot', 'Cottage',
    'Lighthouse', 'Apartment', 'Oak Tree', 'Swordfish', 'Sunflower', 'Puffin', 'Sea Turtle',
    'Robin', 'Blue Jay', 'Woodpecker', 'Hummingbird', 'Pelican', 'Seagull', 'Sparrow', 'Heron',
    'Rubber Duck', 'Seahorse', 'Stingray', 'Orca', 'Nautilus', 'Dandelion', 'Vine', 'Lotus',
    'Pitcher Plant', 'Jack-in-the-Box', 'Fire Station', 'Skateboard Helmet', 'Train Station',
    'Toy Train', 'Toy Airplane', 'Shooting Star', 'Treehouse', 'Barn', 'Greenhouse', 'Pinwheel',
    'Electric Guitar', 'Ukulele', 'Harp', 'Drum Kit', 'Snare Drum', 'Cello', 'Trombone', 'Flute',
    'Maracas', 'Soccer Goal', 'Basketball Hoop', 'Tennis Racket', 'Baseball Bat', 'Aurora',
    'Raincoat', 'Skirt', 'Snowy Mountain'
  ];
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));
  const missing = names.filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`Sprite names not found in block pack: ${missing.join(', ')}`);
  const updates = [];
  for (const name of names) {
    const art = draw(name);
    if (!art) throw new Error(`No original drawing defined for "${name}".`);
    updates.push({ name, src: byName.get(name).src, content: wrap(art) });
  }
  if (updates.length !== 73) throw new Error(`Expected 73 hand-drawn replacements, found ${updates.length}.`);
  for (const item of updates) {
    await fs.writeFile(path.resolve(root, item.src), item.content, 'utf8');
  }
  console.log(`Created ${updates.length} original SVG drawings.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
