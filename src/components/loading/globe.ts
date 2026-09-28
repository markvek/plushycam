export const loadingColors = {
  wire: '#EE4D95',
  title: '#B9FFE1',
  ghost: '#5DCAD8',
  shadow: '#7E2A9C',
};

export type Point3 = [number, number, number];
export type GlobeProps = { size: number; spinning: boolean };
export const rotationSpeed = (Math.PI * 2) / 60;
export const initialAngle = 0;
export const longitudeSegments = 20;
export const latitudeSegments = 12;

// Latitude rings and meridians, without the diagonal edges of a triangulated sphere.
export const globeLines: Point3[][] = [
  ...Array.from({ length: 11 }, (_, i) => {
    const latitude = ((i - 5) * Math.PI) / 12;
    return Array.from({ length: longitudeSegments + 1 }, (_, j): Point3 => {
      const t = (j / longitudeSegments) * Math.PI * 2;
      return [
        Math.cos(latitude) * Math.cos(t),
        Math.sin(latitude),
        Math.cos(latitude) * Math.sin(t),
      ];
    });
  }),
  ...Array.from({ length: 10 }, (_, i) => {
    const longitude = (i / 10) * Math.PI;
    return Array.from({ length: latitudeSegments * 2 + 1 }, (_, j): Point3 => {
      const t = (j / (latitudeSegments * 2)) * Math.PI * 2;
      return [Math.cos(t) * Math.cos(longitude), Math.sin(t), Math.cos(t) * Math.sin(longitude)];
    });
  }),
];

export function projectPoint([x, y, z]: Point3, angle: number): Point3 {
  const rx = x * Math.cos(angle) + z * Math.sin(angle);
  const rz = z * Math.cos(angle) - x * Math.sin(angle);
  return [rx, y, rz];
}
