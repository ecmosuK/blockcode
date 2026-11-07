'use strict';

const eye = (x, y, r = 1.8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1F2937" stroke="none"/>`;

function quadBody(fill, legs, belly, tail = '') {
  return `${tail}
    <path d="M13 43q1-12 13-15l8-2 8 3q9 3 10 12l1 9H13Z" fill="${fill}"/>
    <rect x="13" y="49" width="7" height="14" rx="3.5" fill="${legs}"/>
    <rect x="22" y="50" width="7" height="13" rx="3.5" fill="${legs}" opacity=".85"/>
    <rect x="38" y="50" width="7" height="13" rx="3.5" fill="${legs}"/>
    <rect x="46" y="49" width="7" height="14" rx="3.5" fill="${legs}" opacity=".85"/>
    <path d="M22 47q12-7 24 0v6H22Z" fill="${belly}"/>`;
}

module.exports = {
  Fox: quadBody('#F08A32', '#D97706', '#FFF4DF',
    `<path d="M15 41Q1 29 3 44q2 14 17 9l7-9Z" fill="#F08A32"/>
     <path d="M4 42q4 12 16 8l6-6Z" fill="#FFF4DF"/>`) +
    `<circle cx="52" cy="28" r="14" fill="#F08A32"/>
     <path d="M40 17 38 4l11 8Z" fill="#F08A32"/>
     <path d="M54 13 63 3l1 13Z" fill="#F08A32"/>
     <path d="M42 14 41 8l5 4Z" fill="#3B2A24" stroke="none"/>
     <path d="M57 13 61 7l1 6Z" fill="#3B2A24" stroke="none"/>
     <ellipse cx="57" cy="34" rx="8" ry="6" fill="#FFF4DF"/>
     <path d="M54 32h6l-3 4Z" fill="#1F2937" stroke="none"/>
     ${eye(48, 26)}${eye(58, 26)}
     <path d="M44 35q4 2 7 0" fill="none" stroke="#B45309" stroke-width="1.2"/>`,

  Wolf: quadBody('#8B929B', '#6F767E', '#DCE1E5',
    `<path d="M15 41Q4 33 5 46q2 11 14 7l6-6Z" fill="#8B929B"/>
     <path d="M7 44q5 9 13 5l5-4Z" fill="#DCE1E5"/>`) +
    `<circle cx="52" cy="28" r="14" fill="#8B929B"/>
     <path d="M40 17 38 4l11 8Z" fill="#8B929B"/>
     <path d="M54 13 63 3l1 13Z" fill="#8B929B"/>
     <path d="M42 14 41 8l5 4Z" fill="#4B5563" stroke="none"/>
     <path d="M57 13 61 7l1 6Z" fill="#4B5563" stroke="none"/>
     <ellipse cx="57" cy="34" rx="8" ry="6" fill="#DCE1E5"/>
     <path d="M54 32h6l-3 4Z" fill="#1F2937" stroke="none"/>
     ${eye(48, 26)}${eye(58, 26)}
     <path d="M44 35q4 2 7 0" fill="none" stroke="#5B6168" stroke-width="1.2"/>`,

  Bear: quadBody('#8B5A3C', '#6B422D', '#D7B18B',
    `<circle cx="16" cy="44" r="5" fill="#8B5A3C"/>`) +
    `<circle cx="52" cy="28" r="14" fill="#8B5A3C"/>
     <circle cx="41" cy="16" r="6" fill="#8B5A3C"/>
     <circle cx="63" cy="16" r="6" fill="#8B5A3C"/>
     <circle cx="41" cy="16" r="3" fill="#C99A78" stroke="none"/>
     <circle cx="63" cy="16" r="3" fill="#C99A78" stroke="none"/>
     <ellipse cx="56" cy="34" rx="9" ry="7" fill="#D7B18B"/>
     <ellipse cx="55" cy="31" rx="3.2" ry="2.4" fill="#3C3029" stroke="none"/>
     ${eye(47, 25)}${eye(59, 25)}
     <path d="M52 36q4 3 8 0" fill="none" stroke="#5B3A27" stroke-width="1.2"/>`,

  Panda: quadBody('#F4F3EF', '#202124', '#FFFFFF',
    `<circle cx="16" cy="44" r="5" fill="#FFFFFF"/>`) +
    `<circle cx="52" cy="28" r="14" fill="#FFFFFF"/>
     <circle cx="41" cy="16" r="6" fill="#202124"/>
     <circle cx="63" cy="16" r="6" fill="#202124"/>
     <ellipse cx="46" cy="26" rx="5" ry="6" fill="#202124" transform="rotate(-25 46 26)"/>
     <ellipse cx="58" cy="26" rx="5" ry="6" fill="#202124" transform="rotate(25 58 26)"/>
     ${eye(46, 26, 1.7)}${eye(58, 26, 1.7)}
     <ellipse cx="52" cy="35" rx="3.5" ry="2.6" fill="#202124" stroke="none"/>
     <path d="M49 38q3 2 6 0" fill="none" stroke="#202124" stroke-width="1.2"/>`,

  Lion: quadBody('#D59B37', '#B47B24', '#FFE6B0',
    `<path d="M14 43q-8-6-7 4 1 7 9 6" fill="none" stroke="#D59B37" stroke-width="4"/>
     <circle cx="8" cy="47" r="4" fill="#7C4A1E"/>`) +
    `<circle cx="50" cy="29" r="20.5" fill="#A85D21"/>
     <circle cx="52" cy="28" r="14" fill="#F0BD5A"/>
     <circle cx="41" cy="17" r="5" fill="#F0BD5A"/>
     <circle cx="63" cy="17" r="5" fill="#F0BD5A"/>
     <circle cx="41" cy="17" r="2.5" fill="#C98B36" stroke="none"/>
     <circle cx="63" cy="17" r="2.5" fill="#C98B36" stroke="none"/>
     <ellipse cx="56" cy="34" rx="8" ry="6" fill="#FFE6B0"/>
     <path d="M53 32h6l-3 4Z" fill="#6B3B1A" stroke="none"/>
     ${eye(48, 26)}${eye(58, 26)}
     <path d="M52 37q4 2 7 0" fill="none" stroke="#8A5A1E" stroke-width="1.2"/>`,

  Rabbit: quadBody('#E8D8CC', '#CDBBAE', '#FFF7F0',
    `<circle cx="16" cy="46" r="5" fill="#FFF7F0"/>`) +
    `<ellipse cx="45" cy="15" rx="5" ry="11.5" transform="rotate(-12 45 15)" fill="#E8D8CC"/>
     <ellipse cx="59" cy="14" rx="5" ry="12.5" transform="rotate(12 59 14)" fill="#E8D8CC"/>
     <ellipse cx="45" cy="16" rx="2.4" ry="8" transform="rotate(-12 45 16)" fill="#EDAAA9" stroke="none"/>
     <ellipse cx="59" cy="15" rx="2.4" ry="9" transform="rotate(12 59 15)" fill="#EDAAA9" stroke="none"/>
     <circle cx="52" cy="29" r="14" fill="#E8D8CC"/>
     <ellipse cx="56" cy="35" rx="8" ry="6" fill="#FFF7F0"/>
     <path d="M54 32h5l-2.5 3Z" fill="#D98C8C" stroke="none"/>
     ${eye(48, 27)}${eye(58, 27)}
     <path d="M54 38v4m4-4v4" fill="none" stroke="#FFFFFF" stroke-width="2.4"/>`,

  Raccoon: quadBody('#8C9298', '#5C6268', '#D2D5D7',
    `<path d="M15 41Q4 34 5 47q2 10 14 6l6-6Z" fill="#8C9298"/>
     <path d="M8 37q8 5 15 8m-17 3q7 1 13-1" fill="none" stroke="#292D31" stroke-width="3.5"/>`) +
    `<circle cx="52" cy="28" r="14" fill="#8C9298"/>
     <path d="M40 17 38 4l11 8Z" fill="#8C9298"/>
     <path d="M54 13 63 3l1 13Z" fill="#8C9298"/>
     <path d="M42 14 41 8l5 4Z" fill="#292D31" stroke="none"/>
     <path d="M57 13 61 7l1 6Z" fill="#292D31" stroke="none"/>
     <path d="M39 24q13-7 26 0l-2 8q-11 5-22 0Z" fill="#292D31"/>
     ${eye(47, 26, 1.7)}${eye(59, 26, 1.7)}
     <ellipse cx="56" cy="35" rx="8" ry="6" fill="#D2D5D7"/>
     <path d="M54 32h5l-2.5 3.5Z" fill="#1F2937" stroke="none"/>
     <path d="M52 38q4 2 7 0" fill="none" stroke="#4B5563" stroke-width="1.2"/>`,

  Koala: quadBody('#9AA1A7', '#7B8288', '#E8E3DC',
    `<circle cx="16" cy="44" r="5" fill="#9AA1A7"/>`) +
    `<circle cx="40" cy="19" r="8.5" fill="#9AA1A7"/>
     <circle cx="62" cy="19" r="8.5" fill="#9AA1A7"/>
     <circle cx="40" cy="19" r="5.2" fill="#EFB6B0" stroke="none"/>
     <circle cx="62" cy="19" r="5.2" fill="#EFB6B0" stroke="none"/>
     <circle cx="52" cy="29" r="14" fill="#9AA1A7"/>
     <ellipse cx="52" cy="33" rx="5.5" ry="7" fill="#292D31"/>
     ${eye(46, 25, 1.6)}${eye(58, 25, 1.6)}
     <path d="M48 39q4 2 8 0" fill="none" stroke="#4B5563" stroke-width="1.2"/>`,

  Toucan: `<g transform="translate(-1 0)">
    <path d="M20 45 8 56l18-4Z" fill="#1F2937"/>
    <ellipse cx="36" cy="44" rx="17" ry="13" fill="#1F2937"/>
    <ellipse cx="38" cy="49" rx="10" ry="7.5" fill="#FDE68A"/>
    <path d="M27 34q-8 5-6 15 2 7 8 4 6-5 4-13-1-4-6-6Z" fill="#374151"/>
    <path d="M24 42q5 3 4 9" fill="none" stroke="#111827" stroke-width="1.2"/>
    <circle cx="48" cy="27" r="13" fill="#1F2937"/>
    <circle cx="50" cy="23" r="5" fill="#FFFFFF"/>
    <circle cx="51" cy="23" r="2" fill="#1F2937" stroke="none"/>
    <path d="M55 21c8-3 14 0 16 6 2 6-2 11-8 12-4 1-7-1-9-4Z" fill="#F59E0B"/>
    <path d="M55 21c7-2 12 0 15 5l-6 2c-3-3-6-4-9-3Z" fill="#FBBF24"/>
    <path d="M67 22c3 2 5 6 4 9-1 4-4 7-8 8 3-3 4-7 3-11Z" fill="#111827"/>
    <path d="M55 31q7-1 11 1" fill="none" stroke="#B45309" stroke-width="1.2"/>
    <rect x="31" y="55" width="5" height="9" rx="2.5" fill="#F59E0B"/>
    <rect x="41" y="55" width="5" height="9" rx="2.5" fill="#F59E0B"/>
    <path d="M26 64h10m5 0h10" stroke="#D97706" stroke-width="2.5"/></g>`
};
