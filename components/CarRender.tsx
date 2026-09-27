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
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { BODY_LAYERS, carParts, LAYERS, type Part } from '@/lib/carDrawing';
import { type BodyStyle, SHAPES, type Stance, stanceOffset } from '@/lib/carShapes';

const TAGS = { path: Path, circle: Circle, rect: Rect, line: Line, ellipse: Ellipse };
const GRADIENTS = { linearGradient: LinearGradient, radialGradient: RadialGradient };

type AnyProps = Record<string, string | number>;

function render(part: Part) {
  if (part.layer === 'defs') {
    const Gradient = GRADIENTS[part.tag] as unknown as ComponentType<Record<string, unknown>>;
    return (
      <Gradient key={part.key} {...part.attrs}>
        {part.stops.map((s, i) => (
          <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
        ))}
      </Gradient>
    );
  }
  const Tag = TAGS[part.tag] as unknown as ComponentType<AnyProps>;
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
  const clipId = `carGlassClip-${style}`; // identical content per id, so duplicates are harmless
  const lift = stanceOffset(stance);
  const layer = (name: Part['layer']) => parts.filter((p) => p.layer === name).map(render);

  return (
    <Svg width={width} style={{ aspectRatio: 320 / 130 }} viewBox="0 0 320 130">
      <Defs>
        {layer('defs')}
        <ClipPath id={clipId}>
          <Path d={SHAPES[style].glass} />
        </ClipPath>
      </Defs>
      {LAYERS.map((name) =>
        BODY_LAYERS.includes(name) ? (
          <G key={name} transform={`translate(0, ${lift})`}>
            {name === 'glass' ? <G clipPath={`url(#${clipId})`}>{layer(name)}</G> : layer(name)}
          </G>
        ) : (
          <G key={name}>{layer(name)}</G>
        )
      )}
    </Svg>
  );
}
