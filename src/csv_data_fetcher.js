import {DataFetcher} from './data_fetcher.js';

export class CsvDataFetcher extends DataFetcher {
  /** @return {!Promise<string>} */
  fetchData() {
    return new Promise((resolve, reject) => {
      CSV
        .fetch({url: this.url})
        .done((dataset) => resolve(dataset))
        .catch(() => reject());
    });
  }
}
