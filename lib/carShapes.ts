// Side-view car silhouettes for the garage render. Pure data + geometry (no React), so the
// same code draws the app's render and can be previewed/tested outside the app.
// Everything faces left in a 320 × 130 box with the ground at y = 118.

export const BODY_STYLES = [
  'coupe',
  'sedan',
  'hatch',
  'suv',
  'truck',
  'sports',
  'muscle',
  'roadster',
  'jdm',
  'supercar',
  'offroad',
] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

export const STANCES = ['stock', 'lowered', 'lifted'] as const;
export type Stance = (typeof STANCES)[number];

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = {
  coupe: 'Coupe',
  sedan: 'Sedan',
  hatch: 'Hatch',
  suv: 'SUV',
  truck: 'Truck',
  sports: '911-style',
  muscle: 'Muscle',
  roadster: 'Roadster',
  jdm: 'JDM coupe',
  supercar: 'Supercar',
  offroad: 'Off-roader',
};

export const PAINT_COLORS = [
  { name: 'Purple', hex: '#8458B3' },
  { name: 'Black', hex: '#1c1b22' },
  { name: 'White', hex: '#f4f4f6' },
  { name: 'Silver', hex: '#b9bec7' },
  { name: 'Gunmetal', hex: '#4b4f58' },
  { name: 'Red', hex: '#c8102e' },
  { name: 'Orange', hex: '#f26b21' },
  { name: 'Yellow', hex: '#f5c518' },
  { name: 'Lime', hex: '#8cc63f' },
  { name: 'Racing green', hex: '#0f4d32' },
  { name: 'Teal', hex: '#12877f' },
  { name: 'Sky blue', hex: '#6ecff6' },
  { name: 'Blue', hex: '#1f5fbf' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'Pink', hex: '#ef6fa6' },
  { name: 'Bronze', hex: '#9c6b3c' },
];

export const WHEEL_COLORS = [
  { name: 'Silver', hex: '#c0c4cc' },
  { name: 'Black', hex: '#232228' },
  { name: 'Gunmetal', hex: '#55595f' },
  { name: 'Gold', hex: '#d4a93a' },
  { name: 'Bronze', hex: '#a86f35' },
  { name: 'White', hex: '#f5f5f5' },
];

type Box = { x: number; y: number; w: number; h: number };
type Extra = 'rails' | 'bed' | 'wing' | 'duck' | 'scoop' | 'intake' | 'spare' | 'flares' | 'headrest';

export type Shape = {
  /** Upper outline from the front-bottom corner over the car to the rear (ends at rearX). */
  top: string;
  frontX: number;
  rearX: number;
  /** Bottom edge of the body. */
  sill: number;
  wheelFront: number;
  wheelRear: number;
  tire: number;
  /** Window glass (may contain several sub-paths). */
  glass: string;
  /** B/C-pillars drawn over the glass. */
  pillars: number[];
  door: { x: number; top: number };
  headlight: Box & { round?: boolean };
  taillight: Box;
  extras: Extra[];
};

export const GROUND_Y = 118;

