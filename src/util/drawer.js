import * as THREE from '../../libs/three.js/build/three.module.js';
import * as config from '../config.js';

/**
 * Draws a 3D bar chart visualization representing the number of overlaps at the
 * given centers within a given radius threshold.
 */
export function drawBarChart(viewer, centers, radius = 10) {
  const overlapCounts = getCircleOverlapCounts(centers, radius);

  // Create cylinders at center coordinates with heights representing overlaps.
  const cylinders = centers.map((center, i) => {
    const height = 20 * overlapCounts[i];
    const cylinderGeometry =
        new THREE.CylinderGeometry(radius, radius, radius * 2 + height, 16);
    cylinderGeometry.rotateX(0.5 * Math.PI);
    cylinderGeometry.translate(center[0], center[1], 160 + height / 2);
    return cylinderGeometry;
  });

  const minColor = new THREE.Color(0.0, 1.0, 0.0);
  const midColor = new THREE.Color(1.0, 1.0, 0.0);
  const maxColor = new THREE.Color(1.0, 0.0, 0.0);

  const maxCount = Math.max(...overlapCounts);
  const normalizedCounts = overlapCounts.map((count) => count / maxCount);

  for (const i in cylinders) {
    const cylinder = cylinders[i];

    let color = minColor.clone();
    if (normalizedCounts[i] < 0.5) {
      color = minColor.clone().lerp(midColor, normalizedCounts[i] * 2);
    } else {
      color = midColor.clone().lerp(maxColor, (normalizedCounts[i] - 0.5) * 2);
    }

    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.5,
      transparent: true,
    });

    const mesh = new THREE.Mesh(cylinder, cylinderMaterial);
    viewer.scene.scene.add(mesh);
  }
}

/**
 * Adds ThreeJS cylinders to the scene of the given viewer at the center
 * locations in the given GeoJSON data.
 * @param {!Potree.Viewer} viewer
 * @param {!Array<!GeoJsonDatum>} geoJsonData
 * @param {number]} radius
 */
export function drawCylinderPlot(viewer, geoJsonData, radius = 10) {
  const color = new THREE.Color(0.0, 1.0, 0.0);
  const height = 4;
  const centers = geoJsonData.map((d) => d.center);

  // Create ThreeJS cylinders at every center point in GeoJsonData and render.
  for (const center of centers) {
    const cylinderGeometry =
        new THREE.CylinderGeometry(radius, radius, height, 16);
    cylinderGeometry.rotateX(0.5 * Math.PI);
    cylinderGeometry.translate(center[0], center[1], config.GROUND_Z);

    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: color.clone(),
    });
    const mesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

    viewer.scene.scene.add(mesh);
  }
}

export function drawPathOutlines(viewer, paths) {
  const vectors = paths.map((path) => {
    return path.map((coords) => {
      return [...coords, 160];
    }).reduce((a, b) => [...a, ...b]);
  });

  const lineGeometries = vectors.map((path) => {
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(path);
    return lineGeometry;
  });

  // Semi-transparent green outlines.
  const lineMaterial = new LineMaterial({
    color: 0x00ff00,
    dashSize: 5,
    gapSize: 2,
    linewidth: 6,
    opacity: 0.7,
    resolution: new THREE.Vector2(1000, 1000),
    transparent: true,
  });

  for (const lineGeometry of lineGeometries) {
    const line = new Line2(lineGeometry, lineMaterial);
    viewer.scene.scene.add(line);
  }
}


/**
 * Returns an array of the number of circles with the given radius r overlap
 * with a circle with radius r for each given circle center.
 * Used for aggregation within Potree JS, i.e. rendering bar charts.
 */
function getCircleOverlapCounts(centers, radius = 10) {
  // The maximum distance between the centers of two overlapping circles of
  // equal radius r is 2r.
  const threshold = radius * 2;
  const thresholdSquared = threshold * threshold;

  // Iterate through every center coordinate and 
  return centers.map((center) => {
    let count = 0;
    for (const otherCenter of centers) {
      if (otherCenter === center) {
        continue;
      }

      const dx = (center[0] - otherCenter[0]);
      const dy = (center[1] - otherCenter[1]);
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= thresholdSquared) {
        count++;
      }
    }
    return count;
  });
}

/** Shades all points on gray color scale based on elevation. */
export function shadeEnvironment(pointCloud) {
  const material = pointCloud.material;
  material.activeAttributeName = "elevation";
  material.gradient = [
    [0.0, new THREE.Color(0.090, 0.090, 0.090)],
    [0.1, new THREE.Color(0.180, 0.180, 0.180)],
    [0.2, new THREE.Color(0.271, 0.271, 0.271)],
    [0.3, new THREE.Color(0.365, 0.365, 0.365)],
    [0.4, new THREE.Color(0.455, 0.455, 0.455)],
    [0.5, new THREE.Color(0.545, 0.545, 0.545)],
    [0.6, new THREE.Color(0.635, 0.635, 0.635)],
    [0.7, new THREE.Color(0.729, 0.729, 0.729)],
    [0.8, new THREE.Color(0.820, 0.820, 0.820)],
    [0.9, new THREE.Color(0.910, 0.910, 0.910)],
    [1.0, new THREE.Color(1.000, 1.000, 1.000)],
  ];
  material.elevationRange = [0, 400];
}
