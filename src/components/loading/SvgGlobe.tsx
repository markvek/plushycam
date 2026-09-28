import { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  globeLines,
  initialAngle,
  loadingColors,
  projectPoint,
  rotationSpeed,
  type GlobeProps,
} from './globe';

export function SvgGlobe({ size, spinning }: GlobeProps) {
  const angle = useRef(initialAngle);
  const [frame, setFrame] = useState(initialAngle);
  useEffect(() => {
    if (!spinning) return;
    let last = 0;
    let request = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      if (now - last >= 1000 / 24) {
        angle.current += (Math.min(now - last, 100) * rotationSpeed) / 1000;
        last = now;
        setFrame(angle.current);
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [spinning]);

  let path = '';
  for (const line of globeLines) {
    for (let i = 1; i < line.length; i++) {
      let start = projectPoint(line[i - 1], frame);
      let end = projectPoint(line[i], frame);
      if (start[2] < 0 && end[2] < 0) continue;
      // Clip crossing chords at the horizon so the faceted outline has no gaps.
      if (start[2] < 0 !== end[2] < 0) {
        const t = start[2] / (start[2] - end[2]);
        const edge: [number, number, number] = [
          start[0] + t * (end[0] - start[0]),
          start[1] + t * (end[1] - start[1]),
          0,
        ];
        if (start[2] < 0) start = edge;
        else end = edge;
      }
      path += `M${(50 + start[0] * 45.45).toFixed(2)},${(50 - start[1] * 45.45).toFixed(2)}L${(50 + end[0] * 45.45).toFixed(2)},${(50 - end[1] * 45.45).toFixed(2)} `;
    }
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" testID="globe-svg" aria-hidden>
      <Path
        d={path}
        fill="none"
        stroke={loadingColors.wire}
        strokeWidth="0.18"
        strokeLinejoin="miter"
      />
    </Svg>
  );
}
