/**
 * A type definition class purely for documentation of the GeoJsonDatum object
 * used throughout the application.
 */


class GeoJsonDatum {
  constructor() {
    /** @type {!Array<number>} */
    this.blob;

    /**
     * The center point of the polygon for this datum in Potree coordinate space,
     * expressed in [x, y] format.
     * @type {?Array<number>}
     */
    this.center;

    /**
     * The array of coordinates of the polygon for this datum expressed in
     * [latitude, longitude] format.
     * @type {!Array<!Array<number>>}
     */
    this.coords;

    /**
     * The GeoJSON feature for this datum.
     * @type {!GeoJSON.Feature}
     */
    this.feature;

    /**
     * The joined DETER CSV datum corresponding to this datum.
     * @type {?Array<(string|number|null)>}
     */
    this.record;
  }
}
