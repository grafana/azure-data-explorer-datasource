import { KustoDBDatasource } from './datasource';
export class KustoDBConfigCtrl {
  static templateUrl = 'partials/config.html';

  current: any;
  suggestUrl: string;
  kustoDbDatasource: any;
  databases: any[];

  /** @ngInject */
  constructor($scope, backendSrv, $q) {
    this.suggestUrl = 'https://yourcluster.kusto.windows.net';
    $scope.getSuggestUrls = () => {
      return [this.suggestUrl];
    };

    if (this.current.id) {
      this.current.url = '/api/datasources/proxy/' + this.current.id;
      this.kustoDbDatasource = new KustoDBDatasource(this.current, backendSrv, $q, null);
      this.getDatabases();
    }
  }

  getDatabases() {
    return this.kustoDbDatasource.getDatabases().then(dbs => {
      this.databases = dbs;
      if (this.databases.length > 0) {
        this.current.jsonData.defaultDatabase = this.current.jsonData.defaultDatabase || this.databases[0].value;
      }
    });
  }
}
