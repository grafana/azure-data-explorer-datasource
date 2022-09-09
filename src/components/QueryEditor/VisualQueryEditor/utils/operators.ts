import { SelectableValue } from '@grafana/data';
import { QueryEditorPropertyType } from 'schema/types';

export type OperatorInfo = {
  Operator: string;
  Description: string;
  Example?: string;
  'Case-Sensitive'?: string;
};

export const toOperatorOptions = (
  type: QueryEditorPropertyType = QueryEditorPropertyType.String
): Array<SelectableValue<string>> => {
  return OPERATORS(type).map((op) => ({
    label: op.Operator,
    value: op.Operator,
    description: `${op['Case-Sensitive'] ? '(Case-Sensitive) ' : ''}${op.Description}`,
    title: op.Example,
  }));
};

export const isMulti = (operator?: string) => {
  // Some operators can be used to compare multiple values
  return !!operator && ['in', '!in', 'in~', '!in~', 'has_all', 'has_any'].includes(operator);
};

export const OPERATORS = (type: QueryEditorPropertyType): OperatorInfo[] => {
  switch (type) {
    case QueryEditorPropertyType.Number:
      return [
        {
          Operator: '<',
          Description: 'Less',
          Example: '1 < 10, 10sec < 1h, now() < datetime(2100-01-01)',
        },
        {
          Operator: '>',
          Description: 'Greater',
          Example: '0.23 > 0.22, 10min > 1sec, now() > ago(1d)',
        },
        {
          Operator: '==',
          Description: 'Equals',
          Example: '1 == 1',
        },
        {
          Operator: '!=',
          Description: 'Not equals',
          Example: '1 != 0',
        },
        {
          Operator: '<=',
          Description: 'Less or Equal',
          Example: '4 <= 5',
        },
        {
          Operator: '>=',
          Description: 'Greater or Equal',
          Example: '5 >= 4',
        },
        {
          Operator: 'in',
          Description: 'Equals to one of the elements',
        },
        {
          Operator: '!in',
          Description: 'Not equals to any of the elements',
        },
      ];
    case QueryEditorPropertyType.String:
      return [
        {
          Operator: '==',
          Description: 'Equals',
          'Case-Sensitive': 'Yes',
          Example: '"aBc" == "aBc"',
        },
        {
          Operator: '!=',
          Description: 'Not equals',
          'Case-Sensitive': 'Yes',
          Example: '"abc" != "ABC"',
        },
        {
          Operator: '=~',
          Description: 'Equals',
          'Case-Sensitive': 'No',
          Example: '"abc" =~ "ABC"',
        },
        {
          Operator: '!~',
          Description: 'Not equals',
          'Case-Sensitive': 'No',
          Example: '"aBc" !~ "xyz"',
        },
        {
          Operator: 'contains',
          Description: 'RHS occurs as a subsequence of LHS',
          'Case-Sensitive': 'No',
          Example: '"FabriKam" contains "BRik"',
        },
        {
          Operator: '!contains',
          Description: "RHS doesn't occur in LHS",
          'Case-Sensitive': 'No',
          Example: '"Fabrikam" !contains "xyz"',
        },
        {
          Operator: 'contains_cs',
          Description: 'RHS occurs as a subsequence of LHS',
          'Case-Sensitive': 'Yes',
          Example: '"FabriKam" contains_cs "Kam"',
        },
        {
          Operator: '!contains_cs',
          Description: "RHS doesn't occur in LHS",
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" !contains_cs "Kam"',
        },
        {
          Operator: 'endswith',
          Description: 'RHS is a closing subsequence of LHS',
          'Case-Sensitive': 'No',
          Example: '"Fabrikam" endswith "Kam"',
        },
        {
          Operator: '!endswith',
          Description: "RHS isn't a closing subsequence of LHS",
          'Case-Sensitive': 'No',
          Example: '"Fabrikam" !endswith "brik"',
        },
        {
          Operator: 'endswith_cs',
          Description: 'RHS is a closing subsequence of LHS',
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" endswith_cs "kam"',
        },
        {
          Operator: '!endswith_cs',
          Description: "RHS isn't a closing subsequence of LHS",
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" !endswith_cs "brik"',
        },
        {
          Operator: 'has',
          Description: 'Right-hand-side (RHS) is a whole term in left-hand-side (LHS)',
          'Case-Sensitive': 'No',
          Example: '"North America" has "america"',
        },
        {
          Operator: '!has',
          Description: "RHS isn't a full term in LHS",
          'Case-Sensitive': 'No',
          Example: '"North America" !has "amer"',
        },
        {
          Operator: 'has_all',
          Description: 'Same as has but works on all of the elements',
          'Case-Sensitive': 'No',
          Example: '"North and South America" has_all("south", "north")',
        },
        {
          Operator: 'has_any',
          Description: 'Same as has but works on any of the elements',
          'Case-Sensitive': 'No',
          Example: '"North America" has_any("south", "north")',
        },
        {
          Operator: 'has_cs',
          Description: 'RHS is a whole term in LHS',
          'Case-Sensitive': 'Yes',
          Example: '"North America" has_cs "America"',
        },
        {
          Operator: '!has_cs',
          Description: "RHS isn't a full term in LHS",
          'Case-Sensitive': 'Yes',
          Example: '"North America" !has_cs "amer"',
        },
        {
          Operator: 'hasprefix',
          Description: 'RHS is a term prefix in LHS',
          'Case-Sensitive': 'No',
          Example: '"North America" hasprefix "ame"',
        },
        {
          Operator: '!hasprefix',
          Description: "RHS isn't a term prefix in LHS",
          'Case-Sensitive': 'No',
          Example: '"North America" !hasprefix "mer"',
        },
        {
          Operator: 'hasprefix_cs',
          Description: 'RHS is a term prefix in LHS',
          'Case-Sensitive': 'Yes',
          Example: '"North America" hasprefix_cs "Ame"',
        },
        {
          Operator: '!hasprefix_cs',
          Description: "RHS isn't a term prefix in LHS",
          'Case-Sensitive': 'Yes',
          Example: '"North America" !hasprefix_cs "CA"',
        },
        {
          Operator: 'hassuffix',
          Description: 'RHS is a term suffix in LHS',
          'Case-Sensitive': 'No',
          Example: '"North America" hassuffix "ica"',
        },
        {
          Operator: '!hassuffix',
          Description: "RHS isn't a term suffix in LHS",
          'Case-Sensitive': 'No',
          Example: '"North America" !hassuffix "americ"',
        },
        {
          Operator: 'hassuffix_cs',
          Description: 'RHS is a term suffix in LHS',
          'Case-Sensitive': 'Yes',
          Example: '"North America" hassuffix_cs "ica"',
        },
        {
          Operator: '!hassuffix_cs',
          Description: "RHS isn't a term suffix in LHS",
          'Case-Sensitive': 'Yes',
          Example: '"North America" !hassuffix_cs "icA"',
        },
        {
          Operator: 'in',
          Description: 'Equals to one of the elements',
          'Case-Sensitive': 'Yes',
          Example: '"abc" in ("123", "345", "abc")',
        },
        {
          Operator: '!in',
          Description: 'Not equals to any of the elements',
          'Case-Sensitive': 'Yes',
          Example: '"bca" !in ("123", "345", "abc")',
        },
        {
          Operator: 'in~',
          Description: 'Equals to any of the elements',
          'Case-Sensitive': 'No',
          Example: '"Abc" in~ ("123", "345", "abc")',
        },
        {
          Operator: '!in~',
          Description: 'Not equals to any of the elements',
          'Case-Sensitive': 'No',
          Example: '"bCa" !in~ ("123", "345", "ABC")',
        },
        {
          Operator: 'matches regex',
          Description: 'LHS contains a match for RHS',
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" matches regex "b.*k"',
        },
        {
          Operator: 'startswith',
          Description: 'RHS is an initial subsequence of LHS',
          'Case-Sensitive': 'No',
          Example: '"Fabrikam" startswith "fab"',
        },
        {
          Operator: '!startswith',
          Description: "RHS isn't an initial subsequence of LHS",
          'Case-Sensitive': 'No',
          Example: '"Fabrikam" !startswith "kam"',
        },
        {
          Operator: 'startswith_cs',
          Description: 'RHS is an initial subsequence of LHS',
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" startswith_cs "Fab"',
        },
        {
          Operator: '!startswith_cs',
          Description: "RHS isn't an initial subsequence of LHS",
          'Case-Sensitive': 'Yes',
          Example: '"Fabrikam" !startswith_cs "fab"',
        },
      ];
    case QueryEditorPropertyType.Boolean:
      return [
        {
          Operator: '==',
          Description: 'Yields true if both operands are non-null and equal to each other. Otherwise, false.',
        },
        {
          Operator: '!=',
          Description:
            'Yields true if any of the operands are null, or if the operands are not equal to each other. Otherwise, false.',
        },
        {
          Operator: 'and',
          Description: 'Yields true if both operands are true.',
        },
        {
          Operator: 'or',
          Description: 'Yields true if one of the operands is true, regardless of the other operand.',
        },
      ];
    // Same for TimeSpan and Interval
    default:
      return [
        {
          Operator: 'in',
          Description: 'Equals to one of the elements',
        },
        {
          Operator: '!in',
          Description: 'Not equals to any of the elements',
        },
        {
          Operator: '<',
          Description: 'Less',
          Example: '1 < 10, 10sec < 1h, now() < datetime(2100-01-01)',
        },
        {
          Operator: '>',
          Description: 'Greater',
          Example: '0.23 > 0.22, 10min > 1sec, now() > ago(1d)',
        },
        {
          Operator: '==',
          Description: 'Equals',
          Example: '1 == 1',
        },
        {
          Operator: '!=',
          Description: 'Not equals',
          Example: '1 != 0',
        },
        {
          Operator: '<=',
          Description: 'Less or Equal',
          Example: '4 <= 5',
        },
        {
          Operator: '>=',
          Description: 'Greater or Equal',
          Example: '5 >= 4',
        },
      ];
  }
};
