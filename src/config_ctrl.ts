import { KustoDBDatasource } from './datasource';
import config from 'grafana/app/core/config';
import { isVersionGtOrEq } from './version';

export class KustoDBConfigCtrl {
  static templateUrl = 'partials/config.html';

  current: any;
  suggestUrl: string;
  kustoDbDatasource: any;
  databases: any[] = [];
  hasRequiredGrafanaVersion: boolean;

  /** @ngInject */
  constructor($scope, backendSrv, $q) {
    this.hasRequiredGrafanaVersion = this.hasMinVersion();
    this.suggestUrl = 'https://yourcluster.kusto.windows.net';
    $scope.getSuggestUrls = () => {
      return [this.suggestUrl];
    };

    if (this.current.id) {
      this.current.url = 'api/datasources/proxy/' + this.current.id;
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

  hasMinVersion(): boolean {
    return (
      isVersionGtOrEq(config.buildInfo.latestVersion, '5.3') ||
      config.buildInfo.version === '5.3.0-beta1' ||
      config.buildInfo.version === '5.3.0-pre1'
    );
  }

  showMinVersionWarning() {
    return !this.hasRequiredGrafanaVersion;
  }
}
