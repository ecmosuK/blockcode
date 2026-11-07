/*
 * BlockCode asset pack
 * --------------------
 * Each block is a single SVG sprite in assets/blocks. This file connects
 * those sprites to the workspace: input slots, defaults, behaviour and order.
 * Refresh index.html after editing; no build step or server is needed.
 */

const BACKDROP_ART = {
  school: '<rect x="142" y="126" width="196" height="132" rx="8" fill="#fef3c7" stroke="#92400e" stroke-width="5"/><path d="M126 130 240 65l114 65Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="5"/><rect x="218" y="184" width="44" height="74" fill="#92400e"/><g fill="#7dd3fc" stroke="#92400e" stroke-width="4"><rect x="160" y="151" width="38" height="34"/><rect x="282" y="151" width="38" height="34"/></g><text x="240" y="119" text-anchor="middle" font-size="18" font-weight="700" fill="#7f1d1d">SCHOOL</text>',
  house: '<path d="M140 151 240 69l100 82v107H140Z" fill="#fb923c" stroke="#7c2d12" stroke-width="5"/><path d="m122 154 118-99 118 99" fill="#b91c1c" stroke="#7f1d1d" stroke-width="8"/><rect x="215" y="186" width="50" height="72" rx="5" fill="#78350f"/><g fill="#bae6fd" stroke="#7c2d12" stroke-width="4"><rect x="158" y="169" width="39" height="37"/><rect x="283" y="169" width="39" height="37"/></g>',
  playground: '<path d="M160 112v132m160-132v132m-160-112h160" fill="none" stroke="#7c3aed" stroke-width="9"/><path d="M214 132v58m52-58v58" stroke="#f97316" stroke-width="4"/><path d="M202 190h24l-4 36h-16Zm52 0h24l-4 36h-16Z" fill="#facc15" stroke="#9a3412" stroke-width="3"/>',
  classroom: '<rect x="76" y="64" width="328" height="215" rx="10" fill="#fff7ed" stroke="#92400e" stroke-width="5"/><rect x="108" y="88" width="264" height="96" rx="6" fill="#166534"/><path d="M126 169h226" stroke="#bbf7d0" stroke-width="4"/><rect x="206" y="204" width="68" height="75" fill="#a16207"/><path d="M118 228h242m-214 0v35m186-35v35" stroke="#7c2d12" stroke-width="7"/>',
  library: '<rect x="86" y="72" width="308" height="207" rx="12" fill="#fef3c7" stroke="#78350f" stroke-width="5"/><g stroke="#78350f" stroke-width="4"><path d="M112 108h110v66H112Zm146 0h110v66H258ZM112 194h110v62H112Zm146 0h110v62H258Z"/></g><g fill="#38bdf8"><path d="M126 112h17v58h-17m25-58h19v58h-19m27-58h15v58h-15m74-58h18v58h-18m27-58h16v58h-16m24-58h20v58h-20M126 198h20v54h-20m27-54h16v54h-16m26-54h19v54h-19m68-54h17v54h-17m24-54h20v54h-20m27-54h20v54h-20"/></g>',
  city: '<g stroke="#334155" stroke-width="5"><path d="M50 258V142h82v116Z" fill="#60a5fa"/><path d="M145 258V92h100v166Z" fill="#a78bfa"/><path d="M260 258V126h78v132Z" fill="#f97316"/><path d="M350 258V164h82v94Z" fill="#34d399"/></g><g fill="#fef3c7"><path d="M67 160h16v18H67m33-18h16v18h-16M164 113h18v20h-18m38-20h18v20h-18m-38 28h18v20h-18m38-20h18v20h-18M278 148h16v18h-16m29 0h16v18h-16M369 182h16v18h-16m30 0h16v18h-16"/></g>',
  forest: '<path d="M95 247 160 110l65 137Zm-41 2 51-104 51 104Zm204-1 68-157 68 157Zm54 1 57-117 57 117Z" fill="#15803d" stroke="#14532d" stroke-width="5"/><path d="M158 247h15v45h-15m153-44h17v50h-17" fill="#78350f"/>',
  farm: '<path d="M125 151 240 83l115 68v113H125Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="6"/><path d="m105 154 135-89 135 89" fill="#7f1d1d"/><path d="M190 264v-77l50-40 50 40v77Z" fill="#fef3c7" stroke="#78350f" stroke-width="5"/>',
  mountains: '<path d="m-20 266 134-174 75 96 87-131 220 213v70H-20Z" fill="#64748b" stroke="#334155" stroke-width="6"/><path d="m81 125 33-43 30 39-23-8-12 14Zm161-42 34-40 34 48-27-12-15 17Z" fill="#f8fafc"/>',
  beach: '<path d="M0 175q60-22 120 0t120 0 120 0 120 0v145H0Z" fill="#38bdf8"/><path d="M0 220q65-20 130 0t130 0 120 0 100 0v100H0Z" fill="#0e7490"/><path d="M0 267q90-28 180 0t180 0 120 0v53H0Z" fill="#facc15"/><path d="M335 167v98m-52-94h104l-52-58Z" fill="#fb7185" stroke="#7c2d12" stroke-width="5"/>',
  underwater: '<path d="M0 0h480v320H0Z" fill="#0e7490"/><path d="M0 279q120-36 240 0t240 0v41H0Z" fill="#d6a85f"/><g fill="none" stroke="#fb7185" stroke-width="9" stroke-linecap="round"><path d="M64 280v-76m0 22-24-20m24 8 22-25m268 91v-92m0 28-23-22m23 8 22-28m-22 45 21 18"/></g><g fill="#fde68a"><path d="M170 112q24-18 48 0-24 18-48 0m-5 0-15-12v24Z"/><path d="M280 168q19-15 38 0-19 15-38 0m-7 0-13-10v20Z"/></g>',
  waterfall: '<path d="M0 0h135l30 197H0Zm345 0h135v197H315Z" fill="#166534"/><path d="M160 0h160v247H160Z" fill="#bae6fd" stroke="#0e7490" stroke-width="7"/><path d="M0 228q120-46 240 0t240 0v92H0Z" fill="#0284c7"/><path d="M182 260q58-18 116 0m-98 24q42-13 84 0" fill="none" stroke="#e0f2fe" stroke-width="7"/>',
  tent: '<path d="M0 254q120-42 240 0t240 0v66H0Z" fill="#365314"/><path d="m128 255 112-157 112 157Z" fill="#f97316" stroke="#7c2d12" stroke-width="7"/><path d="m240 98 0 157h112Z" fill="#fef3c7"/>',
  castle: '<path d="M100 270V133h65v-38h55v38h40V95h55v38h65v137Z" fill="#c4b5fd" stroke="#4c1d95" stroke-width="6"/><path d="M90 135V74h42v61m216 0V74h42v61" fill="#8b5cf6" stroke="#4c1d95" stroke-width="5"/><path d="M212 270v-76q28-49 56 0v76Z" fill="#78350f"/><g fill="#fde68a"><rect x="119" y="159" width="22" height="28"/><rect x="339" y="159" width="22" height="28"/></g>',
  space: '<g fill="#f8fafc"><circle cx="42" cy="52" r="3"/><circle cx="408" cy="66" r="3"/><circle cx="364" cy="138" r="2"/><circle cx="94" cy="121" r="2"/></g><circle cx="350" cy="104" r="48" fill="#a78bfa" stroke="#6d28d9" stroke-width="6"/><path d="M74 230q165-100 340-14" fill="none" stroke="#94a3b8" stroke-width="12"/><path d="M240 95q-46 53-27 131l27 34 27-34q19-78-27-131Z" fill="#f8fafc" stroke="#64748b" stroke-width="5"/><circle cx="240" cy="176" r="13" fill="#38bdf8"/>',
  sports: '<path d="M28 34h424v250H28Z" fill="none" stroke="#dcfce7" stroke-width="5"/><path d="M240 34v250m-212-125h424" stroke="#dcfce7" stroke-width="5"/><circle cx="240" cy="159" r="38" fill="none" stroke="#dcfce7" stroke-width="5"/>',
  fair: '<circle cx="240" cy="143" r="91" fill="none" stroke="#f8fafc" stroke-width="8"/><circle cx="240" cy="143" r="12" fill="#ef4444"/><g stroke="#fff" stroke-width="5"><path d="m240 52-28 89h56Zm0 182-28-91h56Zm-91-91 91-28v56Zm182 0-91-28v56Z"/></g><path d="M115 260V168l42-51 42 51v92m104 0V168l42-51 42 51v92Z" fill="#fb7185" stroke="#9d174d" stroke-width="5"/>',
  garden: '<path d="M0 238q120-42 240 0t240 0v82H0Z" fill="#65a30d"/><g stroke="#15803d" stroke-width="7"><path d="M110 245v-80m130 80v-108m130 108v-78"/></g><g fill="#f472b6"><circle cx="110" cy="157" r="15"/><circle cx="97" cy="145" r="10"/><circle cx="123" cy="145" r="10"/><circle cx="240" cy="127" r="15"/><circle cx="227" cy="115" r="10"/><circle cx="253" cy="115" r="10"/><circle cx="370" cy="155" r="15"/></g><circle cx="110" cy="157" r="6" fill="#facc15"/><circle cx="240" cy="127" r="6" fill="#facc15"/>',
  rainy: '<path d="M0 229h480v91H0Z" fill="#475569"/><g fill="#64748b"><ellipse cx="145" cy="102" rx="75" ry="35"/><ellipse cx="214" cy="101" rx="68" ry="45"/><ellipse cx="275" cy="111" rx="70" ry="32"/></g><g stroke="#38bdf8" stroke-width="7"><path d="m120 151-12 30m57-30-12 30m59-30-12 30m60-30-12 30m59-30-12 30m58-30-12 30"/></g>',
  train: '<path d="M0 242h480v78H0Z" fill="#475569"/><path d="M0 266h480m0 30H0" stroke="#cbd5e1" stroke-width="6"/><path d="M106 115q0-30 34-30h200q34 0 34 30v127H106Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="6"/><path d="M137 108h68v55h-68m87-55h68v55h-68m87-55h35v55h-35" fill="#bae6fd" stroke="#7f1d1d" stroke-width="5"/><circle cx="165" cy="245" r="18" fill="#1e293b"/><circle cx="316" cy="245" r="18" fill="#1e293b"/>'
};

