import {DataFetcher} from './data_fetcher.js';

export class GeoJsonDataFetcher extends DataFetcher {
  /** @return {!Promise<string>} */
  fetchData() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', this.url)
      request.onload = function() {
        const rejectWithStatus = () => {
          reject({
            status: this.status,
            statusText: request.statusText,
          });
        };

        if (this.status >= 200 && this.status < 300) {
          resolve(parseGeoJsonResponse(this.response));
        } else {
          rejectWithStatus();
        }
      };
      request.onerror = function() {
        rejectWithStatus();
      };
      request.send();
    });
  }
}

/** @param {string} response */
function parseGeoJsonResponse(response) {
  const json = JSON.parse(response);
  const circles = json.features.map((feature) => {
    const coords = feature.geometry.coordinates[0];
    return {
      feature,
      coords: coords[0],
    };
  });

  // Strip suffixes from name in order to match to DETER data.
  for (const feature of json.features) {
    feature.properties['Name'] = feature.properties['Name'].replace(/_auto/g, '');
    feature.properties['Name'] = feature.properties['Name'].replace(/_merged/g, '');
  }

  return circles;
}
