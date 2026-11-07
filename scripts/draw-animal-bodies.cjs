'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const outline = '#374151';
const fluentNames = new Set([
  'Fox', 'Wolf', 'Bear', 'Panda', 'Tiger', 'Lion', 'Elephant', 'Giraffe', 'Zebra',
  'Monkey', 'Rabbit', 'Deer', 'Hedgehog', 'Raccoon', 'Koala', 'Kangaroo', 'Penguin',
  'Frog', 'Turtle', 'Parrot', 'Owl', 'Eagle', 'Flamingo', 'Peacock', 'Swan', 'Duck',
  'Chicken', 'Rooster', 'Shark', 'Whale', 'Dolphin', 'Octopus', 'Jellyfish', 'Crab',
  'Lobster', 'Squid', 'Shrimp', 'Coral'
]);
const wrap = (art) => `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><g stroke="${outline}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>\n`;

function quadruped({body, face = body, belly = '#fef3c7', legs = '#6b422d', pattern = '', tail = '', ears = '', extra = ''}) {
  return `<path d="M17 43q-2-12 9-17 13-7 27 1l8 9-5 13H21Z" fill="${body}"/>${pattern}
    <path d="M22 44 20 60h6l4-13m15-1 2 14h6l-1-16m-27 2-1 14h5l4-14" fill="${legs}"/>
    <path d="M25 42q11-7 22 0l-2 8H27Z" fill="${belly}"/>
    ${tail}<path d="M46 30q-2-12 8-15 10-1 11 8l-4 12-10 4Z" fill="${face}"/>
    ${ears}<circle cx="57" cy="24" r="1.5" fill="#111827"/><path d="m64 29 5 2-5 3" fill="#f3a5a0"/>${extra}`;
}

function bird({body, wing = '#64748b', beak = '#facc15', tail = '', crest = '', neck = '', legs = '#d97706', belly = '#f8fafc', extra = ''}) {
  return `${tail}<path d="M22 42q1-16 17-17 15 0 18 15l-9 13H27Z" fill="${body}"/>
    <path d="M29 40q11-14 23-3l-5 14-16 2Z" fill="${wing}"/>
    <path d="M29 48q8-7 19 0l-3 7H29Z" fill="${belly}"/>
    <path d="${neck || 'M43 32q-2-12 5-18 7-5 12 1 4 7-3 15l-6 7Z'}" fill="${body}"/>
    <path d="m58 23 12 3-11 5Z" fill="${beak}"/>
    ${crest}<circle cx="56" cy="20" r="1.6" fill="#111827"/>
    <path d="M34 54v9m15-9v9m-19 0h8m7 0h8" fill="none" stroke="${legs}" stroke-width="2.4"/>${extra}`;
}

function fish({body, fin = '#f97316', tail = '#ef4444', stripes = '', extra = ''}) {
  return `<path d="M12 37q17-21 39-7l10 7-10 7Q29 58 12 37Z" fill="${body}"/>
    <path d="m53 37 15-13v26Z" fill="${tail}"/>
    <path d="m32 34 8-12 7 15m-20 1-9 12 20-7" fill="${fin}"/>
    <path d="M17 37q15-9 33 0" fill="none" stroke="#fff" stroke-width="1"/>${stripes}
    <circle cx="49" cy="34" r="2" fill="#111827"/>${extra}`;
}

