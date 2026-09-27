import type { ComponentType } from 'react';
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

import { type BodyStyle, carParts, type Part, SHAPES, type Stance, stanceOffset } from '@/lib/carShapes';

const TAGS = { path: Path, circle: Circle, rect: Rect, line: Line, ellipse: Ellipse };

function render(part: Part) {
  const Tag = TAGS[part.tag] as unknown as ComponentType<Record<string, string | number>>;
  return <Tag key={part.key} {...part.attrs} />;
}

type Props = {
  bodyStyle: BodyStyle;
  paint: string;
  wheels: string;
  stance: Stance;
  /** Rendered width; height follows the 320 × 130 aspect ratio. */
  width?: number | `${number}%`;
};

/** Side-view render of a car: model-style silhouette in the owner's paint, wheels and stance. */
export function CarRender({ bodyStyle, paint, wheels, stance, width = '100%' }: Props) {
  const style = SHAPES[bodyStyle] ? bodyStyle : 'coupe';
  const parts = carParts(style, paint, wheels);
  const clipId = `carGlass-${style}`; // identical content per id, so duplicates are harmless

  return (
    <Svg width={width} style={{ aspectRatio: 320 / 130 }} viewBox="0 0 320 130">
      <Defs>
        <LinearGradient id="carShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Path d={SHAPES[style].glass} />
        </ClipPath>
      </Defs>
      {parts.filter((p) => p.layer === 'shadow').map(render)}
      <G transform={`translate(0, ${stanceOffset(stance)})`}>
        {parts.filter((p) => p.layer === 'body' && !p.clip).map(render)}
        <G clipPath={`url(#${clipId})`}>{parts.filter((p) => p.clip).map(render)}</G>
      </G>
      {parts.filter((p) => p.layer === 'wheels').map(render)}
    </Svg>
  );
}
