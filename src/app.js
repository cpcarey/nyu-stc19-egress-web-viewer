import * as THREE from '../libs/three.js/build/three.module.js';
import {Line2} from '../libs/three.js/lines/Line2.js';
import {LineGeometry} from '../libs/three.js/lines/LineGeometry.js';
import {LineMaterial} from '../libs/three.js/lines/LineMaterial.js';

import {DataStore} from './data_store/data_store.js';
import * as config from './config.js';
import * as controls from './controls/controls.js';
import * as drawer from './util/drawer.js';
import * as util from './util/util.js';
import {Attribute, ATTRIBUTE_NAMES} from './util/attribute.js';

class App {
  constructor() {
    this.dataStore = new DataStore();
    this.viewer = null;
  }

  /** Initializes and starts the visualization application. */
  async run() {
    this.viewer = this.initPotreeViewer();

    // Extract and process GeoJSON behavioral data necessary for visualization.
    const geoJsonData =
        config.RENDERING_CONFIG.fetchGeoJsonData
            ? await this.dataStore.getGeoJsonData()
            : [];

    // Render the Potree visualization with the processed GeoJSON data.
    this.renderPotreeVisualization(geoJsonData);
  }

  /** Initializes the Potree Viewer with default settings. */
  initPotreeViewer() {
    // Initialize Potree Viewer by providing it with the page element to attach
    // to.
    const potreeRenderAreaEl = document.getElementById('potree_render_area');
    const viewer = new Potree.Viewer(potreeRenderAreaEl);

    // Set Potree recommended defaults.
    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(10_000_000);
    return viewer;
  }

