// Side-view car geometry for the garage render (drawing lives in lib/carDrawing.ts).
// Pure data, no React, so it can be previewed and tested outside the app.
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

export type Extra = 'rails' | 'bed' | 'wing' | 'duck' | 'scoop' | 'sideIntake' | 'spare' | 'flares' | 'roadster';

export type Shape = {
  /** Upper outline from the front-bottom corner over the car to the rear (ends at rearX). */
  top: string;
  frontX: number;
  rearX: number;
  /** Bottom edge of the body sides. */
  sill: number;
  wheelFront: number;
  wheelRear: number;
  tire: number;
  /** Highest point of the roof and the window line — used for the paint's shading. */
  roof: number;
  belt: number;
  /** Window glass (may contain several sub-paths). */
  glass: string;
  /** Door pillars drawn over the glass, as slanted bars (x at the roof → x at the window line). */
  pillars: { top: number; bottom: number; width?: number }[];
  doors: number[];
  handles: number[];
  mirror: { x: number; y: number } | null;
  headlight: string;
  taillight: string;
  /** Front grille / lower intake. */
  intake: string;
  extras: Extra[];
  rim: 'mesh' | 'six';
};

export const GROUND_Y = 118;

export const SHAPES: Record<BodyStyle, Shape> = {
  coupe: {
    top: 'M14,93 C14,85 17,80 27,78 C50,74 82,70 106,67 C122,57 138,45 162,39 C178,36 198,36 212,38 C232,42 250,54 266,61 C280,64 296,66 303,70 C306,74 306,82 306,90',
    frontX: 14, rearX: 306, sill: 101, wheelFront: 74, wheelRear: 246, tire: 21, roof: 36, belt: 65,
    glass: 'M114,66 C128,55 144,44 163,41 C180,39 198,39 211,41 C228,45 243,54 255,61 Z',
    pillars: [{ top: 190, bottom: 186 }],
    doors: [184], handles: [168], mirror: { x: 114, y: 63 },
    headlight: 'M17,80 C24,78 34,76 44,75 C46,78 44,81 40,82 L19,86 C17,85 16,83 17,80 Z',
    taillight: 'M297,68 L305,71 C306,74 306,77 305,79 L295,77 Z',
    intake: 'M17,92 L44,91 C46,94 45,97 41,98 L22,98 C19,98 17,96 17,92 Z',
    extras: [], rim: 'mesh',
  },
  sedan: {
    top: 'M12,93 C12,85 15,80 25,78 C48,74 78,70 100,68 C116,58 132,45 154,39 C172,36 204,35 222,37 C238,40 252,52 262,60 C278,62 296,63 304,66 C308,70 308,80 308,90',
    frontX: 12, rearX: 308, sill: 101, wheelFront: 72, wheelRear: 248, tire: 21, roof: 36, belt: 66,
    glass: 'M108,67 C122,56 138,45 156,42 C174,39 202,39 220,41 C234,44 246,53 254,61 Z',
    pillars: [{ top: 184, bottom: 180 }],
    doors: [180, 238], handles: [162, 222], mirror: { x: 108, y: 64 },
    headlight: 'M15,80 C22,78 32,76 42,75 C44,78 42,81 38,82 L17,86 C15,85 14,83 15,80 Z',
    taillight: 'M297,63 L307,66 C308,70 308,74 307,76 L296,75 Z',
    intake: 'M15,92 L42,91 C44,94 43,97 39,98 L20,98 C17,98 15,96 15,92 Z',
    extras: [], rim: 'mesh',
  },
  hatch: {
    top: 'M16,93 C16,85 19,80 29,78 C50,74 78,70 100,68 C116,57 132,44 154,38 C176,34 238,34 256,36 C272,38 284,46 292,56 C298,62 300,70 300,80',
    frontX: 16, rearX: 300, sill: 101, wheelFront: 74, wheelRear: 242, tire: 21, roof: 35, belt: 65,
    glass: 'M108,66 C122,55 138,44 156,41 C178,37 236,37 254,39 C268,41 278,49 284,58 Z',
    pillars: [{ top: 182, bottom: 178 }, { top: 242, bottom: 248, width: 11 }],
    doors: [178, 236], handles: [160, 220], mirror: { x: 110, y: 63 },
    headlight: 'M19,80 C26,78 36,76 46,75 C48,78 46,81 42,82 L21,86 C19,85 18,83 19,80 Z',
    taillight: 'M289,58 L299,62 C300,66 300,70 299,73 L288,71 Z',
    intake: 'M19,92 L46,91 C48,94 47,97 43,98 L24,98 C21,98 19,96 19,92 Z',
    extras: [], rim: 'mesh',
  },
  suv: {
    top: 'M14,89 C14,78 18,70 30,67 C52,63 78,60 96,58 C112,44 126,30 146,24 C168,20 244,20 262,22 C276,24 288,32 294,42 C300,50 302,60 302,72',
    frontX: 14, rearX: 302, sill: 97, wheelFront: 76, wheelRear: 244, tire: 24, roof: 21, belt: 58,
    glass: 'M104,57 C118,44 132,31 148,27 C170,24 242,24 260,26 C272,28 282,36 288,46 L290,55 Z',
    pillars: [{ top: 186, bottom: 182 }, { top: 248, bottom: 254, width: 10 }],
    doors: [182, 240], handles: [166, 226], mirror: { x: 106, y: 55 },
    headlight: 'M16,70 C24,68 36,66 46,65 C48,68 46,72 42,73 L18,76 C16,75 15,72 16,70 Z',
    taillight: 'M291,48 L301,51 C302,57 302,63 301,67 L290,65 Z',
    intake: 'M16,84 L44,83 C46,87 45,91 41,92 L21,92 C18,92 16,89 16,84 Z',
    extras: ['rails'], rim: 'six',
  },
  truck: {
    top: 'M12,90 C12,78 16,70 28,67 C50,64 74,62 92,60 C104,46 116,32 132,26 C144,22 184,22 196,24 C200,26 202,30 202,36 L204,58 L308,58 C308,62 308,70 308,80',
    frontX: 12, rearX: 308, sill: 97, wheelFront: 72, wheelRear: 250, tire: 24, roof: 23, belt: 60,
    glass: 'M100,59 C110,46 122,33 134,29 C146,26 182,26 192,28 L194,57 Z',
    pillars: [{ top: 152, bottom: 148, width: 8 }],
    doors: [146, 198], handles: [130, 184], mirror: { x: 100, y: 57 },
    headlight: 'M14,67 L40,65 C42,68 42,72 40,74 L15,76 C14,73 14,70 14,67 Z',
    taillight: 'M301,60 L308,60 L308,76 L301,76 Z',
    intake: 'M13,78 L44,76 C46,82 46,88 44,92 L16,92 C14,88 13,83 13,78 Z',
    extras: ['bed'], rim: 'six',
  },
  // Porsche 911: rear engine, fender-bulge round headlights, one long fastback curve.
  sports: {
    top: 'M18,93 C18,86 21,82 30,80 C40,72 52,70 64,70 C84,70 96,69 108,67 C122,55 138,44 160,40 C184,37 204,41 220,49 C244,60 272,70 290,75 C298,78 300,84 300,90',
    frontX: 18, rearX: 300, sill: 101, wheelFront: 76, wheelRear: 234, tire: 21, roof: 39, belt: 66,
    glass: 'M116,66 C128,55 142,46 161,43 C180,41 198,44 210,50 C218,55 224,60 228,65 Z',
    pillars: [{ top: 186, bottom: 182 }],
    doors: [182], handles: [166], mirror: { x: 118, y: 64 },
    headlight: 'M30,78 C32,72 44,71 52,74 C52,78 42,81 33,81 C31,80 30,79 30,78 Z',
    taillight: 'M280,72 L299,78 L299,82 L280,76 Z',
    intake: 'M21,92 L48,90 C50,93 49,96 45,97 L25,98 C22,98 21,96 21,92 Z',
    extras: ['duck'], rim: 'mesh',
  },
  // Mustang / Camaro / Challenger: blunt nose, long hood, chopped greenhouse, short deck.
  muscle: {
    top: 'M12,92 L12,80 C12,74 14,71 22,70 C54,67 90,65 118,63 C132,52 146,42 168,39 C182,37 200,37 210,39 C226,43 240,52 250,57 C270,59 292,60 302,62 C307,64 308,70 308,80',
    frontX: 12, rearX: 308, sill: 100, wheelFront: 78, wheelRear: 248, tire: 22, roof: 38, belt: 63,
    glass: 'M126,62 C138,52 150,44 169,42 C184,40 200,40 209,42 C222,46 234,53 242,57 Z',
    pillars: [{ top: 194, bottom: 190 }],
    doors: [188], handles: [172], mirror: { x: 128, y: 60 },
    headlight: 'M13,72 L30,71 C31,73 31,76 30,78 L13,79 Z',
    taillight: 'M298,62 L308,64 L308,73 L298,72 Z',
    intake: 'M12,80 L40,78 C42,83 42,88 40,92 L14,93 C12,89 12,85 12,80 Z',
    extras: ['scoop'], rim: 'mesh',
  },
  // Miata / S2000 / Z4: top down — windshield, headrest, flat beltline, short overhangs.
  roadster: {
    top: 'M22,92 C22,84 25,80 34,79 C60,75 96,71 122,69 C138,68 150,67 158,67 C190,66 222,66 246,66 C268,66 286,68 294,72 C298,76 298,84 298,90',
    frontX: 22, rearX: 298, sill: 100, wheelFront: 78, wheelRear: 238, tire: 20, roof: 50, belt: 68,
    glass: 'M126,69 C132,62 140,54 147,49 L151,50 C148,56 146,62 146,68 Z',
    pillars: [],
    doors: [176], handles: [160], mirror: { x: 130, y: 66 },
    headlight: 'M24,82 C30,79 42,78 50,79 C50,82 46,84 40,85 L26,86 C24,85 24,83 24,82 Z',
    taillight: 'M288,70 L297,73 C298,76 298,79 297,80 L287,78 Z',
    intake: 'M25,92 L50,91 C52,94 51,96 47,97 L29,97 C26,97 25,95 25,92 Z',
    extras: ['roadster'], rim: 'mesh',
  },
  // Supra / 370Z / RX-7 / GT-R: long hood fastback with a rear wing.
  jdm: {
    top: 'M16,93 C16,86 19,82 28,80 C52,76 86,70 112,67 C126,56 140,45 162,40 C178,37 196,38 208,41 C228,46 246,56 262,62 C280,66 296,67 302,70 C304,74 304,82 304,90',
    frontX: 16, rearX: 304, sill: 101, wheelFront: 76, wheelRear: 244, tire: 21, roof: 39, belt: 65,
    glass: 'M120,66 C132,55 146,45 163,43 C178,41 194,42 206,45 C222,50 236,57 246,62 Z',
    pillars: [{ top: 190, bottom: 186 }],
    doors: [186], handles: [170], mirror: { x: 122, y: 63 },
    headlight: 'M19,82 C28,79 42,77 54,77 C54,80 50,82 44,83 L21,86 C19,85 18,84 19,82 Z',
    taillight: 'M291,68 C297,67 303,70 304,74 C304,77 300,78 294,77 C290,75 289,70 291,68 Z',
    intake: 'M19,92 L46,91 C48,94 47,97 43,98 L24,98 C21,98 19,96 19,92 Z',
    extras: ['wing'], rim: 'mesh',
  },
  // Mid-engine: wedge nose, cab-forward, long engine deck, side intake before the rear wheel.
  supercar: {
    top: 'M12,96 C12,90 16,87 26,86 C54,82 84,76 104,71 C120,60 136,50 160,47 C180,45 198,48 212,56 C236,62 268,66 292,68 C302,69 308,74 308,84 C308,90 308,94 308,96',
    frontX: 12, rearX: 308, sill: 104, wheelFront: 76, wheelRear: 240, tire: 21, roof: 47, belt: 72,
    glass: 'M112,70 C126,60 142,52 160,50 C176,49 190,52 200,58 Z',
    pillars: [],
    doors: [], handles: [], mirror: { x: 116, y: 68 },
    headlight: 'M16,87 C30,84 46,82 60,81 L58,84 C46,86 30,88 18,90 Z',
    taillight: 'M288,69 L307,74 L307,78 L288,73 Z',
    intake: 'M15,94 L50,90 C52,94 51,98 47,100 L20,100 C17,100 15,98 15,94 Z',
    extras: ['sideIntake'], rim: 'mesh',
  },
  // Wrangler / Bronco / G-Class / Defender: upright glass, flat roof, big tires, spare on back.
  offroad: {
    top: 'M16,86 L16,64 C16,60 18,58 22,58 L96,56 L112,22 C113,19 115,18 118,18 L288,18 C292,18 294,20 294,24 L296,56 L298,60 L298,80',
    frontX: 16, rearX: 298, sill: 93, wheelFront: 80, wheelRear: 234, tire: 26, roof: 18, belt: 56,
    glass: 'M118,54 L124,23 L168,23 L168,54 Z M176,23 L230,23 L230,54 L176,54 Z M238,23 L286,23 L288,52 L238,52 Z',
    pillars: [],
    doors: [172, 234], handles: [156, 218], mirror: { x: 110, y: 52 },
    headlight: 'M18,66 C18,61 22,59 26,59 C30,59 33,62 33,66 C33,70 30,73 26,73 C22,73 18,70 18,66 Z',
    taillight: 'M291,56 L297,56 L297,72 L291,72 Z',
    intake: 'M16,74 L40,73 L40,86 L16,86 Z',
    extras: ['rails', 'spare', 'flares'], rim: 'six',
  },
};

/** Wheel-arch radius (a few units of gap around the tire). */
export function archRadius(shape: Shape): number {
  return shape.tire + 5;
}

/** Full body outline: the shape's top plus a bottom edge with arches cut around the wheels. */
export function bodyPath(shape: Shape): string {
  const { top, frontX, rearX, sill, wheelFront, wheelRear } = shape;
  const arch = archRadius(shape);
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

const STANCE_OFFSET: Record<Stance, number> = { stock: 0, lowered: 5, lifted: -7 };

/** How far the body moves down (lowered) or up (lifted); the wheels stay on the ground. */
export function stanceOffset(stance: Stance): number {
  return STANCE_OFFSET[stance] ?? 0;
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