export const SHAPES: Record<BodyStyle, Shape> = {
  coupe: {
    top: 'M16,90 Q16,78 30,75 L104,66 Q128,40 160,34 L196,34 Q226,36 250,60 L290,66 Q304,68 304,82',
    frontX: 16, rearX: 304, sill: 100, wheelFront: 72, wheelRear: 248, tire: 22,
    glass: 'M112,64 Q134,42 162,39 L194,39 Q220,41 240,60 Z',
    pillars: [178], door: { x: 176, top: 66 },
    headlight: { x: 18, y: 79, w: 11, h: 5 }, taillight: { x: 295, y: 72, w: 8, h: 7 }, extras: [],
  },
  sedan: {
    top: 'M16,90 Q16,78 30,76 L98,68 Q122,44 150,36 L214,36 Q238,40 256,62 L292,66 Q304,68 304,82',
    frontX: 16, rearX: 304, sill: 100, wheelFront: 72, wheelRear: 248, tire: 22,
    glass: 'M106,66 Q128,44 152,41 L212,41 Q232,44 246,62 Z',
    pillars: [178], door: { x: 176, top: 68 },
    headlight: { x: 18, y: 79, w: 11, h: 5 }, taillight: { x: 295, y: 72, w: 8, h: 7 }, extras: [],
  },
  hatch: {
    top: 'M16,90 Q16,78 30,76 L96,68 Q120,42 150,34 L262,34 Q282,36 292,58 L302,74 Q304,78 304,84',
    frontX: 16, rearX: 304, sill: 100, wheelFront: 72, wheelRear: 248, tire: 22,
    glass: 'M104,66 Q126,44 152,39 L258,39 Q274,41 284,58 Z',
    pillars: [178, 236], door: { x: 176, top: 68 },
    headlight: { x: 18, y: 79, w: 11, h: 5 }, taillight: { x: 296, y: 74, w: 8, h: 7 }, extras: [],
  },
  suv: {
    top: 'M16,86 Q16,70 30,66 L92,60 Q112,26 140,20 L270,20 Q290,22 298,44 L304,62',
    frontX: 16, rearX: 304, sill: 96, wheelFront: 72, wheelRear: 248, tire: 24,
    glass: 'M100,58 Q118,28 142,25 L268,25 Q284,27 290,46 L294,56 Z',
    pillars: [170, 234], door: { x: 168, top: 60 },
    headlight: { x: 18, y: 72, w: 12, h: 6 }, taillight: { x: 295, y: 64, w: 8, h: 9 }, extras: ['rails'],
  },
  truck: {
    top: 'M16,90 Q16,76 30,72 L94,64 Q112,34 136,28 L186,28 Q194,28 196,36 L198,62 L304,62',
    frontX: 16, rearX: 304, sill: 100, wheelFront: 72, wheelRear: 248, tire: 23,
    glass: 'M102,62 Q118,36 138,33 L188,33 L190,60 Z',
    pillars: [], door: { x: 150, top: 64 },
    headlight: { x: 18, y: 76, w: 12, h: 6 }, taillight: { x: 296, y: 66, w: 8, h: 9 }, extras: ['bed'],
  },
  // Porsche 911: rear engine, fender-mounted round headlights, one long fastback curve.
  sports: {
    top: 'M18,92 Q18,82 28,79 Q42,71 62,71 Q86,71 106,68 Q124,46 156,40 Q190,38 214,48 Q256,62 288,74 Q300,77 300,86',
    frontX: 18, rearX: 300, sill: 101, wheelFront: 74, wheelRear: 234, tire: 22,
    glass: 'M114,67 Q130,49 156,45 Q182,43 202,50 Q214,55 222,62 Z',
    pillars: [172], door: { x: 170, top: 68 },
    headlight: { x: 26, y: 74, w: 14, h: 7, round: true }, taillight: { x: 290, y: 76, w: 9, h: 5 }, extras: ['duck'],
  },
  // Mustang / Camaro / Challenger: blunt nose, long hood, chopped greenhouse, short deck.
  muscle: {
    top: 'M14,92 L14,78 Q14,71 22,70 L118,64 Q138,43 168,38 L200,38 Q222,40 244,56 L290,61 Q302,62 304,70',
    frontX: 14, rearX: 304, sill: 100, wheelFront: 78, wheelRear: 246, tire: 23,
    glass: 'M126,62 Q144,45 168,42 L198,42 Q216,44 234,56 Z',
    pillars: [184], door: { x: 180, top: 64 },
    headlight: { x: 15, y: 75, w: 10, h: 6 }, taillight: { x: 296, y: 66, w: 8, h: 7 }, extras: ['scoop'],
  },
  // Miata / S2000 / Z4: top down — windshield, headrest, flat beltline, short overhangs.
  roadster: {
    top: 'M24,92 Q24,80 36,77 L118,69 Q140,67 152,66 L232,64 Q264,62 286,68 Q296,70 296,82',
    frontX: 24, rearX: 296, sill: 100, wheelFront: 76, wheelRear: 238, tire: 21,
    glass: 'M122,69 L143,48 L149,49 L143,67 Z',
    pillars: [], door: { x: 160, top: 66 },
    headlight: { x: 26, y: 79, w: 12, h: 5 }, taillight: { x: 288, y: 72, w: 8, h: 6 }, extras: ['headrest'],
  },
  // Supra / 370Z / RX-7 / GT-R: long hood fastback with a rear wing.
  jdm: {
    top: 'M18,92 Q18,82 30,78 L112,66 Q132,44 160,38 L190,38 Q214,40 240,56 Q270,64 292,66 Q302,68 302,80',
    frontX: 18, rearX: 302, sill: 101, wheelFront: 74, wheelRear: 242, tire: 22,
    glass: 'M120,64 Q138,46 160,42 L188,42 Q206,44 226,56 Z',
    pillars: [176], door: { x: 174, top: 66 },
    headlight: { x: 20, y: 80, w: 14, h: 5 }, taillight: { x: 293, y: 70, w: 9, h: 6 }, extras: ['wing'],
  },
  // Mid-engine: wedge nose, cab-forward, long engine deck, side intake before the rear wheel.
  supercar: {
    top: 'M14,94 Q14,87 24,85 L100,70 Q128,49 158,46 Q186,46 206,56 Q246,64 290,68 Q304,70 306,82',
    frontX: 14, rearX: 306, sill: 102, wheelFront: 76, wheelRear: 238, tire: 22,
    glass: 'M108,68 Q130,52 156,50 Q178,50 194,58 Z',
    pillars: [], door: { x: 168, top: 64 },
    headlight: { x: 18, y: 84, w: 16, h: 4 }, taillight: { x: 296, y: 72, w: 10, h: 4 }, extras: ['intake'],
  },
  // Wrangler / Bronco / G-Class / Defender: upright glass, flat roof, big tires, spare on back.
  offroad: {
    top: 'M20,84 L20,64 Q20,58 26,58 L96,56 L112,24 Q114,20 120,20 L286,20 Q294,20 294,28 L296,86',
    frontX: 20, rearX: 296, sill: 94, wheelFront: 80, wheelRear: 232, tire: 26,
    glass: 'M117,54 L124,26 L168,26 L168,54 Z M176,26 L232,26 L232,54 L176,54 Z M240,26 L284,26 L284,52 L240,52 Z',
    pillars: [], door: { x: 172, top: 58 },
    headlight: { x: 22, y: 62, w: 10, h: 10, round: true }, taillight: { x: 289, y: 60, w: 6, h: 12 }, extras: ['rails', 'spare', 'flares'],
  },
};

