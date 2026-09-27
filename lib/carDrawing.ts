// Turns a car shape + colors into SVG primitives ("parts"). The app renders them with
// react-native-svg (components/CarRender.tsx); `carSvgMarkup` renders the same parts as a
// plain SVG string for previews and tests. Pure — no React.

import {
  archRadius,
  type BodyStyle,
  bodyPath,
  GROUND_Y,
  type Shape,
  SHAPES,
  type Stance,
  stanceOffset,
  wheelCenterY,
} from './carShapes';

export type GradientStop = { offset: number; color: string; opacity?: number };

type Layer = 'shadow' | 'wells' | 'wheels' | 'body' | 'glass';

export type Part =
  | {
      key: string;
      tag: 'path' | 'circle' | 'rect' | 'line' | 'ellipse';
      attrs: Record<string, string | number>;
      layer: Layer;
    }
  | {
      key: string;
      tag: 'linearGradient' | 'radialGradient';
      attrs: Record<string, string | number>;
      stops: GradientStop[];
      layer: 'defs';
    };

/** Drawing order. Wheels sit under the body so fenders overlap tires (lowered cars tuck). */
export const LAYERS: Layer[] = ['shadow', 'wells', 'wheels', 'body', 'glass'];
/** Layers that move with the body when the stance changes. */
export const BODY_LAYERS: Layer[] = ['wells', 'body', 'glass'];

