import './AnnotationEditor';
import { KustoQuery, defaultQuery as globalDefaultQuery } from './types';
import { AnnotationQueryRequest } from '@grafana/data';
import { defaultsDeep } from 'lodash';

const defaultQuery: KustoQuery = {
  ...globalDefaultQuery,
  database: '',
  refId: 'annoz',
  resultFormat: 'table',
  query: `<your table>\n| where $__timeFilter() \n| project TimeGenerated, Text=YourTitleColumn, Tags="tag1,tag2"`,
  rawMode: true,
};

export class AnnotationCtrl {
  // @ts-ignore
  annotation: AnnotationQueryRequest<ServiceNowQuery>;

  // @ts-ignore
  private datasource?: ServiceNowDataSource;

  static templateUrl = 'partials/annotations.editor.html';

  /** @ngInject */
  constructor() {
    // @ts-ignore
    this.annotation.annotation = defaultsDeep(this.annotation.annotation, defaultQuery);
    // @ts-ignore
    this.annotation.datasourceId = this.datasource.id;
  }

  onChange = (req: AnnotationQueryRequest<KustoQuery>) => {
    this.annotation = req;
  };
}