  /**
   * Renders the Potree point cloud visualization with the given joined GeoJSON
   * data to project onto the point cloud as a 3D heatmap.
   * @param {!Array<!GeoJsonDatum>} geoJsonData The data array of GeoJSON
   *   behavioral point polygon features and their corresponding DETER CSV
   *   records.
   */
  renderPotreeVisualization(geoJsonData) {
    Potree.loadPointCloud(config.POINT_CLOUD_URL, config.CODE, (e) => {
      this.viewer.scene.addPointCloud(e.pointcloud);
      e.pointcloud.position.z = 0;

      const material = e.pointcloud.material;
      material.size = 3;
      material.pointSizeType = Potree.PointSizeType.FIXED;
      material.activeAttributeName = 'classification';

      // Get the minimum and maximum corner points of the scene. This is used
      // to:
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
              q1.x + config.CAMERA_POSITION_OFFSET_X,
              q1.y + config.CAMERA_POSITION_OFFSET_Y,
              config.CAMERA_POSITION_Z);
      const cameraLookAt =
          new THREE.Vector3(
              q1.x + config.CAMERA_LOOK_AT_OFFSET_X,
              q1.y + config.CAMERA_LOOK_AT_OFFSET_Y,
              config.CAMERA_LOOK_AT_Z);
      this.viewer.scene.view.position.set(
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z);
      this.viewer.scene.view.lookAt(
          cameraLookAt.x,
          cameraLookAt.y,
          cameraLookAt.z);

      // Calculate and store the centers of the GeoJSON polygons.
      for (const datum of geoJsonData) {
        datum.blob = util.convertLatLonsToCoordSpace(datum.coords, min, max);
        datum.center = util.getPolygonCenter(datum.blob);
      }

      // Render density plot.
      if (config.RENDERING_CONFIG.renderDensityPlot) {
        this.drawDensitySpheres(geoJsonData, Attribute.GENDER);
      }

      if (config.RENDERING_CONFIG.renderCylinderPlot) {
        drawer.drawCylinderPlot(this.viewer, geoJsonData);
      }

      // Monochromatically shade point cloud points by elevation.
      drawer.shadeEnvironment(e.pointcloud);
    });
  }

  getAttributeClasses(attribute, geoJsonData) {
    /**
     * A map between the observed attribute value and its assigned segment
     * index, e.g. {"Female": 0, "Male": 1}.
     * @type {!Map<!(string|number|null), number>}
     */
    const attributeValueToSegmentIndexMap = new Map();
    const attributeValueCountMap = new Map();

    for (const datum of geoJsonData) {
      if (attribute !== null && datum.record) {
        // Extract the attribute value from the geoJsonDatum's record based on
        // the attribute column index of the given attribute by which to
        // segment data, e.g. "Female", "Male".
        const attributeValue = datum.record[attribute];

        // Ignore N/A values for now.
        if (attributeValue == 'NA') {
          continue;
        }

        // Add the attribute value to the segment index map if it has not yet
        // been observed and assign it the next unused segment index, which is
        // determined by the size of the map, e.g. if "Female" is observed
        // first, assign "Female": 0; then if "Male" is observed assign "Male":
        // 1.
        if (!attributeValueToSegmentIndexMap.has(attributeValue)) {
          attributeValueToSegmentIndexMap.set(
              attributeValue, attributeValueToSegmentIndexMap.size);
        }

        if (!attributeValueCountMap.has(attributeValue)) {
          attributeValueCountMap.set(attributeValue, 0);
        }
        attributeValueCountMap.set(
            attributeValue, attributeValueCountMap.get(attributeValue) + 1);
      }
    }

    return {
      attributeValueToSegmentIndexMap,
      attributeValueCountMap,
    };
  }

  /**
   * @param {!Array<!GeoJsonDatum>} geoJsonData The data array of GeoJSON
   *     behavioral point polygon features and their corresponding DETER CSV
   *     records.
   * @param {?Attribute=} The Attribute with which to segment the GeoJSON data
   *     by, formally the attribute column index in the DETER CSV data, e.g.
   *     Attribute.GENDER
   * @param {number=} The radius of the Potree clipping sphere to apply to each
   *     GeoJSON behavioral point for heatmap accumulation.
   */
  drawDensitySpheres(
      geoJsonData, attribute=null,
      radius=config.DENSITY_SPHERE_DEFAULT_RADIUS) {

    const {attributeValueToSegmentIndexMap, attributeValueCountMap} =
        this.getAttributeClasses(attribute, geoJsonData);

    const sortedAttributeValues =
        [...attributeValueCountMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0])

    controls.updateAttributeClasses(
        attribute, sortedAttributeValues, (attributeClasses) => {
          this.resetPotreeViewer();
          this.updateDensitySpheres(
              geoJsonData, attribute, attributeValueToSegmentIndexMap,
              attributeValueCountMap, attributeClasses, radius);
        });

    const topAttributeValues = sortedAttributeValues.slice(0, 2);

    this.updateDensitySpheres(
        geoJsonData, attribute, attributeValueToSegmentIndexMap,
        attributeValueCountMap, topAttributeValues, radius);
  }

  updateDensitySpheres(
      geoJsonData, attribute, attributeValueToSegmentIndexMap,
      attributeValueCountMap, selectedAttributeValues, radius) {

    // Create a Potree clipping sphere for each behavorial point.
    for (const datum of geoJsonData) {
      // Create a Potree DensitySphereVolume object to pass information to the
      // Potree shader with. DensitySphereVolume is a custom type modeled after
      // SphereVolume, but with unneeded features removed for improved
      // performance.
      const volume = new Potree.DensitySphereVolume();

      if (attribute !== null && datum.record) {
        // Mark the attribute class of this behavioral point as the segment
        // index corresponding to its attribute value.
        const attributeValue = datum.record[attribute];

        const attributeClass = selectedAttributeValues.indexOf(attributeValue);
        // If this datum is not in the top 2, do not add.
        if (attributeClass === -1) {
          continue;
        }
        volume.attributeClass = attributeClass;
      }

      const {center} = datum;
      // The constant GROUND_Z_VALUE is set as the approximate constant z-value
      // of ground level in the observed region.
      volume.scale.set(radius, radius, radius);
      volume.position.set(center[0], center[1], config.GROUND_Z);
      volume.visible = false;

      // Potree was modified to treat these density spheres separately for
      // improved peformance; they do not need extra features that Potree
      // clipping spheres typically have (e.g. boundary rendering).
      this.viewer.scene.addDensitySphere(volume);
    }

    // Update the legend to reflect the attribute and attribute values observed
    // in the data.
    const keys = selectedAttributeValues;
    this.drawLegend(attribute, keys);
  }

  /**
   * @param {?Attribute} attribute The Attribute by which data were segmented,
   *     e.g. Attribute.GENDER
   * @param {!Array<(string|number|null)>} attributeValues The attribute values
   *     indexed by the segment index for which they corresponding to,
   *     e.g. ["Female", "Male"]
   */
  drawLegend(attribute, attributeValues) {
    if (!config.RENDERING_CONFIG.renderMultivariateDensityPlot) {
      return;
    }

    // Show/hide color scale based on whether a attribute is provided.
    const colorScaleEl = document.querySelector('.color-scale-container');
    colorScaleEl.style.visibility = (attribute === null) ? 'hidden' : 'visible';

    // Replace the inner HTML content of the corresponding legend HTML elements
    // the values and display names extracted from the data.
    const labelAttributeValue1 =
        document.querySelector('.label-attribute-value-1');
    const labelAttributeValue2 =
        document.querySelector('.label-attribute-value-2');
    const labelAttribute =
        document.querySelector('.label-attribute');
    labelAttributeValue1.innerHTML = attributeValues[0];
    labelAttributeValue2.innerHTML = attributeValues[1];
    labelAttribute.innerHTML = ATTRIBUTE_NAMES.get(attribute);
  }

  /**
   * Resets the Potree viewer by removing all of the Potree.DensitySphere volumes
   * which might have been added previously.
   */
  resetPotreeViewer() {
    while (this.viewer.scene.densitySpheres.length) {
      this.viewer.scene.removeDensitySphere(
          this.viewer.scene.densitySpheres[0]);
    }
  }

  async renderAttribute(attribute) {
    const geoJsonData = await this.dataStore.getGeoJsonData();
    this.resetPotreeViewer(geoJsonData);
    this.drawDensitySpheres(geoJsonData, attribute);
  }
}