// ─── Color helpers ───────────────────────────────────────────────────────────

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: [number, number, number], t: number): string {
  const [r, g, b] = toRgb(hex);
  const out = [r, g, b].map((c, i) => Math.round(c + (target[i] - c) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const lighten = (hex: string, t: number) => mix(hex, [255, 255, 255], t);
export const darken = (hex: string, t: number) => mix(hex, [0, 0, 0], t);

const slug = (hex: string) => hex.replace('#', '').toLowerCase();

// ─── Parts ───────────────────────────────────────────────────────────────────

const TRIM = '#101116';
const RUBBER = '#18171c';

function shared(): Part[] {
  // Same content everywhere, so these ids can be repeated safely on one page.
  return [
    {
      key: 'g-shadow', tag: 'radialGradient', layer: 'defs', attrs: { id: 'carShadow', cx: '50%', cy: '50%', r: '50%' },
      stops: [{ offset: 0, color: '#000', opacity: 0.4 }, { offset: 0.6, color: '#000', opacity: 0.16 }, { offset: 1, color: '#000', opacity: 0 }],
    },
    {
      key: 'g-well', tag: 'radialGradient', layer: 'defs', attrs: { id: 'carWell', cx: '50%', cy: '70%', r: '60%' },
      stops: [{ offset: 0, color: '#040406' }, { offset: 1, color: '#2b2833' }],
    },
    {
      key: 'g-tire', tag: 'radialGradient', layer: 'defs', attrs: { id: 'carTire', cx: '50%', cy: '50%', r: '50%' },
      stops: [{ offset: 0.7, color: '#2c2a31' }, { offset: 0.86, color: '#1d1c22' }, { offset: 1, color: '#0e0d12' }],
    },
    {
      key: 'g-glass', tag: 'linearGradient', layer: 'defs', attrs: { id: 'carGlass', x1: '0', y1: '0', x2: '0', y2: '1' },
      stops: [{ offset: 0, color: '#3a4a60' }, { offset: 0.45, color: '#1d2432' }, { offset: 1, color: '#2e3a4c' }],
    },
    {
      key: 'g-head', tag: 'linearGradient', layer: 'defs', attrs: { id: 'carHead', x1: '0', y1: '0', x2: '1', y2: '1' },
      stops: [{ offset: 0, color: '#ffffff' }, { offset: 0.6, color: '#f4f1e2' }, { offset: 1, color: '#c9c3a8' }],
    },
    {
      key: 'g-tail', tag: 'linearGradient', layer: 'defs', attrs: { id: 'carTail', x1: '0', y1: '0', x2: '0', y2: '1' },
      stops: [{ offset: 0, color: '#ff6b78' }, { offset: 0.55, color: '#d7263d' }, { offset: 1, color: '#7e0b1c' }],
    },
  ];
}

/** Paint with a studio look: light roof, crisp reflection line at the shoulder, dark rocker. */
function paintGradient(id: string, shape: Shape, paint: string): Part {
  const band = Math.min(0.9, Math.max(0.1, (shape.belt + 3 - shape.roof) / (shape.sill - shape.roof)));
  return {
    key: `g-${id}`, tag: 'linearGradient', layer: 'defs', attrs: { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    stops: [
      { offset: 0, color: lighten(paint, 0.4) },
      { offset: band * 0.6, color: lighten(paint, 0.16) },
      { offset: band - 0.04, color: paint },
      { offset: band, color: lighten(paint, 0.55) },
      { offset: band + 0.03, color: lighten(paint, 0.12) },
      { offset: band + 0.08, color: paint },
      { offset: 0.84, color: darken(paint, 0.22) },
      { offset: 1, color: darken(paint, 0.45) },
    ],
  };
}

function rimGradient(id: string, rim: string): Part {
  return {
    key: `g-${id}`, tag: 'linearGradient', layer: 'defs', attrs: { id, x1: '0', y1: '0', x2: '1', y2: '1' },
    stops: [
      { offset: 0, color: lighten(rim, 0.5) },
      { offset: 0.45, color: rim },
      { offset: 0.55, color: darken(rim, 0.15) },
      { offset: 1, color: lighten(rim, 0.25) },
    ],
  };
}

function wheel(prefix: string, cx: number, cy: number, tire: number, style: Shape['rim'], rimFill: string, rimColor: string): Part[] {
  const rim = Math.round(tire * 0.7);
  const parts: Part[] = [
    { key: `${prefix}-tire`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: tire, fill: 'url(#carTire)' } },
    { key: `${prefix}-wall`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: tire - 3, fill: 'none', stroke: '#34313a', strokeWidth: 1 } },
    { key: `${prefix}-barrel`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim, fill: '#0f0e13' } },
    // Brake disc and caliper, seen between the spokes.
    { key: `${prefix}-disc`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim * 0.78, fill: '#8f949c' } },
    { key: `${prefix}-disc-in`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim * 0.34, fill: '#5d6169' } },
    {
      key: `${prefix}-caliper`, tag: 'path', layer: 'wheels',
      attrs: { d: arcBand(cx, cy, rim * 0.5, rim * 0.86, 200, 250), fill: '#c8102e' },
    },
  ];

  const count = style === 'six' ? 6 : 10;
  const [hubHalf, rimHalf] = style === 'six' ? [2.6, 5.2] : [1.3, 2.9];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (style === 'six' ? 0 : Math.PI / count / 2);
    parts.push({
      key: `${prefix}-spoke${i}`, tag: 'path', layer: 'wheels',
      attrs: { d: spoke(cx, cy, 3.5, rim - 2.2, a, hubHalf, rimHalf), fill: rimFill, stroke: darken(rimColor, 0.35), strokeWidth: 0.4 },
    });
  }
  parts.push(
    { key: `${prefix}-lip`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim - 1.1, fill: 'none', stroke: rimFill, strokeWidth: 2.4 } },
    { key: `${prefix}-lip-edge`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: rim, fill: 'none', stroke: darken(rimColor, 0.4), strokeWidth: 0.6 } },
    { key: `${prefix}-hub`, tag: 'circle', layer: 'wheels', attrs: { cx, cy, r: 3.6, fill: darken(rimColor, 0.25) } },
    { key: `${prefix}-hub-shine`, tag: 'circle', layer: 'wheels', attrs: { cx: cx - 1, cy: cy - 1, r: 1.2, fill: '#ffffff', opacity: 0.55 } },
    // Soft contact shadow where the tire meets the ground.
    { key: `${prefix}-contact`, tag: 'ellipse', layer: 'shadow', attrs: { cx, cy: GROUND_Y + 0.5, rx: tire * 0.95, ry: 3, fill: '#000', opacity: 0.35 } }
  );
  return parts;
}

/** Tapered spoke from the hub out to the rim at angle `a` (radians, 0 = up). */
function spoke(cx: number, cy: number, r0: number, r1: number, a: number, w0: number, w1: number): string {
  const pt = (r: number, w: number, side: number) => {
    const px = cx + Math.sin(a) * r + Math.cos(a) * w * side;
    const py = cy - Math.cos(a) * r + Math.sin(a) * w * side;
    return `${px.toFixed(2)},${py.toFixed(2)}`;
  };
  return `M${pt(r0, w0, -1)} L${pt(r1, w1, -1)} L${pt(r1, w1, 1)} L${pt(r0, w0, 1)} Z`;
}

