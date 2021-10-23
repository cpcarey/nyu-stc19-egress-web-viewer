import * as config from '../config.js';

export function convertLatLonToCoordSpace(
    xMin, xMax, yMin, yMax, lonMin, lonMax, latMin, latMax, lon, lat) {
  const dx = xMax - xMin;
  const dy = yMax - yMin;
  const dLon = lonMax - lonMin;
  const dLat = latMax - latMin;

  const x = ((lon - lonMin) / dLon) * dx + xMin;
  const y = yMax - ((lat - latMin) / dLat) * dy;
  return [x, y];
}

export function convertLatLonsToCoordSpace(
    coords, coordSpaceMin, coordSpaceMax) {
  return coords.map(([lon, lat]) => {
    return convertLatLonToCoordSpace(
      coordSpaceMin.x,
      coordSpaceMax.x,
      coordSpaceMin.y,
      coordSpaceMax.y,
      config.LON_MIN,
      config.LON_MAX,
      config.LAT_MIN,
      config.LAT_MAX,
      parseFloat(lon),
      parseFloat(lat),
    );
  });
}

/**
 * Returns an array of coordinates representing the array of bounding box
 * centers of the given polygons.
 * @param polygons Groups of coordinates in Potree coordinate space forming the
 *     outlines of polygons
 */
export function getPolygonCenter(polygon) {
  // Extract bounding box of polygon.
  const xCoords = polygon.map((coord) => coord[0]);
  const yCoords = polygon.map((coord) => coord[1]);

  const box = {
    left: Math.min(...xCoords),
    right: Math.max(...xCoords),
    top: Math.min(...yCoords),
    bottom: Math.max(...yCoords),
  };

  // Return center of polygon bounding box.
  return [(box.left + box.right) / 2, (box.top + box.bottom) / 2];
}
