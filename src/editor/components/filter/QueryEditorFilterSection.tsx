import React from 'react';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSectionRenderer } from '../QueryEditorSectionRenderer';
import { QueryEditorSectionProps, QueryEditorSection } from '../QueryEditorSection';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import { QueryEditorExpression } from '../../expressions';

interface FilterSectionConfiguration {
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  defaultValue: QueryEditorExpression;
}

export interface QueryEditorFilterSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorExpression;
  onChange: (value: QueryEditorExpression) => void;
  getSuggestions: ExpressionSuggestor;
}

export const QueryEditorFilterSection = (
  config: FilterSectionConfiguration
): React.FC<QueryEditorFilterSectionProps> => {
  return props => {
    const expression = props.value ?? config.defaultValue;

    // if (config.conditionals.length > 0) {
    //   return <QueryEditorFilterRepeater {...props} />;
    // }

    return (
      <QueryEditorSection label={props.label}>
        <QueryEditorSectionRenderer<FilterSectionConfiguration>
          expression={expression}
          fields={props.fields}
          templateVariableOptions={props.templateVariableOptions}
          onChange={props.onChange}
          config={config}
          getSuggestions={props.getSuggestions}
        />
      </QueryEditorSection>
    );
  };
};

// export const QueryEditorFilterRepeater: React.FC<QueryEditorFilterSectionProps> = props => {
//   const [] = useState();
// };