const app = new App();
document.addEventListener('DOMContentLoaded', () => app.run());

////////////////////////////////////////////////////////////////////////////////

/** Renders the Potree visualization with the given attribute. */
window.renderAttribute = async (attribute) => {
  app.renderAttribute(attribute);
};

window.renderNoAttribute = () => {
  renderAttribute(null);
};

document.querySelector('.selector-attribute').value = '16';

document.querySelector('.selector-attribute')
    .addEventListener('change', (e) => {
      const value = parseInt(e.target.value);
      if (value === Attribute.NO_ATTRIBUTE) {
        renderNoAttribute();
      }
      if (value !== Attribute.NO_ATTRIBUTE) {
        renderAttribute(value);
      }
    });

document.querySelector('.select-attribute-class-1')
    .addEventListener('change', (e) => {
      controls.handleSelectAttributeClassChange(e, 0);
    });

document.querySelector('.select-attribute-class-2')
    .addEventListener('change', (e) => {
      controls.handleSelectAttributeClassChange(e, 1);
    });

window.setDensityKernelRadius = function(radius) {
  app.viewer.pRenderer.densityKernelRadius = radius;
}

const rangeKdr = document.getElementById('range-kdr');
rangeKdr.addEventListener('input', (e) => {
  app.viewer.pRenderer.densityKernelRadius = parseInt(e.target.value) / 100;
});

window.setDensityKernelMax = function(max) {
  app.viewer.pRenderer.densityKernelMax = max;
}

const rangeKdm = document.getElementById('range-kdm');
rangeKdm.addEventListener('input', (e) => {
  app.viewer.pRenderer.densityKernelMax = parseInt(e.target.value) / 100;
});
