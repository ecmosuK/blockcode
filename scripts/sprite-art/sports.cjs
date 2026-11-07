'use strict';

// Hockey Stick uses Microsoft Fluent Emoji's "Ice hockey" artwork (32x32 viewBox).
const hockeyStick = `
<path d="M24.0638 19.2507L21.059 17.5337C20.0349 19.114 18.4641 20.2424 16.6694 20.7153L15.5 25L15.4901 29.107C18.1544 28.8486 20.5003 27.1883 21.61 24.7122L24.0638 19.2507Z" fill="#F3AD61"/>
<path d="M7.54637 20.9622L6.09 20.9622C3.83 20.9622 2 22.7922 2 25.0522C2 27.3122 3.83 29.1422 6.09 29.1422L6.39675 29.1422L8 25L7.54637 20.9622Z" fill="#F3AD61"/>
<path d="M20.9275 17.7298C21.1883 17.3537 21.4173 16.9502 21.61 16.5222L25.2141 8.5L28.2633 9.90387L24.0041 19.3835L20.9275 17.7298Z" fill="#F8312F"/>
<path d="M26.79 4.99223L25.1786 8.57907L28.2478 9.93831L29.85 6.37224C29.95 6.15224 30 5.92223 30 5.68223C30 3.87223 27.53 3.34223 26.79 4.99223Z" fill="#533566"/>
<path d="M23.64 25.5422H29.11C29.6 25.5422 29.99 25.9322 29.99 26.4222V28.2622C29.99 28.7422 29.6 29.1422 29.11 29.1422H23.64C23.16 29.1422 22.76 28.7522 22.76 28.2622V26.4222C22.76 25.9422 23.15 25.5422 23.64 25.5422Z" fill="#533566"/>
<path d="M12.4557 29.1422L13.5 25.0522L13.6053 20.9622H10.5758L9.50003 25.0522L9.42621 29.1422H12.4557Z" fill="#F4F4F4"/>
<path d="M14.76 20.9622H13.6052L12.4556 29.1422H14.76C15.0055 29.1422 15.2491 29.1303 15.49 29.107L16.6694 20.7153C16.0548 20.8772 15.414 20.9622 14.76 20.9622Z" fill="#D3D3D3"/>
<path d="M10.5758 20.9622L9.42621 29.1422H6.39673L7.54635 20.9622H10.5758Z" fill="#D3D3D3"/>
`;

