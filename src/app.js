import * as THREE from '../libs/three.js/build/three.module.js';
import {Line2} from '../libs/three.js/lines/Line2.js';
import {LineGeometry} from '../libs/three.js/lines/LineGeometry.js';
import {LineMaterial} from '../libs/three.js/lines/LineMaterial.js';

import {DataStore} from './data_store/data_store.js';
import * as constants from './util/constants.js';
import * as drawer from './util/drawer.js';
import * as util from './util/util.js';
import {Dimension, DIMENSION_NAMES} from './util/dimension.js';

const dataStore = new DataStore();
let viewer;

/**
 * Initializes the Potree Viewer with default settings.
 */
function initPotreeViewer() {
  // Initialize Potree Viewer by providing it with the page element to attach
  // to.
  const potreeRenderAreaEl = document.getElementById('potree_render_area');
  viewer = new Potree.Viewer(potreeRenderAreaEl);

  // Set Potree recommended defaults.
  viewer.setEDLEnabled(true);
  viewer.setFOV(60);
  viewer.setPointBudget(2_000_000);
}

/**
 * Renders the Potree point cloud visualization with the given joined GeoJSON
 * data to project onto the point cloud as a 3D heatmap.
 * @param {!Array<!GeoJsonDatum>} geoJsonData The data array of GeoJSON
 *   behavioral point polygon features and their corresponding DETER CSV
 *   records.
 */
function renderPotreeVisualization(geoJsonData) {
  Potree.loadPointCloud(constants.URL_CLOUD, constants.CODE, (e) => {
    viewer.scene.addPointCloud(e.pointcloud);
    e.pointcloud.position.z = 0;

    const material = e.pointcloud.material;
    material.size = 3;
    material.pointSizeType = Potree.PointSizeType.FIXED;
    material.activeAttributeName = 'classification';

    // Get the minimum and maximum corner points of the scene. This is used to:
    //  (1) Position the camera
    //  (2) Transform lat/lon coordinates into the Potree coordinate space.
    const min = e.pointcloud.position;
    const delta = e.pointcloud.boundingBox.max;
    const max = min.clone().add(delta);

    // Get the center point and another reference point for viewing.
    const mid = min.clone().add(max).divideScalar(2);
    const q1 = min.clone().add(mid).divideScalar(2);

    // Position and point the camera.
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

    // Calculate and store the centers of the GeoJSON polygons.
    for (const datum of geoJsonData) {
      datum.blob = util.convertLatLonsToCoordSpace(datum.coords, min, max);
      datum.center = util.getPolygonCenter(datum.blob);
    }

    // Perform heatmap and elevation shading.
    drawClippingSpheres(viewer, geoJsonData, Dimension.GENDER);
    drawer.shadeEnvironment(e.pointcloud);
  });
};

/**
 * @param {!Potree.Viewer} viewer The Potree viewer
 * @param {!Array<!GeoJsonDatum>} geoJsonData The data array of GeoJSON
 *     behavioral point polygon features and their corresponding DETER CSV
 *     records.
 * @param {?Dimension=} The Dimension with which to segment the GeoJSON data by,
 *     formally the attribute column index in the DETER CSV data,
 *     e.g. Dimension.GENDER
 * @param {number=} The radius of the Potree clipping sphere to apply to each
 *     GeoJSON behavioral point for heatmap accumulation.
 */
