// Custom offsets for the particular scene.
export const CAMERA_POSITION_OFFSET_X = -500;
export const CAMERA_POSITION_OFFSET_Y = 500;
export const CAMERA_POSITION_Z = 800;
export const CAMERA_LOOK_AT_OFFSET_X = -100;
export const CAMERA_LOOK_AT_OFFSET_Y = 1000;
export const CAMERA_LOOK_AT_Z = 100;

// Constants for finding data to retrieve.
export const HOST = 'http://localhost:5005';
export const DATA_PATH = `${HOST}/data`;
export const LAS_TILE_CODE = '22242';

// Constants for loading data.
export const CSV_DATA_URL = `${DATA_PATH}/all_records_dta_09142020.csv`;
export const GEO_JSON_DATA_URL =
    `${DATA_PATH}/circles_20200330CH_ChrisJose.geojson`;
export const URL_CLOUD =
    `${DATA_PATH}/${LAS_TILE_CODE}.las_converted/metadata.json`;

// Constants for processing data.
export const CLIPPING_SPHERE_RADIUS = 50;

// Geographic constants.
export const GROUND_Z = 160;
export const LAT_MIN = 40.8391;
export const LAT_MAX = 40.8322;
export const LON_MIN = -73.8618;
export const LON_MAX = -73.8527;

// Configuration for what the application should render.
export const RENDERING_CONFIG = {
  // Set to true to load GeoJson data.
  fetchGeoJsonData: false,
};
