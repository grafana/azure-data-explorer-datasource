import { QueryCtrl } from 'grafana/app/plugins/sdk';
import _ from 'lodash';
import './monaco/kusto_monaco_editor';
import { DatabaseItem } from './response_parser';

export interface ResultFormat {
  text: string;
  value: string;
}

export class KustoDBQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  defaults = {
    query: [
      '//change this to create your own time series query',
      '',
      '<table name>',
      '| where $__timeFilter(Timestamp)',
      '// | summarize count() by <group by column>, bin(Timestamp, $__interval)',
      '// | order by Timestamp asc',
    ].join('\n'),
    resultFormat: 'time_series',
    database: '',
  };

  resultFormats: ResultFormat[];
  showHelp: boolean;
  showLastQuery: boolean;
  lastQuery: string;
  lastQueryError?: string;
  timeNotASC: boolean;
  databases: DatabaseItem[];

  /** @ngInject **/
  constructor($scope, $injector) {
    super($scope, $injector);

    _.defaultsDeep(this.target, this.defaults);
    this.panelCtrl.events.on('data-received', this.onDataReceived.bind(this), $scope);
    this.panelCtrl.events.on('data-error', this.onDataError.bind(this), $scope);
    this.resultFormats = [
      { text: 'Time series', value: 'time_series' },
      { text: 'Table', value: 'table' },
      { text: 'ADX Time series', value: 'time_series_adx_series' },
    ];
    this.getDatabases();
  }

  onDataReceived(dataList) {
    this.lastQueryError = undefined;
    this.lastQuery = '';
    this.timeNotASC = false;

    let anySeriesFromQuery: any = _.find(dataList, {
      refId: this.target.refId,
    });
    if (anySeriesFromQuery && anySeriesFromQuery.meta) {
      this.lastQuery = anySeriesFromQuery.meta.RawQuery;
      this.timeNotASC = anySeriesFromQuery.meta.TimeNotASC;
    }
  }

  onDataError(err) {
    this.handleQueryCtrlError(err);
  }

  handleQueryCtrlError(err) {
    if (err.query && err.query.refId && err.query.refId !== this.target.refId) {
      return;
    }

    if (
      // Get Kusto Error from Backend
      err.data &&
      err.data.results &&
      err.data.results &&
      err.data.results[this.target.refId] &&
      err.data.results[this.target.refId].meta &&
      err.data.results[this.target.refId].meta.KustoError !== ''
    ) {
      this.lastQueryError = err.data.results[this.target.refId].meta.KustoError;
      return;
    }

    if (err.error && err.error.data && err.error.data.error && err.error.data.error.innererror) {
      if (err.error.data.error.innererror.innererror) {
        this.lastQueryError = err.error.data.error.innererror.innererror.message;
      } else {
        this.lastQueryError = err.error.data.error.innererror['@message'];
      }
    } else if (err.error && err.error.data && err.error.data.error) {
      this.lastQueryError = err.error.data.error.message;
    } else if (err.error && err.error.data) {
      this.lastQueryError = err.error.data.message;
    } else if (err.data && err.data.error) {
      this.lastQueryError = err.data.error.message;
    } else if (err.data && err.data.message) {
      this.lastQueryError = err.data.message;
    } else {
      this.lastQueryError = err;
    }
  }

  getDatabases() {
    return this.datasource.getDatabases().then(dbs => {
      this.databases = dbs;
      if (dbs.length > 0 && !this.target.database) {
        this.target.database = this.datasource.defaultOrFirstDatabase || dbs[0].value;
      }
    });
  }

  getSchema() {
    return this.getDatabases().then(() => {
      return this.datasource.getSchema(this.target.database);
    });
  }
}