function drawClippingSpheres(
    viewer, geoJsonData, dimension=null,
    radius=constants.CLIPPING_SPHERE_RADIUS) {

  /**
   * A map between the observed dimension value and its assigned segment index,
   * e.g. {"Female": 0, "Male": 1}.
   * @type {!Map<!(string|number|null), number>}
   */
  const dimensionValueToSegmentIndexMap = new Map();

  // Create a Potree clipping sphere for each behavorial point.
  for (const geoJsonDatum of geoJsonData) {
    // Create a Potree PointVolume object to pass information to the Potree
    // shader with. PointVolume is a custom type modeled after SphereVolume,
    // but with unneeded features removed for improved performance.
    const volume = new Potree.PointVolume();

    if (dimension !== null && datum.record) {
      // Extract the dimension value from the datum's record based on the
      // attribute column index of the given dimension by which to segment
      // data, e.g. "Female", "Male".
      const dimensionValue = datum.record[dimension];

      // Add the dimension value to the segment index map if it has not yet
      // been observed and assign it the next unused segment index, which is
      // determined by the size of the map, e.g. if "Female" is observed first,
      // assign "Female": 0; then if "Male" is observed assign "Male": 1.
      if (!dimensionValueToSegmentIndexMap.has(dimensionValue)) {
        dimensionValueToSegmentIndexMap.set(
            dimensionValue, dimensionValueToSegmentIndexMap.size);
      }

      // Mark the category of this behavioral point as the segment index
      // corresponding to its dimension value.
      volume.category = dimensionValueToSegmentIndexMap.get(dimensionValue);
    }

    const {center} = geoJsonDatum;
    // The constant GROUND_Z_VALUE is set as the approximate constant z-value of
    // ground level in the observed region.
    volume.position.set(center[0], center[1], constants.GROUND_Z_VALUE);
    volume.scale.set(radius, radius, radius);
    volume.visible = false;

    // Potree was modified to treat these clipping spheres separately for
    // improved peformance; they do not need extra features that Potree
    // clipping spheres typically have (e.g. boundary rendering).
    viewer.scene.addHeatPoint(volume);
  }

  // Update the legend to reflect the dimension and dimension values observed in
  // the data.
  drawLegend(dimension, [...dimensionValueMap.keys()]);
}

/**
 * @param {!Dimension} dimension The Dimension by which data were segmented,
 *     e.g. Dimension.GENDER
 * @param {!Array<(string|number|null)>} dimensionValues The dimension values
 *     indexed by the segment index for which they corresponding to,
 *     e.g. ["Female", "Male"]
 */
function drawLegend(dimension, dimensionValues) {
  // Replace the inner HTML content of the corresponding legend HTML elements
  // the values and display names extracted from the data.
  const labelDimensionValue1 =
      document.querySelector('.label-dimension-value-1');
  const labelDimensionValue2 =
      document.querySelector('.label-dimension-value-2');
  const labelDimension =
      document.querySelector('.label-dimension');
  labelDimensionValue1.innerHTML = dimensionValues[0];
  labelDimensionValue2.innerHTML = dimensionValues[1];
  labelDimension.innerHTML = DIMENSION_NAMES.get(dimension);
}

/**
 * Resets the Potree viewer by removing all of the Potree.PointVolume volumes
 * which might have been added previously.
 */
function resetPotreeViewer() {
  while (viewer.scene.volumes.length) {
    viewer.scene.removeVolume(viewer.scene.volumes[0]);
  }
}

/**
 * Initializes and starts the visualization application.
 */
async function run() {
  initPotreeViewer();

  // Extract and process GeoJSON behavioral data necessary for visualization.
  const geoJsonData = await dataStore.getGeoJsonData();

  // Render the Potree visualization with the processed GeoJSON data.
  renderPotreeVisualization(geoJsonData);
}

document.addEventListener('DOMContentLoaded', run);

////////////////////////////////////////////////////////////////////////////////

/** Renders the Potree visualization with the given dimension. */
window.renderDimension = async (dimension) => {
  const geoJsonData = await dataStore.getGeoJsonData();
  resetPotreeViewer(geoJsonData);
  drawClippingSpheres(viewer, geoJsonData, dimension);
};

window.renderNoDimension = () => {
  renderDimension(null);
};

window.renderGenderDimension = () => {
  renderDimension(Dimension.GENDER);
};

document.querySelector('.selector-dimension')
  .addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    console.log('Render Dimension: ', value);
    // TODO: Change this function to render the selected dimension.
  });

// TODO: Add a way for the user to render no dimension.
