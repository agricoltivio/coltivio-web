// Coverage of the swisstopo WMTS layers (swissimage, pixelkarte-farbe), from the WMTS capabilities.
// swisstopo answers tiles outside it with 400, so the raster sources don't request them.
export const SWISSTOPO_TILE_BOUNDS: [number, number, number, number] = [5.140242, 45.398181, 11.47757, 48.230651];
