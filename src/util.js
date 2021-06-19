import * as constants from './constants.js';

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

export function convertLatLonsToCoordSpace(coords, coordSpaceMin, coordSpaceMax) {
  return coords.map(([lon, lat]) => {
    return convertLatLonToCoordSpace(
      coordSpaceMin.x,
      coordSpaceMax.x,
      coordSpaceMin.y,
      coordSpaceMax.y,
      constants.LON_MIN,
      constants.LON_MAX,
      constants.LAT_MIN,
      constants.LAT_MAX,
      parseFloat(lon),
      parseFloat(lat),
    );
  });
}
