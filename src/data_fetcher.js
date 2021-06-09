/** @abstract */
export class DataFetcher {
  /** @param {string} url */
  constructor(url) {
    this.url = url;
  }

  /**
   * @abstract
   * @return {!Promise<!Object>}
   */
  fetchData() { }
}