function illustratedBackdrop([id, name, scene, sky, ground, accent]) {
  const night = scene === 'space';
  const underwater = scene === 'underwater';
  const indoors = scene === 'classroom' || scene === 'library';
  const rainy = scene === 'rainy';
  const city = scene === 'city';
  const mountains = scene === 'mountains';
  const water = underwater || scene === 'beach' || scene === 'waterfall';
  const stars = night
    ? '<g fill="#fff" opacity=".9"><circle cx="43" cy="45" r="1.6"/><circle cx="91" cy="91" r="1"/><circle cx="151" cy="41" r="1.3"/><circle cx="203" cy="113" r="1"/><circle cx="276" cy="52" r="1.7"/><circle cx="322" cy="33" r="1"/><circle cx="429" cy="88" r="1.5"/><circle cx="388" cy="154" r="1"/><circle cx="70" cy="168" r="1.2"/><circle cx="188" cy="187" r="1.4"/></g>'
    : '';
  const sun = underwater || night || indoors || rainy ? '' :
    '<circle cx="394" cy="58" r="48" fill="url(#sunGlow)"/><circle cx="394" cy="58" r="20" fill="' + accent + '" opacity=".96"/>';
  const clouds = underwater || night || indoors || rainy ? '' :
    '<g fill="#fff" opacity=".72"><ellipse cx="93" cy="74" rx="39" ry="11"/><ellipse cx="112" cy="65" rx="23" ry="17"/><ellipse cx="135" cy="73" rx="29" ry="12"/><ellipse cx="285" cy="112" rx="29" ry="8" opacity=".46"/><ellipse cx="299" cy="105" rx="18" ry="12" opacity=".46"/></g>';
  const landscape = underwater || night || indoors || rainy || water ? '' :
    '<path d="M0 211q91-55 184 0t180-1 116-7v117H0Z" fill="url(#farLand)" opacity=".66"/>' +
    '<path d="M0 239q110-61 220-3t260-8v92H0Z" fill="url(#nearLand)"/>';
  const mountainMist = mountains
    ? '<path d="M0 179q115-30 240 0t240 0v45H0Z" fill="#fff" opacity=".16"/>'
    : '';
  const ambient = underwater
    ? '<g opacity=".2" stroke="#d9fbff" stroke-width="18"><path d="m60 0 70 205M176 0l30 194M293 0l-16 186M411 0l-72 203"/></g><g fill="#e0fbff" opacity=".48"><circle cx="78" cy="178" r="3"/><circle cx="103" cy="145" r="2"/><circle cx="347" cy="209" r="4"/><circle cx="373" cy="179" r="2"/><circle cx="421" cy="132" r="3"/></g>'
    : night
      ? '<ellipse cx="240" cy="282" rx="300" ry="96" fill="' + accent + '" opacity=".12"/><path d="M0 270q120-24 240 0t240 0" fill="none" stroke="#c4b5fd" stroke-width="2" opacity=".28"/>'
      : indoors
        ? '<path d="M0 244h480v76H0Z" fill="#6b4b36" opacity=".12"/><path d="M0 258h480M0 286h480" stroke="#fff" stroke-width="2" opacity=".18"/>'
        : rainy
          ? '<path d="M0 222h480v98H0Z" fill="url(#nearLand)" opacity=".44"/><path d="M0 25 480 0v320H0Z" fill="#0f172a" opacity=".08"/>'
          : '';
  const foreground = water
    ? '<path d="M0 297q74-15 148 0t148 0 184 0v23H0Z" fill="#fff" opacity=".2"/><path d="M20 306q52-9 104 0m78-3q45-8 90 0m58 3q44-8 88 0" fill="none" stroke="#fff" stroke-width="2" opacity=".3"/>'
    : !indoors && !night && !rainy && !city
      ? '<path d="M0 308q82-10 164 0t164 0 152 0v12H0Z" fill="#fff" opacity=".12"/><g stroke="#f0fdf4" stroke-width="2" opacity=".22"><path d="m32 309 5-10m82 11 4-8m91 8 5-11m108 11 4-8m94 8 5-10"/></g>'
      : '';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320"><defs>' +
    '<linearGradient id="skyGrad" x2="0" y2="1"><stop stop-color="' + sky + '"/><stop offset=".72" stop-color="' + sky + '"/><stop offset="1" stop-color="' + ground + '"/></linearGradient>' +
    '<linearGradient id="farLand" x2="0" y2="1"><stop stop-color="' + ground + '"/><stop offset="1" stop-color="' + accent + '"/></linearGradient>' +
    '<linearGradient id="nearLand" x2="0" y2="1"><stop stop-color="' + ground + '"/><stop offset="1" stop-color="' + ground + '" stop-opacity=".82"/></linearGradient>' +
    '<radialGradient id="sunGlow"><stop stop-color="' + accent + '" stop-opacity=".48"/><stop offset="1" stop-color="' + accent + '" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="vignette" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#08111f" stop-opacity=".18"/></linearGradient>' +
    '<filter id="sceneShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#102033" flood-opacity=".24"/></filter>' +
    '</defs><rect width="480" height="320" fill="url(#skyGrad)"/>' +
    '<circle cx="240" cy="110" r="180" fill="url(#sunGlow)" opacity=".34"/>' + stars + sun + clouds + landscape + mountainMist +
    '<g filter="url(#sceneShadow)">' + BACKDROP_ART[scene] + '</g>' + ambient + foreground +
    '<rect width="480" height="320" fill="url(#vignette)" pointer-events="none"/>' +
    '<path d="M0 0h480v320H0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/></svg>';
  return { id, name, css: 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")', size: 'cover' };
}

const EXTRA_BACKDROPS = [
  ['sunny-day', 'Sunny Day', 'garden', '#7dd3fc', '#86efac', '#facc15'],
  ['outside', 'Outside', 'forest', '#bae6fd', '#65a30d', '#fbbf24'],
  ['school', 'School', 'school', '#7dd3fc', '#4d7c0f', '#facc15'],
  ['house', 'House', 'house', '#93c5fd', '#65a30d', '#fde047'],
  ['playground', 'Playground', 'playground', '#38bdf8', '#84cc16', '#fbbf24'],
  ['classroom', 'Classroom', 'classroom', '#fde68a', '#a16207', '#f97316'],
  ['library', 'Library', 'library', '#c4b5fd', '#78350f', '#fde68a'],
  ['city-street', 'City Street', 'city', '#93c5fd', '#475569', '#fde047'],
  ['neighborhood', 'Neighborhood', 'house', '#bae6fd', '#65a30d', '#facc15'],
  ['farm', 'Farm', 'farm', '#7dd3fc', '#65a30d', '#facc15'],
  ['garden', 'Garden', 'garden', '#bae6fd', '#4d7c0f', '#fbbf24'],
  ['forest', 'Forest', 'forest', '#7dd3fc', '#166534', '#fde047'],
  ['rainforest', 'Rainforest', 'forest', '#38bdf8', '#14532d', '#facc15'],
  ['pine-forest', 'Pine Forest', 'forest', '#bae6fd', '#14532d', '#fef08a'],
  ['flower-meadow', 'Flower Meadow', 'garden', '#7dd3fc', '#84cc16', '#facc15'],
  ['cherry-grove', 'Cherry Grove', 'forest', '#fbcfe8', '#86efac', '#fde047'],
  ['autumn-woods', 'Autumn Woods', 'forest', '#fdba74', '#a16207', '#facc15'],
  ['rolling-hills', 'Rolling Hills', 'farm', '#bae6fd', '#84cc16', '#facc15'],
  ['countryside', 'Countryside', 'farm', '#7dd3fc', '#65a30d', '#fde047'],
  ['savanna', 'Savanna', 'farm', '#fde68a', '#a16207', '#facc15'],
  ['sandy-beach', 'Sandy Beach', 'beach', '#7dd3fc', '#facc15', '#fde047'],
  ['sunset-coast', 'Sunset Coast', 'beach', '#fb7185', '#0e7490', '#fde68a'],
  ['tropical-lagoon', 'Tropical Lagoon', 'beach', '#67e8f9', '#0e7490', '#facc15'],
  ['coral-reef', 'Coral Reef', 'underwater', '#38bdf8', '#0e7490', '#fde047'],
  ['deep-ocean', 'Deep Ocean', 'underwater', '#0e7490', '#164e63', '#67e8f9'],
  ['arctic-sea', 'Arctic Sea', 'underwater', '#bae6fd', '#0e7490', '#f8fafc'],
  ['aquarium', 'Aquarium', 'underwater', '#38bdf8', '#0e7490', '#facc15'],
  ['waterfall', 'Waterfall', 'waterfall', '#7dd3fc', '#0e7490', '#f8fafc'],
  ['misty-lake', 'Misty Lake', 'beach', '#cbd5e1', '#0e7490', '#f8fafc'],
  ['under-the-bridge', 'Under the Bridge', 'beach', '#94a3b8', '#0e7490', '#fde047'],
  ['mountain-trail', 'Mountain Trail', 'mountains', '#7dd3fc', '#65a30d', '#fde047'],
  ['snowy-peaks', 'Snowy Peaks', 'mountains', '#bae6fd', '#e2e8f0', '#f8fafc'],
  ['ski-resort', 'Ski Resort', 'mountains', '#c4b5fd', '#e2e8f0', '#fde047'],
  ['desert-canyon', 'Desert Canyon', 'mountains', '#fdba74', '#b45309', '#fde047'],
  ['camping', 'Camping', 'tent', '#1e3a8a', '#365314', '#fde047'],
  ['moon-base', 'Moon Base', 'space', '#020617', '#64748b', '#e0e7ff'],
  ['space-station', 'Space Station', 'space', '#020617', '#1e3a8a', '#fef3c7'],
  ['alien-planet', 'Alien Planet', 'space', '#312e81', '#7c3aed', '#4ade80'],
  ['castle', 'Castle', 'castle', '#c4b5fd', '#65a30d', '#fde047'],
  ['city-dusk', 'City at Dusk', 'city', '#f9a8d4', '#334155', '#fde68a'],
  ['downtown', 'Downtown', 'city', '#7dd3fc', '#475569', '#facc15'],
  ['neon-city', 'Neon City', 'city', '#1e1b4b', '#1f2937', '#22d3ee'],
  ['school-library', 'School Library', 'library', '#c4b5fd', '#78350f', '#fde68a'],
  ['bakery', 'Bakery', 'house', '#bae6fd', '#a16207', '#facc15'],
  ['kitchen', 'Kitchen', 'classroom', '#fde68a', '#a16207', '#fb7185'],
  ['train-station', 'Train Station', 'train', '#93c5fd', '#475569', '#facc15'],
  ['sports-field', 'Sports Field', 'sports', '#7dd3fc', '#16a34a', '#fde047'],
  ['carnival', 'Carnival', 'fair', '#c4b5fd', '#65a30d', '#fde047'],
  ['rainy-day', 'Rainy Day', 'rainy', '#94a3b8', '#475569', '#fef08a'],
  ['rainbow-valley', 'Rainbow Valley', 'garden', '#fbcfe8', '#65a30d', '#fde047']
].map(illustratedBackdrop);

const EXTRA_SPRITE_GROUPS = {
  animals: [
    'Fox', 'Wolf', 'Bear', 'Panda', 'Tiger', 'Lion', 'Elephant', 'Giraffe', 'Zebra', 'Monkey',
    'Rabbit', 'Deer', 'Hedgehog', 'Squirrel', 'Raccoon', 'Koala', 'Kangaroo', 'Penguin', 'Frog', 'Turtle'
  ],
  birds: [
    'Parrot', 'Owl', 'Eagle', 'Flamingo', 'Peacock', 'Toucan', 'Swan', 'Duck', 'Chicken', 'Rooster',
    'Robin', 'Blue Jay', 'Woodpecker', 'Hummingbird', 'Pelican', 'Seagull', 'Puffin', 'Sparrow', 'Heron', 'Cardinal'
  ],
  seaLife: [
    'Clownfish', 'Shark', 'Whale', 'Dolphin', 'Octopus', 'Jellyfish', 'Seahorse', 'Crab', 'Lobster', 'Starfish',
    'Seashell', 'Stingray', 'Sea Turtle', 'Pufferfish', 'Swordfish', 'Orca', 'Squid', 'Shrimp', 'Coral', 'Nautilus'
  ],
  plants: [
    'Sunflower', 'Rose', 'Tulip', 'Daisy', 'Cactus', 'Fern', 'Palm Tree', 'Pine Tree', 'Oak Tree', 'Bamboo',
    'Mushroom', 'Water Lily', 'Lavender', 'Dandelion', 'Bonsai', 'Vine', 'Pitcher Plant', 'Clover', 'Poppy', 'Lotus'
  ],
  fruits: [
    'Orange', 'Banana', 'Strawberry', 'Watermelon', 'Grapes', 'Pineapple', 'Pear', 'Peach', 'Cherry', 'Lemon',
    'Blueberry', 'Mango', 'Kiwi', 'Coconut', 'Avocado', 'Pumpkin', 'Carrot', 'Corn', 'Broccoli', 'Bell Pepper'
  ],
  foods: [
    'Pancakes', 'Waffle', 'Donut', 'Cupcake', 'Cookie', 'Pretzel', 'Sandwich', 'Taco', 'Burrito', 'Sushi',
    'Noodles', 'Dumpling', 'Soup', 'Cheese', 'Bread', 'Hot Dog', 'Popcorn', 'Lollipop', 'Milkshake', 'Water Bottle'
  ],
  vehicles: [
    'Race Car', 'Fire Truck', 'Ambulance', 'Police Car', 'Bus', 'Tractor', 'Bicycle', 'Scooter', 'Skateboard', 'Train',
    'Airplane', 'Helicopter', 'Hot Air Balloon', 'Sailboat', 'Submarine', 'Ferry', 'Dump Truck', 'Crane', 'Motorcycle', 'Spaceship'
  ],
  space: [
    'Saturn', 'Earth', 'Mars', 'Jupiter', 'Venus', 'Mercury', 'Neptune', 'Uranus', 'Asteroid', 'Meteor',
    'Galaxy', 'Black Hole', 'Space Shuttle', 'Lunar Lander', 'Space Probe', 'Space Helmet', 'Moon Rover', 'Solar System', 'Satellite Dish', 'Rocket Bot'
  ],
  buildings: [
    'Cottage', 'Farmhouse', 'Treehouse', 'Lighthouse', 'Windmill', 'Barn', 'School Bus Stop', 'Fire Station', 'Hospital', 'Museum',
    'Castle Tower', 'Igloo', 'Tent', 'Apartment', 'Shop', 'Cafe', 'Train Station', 'Water Tower', 'Greenhouse'
  ],
  toys: [
    'Teddy Bear', 'Toy Robot', 'Doll', 'Toy Train', 'Yo-Yo', 'Kite', 'Toy Boat', 'Toy Dinosaur', 'Jack-in-the-Box', 'Spinning Top',
    'Building Blocks', 'Puzzle Piece', 'Jump Rope', 'Toy Drum', 'Marble', 'Toy Rocket', 'Wind-up Mouse', 'Toy Airplane', 'Rubber Duck', 'Pinwheel'
  ],
  music: [
    'Acoustic Guitar', 'Electric Guitar', 'Ukulele', 'Piano', 'Keyboard', 'Violin', 'Cello', 'Harp', 'Trumpet', 'Trombone',
    'Saxophone', 'Clarinet', 'Flute', 'Drum Kit', 'Snare Drum', 'Tambourine', 'Maracas', 'Accordion', 'Harmonica', 'Microphone'
  ],
  sports: [
    'Soccer Ball', 'Basketball', 'Football', 'Volleyball', 'Tennis Ball', 'Baseball', 'Golf Ball', 'Bowling Ball', 'Tennis Racket', 'Baseball Bat',
    'Hockey Stick', 'Skis', 'Snowboard', 'Surfboard', 'Skateboard Helmet', 'Boxing Glove', 'Medal', 'Trophy', 'Soccer Goal', 'Basketball Hoop'
  ],
  weather: [
    'Sunshine', 'Crescent Moon', 'Rainbow', 'Thundercloud', 'Raindrop', 'Snowflake', 'Tornado', 'Lightning Bolt', 'Comet Trail',
    'Foggy Cloud', 'Hailstone', 'Night Sky', 'Star Cluster', 'Planet Ring', 'Shooting Star', 'Snowy Mountain'
  ],
  clothing: [
    'T-Shirt', 'Sweater', 'Raincoat', 'Dress', 'Jeans', 'Shorts', 'Skirt', 'Sneakers', 'Boots', 'Sandals',
    'Baseball Cap', 'Winter Hat', 'Crown', 'Scarf', 'Mittens', 'Sunglasses', 'Backpack', 'Umbrella', 'Bow Tie', 'Wristwatch'
  ],
  tools: [
    'Hammer', 'Wrench', 'Screwdriver', 'Paintbrush', 'Pencil', 'Scissors', 'Saw', 'Shovel', 'Watering Can', 'Flashlight',
    'Magnifying Glass', 'Compass', 'Ruler', 'Key', 'Lock', 'Gear', 'Ladder', 'Bucket', 'Thread and Needle', 'Toolbox'
  ]
};

const EXTRA_SPRITES = Object.entries(EXTRA_SPRITE_GROUPS).flatMap(([category, names]) =>
  names.map((name) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { id: 'library-' + id, name, src: 'assets/sprites/library/' + category + '-' + id + '.svg' };
  })
);

