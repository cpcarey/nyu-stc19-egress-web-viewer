# About

A viewer for 3D visualization of NYU-collected data on egress behavior from NYC COVID-19 exposed health facilities.

![Screenshot of Client Application](./docs/screenshot.png)

# Development

## Setting up the environment

 * Run `npm install` in the repo directory
 * Create a directory named `data` in the repo directory

## Adding data

Data is tracked outside of GitHub due to size. Data loaded into the application include:

### Point cloud data

A point cloud tile converted from the LAS file format to the Potree format using [PotreeConverter](https://github.com/potree/PotreeConverter). For example, the initial version of this application used point cloud tile 22242 from [NYC Open Data and NYS GIS](https://data.cityofnewyork.us/City-Government/Topobathymetric-LiDAR-Data-2017-/7sc8-jtbz). The point cloud tile LAS file was converted using PotreeConverter which produced a directory named `22242.las_converted` contained converted point cloud data. This entire directory was then placed into the `data` directory and referenced by the application in the `URL_CLOUD` field in [`config.js`](https://github.com/cpcarey/nyu-stc19-egress-web-viewer/blob/main/src/config.js). Change the value of `URL_CLOUD` (or `LAS_TILE_CODE`) to direct the application to load a different converted point cloud tile directory.

Additionally, the `LAT_MIN`, `LAT_MAX`, `LON_MIN` and `LON_MAX` values in [`config.js`](https://github.com/cpcarey/nyu-stc19-egress-web-viewer/blob/main/src/config.js) should be set to the latitude and longitude coordinates of the point cloud tile bounds (EPSG:4326 / WSG 84) in order to project other latitude/longitude coordinate data into the visualization space.

## Running

 * `npm start`
 * Go to `http://localhost:5005/src`

## Modifying

 * Modify `src/index.html` and `src/app.js`

# Credits

* [potree](https://https://github.com/potree/potree) for point cloud rendering

# Authors

 * Chris Carey
 * José Romero