const mammals = {
  Fox: quadruped({body:'#e87524',face:'#f08a32',tail:'<path d="M19 36Q5 29 8 44q4 12 16 6l7-7Z" fill="#e87524"/><path d="M9 42q5 9 14 5l5-4Z" fill="#fff"/>',ears:'<path d="m49 18 2-10 9 8m-8 9-7-8-4 7" fill="#e87524"/><path d="m52 15 1-4 4 4" fill="#f4b4a0"/>',belly:'#fff4df'}),
  Wolf: quadruped({body:'#8b929b',face:'#a5adb5',tail:'<path d="M20 34Q7 24 6 36q0 11 17 10l7-5Z" fill="#7b828a"/>',ears:'<path d="m48 18 2-11 8 9m-8 12-8-9-3 7" fill="#8b929b"/>',belly:'#dce1e5',extra:'<path d="m63 31 6 1-6 3Z" fill="#515965"/>'}),
  Bear: quadruped({body:'#875536',face:'#9c6845',legs:'#69432d',tail:'<circle cx="18" cy="40" r="5" fill="#875536"/>',ears:'<circle cx="51" cy="15" r="6" fill="#875536"/><circle cx="51" cy="15" r="3" fill="#dba88c"/>',belly:'#d7b18b',extra:'<ellipse cx="64" cy="31" rx="4" ry="3" fill="#3c3029"/>'}),
  Panda: quadruped({body:'#f4f3ef',face:'#fff',legs:'#202124',tail:'<circle cx="18" cy="41" r="4" fill="#fff"/>',ears:'<circle cx="51" cy="16" r="6" fill="#202124"/><path d="m51 27-7-7-4 8" fill="#202124"/>',pattern:'<path d="M25 31q9-8 16-2l-1 10-11 3Zm2 11q9-6 16 0l-3 8H27Z" fill="#202124"/>',belly:'#fff'}),
  Tiger: quadruped({body:'#f38b22',face:'#f9a43c',tail:'<path d="M20 34Q7 25 8 39q1 10 16 8" fill="none" stroke="#f38b22" stroke-width="6"/><path d="M11 35h7m-6 9h8" stroke="#292321" stroke-width="3"/>',ears:'<path d="m50 17 2-8 8 10m-9 8-8-8-4 8" fill="#f38b22"/>',pattern:'<path d="m27 28 5 6-5 7m14-13-4 7 5 8m6-14-4 6 5 8" fill="none" stroke="#292321" stroke-width="2.8"/>',belly:'#fff0ce'}),
  Lion: quadruped({body:'#d59b37',face:'#f0bd5a',tail:'<path d="M20 35Q8 25 8 38q0 10 14 8" fill="none" stroke="#d59b37" stroke-width="4"/><path d="m9 35-4 4 5 5Z" fill="#69432d"/>',ears:'<circle cx="52" cy="18" r="5" fill="#d59b37"/>',extra:'<circle cx="54" cy="28" r="15" fill="#a85d21"/><path d="M48 22q10-8 15 1l-2 17-15-1-7-9Z" fill="#f0bd5a"/><circle cx="54" cy="29" r="1.5" fill="#111827"/><path d="m60 33 4 2-4 2" fill="#5b3524"/>'}),
  Elephant: '<path d="M13 39q2-18 22-18 18 0 22 16l-5 10H20Z" fill="#8898a7"/><path d="M21 45v16h6l3-14m14 0 2 14h6l-1-16" fill="#718394"/><circle cx="50" cy="27" r="12" fill="#9eacb8"/><path d="M48 31q-1 22 10 19 6-2 3-9" fill="#9eacb8"/><path d="M53 36q4 3 8 0" fill="none" stroke="#f8fafc" stroke-width="3"/><path d="M43 18q-15-12-15 6 7 6 14 1" fill="#aebbc5"/><circle cx="54" cy="25" r="1.5" fill="#111827"/>',
  Giraffe: quadruped({body:'#f5c34d',face:'#f5c34d',legs:'#e8b63e',tail:'<path d="M20 35Q8 26 9 39l11 6" fill="none" stroke="#e8b63e" stroke-width="3"/>',ears:'<path d="M50 20 50 9m7 10 5-9" stroke="#f5c34d" stroke-width="3"/><circle cx="50" cy="8" r="2.5" fill="#805129"/><circle cx="62" cy="8" r="2.5" fill="#805129"/>',pattern:'<path d="M27 29h7v7h-7m12-8h6v7h-6m-13 9h7v7h-7m14-7h8v7h-8m6-19h5v6h-5" fill="#9d642d"/>',extra:'<path d="M50 30q1-9 7-10l5 8-3 10-10 1Z" fill="#f5c34d"/>',belly:'#ffe6a2'}),
  Zebra: quadruped({body:'#f4f3ef',face:'#f4f3ef',legs:'#f4f3ef',tail:'<path d="M20 34Q7 27 9 40l12 5" fill="none" stroke="#252525" stroke-width="2"/>',ears:'<path d="m50 17 1-9 7 10m-9 9-7-8-3 8" fill="#f4f3ef"/>',pattern:'<path d="m24 29 5 3-5 4 5 4-5 5 6 5m5-23 4 4-4 5 5 4-4 5 5 5m4-22 4 4-4 5 5 4-4 5" fill="none" stroke="#202124" stroke-width="3"/>',belly:'#fff'}),
  Monkey: quadruped({body:'#94613b',face:'#94613b',legs:'#754b30',tail:'<path d="M20 35q-13-11-14 0t10 9q8-1 5-9" fill="none" stroke="#94613b" stroke-width="3"/>',ears:'<circle cx="51" cy="22" r="7" fill="#94613b"/><circle cx="51" cy="22" r="4" fill="#e9b38a"/>',belly:'#d89e71',extra:'<ellipse cx="56" cy="31" rx="8" ry="7" fill="#e9b38a"/><path d="M52 32h2m5 0h2m-6 3q2 2 4 0" fill="none"/>',face:'#94613b'}),
  Rabbit: '<path d="M18 45q0-16 18-17 17 0 22 13l-6 13H22Z" fill="#d8c6b8"/><path d="M25 48v13h6l3-12m12 0 1 12h6l-1-13" fill="#c6b3a5"/><path d="M49 29Q39 22 42 5q12 4 11 21 3-19 12-20 2 17-10 25Z" fill="#d8c6b8"/><path d="M48 26Q44 13 46 10m10 15q5-11 7-13" fill="none" stroke="#edaaa9"/><circle cx="56" cy="34" r="1.5" fill="#111827"/><ellipse cx="64" cy="39" rx="4" ry="3" fill="#fff"/>',
  Deer: quadruped({body:'#b9824b',face:'#c58b56',tail:'<path d="M20 35q-9-8-10 2l10 7" fill="#f2e3cc"/>',ears:'<path d="m48 20-8-7 10 3m4 2 8-8-5 12m-7-1-7-12m13 13 8-12" fill="none" stroke="#80522f" stroke-width="2.5"/>',pattern:'<g fill="#f7e7c7"><circle cx="29" cy="31" r="1.5"/><circle cx="36" cy="35" r="1.5"/><circle cx="43" cy="30" r="1.5"/></g>',belly:'#f4dfc3'}),
  Hedgehog: quadruped({body:'#c89b63',face:'#deb67e',legs:'#75533f',tail:'<path d="M20 41h-5" fill="none"/>',ears:'<path d="M49 23 53 17l5 7" fill="#deb67e"/>',pattern:'<path d="M20 37 16 22l9 9 1-17 7 15 7-17 3 18 11-13-4 22Z" fill="#544334"/>',belly:'#ecd2a9',extra:'<path d="m62 31 6 3-6 3" fill="#6b4d38"/>'}),
  Squirrel: quadruped({body:'#c87939',face:'#d58746',legs:'#a45d31',tail:'<path d="M20 38Q7 25 10 14q4-8 10-1 8 9 0 26Z" fill="#c87939"/><path d="M15 31q-2-13 3-16" fill="none" stroke="#f3c697" stroke-width="3"/>',ears:'<path d="m50 19 1-8 7 9m-9 10-7-8-4 8" fill="#c87939"/>',belly:'#f2d8b5',extra:'<path d="M61 31 68 33 62 37Z" fill="#f3c697"/><circle cx="57" cy="26" r="1.5" fill="#111827"/>'}),
  Raccoon: quadruped({body:'#777d83',face:'#8c9298',legs:'#555b62',tail:'<path d="M19 36Q6 26 9 41l12 5Z" fill="#777d83"/><path d="m10 33 10 5m-8 6 9-1" stroke="#25282b" stroke-width="3"/>',ears:'<path d="m49 18 3-9 8 11m-10 10-8-8-4 8" fill="#777d83"/>',pattern:'<path d="M48 26q9-8 16 2l-4 9-13-1Z" fill="#292d31"/>',belly:'#d2d5d7',extra:'<path d="m62 33 6 1-6 3" fill="#34383c"/>'}),
  Koala: quadruped({body:'#8b9299',face:'#a0a6ac',legs:'#737a81',tail:'<circle cx="19" cy="42" r="5" fill="#8b9299"/>',ears:'<circle cx="49" cy="18" r="9" fill="#a0a6ac"/><circle cx="49" cy="18" r="5" fill="#efb6b0"/><path d="m49 29-8-8-4 8" fill="#a0a6ac"/>',belly:'#f4f0e9',extra:'<ellipse cx="60" cy="31" rx="4" ry="6" fill="#292d31"/>'}),
  Kangaroo: '<path d="M18 42q-2-12 14-17 12-4 20 6l-4 18H23Z" fill="#b77b4e"/><path d="M27 44 20 62h7l9-13m3-2 4 15h7l-4-17" fill="#a66c43"/><path d="M48 34q9 0 11 10l-6 7q-8-3-13 3-9 1-11-6 7-10 19-9Z" fill="#d29965"/><path d="M49 31 52 7q6-3 7 4l-3 24m-8-3-7-23q4-7 8-1l4 24" fill="#b77b4e"/><path d="M35 42q8 6 15 0" fill="none" stroke="#8c5738"/><circle cx="56" cy="32" r="1.5" fill="#111827"/>',
  Penguin: '<ellipse cx="36" cy="40" rx="20" ry="25" fill="#303744"/><ellipse cx="36" cy="44" rx="12" ry="17" fill="#fffaf0"/><circle cx="29" cy="26" r="2" fill="#fff"/><circle cx="43" cy="26" r="2" fill="#fff"/><path d="m32 32 4 5 4-5Z" fill="#f59e0b"/><path d="m18 39-9 9 11 4m34-13 9 9-11 4" fill="#303744"/><path d="m26 63-4 4h12l2-4m6 0 2 4h12l-5-4" fill="#f59e0b"/>',
  Frog: '<ellipse cx="36" cy="43" rx="22" ry="17" fill="#69b943"/><ellipse cx="25" cy="27" rx="9" ry="10" fill="#72c94c"/><ellipse cx="47" cy="27" rx="9" ry="10" fill="#72c94c"/><circle cx="26" cy="27" r="3" fill="#fff"/><circle cx="47" cy="27" r="3" fill="#fff"/><circle cx="27" cy="27" r="1.5" fill="#111827"/><circle cx="48" cy="27" r="1.5" fill="#111827"/><path d="M22 49q14 11 28 0M22 51l-9 9 12-1m25-8 9 9-12-1" fill="none" stroke="#438b31" stroke-width="4"/><path d="m29 59-6 8h13l2-7m5-1 3 8h12l-8-9" fill="#69b943"/>',
  Turtle: '<ellipse cx="36" cy="42" rx="19" ry="14" fill="#8b6b3e"/><path d="M23 39q12-13 25 0v9q-13 11-25 0Z" fill="#a77c43"/><path d="m25 40 8-6 8 5-2 8-8 4-7-5Zm16-1 7-4m-24 13-5 9 10-3m18-6 7 8-10-2" fill="none" stroke="#5b472d" stroke-width="2"/><circle cx="59" cy="39" r="8" fill="#80b93f"/><circle cx="61" cy="37" r="1.5" fill="#111827"/><path d="m24 50-7 9 10-2m20-5 8 9-10-2" fill="#80b93f"/>'
};

