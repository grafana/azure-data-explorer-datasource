import { AdxDataSource } from './datasource';
import config from 'grafana/app/core/config';
import { isVersionGtOrEq } from './version';
import { EditorMode } from './types';

const dataConsistency = {
  strongconsistency: 'Strong',
  weakconsistency: 'Weak',
};

export class KustoDBConfigCtrl {
  static templateUrl = 'partials/config.html';

  current: any;
  suggestUrl: string;
  dataConsistency: any[];
  datasource: AdxDataSource | undefined;
  databases: any[];
  hasRequiredGrafanaVersion: boolean;
  loading = false;
  schemaError = false;
  editorModes: Array<{ value: string; label: string }>;

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
      this.refreshSchema();
    }

    this.editorModes = Object.keys(EditorMode)
      .filter(key => isNaN(parseInt(key, 10)))
      .map(key => ({ value: EditorMode[key], label: key }));

    if (!this.current.jsonData?.defaultEditorMode) {
      this.current.jsonData.defaultEditorMode = this.editorModes[0].value;
    }

    this.dataConsistency = Object.keys(dataConsistency).map(value => ({
      value,
      label: dataConsistency[value],
    }));

    if (!this.current.jsonData?.dataConsistency) {
      this.current.jsonData.dataConsistency = this.dataConsistency[0].value;
    }
  }

  refreshSchema() {
    if (!this.datasource) {
      return [];
    }

    this.loading = true;

    return this.datasource
      .getSchema(true)
      .then(schema => {
        this.databases = Object.keys(schema.Databases).map(key => ({ text: key, value: key }));

        if (!this.current.jsonData.defaultDatabase && this.databases.length) {
          this.current.jsonData.defaultDatabase = this.databases[0].value;
        }

        this.loading = false;
        this.schemaError = false;
        this.$scope.$digest();
      })
      .catch(e => {
        this.loading = false;
        this.schemaError = true;
        this.$scope.$digest();
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
