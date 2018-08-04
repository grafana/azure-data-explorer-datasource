export class KustoDBAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
  datasource: any;
  annotation: any;

  defaultQuery = '<your table>\n| where $__timeFilter() \n| project TimeGenerated, Text=YourTitleColumn, Tags="tag1,tag2"';

  /** @ngInject **/
  constructor() {
    this.annotation.rawQuery = this.annotation.rawQuery || this.defaultQuery;
  }
}