/** Ring segment between two radii and angles (degrees, 0 = up, clockwise). */
function arcBand(cx: number, cy: number, r0: number, r1: number, from: number, to: number): string {
  const p = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(cx + Math.sin(rad) * r).toFixed(2)},${(cy - Math.cos(rad) * r).toFixed(2)}`;
  };
  return `M${p(r1, from)} A${r1},${r1} 0 0 1 ${p(r1, to)} L${p(r0, to)} A${r0},${r0} 0 0 0 ${p(r0, from)} Z`;
}

/** Every primitive (and gradient) needed to draw a car. */
export function carParts(style: BodyStyle, paint: string, wheels: string): Part[] {
  const s = SHAPES[style] ?? SHAPES.coupe;
  const body = bodyPath(s);
  const cy = wheelCenterY(s);
  const arch = archRadius(s);
  const has = (extra: Shape['extras'][number]) => s.extras.includes(extra);
  const paintId = `carPaint-${style}-${slug(paint)}`;
  const rimId = `carRim-${slug(wheels)}`;
  const edge = darken(paint, 0.5);
  const parts: Part[] = [...shared(), paintGradient(paintId, s, paint), rimGradient(rimId, wheels)];
  const fill = `url(#${paintId})`;

  // Ground shadow and wheel wells.
  parts.push(
    { key: 'shadow', tag: 'ellipse', layer: 'shadow', attrs: { cx: (s.frontX + s.rearX) / 2, cy: GROUND_Y + 1, rx: (s.rearX - s.frontX) / 2 + 6, ry: 7, fill: 'url(#carShadow)' } },
    { key: 'well-f', tag: 'circle', layer: 'wells', attrs: { cx: s.wheelFront, cy: cy + 1, r: arch - 0.5, fill: 'url(#carWell)' } },
    { key: 'well-r', tag: 'circle', layer: 'wells', attrs: { cx: s.wheelRear, cy: cy + 1, r: arch - 0.5, fill: 'url(#carWell)' } }
  );

  parts.push(
    ...wheel('wf', s.wheelFront, cy, s.tire, s.rim, `url(#${rimId})`, wheels),
    ...wheel('wr', s.wheelRear, cy, s.tire, s.rim, `url(#${rimId})`, wheels)
  );

  // Behind the body: roof rails, spare tire, wing posts.
  if (has('rails')) {
    const x0 = s.wheelFront + 64;
    const x1 = s.wheelRear + 8;
    parts.push(
      { key: 'rail', tag: 'rect', layer: 'body', attrs: { x: x0, y: s.roof - 6, width: x1 - x0, height: 3.2, rx: 1.6, fill: TRIM } },
      { key: 'rail-leg1', tag: 'rect', layer: 'body', attrs: { x: x0 + 6, y: s.roof - 4, width: 3, height: 5, fill: TRIM } },
      { key: 'rail-leg2', tag: 'rect', layer: 'body', attrs: { x: x1 - 10, y: s.roof - 4, width: 3, height: 5, fill: TRIM } }
    );
  }
  if (has('spare')) {
    parts.push(
      { key: 'spare', tag: 'circle', layer: 'body', attrs: { cx: s.rearX + 3, cy: 60, r: 18, fill: 'url(#carTire)' } },
      { key: 'spare-rim', tag: 'circle', layer: 'body', attrs: { cx: s.rearX + 3, cy: 60, r: 10, fill: `url(#${rimId})` } },
      { key: 'spare-hub', tag: 'circle', layer: 'body', attrs: { cx: s.rearX + 3, cy: 60, r: 3, fill: darken(wheels, 0.3) } }
    );
  }
  if (has('wing')) {
    parts.push(
      { key: 'wing-post1', tag: 'path', layer: 'body', attrs: { d: 'M270,63 L273,50 L276,50 L275,64 Z', fill: TRIM } },
      { key: 'wing-post2', tag: 'path', layer: 'body', attrs: { d: 'M289,66 L291,50 L294,50 L294,67 Z', fill: TRIM } }
    );
  }

  // The body itself.
  parts.push(
    { key: 'paint', tag: 'path', layer: 'body', attrs: { d: body, fill } },
    { key: 'outline', tag: 'path', layer: 'body', attrs: { d: body, fill: 'none', stroke: edge, strokeOpacity: 0.55, strokeWidth: 1 } },
    // Dark side skirt between the wheels.
    {
      key: 'skirt', tag: 'path', layer: 'body',
      attrs: { d: `M${s.wheelFront + arch + 1},${s.sill - 1.5} L${s.wheelRear - arch - 1},${s.sill - 1.5}`, stroke: darken(paint, 0.55), strokeOpacity: 0.7, strokeWidth: 3 },
    },
    { key: 'intake', tag: 'path', layer: 'body', attrs: { d: s.intake, fill: '#141318', opacity: 0.92 } }
  );

  if (has('flares')) {
    for (const [id, x] of [['f', s.wheelFront], ['r', s.wheelRear]] as const) {
      const r = arch + 2;
      parts.push({
        key: `flare-${id}`, tag: 'path', layer: 'body',
        attrs: { d: `M${x + r},${s.sill + 1} A${r},${r} 0 0 0 ${x - r},${s.sill + 1}`, fill: 'none', stroke: '#1d1c22', strokeWidth: 6, strokeLinecap: 'round' },
      });
    }
  }
  if (has('scoop')) {
    parts.push({ key: 'scoop', tag: 'path', layer: 'body', attrs: { d: 'M68,66 C76,59 90,58 100,64 Z', fill: darken(paint, 0.55) } });
  }
  if (has('duck')) {
    parts.push({ key: 'duck', tag: 'path', layer: 'body', attrs: { d: 'M258,63 C272,66 286,70 297,74 L298,70 C286,66 272,62 258,61 Z', fill, stroke: edge, strokeOpacity: 0.5, strokeWidth: 0.8 } });
  }
  if (has('sideIntake')) {
    parts.push(
      { key: 'side-intake', tag: 'path', layer: 'body', attrs: { d: 'M190,97 C198,84 212,76 230,75 L226,97 Z', fill: '#121116' } },
      { key: 'side-intake-slat1', tag: 'path', layer: 'body', attrs: { d: 'M200,90 L228,84', stroke: '#2e2c35', strokeWidth: 1.2 } },
      { key: 'side-intake-slat2', tag: 'path', layer: 'body', attrs: { d: 'M196,95 L227,90', stroke: '#2e2c35', strokeWidth: 1.2 } }
    );
  }
  if (has('bed')) {
    parts.push(
      { key: 'bed-rail', tag: 'path', layer: 'body', attrs: { d: `M204,61 L${s.rearX},61`, stroke: darken(paint, 0.5), strokeOpacity: 0.6, strokeWidth: 1.4 } },
      { key: 'tailgate', tag: 'path', layer: 'body', attrs: { d: `M${s.rearX - 8},60 L${s.rearX - 8},${s.sill - 3}`, stroke: edge, strokeOpacity: 0.5, strokeWidth: 1 } }
    );
  }
  if (has('wing')) {
    parts.push({ key: 'wing', tag: 'path', layer: 'body', attrs: { d: 'M256,49 C272,47 290,46 305,46 L305,51 C290,51 272,52 256,53 Z', fill, stroke: edge, strokeOpacity: 0.6, strokeWidth: 0.8 } });
  }

  // Doors: engraved seams and chrome handles.
  for (const x of s.doors) {
    parts.push(
      { key: `door-${x}`, tag: 'path', layer: 'body', attrs: { d: `M${x},${s.belt + 1} L${x - 2},${s.sill - 3}`, stroke: edge, strokeOpacity: 0.7, strokeWidth: 0.9 } },
      { key: `door-hl-${x}`, tag: 'path', layer: 'body', attrs: { d: `M${x + 1},${s.belt + 1} L${x - 1},${s.sill - 3}`, stroke: '#ffffff', strokeOpacity: 0.25, strokeWidth: 0.6 } }
    );
  }
  for (const x of s.handles) {
    parts.push({ key: `handle-${x}`, tag: 'rect', layer: 'body', attrs: { x, y: s.belt + 5, width: 11, height: 2.6, rx: 1.3, fill: '#dfe3ea', stroke: edge, strokeOpacity: 0.6, strokeWidth: 0.5 } });
  }

  // Lights.
  parts.push(
    { key: 'headlight', tag: 'path', layer: 'body', attrs: { d: s.headlight, fill: 'url(#carHead)', stroke: TRIM, strokeOpacity: 0.55, strokeWidth: 0.8 } },
    { key: 'taillight', tag: 'path', layer: 'body', attrs: { d: s.taillight, fill: 'url(#carTail)', stroke: '#5a0714', strokeOpacity: 0.6, strokeWidth: 0.6 } }
  );

  // Glass, trim and reflections (the reflections and pillars are clipped to the windows).
  parts.push(
    { key: 'glass', tag: 'path', layer: 'body', attrs: { d: s.glass, fill: 'url(#carGlass)' } },
    { key: 'glass-trim', tag: 'path', layer: 'body', attrs: { d: s.glass, fill: 'none', stroke: TRIM, strokeWidth: 1.6, strokeLinejoin: 'round' } }
  );
  for (const [i, x] of [138, 176].entries()) {
    parts.push({
      key: `reflection-${i}`, tag: 'path', layer: 'glass',
      attrs: { d: `M${x},0 L${x + (i ? 8 : 16)},0 L${x - 34},130 L${x - (i ? 42 : 50)},130 Z`, fill: '#ffffff', opacity: i ? 0.1 : 0.17 },
    });
  }
  for (const p of s.pillars) {
    const w = p.width ?? 7;
    parts.push({
      key: `pillar-${p.top}`, tag: 'path', layer: 'glass',
      attrs: { d: `M${p.top},${s.roof - 6} L${p.top + w},${s.roof - 6} L${p.bottom + w},${s.belt + 4} L${p.bottom},${s.belt + 4} Z`, fill: TRIM },
    });
  }
  if (has('roadster')) {
    parts.push(
      { key: 'cockpit', tag: 'path', layer: 'body', attrs: { d: 'M150,68 C172,64 204,63 232,66', fill: 'none', stroke: TRIM, strokeWidth: 2.6, strokeLinecap: 'round' } },
      { key: 'headrest', tag: 'path', layer: 'body', attrs: { d: 'M184,67 C184,56 188,51 196,51 C204,51 208,56 208,67 Z', fill: '#26242c' } },
      { key: 'headrest-shine', tag: 'path', layer: 'body', attrs: { d: 'M190,56 C191,53 194,52 197,52', fill: 'none', stroke: '#ffffff', strokeOpacity: 0.25, strokeWidth: 1.2 } }
    );
  }

  // Side mirror sits on top of everything at the window's front corner.
  if (s.mirror) {
    const { x, y } = s.mirror;
    parts.push(
      { key: 'mirror', tag: 'path', layer: 'body', attrs: { d: `M${x},${y} C${x - 1},${y - 5} ${x + 6},${y - 8} ${x + 13},${y - 7} C${x + 16},${y - 6} ${x + 17},${y - 3} ${x + 16},${y} C${x + 11},${y + 2} ${x + 5},${y + 2} ${x},${y} Z`, fill, stroke: edge, strokeOpacity: 0.6, strokeWidth: 0.7 } },
      { key: 'mirror-base', tag: 'path', layer: 'body', attrs: { d: `M${x + 4},${y + 1} L${x + 9},${y + 1} L${x + 9},${y + 3} L${x + 4},${y + 3} Z`, fill: TRIM } }
    );
  }

  return parts;
}

