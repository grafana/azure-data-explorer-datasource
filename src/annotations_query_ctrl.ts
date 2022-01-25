import './monaco/kusto_monaco_editor';
export class KustoDBAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
  datasource: any;
  annotation: any;
  databases: any[];
  showHelp = false;

  defaultQuery =
    '<your table>\n| where $__timeFilter() \n| project TimeGenerated, Text=YourTitleColumn, Tags="tag1,tag2"';

  /** @ngInject */
  constructor() {
    this.annotation.query = this.annotation.query || this.defaultQuery;
    this.annotation.resultFormat = 'table';
    this.databases = this.getDatabases();
  }

  getDatabases() {
    if (this.databases && this.databases.length > 0) {
      return this.databases;
    }

    return this.datasource
      .getDatabases()
      .then((list) => {
        this.databases = list;
        if (list.length > 0 && !this.annotation.database) {
          this.annotation.database = list[0].value;
        }
        return this.databases;
      })
      .catch((err) => {});
  }
}
