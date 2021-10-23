import {CsvDataFetcher} from './csv_data_fetcher.js';
import {GeoJsonDataFetcher} from './geo_json_data_fetcher.js';

import {CSV_DATA_URL, GEO_JSON_DATA_URL} from '../config.js';

export class DataStore {
  /** @private {{csvData: ?Array<!Object>, geoJsonData: ?Array<!Object>}} */
  cache = {
    csvData: null,
    geoJsonData: null,
  };

  /** @private {!CsvDataFetcher} */
  csvDataFetcher = new CsvDataFetcher(CSV_DATA_URL);

  /** @private {!GeoJsonDataFetcher} */
  geoJsonDataFetcher = new GeoJsonDataFetcher(GEO_JSON_DATA_URL);

  async getCsvData() {
    if (this.cache.csvData === null) {
      this.cache.csvData = await this.csvDataFetcher.fetchData();
    }

    return this.cache.csvData;
  }

  async getGeoJsonData() {
    if (this.cache.geoJsonData === null) {
      this.cache.geoJsonData = await this.geoJsonDataFetcher.fetchData();
      mergeData(await this.getCsvData(), this.cache.geoJsonData);
    }

    return this.cache.geoJsonData;
  }
}

/**
 * @param {!Array<!Object>} csvData
 * @param {!Array<!Object>} geoJsonData
 */
function mergeData(csvData, geoJsonData) {
  for (const circle of geoJsonData) {
    const id = circle.feature.properties['Name'];
    circle.record = csvData.records.find((record) => record[1] === id);
  }
}

