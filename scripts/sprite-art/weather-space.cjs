'use strict';

module.exports = {
  'Foggy Cloud': `<path d="M14 36q0-10 10-12 2-10 13-10t13 10q10 2 10 12 0 8-10 8H24q-10 0-10-8Z" fill="#CBD5E1"/>
    <path d="M12 50h48M18 56h36M22 62h28" stroke="#94A3B8" stroke-width="4"/>`,

  Hailstone: `<path d="M14 30q0-10 10-12 2-10 13-10t13 10q10 2 10 12 0 8-10 8H24q-10 0-10-8Z" fill="#94A3B8"/>
    <g fill="#E0F2FE" stroke="#38BDF8" stroke-width="1.5">
      <circle cx="22" cy="50" r="4"/><circle cx="36" cy="54" r="4"/><circle cx="50" cy="50" r="4"/>
      <circle cx="29" cy="62" r="4"/><circle cx="43" cy="62" r="4"/>
    </g>`,

  'Star Cluster': `<g fill="#FACC15">
      <path d="m36 6 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1Z"/>
      <path d="m16 32 2 6 7 1-5 4 1 7-5-4-6 4 1-7-4-4 6-1Z"/>
      <path d="m56 34 2 6 7 1-5 4 1 7-5-4-6 4 1-7-4-4 6-1Z"/>
    </g>
    <g fill="#FDE047" stroke="none"><circle cx="24" cy="14" r="2"/><circle cx="52" cy="18" r="2"/><circle cx="36" cy="50" r="2"/></g>`,

  Rainbow: `<path d="M4 62A32 40 0 0 1 68 62L64 62A28 36 0 0 0 8 62Z" fill="#EF4444" stroke="none"/>
    <path d="M8 62A28 36 0 0 1 64 62L60 62A24 32 0 0 0 12 62Z" fill="#F97316" stroke="none"/>
    <path d="M12 62A24 32 0 0 1 60 62L56 62A20 28 0 0 0 16 62Z" fill="#FACC15" stroke="none"/>
    <path d="M16 62A20 28 0 0 1 56 62L52 62A16 24 0 0 0 20 62Z" fill="#22C55E" stroke="none"/>
    <path d="M20 62A16 24 0 0 1 52 62L48 62A12 20 0 0 0 24 62Z" fill="#3B82F6" stroke="none"/>
    <path d="M24 62A12 20 0 0 1 48 62L44 62A8 16 0 0 0 28 62Z" fill="#8B5CF6" stroke="none"/>`,

  'Shooting Star': `<path d="M38 28Q22 40 6 62q18-8 34-22Z" fill="#FB923C"/>
    <path d="M36 30Q24 42 12 58q14-6 26-18Z" fill="#FDE68A"/>
    <path d="M32 34Q22 44 14 56" fill="none" stroke="#F97316" stroke-width="2"/>
    <path d="M40 8l3 7 8 1-6 5.5 1.5 8-7.5-4-7.5 4 1.5-8-6-5.5 8-1Z" fill="#FACC15"/>
    <circle cx="56" cy="12" r="2" fill="#FDE68A"/>
    <circle cx="62" cy="22" r="1.5" fill="#FDE68A"/>`,

  Meteor: `<path d="M16 37 24 24l13 2 9-7 12 9 5 13-8 11-2 12-14 3-10-7-12 1-5-13Z" fill="#78716C"/>
    <path d="m24 24 4 9-12 4m21-11 1 10 8-17m12 9-9 8 13 4M19 50l12-2 3 12m14-9 5 12m-30-21 7 3" fill="none" stroke="#57534E" stroke-width="2"/>
    <path d="m25 28 5 3m19-8 4 4M20 47l5-1m22 15 5-2" fill="none" stroke="#A8A29E" stroke-width="2"/>
    <circle cx="34" cy="39" r="3" fill="#57534E"/>
    <circle cx="48" cy="38" r="2.5" fill="#57534E"/>
    <circle cx="39" cy="52" r="2" fill="#57534E"/>`,

  Galaxy: `<ellipse cx="36" cy="36" rx="30" ry="18" fill="#4338CA" opacity=".22" stroke="none"/>
    <path d="M36 36C28 24 12 26 10 40c-2 14 16 20 28 12 12-8 10-22-2-24" fill="none" stroke="#818CF8" stroke-width="5"/>
    <path d="M36 36C44 48 60 46 62 32c2-14-16-20-28-12-12 8-10 22 2 24" fill="none" stroke="#A78BFA" stroke-width="5"/>
    <ellipse cx="36" cy="36" rx="9" ry="5.5" fill="#FEF3C7"/>
    <ellipse cx="36" cy="36" rx="4.5" ry="2.8" fill="#FFFFFF" stroke="none"/>
    <g fill="#FDE68A" stroke="none">
      <circle cx="12" cy="16" r="1.5"/><circle cx="62" cy="18" r="1.5"/><circle cx="20" cy="58" r="1.5"/>
      <circle cx="56" cy="56" r="1.5"/><circle cx="66" cy="40" r="1.2"/><circle cx="8" cy="40" r="1.2"/>
    </g>`,

  'Space Shuttle': `<path d="M36 6q8 8 8 28l-4 12H32l-4-12Q28 14 36 6Z" fill="#F8FAFC"/>
    <path d="M28 34 10 52l20-2m14-16 18 18-20-2" fill="#E5E7EB"/>
    <path d="M32 46h8v10h-8Z" fill="#374151"/>
    <path d="M32 56q-4 8 0 10m8-10q4 8 0 10" fill="none" stroke="#F97316" stroke-width="3"/>
    <circle cx="36" cy="26" r="5" fill="#38BDF8"/>
    <path d="M32 20h8" stroke="#94A3B8" stroke-width="2"/>`,

  'Lunar Lander': `<path d="M28 20h16l6 22H22Z" fill="#D1D5DB"/>
    <path d="M22 42 12 58m38-16 10 16M18 58h-6m42 0h6" stroke="#6B7280" stroke-width="3"/>
    <path d="M28 28h16" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="36" cy="32" r="5" fill="#F59E0B"/>
    <path d="M36 20V12m-6 0h12" stroke="#6B7280" stroke-width="2"/>
    <path d="M30 42v8m12-8v8" stroke="#6B7280" stroke-width="2"/>`,

  'Space Probe': `<rect x="28" y="24" width="16" height="24" rx="4" fill="#CBD5E1"/>
    <path d="M28 30H10v12h18m16-12h18v12H44" fill="#3B82F6"/>
    <path d="M15 30v12m8-12v12m26-12v12m8-12v12" stroke="#1D4ED8" stroke-width="1.5"/>
    <path d="M36 24V14" stroke="#6B7280" stroke-width="2"/>
    <path d="M36 14q-10 0-10 8h20q0-8-10-8Z" fill="#F8FAFC"/>
    <circle cx="36" cy="20" r="2" fill="#F59E0B"/>
    <path d="M36 48v8m-6 0h12" stroke="#6B7280" stroke-width="2"/>`,

  'Moon Rover': `<rect x="12" y="28" width="48" height="16" rx="4" fill="#CBD5E1"/>
    <path d="M18 28 24 18h24l6 10Z" fill="#FACC15"/>
    <rect x="30" y="20" width="12" height="8" fill="#BAE6FD"/>
    <circle cx="20" cy="50" r="6" fill="#374151"/>
    <circle cx="36" cy="50" r="6" fill="#374151"/>
    <circle cx="52" cy="50" r="6" fill="#374151"/>
    <circle cx="20" cy="50" r="2" fill="#CBD5E1" stroke="none"/>
    <circle cx="36" cy="50" r="2" fill="#CBD5E1" stroke="none"/>
    <circle cx="52" cy="50" r="2" fill="#CBD5E1" stroke="none"/>
    <path d="M36 18V10m-6 0h12" stroke="#6B7280" stroke-width="2"/>
    <circle cx="36" cy="8" r="3" fill="#F97316"/>`,

  'Black Hole': `<ellipse cx="36" cy="38" rx="30" ry="8" fill="#F59E0B" opacity=".9"/>
    <ellipse cx="36" cy="34" rx="24" ry="6" fill="#FBBF24"/>
    <circle cx="36" cy="34" r="12" fill="#111827"/>
    <path d="M6 38q30 14 60 0" fill="none" stroke="#F97316" stroke-width="3"/>
    <circle cx="36" cy="34" r="16" fill="none" stroke="#FDE68A" stroke-width="1.5"/>`,

  Mars: `<circle cx="36" cy="36" r="26" fill="#DC2626"/>
    <path d="M20 26q6-6 12 0t10-2" fill="none" stroke="#B91C1C" stroke-width="3"/>
    <circle cx="28" cy="40" r="4" fill="#991B1B"/>
    <circle cx="46" cy="30" r="3" fill="#991B1B"/>
    <path d="M26 14q10-4 20 0" stroke="#FCA5A5" stroke-width="4"/>`
};