// ─── Plain SVG (previews / tests) ────────────────────────────────────────────

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const attrs = (a: Record<string, string | number>) =>
  Object.entries(a).map(([k, v]) => `${kebab(k)}="${v}"`).join(' ');

/** The same drawing as <CarRender>, as a standalone SVG string. */
export function carSvgMarkup(style: BodyStyle, paint: string, wheels: string, stance: Stance, width = 320): string {
  const parts = carParts(style, paint, wheels);
  const lift = stanceOffset(stance);
  const clipId = `carGlassClip-${style}`;
  const el = (p: Part) =>
    p.tag === 'linearGradient' || p.tag === 'radialGradient'
      ? `<${p.tag} ${attrs(p.attrs)}>${p.stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`).join('')}</${p.tag}>`
      : `<${p.tag} ${attrs(p.attrs)}/>`;
  const layer = (name: Layer) => parts.filter((p) => p.layer === name).map(el).join('');
  const moved = (name: Layer) => `<g transform="translate(0,${lift})">${name === 'glass' ? `<g clip-path="url(#${clipId})">${layer(name)}</g>` : layer(name)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 130" width="${width}" height="${(width * 130) / 320}">`
    + `<defs>${parts.filter((p) => p.layer === 'defs').map(el).join('')}<clipPath id="${clipId}"><path d="${SHAPES[style].glass}"/></clipPath></defs>`
    + LAYERS.map((name) => (BODY_LAYERS.includes(name) ? moved(name) : layer(name))).join('')
    + '</svg>';
}
