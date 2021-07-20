/**
 * A type definition class purely for documentation of the GeoJsonDatum object
 * used throughout the application.
 */


class GeoJsonDatum {
  /** @type {!Array<number>} */
  let blob;

  /**
   * The center point of the polygon for this datum in Potree coordinate space,
   * expressed in [x, y] format.
   * @type {?Array<number>}
   */
  let center;

  /**
   * The array of coordinates of the polygon for this datum expressed in
   * [latitude, longitude] format.
   * @type {!Array<!Array<number>>}
   */
  let coords;

  /**
   * The GeoJSON feature for this datum.
   * @type {!GeoJSON.Feature}
   */
  let feature;

  /**
   * The joined DETER CSV datum corresponding to this datum.
   * @type {?Array<(string|number|null)>}
   */
  let record;
}
