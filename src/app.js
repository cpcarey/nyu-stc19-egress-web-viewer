import * as THREE from '../libs/three.js/build/three.module.js';
import {Line2} from '../libs/three.js/lines/Line2.js';
import {LineGeometry} from '../libs/three.js/lines/LineGeometry.js';
import {LineMaterial} from '../libs/three.js/lines/LineMaterial.js';

import {DataStore} from './data_store.js';

// Constants for loading data.
const CODE = '22242';
const URL_CLOUD = `http://localhost:1234/data/${CODE}.las_converted/metadata.json`;

// Constants for processing data.
const CLIPPING_SPHERE_THRESHOLD = 50;
const LAT_MIN = 40.8391;
const LAT_MAX = 40.8322;
const LON_MIN = -73.8618;
const LON_MAX = -73.8527;

// Custom offsets for the particular scene.
const CAMERA_POSITION_OFFSET_X = -500;
const CAMERA_POSITION_OFFSET_Y = 500;
const CAMERA_POSITION_Z = 800;
const CAMERA_LOOK_AT_OFFSET_X = -100;
const CAMERA_LOOK_AT_OFFSET_Y = 1000;
const CAMERA_LOOK_AT_Z = 100;

function render(geoJsonData, rendererConfig) {
  const viewer =
      new Potree.Viewer(
          document.getElementById('potree_render_area'),
          {rendererConfig});
  viewer.setEDLEnabled(true);
  viewer.setFOV(60);
  viewer.setPointBudget(2_000_000);

  Potree.loadPointCloud(URL_CLOUD, CODE, (e) => {
    viewer.scene.addPointCloud(e.pointcloud);
    e.pointcloud.position.z = 0;

    const material = e.pointcloud.material;
    material.size = 3;
    material.pointSizeType = Potree.PointSizeType.FIXED;
    material.activeAttributeName = 'classification';

    // Get the minimum and maximum corner points of the scene.
    const min = e.pointcloud.position;
    const delta = e.pointcloud.boundingBox.max;
    const max = min.clone().add(delta);

    // Get the center point and another reference point for viewing.
    const mid = min.clone().add(max).divideScalar(2);
    const q1 = min.clone().add(mid).divideScalar(2);

    const cameraPosition =
        new THREE.Vector3(
            q1.x + CAMERA_POSITION_OFFSET_X,
            q1.y + CAMERA_POSITION_OFFSET_Y,
            CAMERA_POSITION_Z);
    const cameraLookAt =
        new THREE.Vector3(
            q1.x + CAMERA_LOOK_AT_OFFSET_X,
            q1.y + CAMERA_LOOK_AT_OFFSET_Y,
            CAMERA_LOOK_AT_Z);

    viewer.scene.view.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z);
    viewer.scene.view.lookAt(
        cameraLookAt.x,
        cameraLookAt.y,
        cameraLookAt.z);

    for (const datum of geoJsonData) {
      datum.blob = convertLatLonToCoordSpace(datum.coords, min, max);
      datum.center = getPolygonCenter(datum.blob);
    }

    // Draw the bar chart if the URL contains the query param v=bar.
    if (hasQueryParam('v', 'bar')) {
      drawBarChart(viewer, centers);
    } else if (hasQueryParam('v', 'path')) {
      drawPathOutlines(viewer, blobs);
    } else {
      drawClippingSpheres(viewer, geoJsonData);
    }

    shadeEnvironment(e.pointcloud);
  });
};

function convertLatLonToCoordSpace(coords, coordSpaceMin, coordSpaceMax) {
  return coords.map(([lon, lat]) => {
    return latLonToCoordSpace(
      coordSpaceMin.x,
      coordSpaceMax.x,
      coordSpaceMin.y,
      coordSpaceMax.y,
      LON_MIN,
      LON_MAX,
      LAT_MIN,
      LAT_MAX,
      parseFloat(lon),
      parseFloat(lat),
    );
  });
}

/**
 * Draws a 3D bar chart visualization representing the number of overlaps at the
 * given centers within a given radius threshold.
 */
function drawBarChart(viewer, centers, radius = 10) {
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

function drawClippingSpheres(
    viewer, data, radius=CLIPPING_SPHERE_THRESHOLD) {
  for (const datum of data) {
    const {center} = datum;
    const volume = new Potree.SphereVolume();
    if (datum.record) {
      volume.category = datum.record[16];
    }
    volume.scale.set(radius, radius, radius);
    volume.position.set(center[0], center[1], 160);
    volume.visible = false;
    viewer.scene.addVolume(volume);
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

/**
 * Returns an array of coordinates representing the array of bounding box
 * centers of the given polygons.
 * @param polygons Groups of coordinates in Potree coordinate space forming the
 *     outlines of polygons
 */
function getPolygonCenter(polygon) {
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

function hasQueryParam(query, value) {
  return Boolean(window.location.search.match(`${query}=${value}`));
}

/** Shades all points on gray color scale based on elevation. */
function shadeEnvironment(pointCloud) {
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

function drawPathOutlines(viewer, paths) {
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

function latLonToCoordSpace(xMin, xMax, yMin, yMax, lonMin, lonMax, latMin, latMax, lon, lat) {
  const dx = xMax - xMin;
  const dy = yMax - yMin;
  const dLon = lonMax - lonMin;
  const dLat = latMax - latMin;

  const x = ((lon - lonMin) / dLon) * dx + xMin;
  const y = yMax - ((lat - latMin) / dLat) * dy;
  return [x, y];
}

let circlesData = null;
let csvData = null;
let rendererConfig = {dimension: null};

const dataStore = new DataStore();

async function run() {
  const geoJsonData = await dataStore.getGeoJsonData();
  render(geoJsonData, rendererConfig);
}

// TODO: This is not the correct to reset the GL context.
function reset() {
  const el = document.querySelector('#potree_render_area');
  const {parentElement} = el;

  const gl = el.querySelector('canvas').getContext('webgl');
  gl.clear(gl.DEPTH_BUFFER_BIT);

  parentElement.removeChild(el);
  const newEl = document.createElement('div');
  newEl.setAttribute('id', 'potree_render_area');
  parentElement.appendChild(newEl);
}

window.renderNoDimension = async () => {
  const geoJsonData = await dataStore.getGeoJsonData();
  rendererConfig.dimension = null;
  reset();
  render(geoJsonData, rendererConfig);
}

window.renderGenderDimension = async () => {
  const geoJsonData = await dataStore.getGeoJsonData();
  rendererConfig.dimension = 'gender';
  reset();
  render(geoJsonData, rendererConfig);
};

document.addEventListener('DOMContentLoaded', run);