const birds = {
  Parrot: bird({body:'#20a85a',wing:'#e0bd27',beak:'#e25d22',tail:'<path d="m28 48-7 20 10-5 2-13m4 0 2 18 7-8-3-13" fill="#e53d39"/>',crest:'<path d="m48 14-4-8 9 5 3-8 3 12" fill="#e53d39"/>',belly:'#f0d83b'}),
  Owl: '<ellipse cx="36" cy="42" rx="21" ry="23" fill="#8a613e"/><path d="m19 27-6-14 16 9m14 0 16-9-6 14" fill="#8a613e"/><ellipse cx="27" cy="34" rx="9" ry="10" fill="#f6e8c9"/><ellipse cx="45" cy="34" rx="9" ry="10" fill="#f6e8c9"/><circle cx="28" cy="34" r="4" fill="#f2b63d"/><circle cx="44" cy="34" r="4" fill="#f2b63d"/><circle cx="28" cy="34" r="2" fill="#111827"/><circle cx="44" cy="34" r="2" fill="#111827"/><path d="m32 42 4 5 4-5Z" fill="#f0a52e"/><path d="M26 61v5m20-5v5m-18 0h-5m25 0h-5" fill="none" stroke="#d9972f" stroke-width="2.5"/><path d="M19 43q8 6 13 0m8 0q6 6 13 0" fill="none" stroke="#b88b60"/>',
  Eagle: bird({body:'#754b30',wing:'#593824',beak:'#facc15',tail:'<path d="m30 47-8 15 11-7 5-8" fill="#fff"/>',crest:'<path d="M49 16q8-12 15-5l-8 12Z" fill="#fff"/>',belly:'#fff',extra:'<path d="M22 36 8 30l9 15m35-10 12-7-7 15" fill="#754b30"/>'}),
  Flamingo: bird({body:'#f47c9a',wing:'#f8a0b2',beak:'#f9a6ac',tail:'<path d="m30 48-6 12 12-7" fill="#f47c9a"/>',neck:'M43 33q-8-8 0-17 8-9 3-13-5 2-3 7 2 4-5 7-10 8-2 19Z',legs:'#e86c89',belly:'#fff0f2',extra:'<path d="M32 54v13m-4 0h8m15-13v13m-4 0h8" fill="none" stroke="#e86c89" stroke-width="2.5"/>'}),
  Peacock: bird({body:'#168c83',wing:'#14726d',beak:'#facc15',tail:'<path d="M30 46Q8 43 12 22q4-13 13 0 8-19 15-1 12-15 18-1 7 18-15 27Z" fill="#299c67"/><g fill="#facc15"><circle cx="22" cy="26" r="3"/><circle cx="39" cy="22" r="3"/><circle cx="53" cy="25" r="3"/></g><g fill="#2563eb"><circle cx="22" cy="26" r="1.5"/><circle cx="39" cy="22" r="1.5"/><circle cx="53" cy="25" r="1.5"/></g>',crest:'<path d="M52 14v-7m5 8 4-6m-9 6-5-6" fill="none" stroke="#178b82" stroke-width="2"/>',belly:'#31b7a2'}),
  Toucan: bird({body:'#202124',wing:'#34363a',beak:'#f59e0b',tail:'<path d="m29 49-9 13 15-7" fill="#202124"/>',belly:'#fff',extra:'<path d="m56 23 13 4-10 10-12-2Z" fill="#f59e0b"/><path d="m63 25 5 2-5 4" fill="#f43f5e"/>'}),
  Swan: '<path d="M14 48q9-17 27-11 10 3 15-5-8 1-11-3-5-6 2-13 6-5 9 0 2 4-3 6l-2-3q-2 1-1 3 4 5 12 2-2 15-15 20-18 8-29 17Z" fill="#fff"/><path d="M48 21q4-6 8-5l4 4-5 5" fill="#fff"/><path d="m56 16 11 1-9 5Z" fill="#f97316"/><circle cx="58" cy="18" r="1.2" fill="#111827"/><path d="M22 48q12 6 25-2m-25 17 7 3m14-5 5 3" fill="none" stroke="#d1d5db" stroke-width="2"/>',
  Duck: '<path d="M13 46q0-15 18-17 7-13 19-8 10 5 7 15 13 9 7 19-6 10-29 9-22-1-22-18Z" fill="#f5cc28"/><path d="m51 34 17 4-15 6Z" fill="#f97316"/><circle cx="49" cy="28" r="1.8" fill="#111827"/><path d="M24 51q14 6 28 0m-23 11-3 5h10l2-5m10 0 2 5h10l-6-5" fill="none" stroke="#d97706" stroke-width="2.5"/>',
  Chicken: bird({body:'#fff8eb',wing:'#f6f0e5',beak:'#f59e0b',legs:'#e6a32d',tail:'<path d="m30 37-8-9 8 2-2-9 9 8 4-10 4 12" fill="#fff8eb"/>',crest:'<path d="M51 13q-4-9 2-9 4 0 3 5 5-7 8-3 2 4-5 8Z" fill="#ef4444"/>',belly:'#f8fafc',extra:'<path d="M59 29q4 4 0 8l-5-4Z" fill="#ef4444"/>'}),
  Rooster: bird({body:'#a74725',wing:'#d19a2b',beak:'#facc15',legs:'#e4a82b',tail:'<path d="m30 42-11-14q8 1 12 9-4-15 3-17 4 10 4 20 4-17 12-16-2 15-12 22Z" fill="#157746"/>',crest:'<path d="M50 14q-4-11 3-10 4 1 2 6 6-7 9-2 1 4-6 9Z" fill="#dc2626"/>',belly:'#f5cf77',extra:'<path d="M59 29q5 4 0 8l-6-4Z" fill="#ef4444"/>'}),
  Robin: bird({body:'#8b5a2b',wing:'#76502f',beak:'#facc15',belly:'#ef4444',tail:'<path d="m28 48-7 14 12-6 4-9" fill="#76502f"/>'}),
  'Blue Jay': bird({body:'#2563eb',wing:'#1d4ed8',beak:'#111827',belly:'#fff',tail:'<path d="m30 46-8 18 13-10" fill="#1d4ed8"/>',crest:'<path d="m49 15-1-10 8 8 4-8 2 14" fill="#2563eb"/>',extra:'<path d="m33 38 14 7" stroke="#fff" stroke-width="3"/>'}),
  Woodpecker: bird({body:'#34383d',wing:'#292c30',beak:'#facc15',belly:'#fff',tail:'<path d="m29 49-5 15 12-8" fill="#dc2626"/>',crest:'<path d="m49 15 1-9 6 8 5-7 1 13" fill="#dc2626"/>',extra:'<path d="m30 37 14 4" stroke="#fff" stroke-width="2.5"/>'}),
  Hummingbird: bird({body:'#12a99b',wing:'#8be0cf',beak:'#34383d',belly:'#e3fff7',tail:'<path d="m30 45-9 14 15-7" fill="#078577"/>',extra:'<path d="m57 23 13-11-9 15" fill="#34383d"/><path d="m27 37-8-11 13 8" fill="#a4f0df"/>'}),
  Pelican: bird({body:'#f5f2e9',wing:'#d7dce0',beak:'#f3be3f',legs:'#f3be3f',belly:'#fff',tail:'<path d="m29 48-7 14 13-7" fill="#d7dce0"/>',neck:'M43 32q-5-16 2-20 7-3 11 4 2 6-4 11l-2 11Z',extra:'<path d="M56 25q12 6 6 14-8 10-16 4" fill="none" stroke="#f3be3f" stroke-width="3"/>'}),
  Seagull: bird({body:'#fff',wing:'#64748b',beak:'#facc15',legs:'#facc15',belly:'#fff',tail:'<path d="m29 47-7 14 13-8" fill="#64748b"/>',extra:'<path d="m31 35 13 6m-10-10 12 6" stroke="#fff" stroke-width="2"/>'}),
  Puffin: bird({body:'#252b35',wing:'#171b23',beak:'#f97316',legs:'#f97316',belly:'#fff',tail:'<path d="m30 48-6 12 12-6" fill="#252b35"/>',neck:'M43 32q-6-13 3-18 8-4 13 3l-3 17-8 6Z',extra:'<path d="m51 20 12 4-10 7-7-3Z" fill="#facc15"/><path d="M50 20v11" stroke="#fff" stroke-width="2"/>'}),
  Sparrow: bird({body:'#9c6a37',wing:'#774c2b',beak:'#f1b833',legs:'#a46a30',belly:'#f6e5c4',tail:'<path d="m29 47-8 13 14-7" fill="#774c2b"/>',extra:'<path d="M45 32q7-5 12 1" fill="none" stroke="#f6e5c4" stroke-width="3"/>'}),
  Heron: bird({body:'#8999a5',wing:'#657b88',beak:'#e6b834',legs:'#d39a45',belly:'#eee',tail:'<path d="m29 49-7 13 13-8" fill="#657b88"/>',neck:'M43 34q-8-10-2-20 5-8 11-3 5 5-1 12l-2 14Z',extra:'<path d="M31 55v12m20-12v12m-4 0h8" fill="none" stroke="#d39a45" stroke-width="2.5"/>'}),
  Cardinal: bird({body:'#df3036',wing:'#b91c2a',beak:'#f5bd32',legs:'#77513b',belly:'#ef7373',tail:'<path d="m29 46-11 17 17-10" fill="#b91c2a"/>',crest:'<path d="m48 16 4-12 5 9 8-4-6 12" fill="#df3036"/>',extra:'<path d="M51 25q8-6 12 3l-4 8-10-2Z" fill="#242424"/>'})
};

