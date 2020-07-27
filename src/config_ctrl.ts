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
  loading = false;

  /** @ngInject */
  constructor(private $scope) {
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

    this.loading = true;
    return this.datasource.getDatabases().then(dbs => {
      this.loading = false;
      this.databases = dbs;
      if(!this.current.jsonData.defaultDatabase && dbs.length) {
        this.current.jsonData.defaultDatabase =  dbs[0].value;
      }
      this.$scope.$digest(); // force thigns to re-render
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
