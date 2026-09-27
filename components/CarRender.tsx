import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export const BODY_STYLES = ['coupe', 'sedan', 'hatch', 'suv', 'truck'] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];
export const STANCES = ['stock', 'lowered', 'lifted'] as const;
export type Stance = (typeof STANCES)[number];

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = {
  coupe: 'Coupe',
  sedan: 'Sedan',
  hatch: 'Hatch',
  suv: 'SUV',
  truck: 'Truck',
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

// All shapes are drawn facing left in a 320 × 130 box; ground is at y = 118.
const WHEEL_Y = 96;
const FRONT_X = 72;
const REAR_X = 248;

type Shape = { body: string; glass: string; pillars: number[]; extras?: 'rails' | 'bed' };

const SHAPES: Record<BodyStyle, Shape> = {
  coupe: {
    body: 'M16,90 Q16,78 30,75 L104,66 Q128,40 160,34 L196,34 Q226,36 250,60 L290,66 Q304,68 304,82 L304,94 Q304,100 296,100 L275,100 A27,27 0 0 0 221,100 L99,100 A27,27 0 0 0 45,100 L24,100 Q16,100 16,90 Z',
    glass: 'M112,64 Q134,42 162,39 L194,39 Q220,41 240,60 Z',
    pillars: [178],
  },
  sedan: {
    body: 'M16,90 Q16,78 30,76 L98,68 Q122,44 150,36 L214,36 Q238,40 256,62 L292,66 Q304,68 304,82 L304,94 Q304,100 296,100 L275,100 A27,27 0 0 0 221,100 L99,100 A27,27 0 0 0 45,100 L24,100 Q16,100 16,90 Z',
    glass: 'M106,66 Q128,44 152,41 L212,41 Q232,44 246,62 Z',
    pillars: [178],
  },
  hatch: {
    body: 'M16,90 Q16,78 30,76 L96,68 Q120,42 150,34 L262,34 Q282,36 292,58 L302,74 Q304,78 304,84 L304,94 Q304,100 296,100 L275,100 A27,27 0 0 0 221,100 L99,100 A27,27 0 0 0 45,100 L24,100 Q16,100 16,90 Z',
    glass: 'M104,66 Q126,44 152,39 L258,39 Q274,41 284,58 Z',
    pillars: [178, 236],
  },
  suv: {
    body: 'M16,88 Q16,70 30,66 L92,60 Q112,26 140,20 L270,20 Q290,22 298,44 L304,62 L304,92 Q304,98 296,98 L276,98 A28,28 0 0 0 220,98 L100,98 A28,28 0 0 0 44,98 L24,98 Q16,98 16,88 Z',
    glass: 'M100,58 Q118,28 142,25 L268,25 Q284,27 290,46 L294,56 Z',
    pillars: [170, 234],
    extras: 'rails',
  },
  truck: {
    body: 'M16,90 Q16,76 30,72 L94,64 Q112,34 136,28 L186,28 Q194,28 196,36 L198,62 L304,62 L304,94 Q304,100 296,100 L275,100 A27,27 0 0 0 221,100 L99,100 A27,27 0 0 0 45,100 L24,100 Q16,100 16,90 Z',
    glass: 'M102,62 Q118,36 138,33 L188,33 L190,60 Z',
    pillars: [],
    extras: 'bed',
  },
};

const STANCE_OFFSET: Record<Stance, number> = { stock: 0, lowered: 5, lifted: -7 };

function Wheel({ cx, color }: { cx: number; color: string }) {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <G>
      <Circle cx={cx} cy={WHEEL_Y} r={22} fill="#1d1a24" />
      <Circle cx={cx} cy={WHEEL_Y} r={15} fill={color} />
      <Circle cx={cx} cy={WHEEL_Y} r={15} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={1.5} />
      {spokes.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <Line
            key={angle}
            x1={cx}
            y1={WHEEL_Y}
            x2={cx + Math.sin(rad) * 13}
            y2={WHEEL_Y - Math.cos(rad) * 13}
            stroke="#000"
            strokeOpacity={0.3}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={cx} cy={WHEEL_Y} r={4} fill="#2a2730" />
    </G>
  );
}

type Props = {
  bodyStyle: BodyStyle;
  paint: string;
  wheels: string;
  stance: Stance;
  /** Rendered width; height follows the 320 × 130 aspect ratio. */
  width?: number | `${number}%`;
};

/** Stylized side-view render of a car in the owner's chosen body style, paint and wheels. */
export function CarRender({ bodyStyle, paint, wheels, stance, width = '100%' }: Props) {
  const shape = SHAPES[bodyStyle] ?? SHAPES.coupe;
  const lift = STANCE_OFFSET[stance] ?? 0;

  return (
    <Svg width={width} style={{ aspectRatio: 320 / 130 }} viewBox="0 0 320 130">
      <Defs>
        {/* Same stops everywhere, so sharing the id across renders on one page is harmless. */}
        <LinearGradient id="carShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </LinearGradient>
        {/* One clip per body style (identical content per id, so duplicates are harmless). */}
        <ClipPath id={`carGlass-${bodyStyle}`}>
          <Path d={shape.glass} />
        </ClipPath>
      </Defs>

      <Ellipse cx={160} cy={119} rx={146} ry={6} fill="#000" opacity={0.16} />

      <G transform={`translate(0, ${lift})`}>
        {/* Dark wheel wells show through the arch cut-outs. */}
        <Circle cx={FRONT_X} cy={WHEEL_Y + 2} r={26} fill="#15131a" />
        <Circle cx={REAR_X} cy={WHEEL_Y + 2} r={26} fill="#15131a" />
        {shape.extras === 'rails' ? <Rect x={150} y={14} width={110} height={4} rx={2} fill="#2a2730" /> : null}
        <Path d={shape.body} fill={paint} />
        <Path d={shape.body} fill="url(#carShade)" />
        <Path d={shape.body} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={1} />
        <Path d={shape.glass} fill="#2d3a4f" opacity={0.9} />
        <Path d={shape.glass} fill="#a0d2eb" opacity={0.25} />
        <G clipPath={`url(#carGlass-${bodyStyle})`}>
          {shape.pillars.map((x) => (
            <Rect key={x} x={x} y={10} width={6} height={70} fill={paint} />
          ))}
        </G>
        {shape.extras === 'bed' ? (
          <Line x1={198} y1={68} x2={304} y2={68} stroke="#000" strokeOpacity={0.25} strokeWidth={1.5} />
        ) : null}
        {/* Door seam and handle */}
        <Line x1={176} y1={68} x2={176} y2={96} stroke="#000" strokeOpacity={0.18} strokeWidth={1} />
        <Rect x={186} y={74} width={12} height={3} rx={1.5} fill="#000" opacity={0.25} />
        {/* Lights */}
        <Rect x={18} y={79} width={11} height={5} rx={2} fill="#fff6c8" />
        <Rect x={295} y={shape.extras === 'bed' ? 66 : 72} width={8} height={7} rx={2} fill="#d7263d" />
      </G>

      <Wheel cx={FRONT_X} color={wheels} />
      <Wheel cx={REAR_X} color={wheels} />
    </Svg>
  );
}
