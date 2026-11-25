/**
 * Midpoints between neighbouring points of a drawn outline, used as handles to insert
 * a new point. A closed outline (3+ points) also gets one between the last and the
 * first point. `afterIndex` is the point the new one goes after.
 */
export function ringMidpoints(
  vertices: number[][],
  closed: boolean,
): { afterIndex: number; lngLat: [number, number] }[] {
  const midpoints: { afterIndex: number; lngLat: [number, number] }[] = [];
  const count = closed && vertices.length >= 3 ? vertices.length : vertices.length - 1;
  for (let index = 0; index < count; index++) {
    const [lng, lat] = vertices[index];
    const [nextLng, nextLat] = vertices[(index + 1) % vertices.length];
    midpoints.push({ afterIndex: index, lngLat: [(lng + nextLng) / 2, (lat + nextLat) / 2] });
  }
  return midpoints;
}

/** Inserts a point after `afterIndex`. */
export function insertVertexAfter<T>(vertices: T[], afterIndex: number, vertex: T): T[] {
  return [...vertices.slice(0, afterIndex + 1), vertex, ...vertices.slice(afterIndex + 1)];
}