/** Full body outline: the shape's top plus a bottom edge with arches cut around the wheels. */
export function bodyPath(shape: Shape): string {
  const { top, frontX, rearX, sill, wheelFront, wheelRear } = shape;
  const arch = shape.tire + 5;
  return [
    top,
    `L${rearX},${sill - 6}`,
    `Q${rearX},${sill} ${rearX - 8},${sill}`,
    `L${wheelRear + arch},${sill}`,
    `A${arch},${arch} 0 0 0 ${wheelRear - arch},${sill}`,
    `L${wheelFront + arch},${sill}`,
    `A${arch},${arch} 0 0 0 ${wheelFront - arch},${sill}`,
    `L${frontX + 8},${sill}`,
    `Q${frontX},${sill} ${frontX},${sill - 6}`,
    'Z',
  ].join(' ');
}

export function wheelCenterY(shape: Shape): number {
  return GROUND_Y - shape.tire;
}

// ─── Picking a shape from the make/model ─────────────────────────────────────

type Rule = { style: BodyStyle; makes?: string[]; models?: RegExp };

// First match wins, so specific models come before make-wide defaults.
const RULES: Rule[] = [
  { style: 'offroad', models: /\b(wrangler|bronco(?! sport)|g[- ]?(class|wagon|550|63)|defender|4runner|land cruiser|fj cruiser|xterra|hummer|jimny|g63)\b/ },
  { style: 'truck', models: /\b(f-?\d{3}|silverado|sierra|tacoma|tundra|ranger|colorado|canyon|frontier|titan|ridgeline|gladiator|maverick|cybertruck|santa cruz|1500|2500|3500|raptor|pickup)\b/ },
  { style: 'roadster', models: /\b(mx-?5|miata|s2000|z4|boxster|spider|spyder|roadster|convertible|slk|slc|124|solstice|sky)\b/ },
  { style: 'supercar', models: /\b(nsx|r8|ford gt|gt40|huracan|aventador|revuelto|urraco|cayman|mr2|evora|exige|elise|emira|c8|z06|zr1|e-ray)\b/ },
  { style: 'sports', models: /\b(911|carrera|gt3|gt2|targa|964|993|996|997|991|992)\b/ },
  { style: 'jdm', models: /\b(supra|[234]\d0 ?zx?|nissan z|\bz\b|240sx|silvia|180sx|rx-?[78]|gt-?r|skyline|brz|gr86|86|fr-?s|celica|eclipse|3000gt|genesis coupe|rc ?f?|lc ?500|m[248]\b|stinger)\b/ },
  { style: 'muscle', models: /\b(mustang|camaro|challenger|charger|corvette|gto|firebird|trans am|chevelle|cuda|barracuda|nova|el camino|shelby)\b/ },
  { style: 'hatch', models: /\b(hatch|hatchback|golf|gti|fit|veloster|fiesta|focus|yaris|500|prius|i30|type r|civic si hatch|mini|cooper|polo|clio|mazda ?3 hatch|wrx hatch|impreza hatch|bolt|leaf|ioniq 5)\b/ },
  { style: 'suv', models: /\b(cr-?v|hr-?v|rav4|highlander|pilot|passport|explorer|expedition|escape|edge|tahoe|suburban|yukon|escalade|x[1-7]|q[3-8]|gl[abce]|model [xy]|cx-?\d+|rogue|pathfinder|murano|kicks|forester|outback|crosstrek|ascent|cherokee|compass|renegade|durango|telluride|palisade|santa fe|tucson|sportage|sorento|seltos|macan|cayenne|range rover|discovery|evoque|velar|atlas|tiguan|touareg|rdx|mdx|rx|nx|gx|lx|xc\d0|ev9|traverse|equinox|trax|blazer|trailblazer|terrain|acadia|bronco sport|enclave|encore|envision)\b/ },
  { style: 'sedan', models: /\b(civic|accord|camry|corolla|altima|sentra|maxima|versa|[1-8] series|\d{3}i|m3|m5|c-?class|e-?class|s-?class|a[3-8]|s[3-8]|rs[3-7]|wrx|impreza|legacy|model [3s]|lancer|evo|jetta|passat|arteon|elantra|sonata|k5|forte|optima|is|es|gs|ls|g70|g80|g90|ct[45]|ats|cts|malibu|impala|fusion|taurus|mazda ?[36]|tlx|ilx|integra|300|avalon|taycan|panamera)\b/ },
  { style: 'supercar', makes: ['ferrari', 'lamborghini', 'mclaren', 'lotus', 'bugatti', 'pagani', 'koenigsegg'] },
  { style: 'truck', makes: ['ram'] },
  { style: 'offroad', makes: ['jeep'] },
  { style: 'suv', makes: ['land rover', 'rivian'] },
];