module.exports = {
  'Hockey Stick': { raw: hockeyStick, viewBox: '0 0 32 32', stroke: '#6d4b42', strokeWidth: 0.85 },

  'Tennis Ball': `<circle cx="36" cy="36" r="26" fill="#D9F99D"/>
    <path d="M20 18q18 18 0 36M52 18q-18 18 0 36" fill="none" stroke="#FFFFFF" stroke-width="4"/>
    <ellipse cx="27" cy="25" rx="5" ry="3" fill="#FFFFFF" opacity=".7" stroke="none"/>`,

  'Tennis Racket': `<defs><clipPath id="tennis-racket-face"><ellipse cx="36" cy="27" rx="13.5" ry="17.5"/></clipPath></defs>
    <ellipse cx="36" cy="27" rx="17" ry="21" fill="#22C55E"/>
    <ellipse cx="36" cy="27" rx="13.5" ry="17.5" fill="#F0FDF4" stroke="none"/>
    <g clip-path="url(#tennis-racket-face)" stroke="#15803D" stroke-width="0.9">
      <path d="M26 8v38M30 8v38M34 8v38M38 8v38M42 8v38M46 8v38"/>
      <path d="M21 14h30M21 18h30M21 22h30M21 26h30M21 30h30M21 34h30M21 38h30M21 42h30"/>
    </g>
    <path d="M32 44h8l2 23H30Z" fill="#92400E"/>
    <path d="M31.5 50h9M31.5 55h9M31.5 60h9" stroke="#78350F" stroke-width="1.2"/>
    <rect x="28" y="65" width="16" height="5" rx="2.5" fill="#374151"/>`,

  'Soccer Goal': `<path d="M10 22 18 16h36l8 6" fill="none" stroke="#374151" stroke-width="3"/>
    <path d="M10 22h52v38H10Z" fill="#F8FAFC"/>
    <path d="M10 22v38m52-38v38M10 22h52" fill="none" stroke="#374151" stroke-width="4"/>
    <path d="M18 16v10m36-10v10" stroke="#94A3B8" stroke-width="2"/>
    <path d="M14 26h44v30H14Z" fill="none" stroke="#94A3B8" stroke-width="1.2"/>
    <path d="M14 26v30m11-30v30m11-30v30m11-30v30m11-30v30M14 26h44M14 36h44M14 46h44M14 56h44" stroke="#CBD5E1" stroke-width="1.2"/>`,

  'Bowling Ball': `<circle cx="36" cy="38" r="26" fill="#7C3AED"/>
    <path d="M18 26q4-8 12-10" fill="none" stroke="#A78BFA" stroke-width="4" opacity=".7"/>
    <g fill="#4C1D95" stroke="none">
      <circle cx="28" cy="30" r="4"/><circle cx="37" cy="27" r="4"/><circle cx="31" cy="40" r="4"/>
    </g>`,

  'Baseball Bat': `<g transform="rotate(35 36 36)">
    <path d="M28 40h16l3-27q0-6-11-6t-11 6Z" fill="#D9A066"/>
    <rect x="30" y="40" width="12" height="20" rx="6" fill="#C27A3A"/>
    <rect x="27" y="58" width="18" height="7" rx="3.5" fill="#92400E"/>
    <rect x="30" y="44" width="12" height="10" rx="3" fill="#374151"/>
    <path d="M31 47h10m-10 4h10" stroke="#9CA3AF" stroke-width="1.2"/>
    <path d="M33 38V12" stroke="#E8B98A" stroke-width="2" opacity=".7"/>
  </g>`,

  'Golf Ball': `<circle cx="36" cy="38" r="24" fill="#FFFFFF"/>
    <g fill="#D1D5DB" stroke="none">
      <circle cx="28" cy="30" r="2"/><circle cx="38" cy="26" r="2"/><circle cx="48" cy="32" r="2"/>
      <circle cx="24" cy="42" r="2"/><circle cx="34" cy="40" r="2"/><circle cx="45" cy="44" r="2"/>
      <circle cx="29" cy="51" r="2"/><circle cx="40" cy="54" r="2"/><circle cx="50" cy="51" r="2"/>
    </g>
    <ellipse cx="28" cy="24" rx="6" ry="3" fill="#F8FAFC" opacity=".8" stroke="none"/>
    <path d="M18 58q18 8 36 0" fill="none" stroke="#CBD5E1" stroke-width="2"/>`,

  'Skis': `<g transform="rotate(-12 36 36)">
      <rect x="14" y="10" width="10" height="52" rx="5" fill="#38BDF8"/>
      <rect x="28" y="8" width="10" height="54" rx="5" fill="#0EA5E9"/>
      <path d="M14 16q5-8 10 0M28 14q5-8 10 0" fill="none" stroke="#BAE6FD" stroke-width="2"/>
      <rect x="12" y="34" width="14" height="8" rx="3" fill="#EF4444"/>
      <rect x="26" y="38" width="14" height="8" rx="3" fill="#EF4444"/>
      <path d="M18 42v12m14-10v12" stroke="#374151" stroke-width="2"/>
    </g>`,

  'Snowboard': `<g transform="rotate(20 36 36)">
      <rect x="24" y="6" width="24" height="60" rx="12" fill="#8B5CF6"/>
      <rect x="26" y="8" width="8" height="56" rx="4" fill="#C4B5FD" stroke="none"/>
      <rect x="24" y="20" width="24" height="8" rx="4" fill="#374151"/>
      <rect x="24" y="44" width="24" height="8" rx="4" fill="#374151"/>
      <path d="M30 24h12M30 48h12" stroke="#9CA3AF" stroke-width="2"/>
    </g>`,

  'Surfboard': `<g transform="rotate(18 36 36)">
      <ellipse cx="36" cy="36" rx="13" ry="31" fill="#F97316"/>
      <path d="M36 7v58" stroke="#FDBA74" stroke-width="3"/>
      <path d="M36 60l-8 7h16Z" fill="#EA580C"/>
      <path d="M30 18q6-6 12 0" fill="none" stroke="#FFEDD5" stroke-width="2"/>
    </g>`
};
