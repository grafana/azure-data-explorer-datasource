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
  schemaMappingOptions: any[];
  mapping: any;
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
    this.schemaMappingOptions = [];

    if (!Array.isArray(this.current.jsonData?.schemaMappings)) {
      this.current.jsonData.schemaMappings = [];
    }

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

  addSchemaMapping() {
    if (!this.mapping) {
      return;
    }

    this.current.jsonData.schemaMappings.push({
      database: this.mapping.database,
      type: this.mapping.type,
      name: this.mapping.text,
      input:
        this.mapping.input?.map(i => ({
          name: i.Name,
          value: i.Value ?? '',
        })) ?? [],
    });

    this.mapping = undefined;
  }

  removeSchemaMapping(index: number) {
    this.current.jsonData.schemaMappings.splice(index, 1);
  }

  formatMapping(mapping: any): string {
    if (!mapping) {
      return 'Invalid mapping';
    }

    switch (mapping.type) {
      case 'function':
        const input = mapping.input ?? [];
        return `${mapping.name}(${input.map(i => i.value).join(',')})`;
      default:
        return mapping.name;
    }
  }

  refreshSchema() {
    if (!this.datasource) {
      return;
    }
    this.loading = true;

    this.datasource
      .getSchema(true)
      .then(schema => {
        for (const dbName of Object.keys(schema.Databases)) {
          const database = schema.Databases[dbName];

          this.databases.push({
            text: database.Name,
            value: database.Name,
          });

          for (const tableName of Object.keys(database.Tables)) {
            const table = database.Tables[tableName];

            this.schemaMappingOptions.push({
              type: 'table',
              text: `${database.Name}/tables/${table.Name}`,
              value: table.Name,
              database: database.Name,
            });
          }

          for (const functionName of Object.keys(database.Functions)) {
            const func = database.Functions[functionName];

            this.schemaMappingOptions.push({
              type: 'function',
              text: `${database.Name}/functions/${func.Name}`,
              value: func.Name,
              input: func.InputParameters,
              database: database.Name,
            });
          }
        }

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
