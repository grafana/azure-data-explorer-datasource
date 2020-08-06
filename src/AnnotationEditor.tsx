import React, { PureComponent } from 'react';
import coreModule from 'grafana/app/core/core_module';

import { AnnotationQueryRequest } from '@grafana/data';
import { KustoQuery } from './types';
import { AdxDataSource } from './datasource';
import { QueryEditor } from 'QueryEditor';

interface Props {
  datasource: AdxDataSource;
  annotation: AnnotationQueryRequest<KustoQuery>;
  change: (query: AnnotationQueryRequest<KustoQuery>) => void;
}

export class AnnotationEditor extends PureComponent<Props> {
  onQueryChange = (query: KustoQuery) => {
    const { datasource, annotation } = this.props;

    // console.log('Current', annotation, query);

    const update = {
      ...annotation,
      annotation: {
        ...annotation.annotation, // The query
        ...query,
        datasource: datasource.name,
      },
    };

    console.log('CurrentXX', update);
    this.props.change(update);
  };

  onRunQuery = () => {
    console.log('??? on run query');
  };

  render() {
    const { datasource, annotation } = this.props;
    return (
      <>
        <QueryEditor
          datasource={datasource}
          onChange={this.onQueryChange}
          query={annotation.annotation}
          onRunQuery={this.onRunQuery}
        />
      </>
    );
  }
}

coreModule.directive('annotationEditor', [
  'reactDirective',
  (reactDirective: any) => {
    return reactDirective(AnnotationEditor, ['annotation', 'datasource', 'change']);
  },
]);
