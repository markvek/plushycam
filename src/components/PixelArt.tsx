import { memo } from 'react';
import { View } from 'react-native';
import { colors } from './theme';

const sprites = {
  pet: [
    '    NNN     NNN    ',
    '   NPPPN   NPPPN   ',
    '   NPPPNNNNNPPPN   ',
    '  NPPPPPPPPPPPPPN  ',
    ' NPPPPPPPPPPPPPPPN ',
    ' NPPPNNPPPPPNNPPPN ',
    ' NPPPWNPPPPPWNPPPN ',
    ' NPPPPPPNNNPPPPPPN ',
    ' NPHHPPPPNPPPPHHPN ',
    '  NPPPPNNNNNPPPPN  ',
    ' NNPPPPPPPPPPPPPNN ',
    'NPPNPPPPPPPPPPPNPPN',
    ' NNPPPPPPPPPPPPPNN ',
    '  NPPPPPPPPPPPPPN  ',
    '   NNNNNNNNNNNNN   ',
    '   NNNN     NNNN   ',
  ],
  camera: [
    '  NNNN      ',
    ' NPPPPNNNNN ',
    'NPPPPPPPPPPN',
    'NPPPNNNNPHHN',
    'NPPNCCWCNPPN',
    'NPPNCCCCNPPN',
    'NPPPNNNNPPPN',
    ' NNNNNNNNNN ',
  ],
  album: [
    ' NNNNNNNNN ',
    ' NWWWWWWWN ',
    ' NWCWWWWWN ',
    ' NWCCWWWWN ',
    ' NWWWWNWWN ',
    ' NWWWNNNWN ',
    ' NWWNNNNNN ',
    ' NNNNNNNNN ',
  ],
  heart: [' NN NN ', 'NHHNHHN', 'NHHHHHN', ' NHHHN ', '  NHN  ', '   N   '],
  star: ['   N   ', '  NYN  ', 'NNYYYNN', ' NYYYN ', ' NYNYN ', ' N   N '],
  gear: [
    '   NNN   ',
    ' NNPPPNN ',
    ' NPPPPPN ',
    'NPPNNNPPN',
    'NPPNWNPPN',
    'NPPNNNPPN',
    ' NPPPPPN ',
    ' NNPPPNN ',
    '   NNN   ',
  ],
} as const;
export type PixelIconName = keyof typeof sprites;

// Horizontal runs keep the tiny, original sprites crisp without hundreds of views.
export const PixelArt = memo(function PixelArt({
  name = 'pet',
  size = 4,
  tint = colors.pink,
}: {
  name?: PixelIconName;
  size?: number;
  tint?: string;
}) {
  const rows = sprites[name];
  const palette: Record<string, string> = {
    N: colors.ink,
    P: tint,
    W: colors.white,
    H: '#F36B9B',
    C: colors.cyan,
    Y: colors.yellow,
  };
  const runs = rows.flatMap((row, y) => {
    const result: { x: number; y: number; length: number; color: string }[] = [];
    for (let x = 0; x < row.length;) {
      const start = x;
      const pixel = row[x];
      while (row[x] === pixel && x < row.length) x++;
      if (palette[pixel]) result.push({ x: start, y, length: x - start, color: palette[pixel] });
    }
    return result;
  });
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        width: Math.max(...rows.map((row) => row.length)) * size,
        height: rows.length * size,
      }}
    >
      {runs.map((run) => (
        <View
          key={`${run.x}-${run.y}`}
          style={{
            position: 'absolute',
            left: run.x * size,
            top: run.y * size,
            width: run.length * size,
            height: size,
            backgroundColor: run.color,
          }}
        />
      ))}
    </View>
  );
});

export function Pet({ size = 7 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: size * 2 }}>
      <PixelArt size={size} />
      <View style={{ width: size * 14, height: size, backgroundColor: '#C7D4BA' }} />
    </View>
  );
}
