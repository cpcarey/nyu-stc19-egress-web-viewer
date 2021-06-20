import * as THREE from '../libs/three.js/build/three.module.js';
import {Line2} from '../libs/three.js/lines/Line2.js';
import {LineGeometry} from '../libs/three.js/lines/LineGeometry.js';
import {LineMaterial} from '../libs/three.js/lines/LineMaterial.js';

import {DataStore} from './data_store.js';
import * as constants from './constants.js';
import * as drawer from './drawer.js';
import * as util from './util.js';
import {Dimension, DIMENSION_NAMES} from './dimension.js';

let viewer;

function init() {
  viewer =
      new Potree.Viewer(
          document.getElementById('potree_render_area'));
  viewer.setEDLEnabled(true);
  viewer.setFOV(60);
  viewer.setPointBudget(2_000_000);
}

function render(geoJsonData) {
  Potree.loadPointCloud(constants.URL_CLOUD, constants.CODE, (e) => {
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
            q1.x + constants.CAMERA_POSITION_OFFSET_X,
            q1.y + constants.CAMERA_POSITION_OFFSET_Y,
            constants.CAMERA_POSITION_Z);
    const cameraLookAt =
        new THREE.Vector3(
            q1.x + constants.CAMERA_LOOK_AT_OFFSET_X,
            q1.y + constants.CAMERA_LOOK_AT_OFFSET_Y,
            constants.CAMERA_LOOK_AT_Z);

    viewer.scene.view.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z);
    viewer.scene.view.lookAt(
        cameraLookAt.x,
        cameraLookAt.y,
        cameraLookAt.z);

    for (const datum of geoJsonData) {
      datum.blob = util.convertLatLonsToCoordSpace(datum.coords, min, max);
      datum.center = getPolygonCenter(datum.blob);
    }

    drawClippingSpheres(viewer, geoJsonData);
    drawer.shadeEnvironment(e.pointcloud);
  });
};

function drawClippingSpheres(
    viewer, data, dimension=null, radius=constants.CLIPPING_SPHERE_THRESHOLD) {

  const dimensionValueMap = new Map();
  for (const datum of data) {
    const {center} = datum;
    const volume = new Potree.PointVolume();

    if (datum.record && dimension !== null) {
      const dimensionValue = datum.record[dimension];
      if (!dimensionValueMap.has(dimensionValue)) {
        dimensionValueMap.set(dimensionValue, dimensionValueMap.size);
      }
      volume.category = dimensionValueMap.get(dimensionValue);
    }

    volume.scale.set(radius, radius, radius);
    volume.position.set(center[0], center[1], 160);
    volume.visible = false;

    viewer.scene.addHeatPoint(volume);
  }

  drawLegend(dimension, [...dimensionValueMap.keys()]);
}

function drawLegend(dimension, dimensionValues) {
  const legendEl = document.querySelector('.legend');
  const valuesEl = legendEl.querySelector('.dimension-values');
  while (valuesEl.firstChild) {
    valuesEl.removeChild(valuesEl.firstChild);
  }
  for (let i = 0; i < dimensionValues.length; i++) {
    const valueEl = document.createElement('li');
    valueEl.classList.add('dimension-value');
    valueEl.classList.add(`segment-${i}`);
    valueEl.innerHTML = dimensionValues[i];
    valuesEl.appendChild(valueEl);
  }

  if (dimensionValues.length) {
    legendEl.style.visibility = 'visible';
  }
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



let circlesData = null;
let csvData = null;

const dataStore = new DataStore();

async function run() {
  init();
  const geoJsonData = await dataStore.getGeoJsonData();
  render(geoJsonData);
}

function reset(geoJsonData) {
  while (viewer.scene.volumes.length) {
    viewer.scene.removeVolume(viewer.scene.volumes[0]);
  }
}

window.renderDimension = async (dimension) => {
  const geoJsonData = await dataStore.getGeoJsonData();
  reset(geoJsonData);
  drawClippingSpheres(viewer, geoJsonData, dimension);
};

window.renderNoDimension = () => {
  renderDimension(null);
};

window.renderGenderDimension = () => {
  renderDimension(Dimension.GENDER);
};

document.addEventListener('DOMContentLoaded', run);
