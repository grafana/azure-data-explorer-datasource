import { AdxDataSource } from './datasource';
import config from 'grafana/app/core/config';
import { isVersionGtOrEq } from './version';

export class KustoDBConfigCtrl {
  static templateUrl = 'partials/config.html';

  current: any;
  suggestUrl: string;
  datasource: AdxDataSource | undefined;
  databases: any[];
  hasRequiredGrafanaVersion: boolean;

  /** @ngInject */
  constructor($scope) {
    this.hasRequiredGrafanaVersion = this.hasMinVersion();
    this.suggestUrl = 'https://yourcluster.kusto.windows.net';
    $scope.getSuggestUrls = () => {
      return [this.suggestUrl];
    };

    this.databases = [];
    if (this.current.id) {
      this.current.url = 'api/datasources/proxy/' + this.current.id;
      this.datasource = new AdxDataSource(this.current);
      this.getDatabases();
    }
  }

  getDatabases() {
    if (!this.datasource) {
      return [];
    }

    return this.datasource.getDatabases().then(dbs => {
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
