import _ from 'lodash';
import {
  QueryEditorOperatorDefinition,
  QueryEditorProperty,
  QueryEditorPropertyType,
} from '../../../../../schema/types';

export const parseOperatorValue = (
  property: QueryEditorProperty,
  definition: QueryEditorOperatorDefinition,
  value: any,
  defaultValue: any
) => {
  if (definition.multipleValues) {
    if (Array.isArray(value)) {
      return tryToCastArrayToPropertyType(property, value);
    }
    return tryToCastArrayToPropertyType(property, [value]);
  }

  const casted = tryToCastToPropertyType(property, value);
  return _.isUndefined(casted) ? defaultValue : casted;
};

const tryToCastArrayToPropertyType = (property: QueryEditorProperty, value: any[]) => {
  return value.reduce((all: any[], v) => {
    const casted = tryToCastToPropertyType(property, v);

    if (_.isUndefined(casted)) {
      return all;
    }

    all.push(casted);
    return all;
  }, []);
};

const tryToCastToPropertyType = (property: QueryEditorProperty, value: any) => {
  switch (property.type) {
    case QueryEditorPropertyType.Boolean:
      return toBoolean(value, false);

    case QueryEditorPropertyType.Number:
      return toNumber(value, 0);

    default:
      return;
  }
};

const toNumber = (value: any, defaultValue: number): number => {
  if (_.isNumber(value)) {
    return _.toNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return defaultValue;
};

const toBoolean = (value: any, defaultValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const comparable = _.toLower(_.trim(value));

    if (_.startsWith(comparable, 't')) {
      return true;
    }

    if (_.startsWith(comparable, '1')) {
      return true;
    }

    return false;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  return defaultValue;
};