window.BLOCK_PACK = {
  categories: {
    functions: { title: 'Functions', color: '#14b8a6' },
    control: { title: 'Control', color: '#6366f1' },
    sensing: { title: 'Sensing', color: '#06b6d4' },
    logic: { title: 'Logic', color: '#8b5cf6' },
    normal: { title: 'Normal', color: '#f97316' },
    math: { title: 'Math', color: '#22c55e' },
    lists: { title: 'Lists', color: '#0ea5e9' },
    visual: { title: 'Visual', color: '#ec4899' },
    audio: { title: 'Speech & audio', color: '#ef4444' }
  },

  palette: ['functions', 'control', 'sensing', 'logic', 'normal', 'math', 'lists', 'visual', 'audio'],

  blocks: [
    {
      type: 'start',
      category: 'functions',
      label: 'on start',
      sprite: 'assets/blocks/start.svg',
      width: 160,
      height: 52,
      fields: {},
      slots: [],
      action: 'start',
      hat: true
    },
    {
      type: 'event',
      category: 'functions',
      label: 'when clicked',
      sprite: 'assets/blocks/event.svg',
      width: 176,
      height: 52,
      fields: {},
      slots: [],
      action: 'event',
      hat: true
    },
    {
      type: 'signal',
      category: 'functions',
      label: 'when I receive',
      sprite: 'assets/blocks/signal.svg',
      width: 248,
      height: 52,
      fields: { message: 'message1' },
      slots: [
        { field: 'message', type: 'signal', x: 132, y: 15, w: 96, h: 22 }
      ],
      action: 'signal',
      hat: true
    },
    {
      type: 'broadcast',
      category: 'functions',
      label: 'send signal',
      sprite: 'assets/blocks/broadcast.svg',
      width: 228,
      height: 44,
      fields: { message: 'message1' },
      slots: [
        { field: 'message', type: 'text', x: 124, y: 8, w: 80, h: 22 }
      ],
      action: 'broadcast'
    },
    {
      type: 'define',
      category: 'functions',
      label: 'define function',
      sprite: 'assets/blocks/define.svg',
      width: 250,
      height: 52,
      fields: { name: 'my function' },
      slots: [
        { field: 'name', type: 'text', x: 98, y: 15, w: 108, h: 22 }
      ],
      action: 'define',
      hat: true
    },
    {
      type: 'call',
      category: 'functions',
      label: 'call function',
      sprite: 'assets/blocks/call.svg',
      width: 230,
      height: 44,
      fields: { name: '' },
      slots: [
        { field: 'name', type: 'function', x: 76, y: 8, w: 112, h: 22 }
      ],
      action: 'call'
    },
    {
      type: 'repeat',
      category: 'functions',
      label: 'repeat times',
      sprite: 'assets/blocks/repeat-top.svg',
      width: 200,
      height: 44,
      fields: { times: 4 },
      slots: [
        { field: 'times', type: 'value', x: 96, y: 8, w: 48, h: 22, suffix: 'times', suffixWidth: 42, suffixColor: '#042f2e' }
      ],
      action: 'repeat',
      cblock: true
    },
    {
      type: 'forever',
      category: 'functions',
      label: 'forever',
      sprite: 'assets/blocks/forever-top.svg',
      width: 160,
      height: 44,
      fields: {},
      slots: [],
      action: 'forever',
      cblock: true
    },
    {
      type: 'if',
      category: 'control',
      label: 'if',
      sprite: 'assets/blocks/if.svg',
      width: 224,
      height: 44,
      fields: { condition: 0 },
      slots: [
        { field: 'condition', type: 'value', x: 76, y: 7, w: 132, h: 24 }
      ],
      action: 'if',
      cblock: true
    },
    {
      type: 'elseif',
      category: 'control',
      label: 'else if',
      sprite: 'assets/blocks/elseif.svg',
      width: 262,
      height: 44,
      fields: { condition: 0 },
      slots: [
        { field: 'condition', type: 'value', x: 126, y: 7, w: 126, h: 24 }
      ],
      action: 'elseif',
      cblock: true
    },
    {
      type: 'else',
      category: 'control',
      label: 'else',
      sprite: 'assets/blocks/else.svg',
      width: 156,
      height: 44,
      fields: {},
      slots: [],
      action: 'else',
      cblock: true
    },
    {
      type: 'while',
      category: 'control',
      label: 'while',
      sprite: 'assets/blocks/while.svg',
      width: 250,
      height: 44,
      fields: { condition: 1 },
      slots: [
        { field: 'condition', type: 'value', x: 106, y: 7, w: 126, h: 24 }
      ],
      action: 'while',
      cblock: true
    },
    {
      type: 'touching',
      category: 'sensing',
      label: 'touching',
      sprite: 'assets/blocks/touching.svg',
      width: 212,
      height: 36,
      fields: { sprite: 'rocket' },
      slots: [
        { field: 'sprite', type: 'touching', x: 92, y: 7, w: 96, h: 22 }
      ],
      action: 'touching',
      reporter: true
    },
    {
      type: 'xposition',
      category: 'sensing',
      label: 'x position',
      sprite: 'assets/blocks/xposition.svg',
      width: 220,
      height: 36,
      fields: { operator: '>', value: 0 },
      slots: [
        { field: 'operator', type: 'operator', x: 94, y: 7, w: 44, h: 22 },
        { field: 'value', type: 'value', x: 158, y: 7, w: 42, h: 22 }
      ],
      action: 'xposition',
      reporter: true
    },
    {
      type: 'yposition',
      category: 'sensing',
      label: 'y position',
      sprite: 'assets/blocks/yposition.svg',
      width: 220,
      height: 36,
      fields: { operator: '>', value: 0 },
      slots: [
        { field: 'operator', type: 'operator', x: 94, y: 7, w: 44, h: 22 },
        { field: 'value', type: 'value', x: 158, y: 7, w: 42, h: 22 }
      ],
      action: 'yposition',
      reporter: true
    },
    {
      type: 'direction',
      category: 'sensing',
      label: 'direction',
      sprite: 'assets/blocks/direction.svg',
      width: 228,
      height: 36,
      fields: { operator: '>', value: 0 },
      slots: [
        { field: 'operator', type: 'operator', x: 98, y: 7, w: 44, h: 22 },
        { field: 'value', type: 'value', x: 158, y: 7, w: 42, h: 22, suffix: '°', suffixWidth: 8, suffixOnInput: true }
      ],
      action: 'direction',
      reporter: true
    },
    {
      type: 'sensesize',
      category: 'sensing',
      label: 'item size',
      sprite: 'assets/blocks/sensesize.svg',
      width: 330,
      height: 36,
      fields: { sprite: 'rocket', operator: '>', value: 100 },
      slots: [
        { field: 'sprite', type: 'sprite', x: 96, y: 7, w: 82, h: 22 },
        { field: 'operator', type: 'operator', x: 190, y: 7, w: 44, h: 22 },
        { field: 'value', type: 'value', x: 254, y: 7, w: 42, h: 22, suffix: '%', suffixWidth: 10, suffixOnInput: true }
      ],
      action: 'sensesize',
      reporter: true
    },
    {
      type: 'distance',
      category: 'sensing',
      label: 'distance to',
      sprite: 'assets/blocks/distance.svg',
      width: 324,
      height: 36,
      fields: { sprite: 'rocket', operator: '>', value: 0 },
      slots: [
        { field: 'sprite', type: 'sprite', x: 104, y: 7, w: 84, h: 22 },
        { field: 'operator', type: 'operator', x: 198, y: 7, w: 44, h: 22 },
        { field: 'value', type: 'value', x: 256, y: 7, w: 46, h: 22 }
      ],
      action: 'distance',
      reporter: true
    },
    {
      type: 'equals',
      category: 'math',
      label: 'equals',
      sprite: 'assets/blocks/equals.svg',
      width: 110,
      height: 36,
      fields: { a: 0, b: 0 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '=', suffixWidth: 12, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'equals',
      reporter: true
    },
    {
      type: 'less',
      category: 'math',
      label: 'less than',
      sprite: 'assets/blocks/less.svg',
      width: 110,
      height: 36,
      fields: { a: 0, b: 0 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '<', suffixWidth: 12, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'less',
      reporter: true
    },
    {
      type: 'greater',
      category: 'math',
      label: 'greater than',
      sprite: 'assets/blocks/greater.svg',
      width: 110,
      height: 36,
      fields: { a: 0, b: 0 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '>', suffixWidth: 12, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'greater',
      reporter: true
    },
    {
      type: 'and',
      category: 'logic',
      label: 'and',
      sprite: 'assets/blocks/and.svg',
      width: 110,
      height: 36,
      fields: { a: 1, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: 'and', suffixWidth: 26, suffixColor: '#fff' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'and',
      reporter: true
    },
    {
      type: 'or',
      category: 'logic',
      label: 'or',
      sprite: 'assets/blocks/or.svg',
      width: 110,
      height: 36,
      fields: { a: 0, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: 'or', suffixWidth: 16, suffixColor: '#fff' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'or',
      reporter: true
    },
    {
      type: 'not-equal',
      category: 'math',
      label: 'not equal to',
      sprite: 'assets/blocks/not.svg',
      width: 110,
      height: 36,
      fields: { a: 0, b: 0 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '!=', suffixWidth: 18, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'not-equal',
      reporter: true
    },
    {
      type: 'wait',
      category: 'normal',
      label: 'wait seconds',
      sprite: 'assets/blocks/wait.svg',
      width: 158,
      height: 44,
      fields: { secs: 1 },
      slots: [
        { field: 'secs', type: 'value', x: 76, y: 8, w: 40, h: 22, suffix: 's', suffixWidth: 12, suffixColor: '#2c1000' }
      ],
      action: 'wait'
    },
    {
      type: 'goto',
      category: 'normal',
      label: 'go to start',
      sprite: 'assets/blocks/goto.svg',
      width: 142,
      height: 44,
      fields: {},
      slots: [],
      action: 'goto'
    },
    {
      type: 'stop',
      category: 'normal',
      label: 'stop',
      sprite: 'assets/blocks/stop.svg',
      width: 120,
      height: 44,
      fields: {},
      slots: [],
      action: 'stop'
    },
    {
      type: 'setvar',
      category: 'math',
      label: 'set variable',
      sprite: 'assets/blocks/setvar.svg',
      width: 225,
      height: 44,
      fields: { name: '', value: 0 },
      slots: [
        { field: 'name', type: 'variable', x: 74, y: 8, w: 64, h: 22 },
        { field: 'value', type: 'value', x: 172, y: 8, w: 30, h: 22 }
      ],
      action: 'setvar'
    },
    {
      type: 'changevar',
      category: 'math',
      label: 'change variable',
      sprite: 'assets/blocks/changevar.svg',
      width: 245,
      height: 44,
      fields: { name: '', value: 1 },
      slots: [
        { field: 'name', type: 'variable', x: 92, y: 8, w: 64, h: 22 },
        { field: 'value', type: 'value', x: 192, y: 8, w: 30, h: 22 }
      ],
      action: 'changevar'
    },
    {
      type: 'add',
      category: 'math',
      label: 'add',
      sprite: 'assets/blocks/add.svg',
      width: 110,
      height: 36,
      fields: { a: 1, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '+', suffixWidth: 12, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'add',
      reporter: true
    },
    {
      type: 'subtract',
      category: 'math',
      label: 'subtract',
      sprite: 'assets/blocks/subtract.svg',
      width: 110,
      height: 36,
      fields: { a: 1, b: 1 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '-', suffixWidth: 12, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'subtract',
      reporter: true
    },
    {
      type: 'multiply',
      category: 'math',
      label: 'multiply',
      sprite: 'assets/blocks/multiply.svg',
      width: 110,
      height: 36,
      fields: { a: 2, b: 2 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '×', suffixWidth: 14, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'multiply',
      reporter: true
    },
    {
      type: 'divide',
      category: 'math',
      label: 'divide',
      sprite: 'assets/blocks/divide.svg',
      width: 110,
      height: 36,
      fields: { a: 10, b: 2 },
      slots: [
        { field: 'a', type: 'value', x: 8, y: 7, w: 30, h: 22, suffix: '÷', suffixWidth: 14, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 72, y: 7, w: 30, h: 22 }
      ],
      action: 'divide',
      reporter: true
    },
    {
      type: 'round',
      category: 'math',
      label: 'round',
      sprite: 'assets/blocks/round.svg',
      width: 126,
      height: 36,
      fields: { a: 0 },
      slots: [
        { field: 'a', type: 'value', x: 73, y: 7, w: 30, h: 22 }
      ],
      action: 'round',
      reporter: true
    },
    {
      type: 'random',
      category: 'math',
      label: 'random',
      sprite: 'assets/blocks/random.svg',
      width: 198,
      height: 36,
      fields: { a: 1, b: 10 },
      slots: [
        { field: 'a', type: 'value', x: 84, y: 7, w: 30, h: 22, suffix: 'to', suffixWidth: 16, suffixColor: '#052e16' },
        { field: 'b', type: 'value', x: 144, y: 7, w: 30, h: 22 }
      ],
      action: 'random',
      reporter: true
    },
    {
      type: 'variable',
      category: 'math',
      label: 'variable',
      sprite: 'assets/blocks/variable.svg',
      width: 170,
      height: 36,
      fields: { name: '' },
      slots: [
        { field: 'name', type: 'variable', x: 82, y: 7, w: 74, h: 22 }
      ],
      action: 'variable',
      reporter: true
    },
    {
      type: 'listadd',
      category: 'lists',
      label: 'add item to list',
      sprite: 'assets/blocks/list-add.svg',
      width: 300,
      height: 44,
      fields: { item: '', list: '' },
      slots: [
        { field: 'item', type: 'text', x: 70, y: 8, w: 76, h: 22 },
        { field: 'list', type: 'list', x: 202, y: 8, w: 80, h: 22 }
      ],
      action: 'listadd'
    },
    {
      type: 'listdelete',
      category: 'lists',
      label: 'delete item from list',
      sprite: 'assets/blocks/list-delete.svg',
      width: 350,
      height: 44,
      fields: { index: 1, list: '' },
      slots: [
        { field: 'index', type: 'value', x: 118, y: 8, w: 54, h: 22 },
        { field: 'list', type: 'list', x: 238, y: 8, w: 90, h: 22 }
      ],
      action: 'listdelete'
    },
    {
      type: 'listinsert',
      category: 'lists',
      label: 'insert item in list',
      sprite: 'assets/blocks/list-insert.svg',
      width: 340,
      height: 44,
      fields: { item: '', index: 1, list: '' },
      slots: [
        { field: 'item', type: 'text', x: 80, y: 8, w: 68, h: 22 },
        { field: 'index', type: 'value', x: 176, y: 8, w: 48, h: 22 },
        { field: 'list', type: 'list', x: 252, y: 8, w: 70, h: 22 }
      ],
      action: 'listinsert'
    },
    {
      type: 'listreplace',
      category: 'lists',
      label: 'replace item in list',
      sprite: 'assets/blocks/list-replace.svg',
      width: 410,
      height: 44,
      fields: { index: 1, item: '', list: '' },
      slots: [
        { field: 'index', type: 'value', x: 122, y: 8, w: 48, h: 22 },
        { field: 'item', type: 'text', x: 208, y: 8, w: 58, h: 22 },
        { field: 'list', type: 'list', x: 298, y: 8, w: 88, h: 22 }
      ],
      action: 'listreplace'
    },
    {
      type: 'listitem',
      category: 'lists',
      label: 'item of list',
      sprite: 'assets/blocks/list-item.svg',
      width: 228,
      height: 36,
      fields: { index: 1, list: '' },
      slots: [
        { field: 'index', type: 'value', x: 63, y: 7, w: 30, h: 22, suffix: 'of', suffixWidth: 14, suffixColor: '#082f49' },
        { field: 'list', type: 'list', x: 123, y: 7, w: 82, h: 22 }
      ],
      action: 'listitem',
      reporter: true
    },
    {
      type: 'listlength',
      category: 'lists',
      label: 'length of list',
      sprite: 'assets/blocks/list-length.svg',
      width: 210,
      height: 36,
      fields: { list: '' },
      slots: [
        { field: 'list', type: 'list', x: 96, y: 7, w: 88, h: 22 }
      ],
      action: 'listlength',
      reporter: true
    },
    {
      type: 'listcontains',
      category: 'lists',
      label: 'list contains item',
      sprite: 'assets/blocks/list-contains.svg',
      width: 260,
      height: 36,
      fields: { list: '', item: '' },
      slots: [
        { field: 'list', type: 'list', x: 86, y: 7, w: 82, h: 22 },
        { field: 'item', type: 'text', x: 172, y: 7, w: 68, h: 22 }
      ],
      action: 'listcontains',
      reporter: true
    },
    {
      type: 'move',
      category: 'visual',
      label: 'move steps',
      sprite: 'assets/blocks/move.svg',
      width: 176,
      height: 44,
      fields: { steps: 50 },
      slots: [
        { field: 'steps', type: 'value', x: 82, y: 8, w: 44, h: 22, suffix: 'steps', suffixWidth: 42, suffixColor: '#500724' }
      ],
      action: 'move'
    },
    {
      type: 'turn',
      category: 'visual',
      label: 'turn degrees',
      sprite: 'assets/blocks/turn.svg',
      width: 144,
      height: 44,
      fields: { deg: 90 },
      slots: [
        { field: 'deg', type: 'value', x: 76, y: 8, w: 44, h: 22, suffix: '°', suffixWidth: 12, suffixColor: '#500724' }
      ],
      action: 'turn'
    },
    {
      type: 'switchsprite',
      category: 'visual',
      label: 'switch sprite to',
      sprite: 'assets/blocks/switchsprite.svg',
      width: 284,
      height: 44,
      fields: { sprite: 'rocket' },
      slots: [
        { field: 'sprite', type: 'sprite', x: 164, y: 8, w: 112, h: 22 }
      ],
      action: 'switchsprite'
    },
    {
      type: 'switchbg',
      category: 'visual',
      label: 'switch background to',
      sprite: 'assets/blocks/switchbg.svg',
      width: 292,
      height: 44,
      fields: { background: 'mission' },
      slots: [
        { field: 'background', type: 'background', x: 184, y: 8, w: 102, h: 22 }
      ],
      action: 'switchbg'
    },
    {
      type: 'show',
      category: 'visual',
      label: 'show sprite',
      sprite: 'assets/blocks/show.svg',
      width: 124,
      height: 44,
      fields: {},
      slots: [],
      action: 'show'
    },
    {
      type: 'hide',
      category: 'visual',
      label: 'hide sprite',
      sprite: 'assets/blocks/hide.svg',
      width: 124,
      height: 44,
      fields: {},
      slots: [],
      action: 'hide'
    },
    {
      type: 'createclone',
      category: 'visual',
      label: 'create clone of myself',
      sprite: 'assets/blocks/create-clone.svg',
      width: 236,
      height: 44,
      fields: {},
      slots: [],
      action: 'createclone'
    },
    {
      type: 'deleteclones',
      category: 'visual',
      label: 'delete clones',
      sprite: 'assets/blocks/delete-clones.svg',
      width: 178,
      height: 44,
      fields: {},
      slots: [],
      action: 'deleteclones'
    },
    {
      type: 'setsize',
      category: 'visual',
      label: 'set size',
      sprite: 'assets/blocks/setsize.svg',
      width: 176,
      height: 44,
      fields: { size: 100 },
      slots: [
        { field: 'size', type: 'value', x: 108, y: 8, w: 44, h: 22, suffix: '%', suffixWidth: 12, suffixColor: '#500724' }
      ],
      action: 'setsize'
    },
    {
      type: 'gotoxy',
      category: 'visual',
      label: 'go to x y',
      sprite: 'assets/blocks/gotoxy.svg',
      width: 204,
      height: 44,
      fields: { x: 0, y: 0 },
      slots: [
        { field: 'x', type: 'value', x: 96, y: 8, w: 30, h: 22, suffix: 'y', suffixWidth: 8, suffixColor: '#500724' },
        { field: 'y', type: 'value', x: 150, y: 8, w: 30, h: 22 }
      ],
      action: 'gotoxy'
    },
    {
      type: 'glide',
      category: 'visual',
      label: 'glide to x y',
      sprite: 'assets/blocks/glide.svg',
      width: 270,
      height: 44,
      fields: { secs: 1, x: 0, y: 0 },
      slots: [
        { field: 'secs', type: 'value', x: 83, y: 8, w: 30, h: 22, suffix: 's to x', suffixWidth: 36, suffixColor: '#500724' },
        { field: 'x', type: 'value', x: 164, y: 8, w: 30, h: 22, suffix: 'y', suffixWidth: 8, suffixColor: '#500724' },
        { field: 'y', type: 'value', x: 217, y: 8, w: 30, h: 22 }
      ],
      action: 'glide'
    },
    {
      type: 'changex',
      category: 'visual',
      label: 'change x by',
      sprite: 'assets/blocks/changex.svg',
      width: 182,
      height: 44,
      fields: { dx: 20 },
      slots: [
        { field: 'dx', type: 'value', x: 129, y: 8, w: 30, h: 22 }
      ],
      action: 'changex'
    },
    {
      type: 'changey',
      category: 'visual',
      label: 'change y by',
      sprite: 'assets/blocks/changey.svg',
      width: 182,
      height: 44,
      fields: { dy: 20 },
      slots: [
        { field: 'dy', type: 'value', x: 129, y: 8, w: 30, h: 22 }
      ],
      action: 'changey'
    },
    {
      type: 'point',
      category: 'visual',
      label: 'point in direction',
      sprite: 'assets/blocks/point.svg',
      width: 217,
      height: 44,
      fields: { deg: 90 },
      slots: [
        { field: 'deg', type: 'value', x: 164, y: 8, w: 30, h: 22 }
      ],
      action: 'point'
    },
    {
      type: 'say',
      category: 'audio',
      label: 'say for seconds',
      sprite: 'assets/blocks/say.svg',
      width: 252,
      height: 44,
      fields: { text: 'Hello, NASA!', secs: 1 },
      slots: [
        { field: 'text', type: 'text', x: 70, y: 8, w: 96, h: 22 },
        { field: 'secs', type: 'value', x: 196, y: 8, w: 30, h: 22, suffix: 's', suffixWidth: 12, suffixColor: '#450a0a' }
      ],
      action: 'say'
    },
    {
      type: 'speak',
      category: 'audio',
      label: 'speak',
      sprite: 'assets/blocks/speak.svg',
      width: 250,
      height: 44,
      fields: { text: 'Hello!' },
      slots: [
        { field: 'text', type: 'text', x: 92, y: 8, w: 146, h: 22 }
      ],
      action: 'speak'
    },
    {
      type: 'tone',
      category: 'audio',
      label: 'play tone',
      sprite: 'assets/blocks/tone.svg',
      width: 300,
      height: 44,
      fields: { hz: 440, secs: 0.5 },
      slots: [
        { field: 'hz', type: 'value', x: 108, y: 8, w: 46, h: 22, suffix: 'Hz for', suffixWidth: 48, suffixColor: '#450a0a' },
        { field: 'secs', type: 'value', x: 214, y: 8, w: 34, h: 22, suffix: 's', suffixWidth: 12, suffixColor: '#450a0a' }
      ],
      action: 'tone'
    },
    {
      type: 'stopsounds',
      category: 'audio',
      label: 'stop all sounds',
      sprite: 'assets/blocks/stopsounds.svg',
      width: 200,
      height: 44,
      fields: {},
      slots: [],
      action: 'stopsounds'
    }
  ],

  sprites: {
    active: 'rocket',
    list: [
      { id: 'rocket', name: 'Rocket', src: 'assets/sprites/rocket.svg' }
    ],
    library: [
      { id: 'satellite', name: 'Satellite', src: 'assets/sprites/satellite.svg' },
      { id: 'ufo', name: 'UFO', src: 'assets/sprites/ufo.svg' },
      { id: 'astronaut', name: 'Astronaut', src: 'assets/sprites/astronaut.svg' },
      { id: 'planet', name: 'Planet', src: 'assets/sprites/planet.svg' },
      { id: 'moon', name: 'Moon', src: 'assets/sprites/moon.svg' },
      { id: 'comet', name: 'Comet', src: 'assets/sprites/comet.svg' },
      { id: 'star', name: 'Star', src: 'assets/sprites/star.svg' },
      { id: 'rover', name: 'Rover', src: 'assets/sprites/rover.svg' },
      { id: 'box', name: 'Cardboard Box', src: 'assets/sprites/box.svg' },
      { id: 'gift-box', name: 'Gift Box', src: 'assets/sprites/gift-box.svg' },
      { id: 'house', name: 'House', src: 'assets/sprites/house.svg' },
      { id: 'skyscraper', name: 'Skyscraper', src: 'assets/sprites/skyscraper.svg' },
      { id: 'tree', name: 'Tree', src: 'assets/sprites/tree.svg' },
      { id: 'apple', name: 'Apple', src: 'assets/sprites/apple.svg' },
      { id: 'pizza', name: 'Pizza', src: 'assets/sprites/pizza.svg' },
      { id: 'burger', name: 'Burger', src: 'assets/sprites/burger.svg' },
      { id: 'ice-cream', name: 'Ice Cream', src: 'assets/sprites/ice-cream.svg' },
      { id: 'cake', name: 'Cake', src: 'assets/sprites/cake.svg' },
      { id: 'fish', name: 'Fish', src: 'assets/sprites/fish.svg' },
      { id: 'robot', name: 'Robot', src: 'assets/sprites/robot.svg' },
      { id: 'alien', name: 'Alien', src: 'assets/sprites/alien.svg' },
      { id: 'flower', name: 'Flower', src: 'assets/sprites/flower.svg' },
      { id: 'cloud', name: 'Cloud', src: 'assets/sprites/cloud.svg' }
    ].concat(EXTRA_SPRITES)
  },

  backgrounds: {
    active: 'mission',
    list: [
      {
        id: 'mission',
        name: 'Mission Control',
        css: 'radial-gradient(600px 400px at 50% 42%, #17264f 0%, rgba(10, 17, 34, .7) 58%, #060a14 100%), linear-gradient(rgba(148, 163, 184, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, .08) 1px, transparent 1px)',
        size: 'auto, 32px 32px, 32px 32px'
      },
      {
        id: 'orbit',
        name: 'Orbit',
        css: 'radial-gradient(circle at 30% 20%, #1d4ed8, #0f172a 55%, #020617)',
        size: 'cover'
      },
      {
        id: 'nebula',
        name: 'Nebula',
        css: 'radial-gradient(circle at 70% 25%, #db2777, transparent 40%), radial-gradient(circle at 20% 70%, #7c3aed, transparent 45%), linear-gradient(160deg, #020617, #0b1120)',
        size: 'cover'
      },
      {
        id: 'lunar',
        name: 'Lunar Surface',
        css: 'radial-gradient(circle at 50% 120%, #94a3b8, #1e293b 60%, #020617)',
        size: 'cover'
      }
    ].concat(EXTRA_BACKDROPS)
  }
};