/** Best-matching body style for a make/model, or null if nothing matches. */
export function guessBodyStyle(make: string, model: string): BodyStyle | null {
  const m = model.trim().toLowerCase();
  const mk = make.trim().toLowerCase();
  for (const rule of RULES) {
    if (rule.models && m && rule.models.test(m)) return rule.style;
    if (rule.makes && rule.makes.includes(mk)) return rule.style;
  }
  return null;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

/** One SVG primitive. `layer` says where it goes; `clip` means "clip to the windows". */
export type Part = {
  key: string;
  tag: 'path' | 'circle' | 'rect' | 'line' | 'ellipse';
  attrs: Record<string, string | number>;
  layer: 'shadow' | 'body' | 'wheels';
  clip?: boolean;
};

const STANCE_OFFSET: Record<Stance, number> = { stock: 0, lowered: 5, lifted: -7 };
const DARK = '#1d1a24';

export function stanceOffset(stance: Stance): number {
  return STANCE_OFFSET[stance] ?? 0;
}

function wheel(cx: number, cy: number, r: number, color: string, id: string): Part[] {
  const rim = Math.round(r * 0.68);
  const parts: Part[] = [
    { key: `${id}-tire`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r, fill: DARK } },
    { key: `${id}-rim`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim, fill: color } },
    {
      key: `${id}-lip`,
      tag: 'circle',
      layer: 'wheels',
      attrs: { cx, cy, r: rim, fill: 'none', stroke: '#000', strokeOpacity: 0.25, strokeWidth: 1.5 },
    },
  ];
  for (const angle of [0, 72, 144, 216, 288]) {
    const rad = (angle * Math.PI) / 180;
    parts.push({
      key: `${id}-spoke${angle}`,
      tag: 'line',
      layer: 'wheels',
      attrs: {
        x1: cx,
        y1: cy,
        x2: +(cx + Math.sin(rad) * (rim - 2)).toFixed(2),
        y2: +(cy - Math.cos(rad) * (rim - 2)).toFixed(2),
        stroke: '#000',
        strokeOpacity: 0.3,
        strokeWidth: 3,
        strokeLinecap: 'round',
      },
    });
  }
  parts.push({ key: `${id}-hub`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: 4, fill: '#2a2730' } });
  return parts;
}

