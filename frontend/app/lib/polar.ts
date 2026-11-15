// The south-pole map's projection. Must match backend/scripts/build_basemap.py: polar stereographic,
// centered on the pole, image up = 0° E (toward Earth), 90° E to the right.
export const HALF_EXTENT_M = 305_280; // half-width of the map square (≈80°S at the edge midpoints)
export const R_M = 1_737_400; // lunar radius
export const HEIGHTS_SIZE = 848; // south-pole-heights.bin is 848 × 848 int16 meters (720 m cells)
const DEG = Math.PI / 180;

/** Map position (0..1 fractions from the top-left) of a southern latitude/longitude, or null if off the map. */
export function toMap(lat: number, lon: number): [number, number] | null {
  if (lat >= 0) return null;
  const r = 2 * R_M * Math.tan(((90 + lat) * DEG) / 2);
  const fx = 0.5 + (r * Math.sin(lon * DEG)) / (2 * HALF_EXTENT_M);
  const fy = 0.5 - (r * Math.cos(lon * DEG)) / (2 * HALF_EXTENT_M);
  return fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 ? [fx, fy] : null;
}

export function fromMap(fx: number, fy: number): { lat: number; lon: number } {
  const x = (fx - 0.5) * 2 * HALF_EXTENT_M;
  const y = (0.5 - fy) * 2 * HALF_EXTENT_M;
  const lat = -90 + (2 * Math.atan(Math.hypot(x, y) / (2 * R_M))) / DEG;
  return { lat, lon: Math.atan2(x, y) / DEG };
}

/** Moon-fixed unit vector (x toward 0°N 0°E, z toward the north pole) for a latitude/longitude. */
export function unitVector(lat: number, lon: number): [number, number, number] {
  const a = lat * DEG;
  const b = lon * DEG;
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
}