const seaLife = {
  Clownfish: fish({body:'#f97316',fin:'#f97316',tail:'#f97316',stripes:'<path d="M26 27q-4 10 0 20m12-24q-4 14 0 28m12-25q-4 10 0 20" fill="none" stroke="#fff" stroke-width="4"/>'}),
  Shark: '<path d="M8 40q15-21 40-12l10 11q-15 16-40 8Z" fill="#718096"/><path d="m54 38 14-14-3 19 3 13Z" fill="#64748b"/><path d="m30 46-8 12 18-8m-4-14 7-9 2 13" fill="#64748b"/><path d="M17 45q18 5 37 0" fill="none" stroke="#fff" stroke-width="3"/><path d="m30 47 3 4 3-4 3 4 3-4" fill="#fff"/><circle cx="48" cy="34" r="2" fill="#111827"/>',
  Whale: '<path d="M9 42q4-20 31-20 22 0 24 18-5 17-27 17-18 0-28-15Z" fill="#438aa5"/><path d="M23 49q20 9 37-1" fill="none" stroke="#c8edf1" stroke-width="5"/><path d="m18 42-11 8 14 3m22-27q12-15 18-7l-5 7" fill="#438aa5"/><circle cx="52" cy="34" r="2" fill="#111827"/><path d="M39 21q-4-10 2-13m4 12q-1-8 5-10" fill="none" stroke="#72c9d6" stroke-width="3"/>',
  Dolphin: '<path d="M12 44q10-22 34-17 11 2 17 14-12 15-32 12-12-2-19-9Z" fill="#48a9c5"/><path d="m53 39 15-13-6 21 5 11-17-8m-13-7-8 13 19-7" fill="#348ca8"/><path d="M23 47q17 7 36 0" fill="none" stroke="#e8fbff" stroke-width="3"/><circle cx="53" cy="35" r="1.8" fill="#111827"/><path d="M31 29q6-10 13-10" fill="none" stroke="#348ca8" stroke-width="3"/>',
  Octopus: '<path d="M17 37q0-20 19-20t19 20q0 12-19 12T17 37Z" fill="#d76073"/><path d="M21 45q-12 8-8 19 2 4 6-1l7-11m2-4q-9 17-1 22 5 2 5-5l2-13m5-1q-3 18 6 20 5 0 3-8l-1-14m5-3q8 13 15 8 4-4-3-8l-7-8" fill="none" stroke="#d76073" stroke-width="5"/><circle cx="30" cy="33" r="2" fill="#fff"/><circle cx="43" cy="33" r="2" fill="#fff"/><circle cx="30" cy="33" r="1" fill="#111827"/><circle cx="43" cy="33" r="1" fill="#111827"/>',
  Jellyfish: '<path d="M13 36q0-24 23-24t23 24q-7 10-15 0-8 10-16 0-8 10-15 0Z" fill="#bb8bdb"/><path d="M20 39q6 8 0 19m11-17q6 13 0 23m11-23q-6 12 2 22m8-24q-7 10 1 18" fill="none" stroke="#9869c0" stroke-width="3"/><path d="M20 29q16-10 32 0m-27-8q10-6 21 0" fill="none" stroke="#e9d5ff" stroke-width="3"/><circle cx="29" cy="32" r="1.5" fill="#5b3b77"/><circle cx="43" cy="32" r="1.5" fill="#5b3b77"/>',
  Seahorse: mammals.Seahorse || '<path d="M45 13q-15-7-22 5-6 12 5 19 8 7 1 14-8 8 2 12 12 3 16-6 4-7-4-12-6-4-1-9 9-8 9-16 0-7-6-9Z" fill="#f49a45"/><path d="m42 17 12-6-6 11m-20-4-5-7m-2 16-8-4m10 13-8 3m24-15 9 4m-12 16 8 5" fill="#f6c355"/><circle cx="43" cy="20" r="1.8" fill="#111827"/><path d="M31 56q-8 6-2 10" fill="none"/>',
  Crab: '<path d="M18 40q0-13 18-13t18 13l-5 15H23Z" fill="#ef6550"/><path d="m19 34-9-9q-4-8 3-10 8-1 7 8l8 7m25 4 9-9q4-8-3-10-8-1-7 8l-8 7" fill="none" stroke="#ef6550" stroke-width="4"/><path d="M22 52 15 63m14-10-2 12m16-12 2 12m6-13 7 11" fill="none" stroke="#d94b43" stroke-width="3"/><circle cx="29" cy="31" r="3" fill="#fff"/><circle cx="43" cy="31" r="3" fill="#fff"/><circle cx="29" cy="31" r="1.4" fill="#111827"/><circle cx="43" cy="31" r="1.4" fill="#111827"/>',
  Lobster: '<path d="M23 31q13-9 26 0l-3 17H26Z" fill="#e34d3f"/><path d="m26 34-10-9m30 9 10-9M29 46l-9 11m16-10v14m7-15 10 11" fill="none" stroke="#d43c34" stroke-width="3"/><path d="m17 26-9-6 2 13 10-1m34-6 9-6-2 13-10-1" fill="#ef6550"/><path d="m28 31-7-15m23 15 7-15m-23 8-7-4m23 4 7-4" fill="none" stroke="#d43c34" stroke-width="2"/><circle cx="30" cy="30" r="1.5" fill="#111827"/><circle cx="42" cy="30" r="1.5" fill="#111827"/>',
  Starfish: '<path d="m36 8 8 19 20 1-15 13 5 20-18-11-18 11 5-20L8 28l20-1Z" fill="#fb923c"/><circle cx="31" cy="32" r="2" fill="#fff"/><circle cx="41" cy="32" r="2" fill="#fff"/><path d="M32 39q4 4 8 0m-15-8 3 2m20-2-3 2m-15 9 2 3m8-3-2 3" fill="none" stroke="#7c2d12"/>',
  Stingray: '<path d="M36 13q7 13 30 20-10 17-27 8l-3 20-4-20q-18 9-27-8 23-7 31-20Z" fill="#687c91"/><path d="M30 43q6 6 12 0m-6 18 5 9" fill="none"/><circle cx="30" cy="34" r="2" fill="#fff"/><circle cx="42" cy="34" r="2" fill="#fff"/><circle cx="30" cy="34" r="1" fill="#111827"/><circle cx="42" cy="34" r="1" fill="#111827"/>',
  'Sea Turtle': '<ellipse cx="36" cy="42" rx="19" ry="14" fill="#287c67"/><path d="M22 39q14-14 28 0v9q-14 11-28 0Z" fill="#498f57"/><path d="m25 40 8-7 8 5-2 9-8 4-7-5Zm16-1 8-6m-27 13-7 9 11-2m20-6 8 8-11-2" fill="none" stroke="#1c5e4d" stroke-width="2"/><path d="m22 34-10-9-3 10 12 6m30-7 10-9 3 10-12 6M25 51l-9 10 13-3m18-7 9 10-12-3" fill="#70b87a"/><circle cx="60" cy="39" r="8" fill="#70b87a"/><path d="M57 37q4-3 7 0" fill="none" stroke="#d7ec9d" stroke-width="2"/><circle cx="62" cy="37" r="1.5" fill="#111827"/>',
  Pufferfish: '<circle cx="36" cy="39" r="19" fill="#f2c550"/><path d="m36 15 3 7m14-2-5 7m16 6-8 3m5 14-8-2m-12 15 1-8m-18 4 4-8M9 40l8-2m-3-14 8 5m2-15 5 8" stroke="#c28c2d" stroke-width="2"/><path d="M16 40q-8 9-9 0 3-10 10-8m29-13 1-7 5 5m-26 3-1-8-5 6" fill="#f2c550"/><circle cx="43" cy="34" r="2" fill="#111827"/><path d="M48 43q-5 4-10 0" fill="none" stroke="#bd773e" stroke-width="2"/>',
  Swordfish: fish({body:'#38bdf8',fin:'#64748b',tail:'#64748b',stripes:'<path d="m26 29 5 8-5 8m10-21 5 13-4 9" fill="none" stroke="#1e3a8a" stroke-width="2"/>',extra:'<path d="m57 32 13-13-9 18" fill="#64748b"/>'}),
  Orca: '<path d="M9 42q10-21 36-17 14 2 19 15-8 17-29 16-16-1-26-14Z" fill="#151a20"/><path d="M18 37q12-7 22-1l-3 13q-10-5-19-1Z" fill="#fff"/><path d="m55 41 13 8-18-1m-15-21 9-11 7 14" fill="#151a20"/><path d="M24 49q15 9 31 1" fill="none" stroke="#fff" stroke-width="3"/><circle cx="53" cy="36" r="1.8" fill="#fff"/>',
  Squid: '<path d="M22 42q0-22 14-22t14 22q-14 9-28 0Z" fill="#c66d8b"/><path d="M26 43q-3 14-11 18m15-16q2 13-2 20m8-19v19m6-20q7 13 11 18m-6-20q14 9 16 17" fill="none" stroke="#9e4f70" stroke-width="3"/><path d="M30 39q6 5 12 0" fill="none" stroke="#f7d8e1" stroke-width="2"/><circle cx="29" cy="34" r="2" fill="#fff"/><circle cx="43" cy="34" r="2" fill="#fff"/><circle cx="29" cy="34" r="1" fill="#111827"/><circle cx="43" cy="34" r="1" fill="#111827"/>',
  Shrimp: '<path d="M17 36q6-17 23-14 15 2 15 16-3 15-18 16-17 1-22-12Z" fill="#f28a78"/><path d="M22 29q-9-12-13-3m14 7Q9 23 8 34m14 7Q9 36 8 44" fill="none" stroke="#db665c" stroke-width="2"/><path d="M27 29q-4 8 1 18m7-20q-4 11 2 22m6-19q-4 10 2 17m3-10q10 10 13 20" fill="none" stroke="#db665c" stroke-width="2"/><path d="m26 27-4-11m8 10 2-12" fill="none"/><circle cx="28" cy="28" r="1.5" fill="#111827"/>'
};

async function main() {
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, 'assets', 'block-pack.js'), 'utf8'), { window });
  const sprites = [...window.BLOCK_PACK.sprites.list, ...window.BLOCK_PACK.sprites.library];
  const assets = [...Object.entries(mammals), ...Object.entries(birds), ...Object.entries(seaLife)]
    .filter(([name]) => !fluentNames.has(name));
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));
  const missing = assets.filter(([name]) => !byName.has(name));
  if (missing.length) throw new Error(`Sprite registrations missing: ${missing.map(([name]) => name).join(', ')}`);
  const files = new Set(assets.map(([name]) => byName.get(name).src));
  if (assets.length !== files.size) throw new Error('Some animal names point to the same asset path.');
  for (const [name, art] of assets) await fs.writeFile(path.resolve(root, byName.get(name).src), wrap(art), 'utf8');
  console.log(`Created original full-body drawings for ${assets.length} animals without exact Fluent artwork.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