/** Every primitive needed to draw a car. Body parts should be shifted by `stanceOffset`. */
export function carParts(style: BodyStyle, paint: string, wheels: string): Part[] {
  const s = SHAPES[style] ?? SHAPES.coupe;
  const body = bodyPath(s);
  const cy = wheelCenterY(s);
  const archR = s.tire + 4;
  const has = (extra: Extra) => s.extras.includes(extra);
  const parts: Part[] = [
    {
      key: 'shadow',
      tag: 'ellipse',
      layer: 'shadow',
      attrs: { cx: 160, cy: GROUND_Y + 1, rx: 146, ry: 6, fill: '#000', opacity: 0.16 },
    },
    // Dark wheel wells show through the arch cut-outs.
    { key: 'well-f', tag: 'circle', layer: 'body', attrs: { cx: s.wheelFront, cy: cy + 2, r: archR, fill: '#15131a' } },
    { key: 'well-r', tag: 'circle', layer: 'body', attrs: { cx: s.wheelRear, cy: cy + 2, r: archR, fill: '#15131a' } },
  ];

  if (has('rails')) {
    parts.push({
      key: 'rails',
      tag: 'rect',
      layer: 'body',
      attrs: { x: s.wheelFront + 70, y: 14, width: 120, height: 4, rx: 2, fill: '#2a2730' },
    });
  }
  if (has('spare')) {
    parts.push(
      { key: 'spare', tag: 'circle', layer: 'body', attrs: { cx: s.rearX + 4, cy: 58, r: 17, fill: DARK } },
      { key: 'spare-rim', tag: 'circle', layer: 'body', attrs: { cx: s.rearX + 4, cy: 58, r: 9, fill: wheels } }
    );
  }
  if (has('wing')) {
    const blade = 'M258,50 L304,47 L304,52 L258,54 Z';
    parts.push(
      { key: 'wing-post1', tag: 'rect', layer: 'body', attrs: { x: 268, y: 52, width: 3, height: 14, fill: DARK } },
      { key: 'wing-post2', tag: 'rect', layer: 'body', attrs: { x: 288, y: 52, width: 3, height: 14, fill: DARK } },
      { key: 'wing', tag: 'path', layer: 'body', attrs: { d: blade, fill: paint } },
      {
        key: 'wing-edge',
        tag: 'path',
        layer: 'body',
        attrs: { d: blade, fill: 'none', stroke: '#000', strokeOpacity: 0.25, strokeWidth: 1 },
      }
    );
  }

  parts.push(
    { key: 'paint', tag: 'path', layer: 'body', attrs: { d: body, fill: paint } },
    { key: 'shade', tag: 'path', layer: 'body', attrs: { d: body, fill: 'url(#carShade)' } },
    {
      key: 'outline',
      tag: 'path',
      layer: 'body',
      attrs: { d: body, fill: 'none', stroke: '#000', strokeOpacity: 0.18, strokeWidth: 1 },
    }
  );

  if (has('flares')) {
    for (const [id, x] of [['f', s.wheelFront], ['r', s.wheelRear]] as const) {
      const r = archR + 2;
      parts.push({
        key: `flare-${id}`,
        tag: 'path',
        layer: 'body',
        attrs: { d: `M${x + r},${s.sill} A${r},${r} 0 0 0 ${x - r},${s.sill}`, fill: 'none', stroke: '#2a2730', strokeWidth: 5 },
      });
    }
  }
  if (has('scoop')) {
    parts.push({ key: 'scoop', tag: 'path', layer: 'body', attrs: { d: 'M70,69 Q84,61 102,66 Z', fill: DARK, opacity: 0.85 } });
  }
  if (has('duck')) {
    parts.push({
      key: 'duck',
      tag: 'path',
      layer: 'body',
      attrs: { d: 'M266,66 L296,74 L297,70 Z', fill: paint, stroke: '#000', strokeOpacity: 0.2, strokeWidth: 1 },
    });
  }
  if (has('intake')) {
    parts.push({ key: 'intake', tag: 'path', layer: 'body', attrs: { d: 'M196,90 Q212,72 234,74 L230,92 Z', fill: DARK, opacity: 0.85 } });
  }
  if (has('bed')) {
    parts.push({
      key: 'bed',
      tag: 'line',
      layer: 'body',
      attrs: { x1: 198, y1: 68, x2: s.rearX, y2: 68, stroke: '#000', strokeOpacity: 0.25, strokeWidth: 1.5 },
    });
  }
  if (has('headrest')) {
    parts.push(
      { key: 'cockpit', tag: 'path', layer: 'body', attrs: { d: 'M150,66 Q190,60 226,64', fill: 'none', stroke: DARK, strokeWidth: 2.5 } },
      { key: 'headrest', tag: 'path', layer: 'body', attrs: { d: 'M178,63 Q178,49 188,49 Q198,49 198,63 Z', fill: '#2a2730' } }
    );
  }

  parts.push(
    { key: 'glass', tag: 'path', layer: 'body', attrs: { d: s.glass, fill: '#2d3a4f', opacity: 0.9 } },
    { key: 'glass-tint', tag: 'path', layer: 'body', attrs: { d: s.glass, fill: '#a0d2eb', opacity: 0.25 } }
  );
  for (const x of s.pillars) {
    parts.push({ key: `pillar-${x}`, tag: 'rect', layer: 'body', clip: true, attrs: { x, y: 10, width: 6, height: 70, fill: paint } });
  }

  // Door seam and handle.
  parts.push(
    {
      key: 'door',
      tag: 'line',
      layer: 'body',
      attrs: { x1: s.door.x, y1: s.door.top, x2: s.door.x, y2: s.sill - 4, stroke: '#000', strokeOpacity: 0.18, strokeWidth: 1 },
    },
    {
      key: 'handle',
      tag: 'rect',
      layer: 'body',
      attrs: { x: s.door.x + 10, y: s.door.top + 7, width: 12, height: 3, rx: 1.5, fill: '#000', opacity: 0.25 },
    }
  );

  const h = s.headlight;
  const t = s.taillight;
  parts.push(
    h.round
      ? {
          key: 'headlight',
          tag: 'ellipse',
          layer: 'body',
          attrs: { cx: h.x + h.w / 2, cy: h.y + h.h / 2, rx: h.w / 2, ry: h.h / 2, fill: '#fff6c8' },
        }
      : { key: 'headlight', tag: 'rect', layer: 'body', attrs: { x: h.x, y: h.y, width: h.w, height: h.h, rx: 2, fill: '#fff6c8' } },
    { key: 'taillight', tag: 'rect', layer: 'body', attrs: { x: t.x, y: t.y, width: t.w, height: t.h, rx: 2, fill: '#d7263d' } }
  );

  parts.push(...wheel(s.wheelFront, cy, s.tire, wheels, 'wf'), ...wheel(s.wheelRear, cy, s.tire, wheels, 'wr'));
  return parts;
}
