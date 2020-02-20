import * as _ from 'lodash';
import { TimeRange } from '@grafana/data';

export class TemplateSrv {
  variables: any[] = [];
  timeRange: any = {};

  private regex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?::(\w+))?}/g;
  private index = {};
  private grafanaVariables = {};

  constructor() { }

  init(variables, timeRange?: TimeRange) {
    this.variables = variables;
    this.updateTemplateData();
    this.timeRange = timeRange;
  }

  highlightVariablesAsHtml() {

  }
  updateTemplateData() {
    this.index = {};

    for (var i = 0; i < this.variables.length; i++) {
      var variable = this.variables[i];

      if (!variable.current || (!variable.current.isNone && !variable.current.value)) {
        continue;
      }

      this.index[variable.name] = variable;
    }
  }

  formatValue(value, format, variable) {
    if (typeof format === 'function') {
      return format(value, variable, this.formatValue);
    }

    if (_.isString(value)) {
      return value;
    }
    return '{' + value.join(',') + '}';
  }

  replace(target: string, scopedVars?: any, format?: string | Function) {
    if (!target) {
      return target;
    }

    let variable, systemValue, value, fmt;
    this.regex.lastIndex = 0;

    return target.replace(this.regex, (match, var1, var2, fmt2, var3, fmt3) => {
      variable = this.index[var1 || var2 || var3];
      fmt = fmt2 || fmt3 || format;
      if (scopedVars) {
        value = scopedVars[var1 || var2 || var3];
        if (value) {
          return this.formatValue(value.value, fmt, variable);
        }
      }

      if (!variable) {
        return match;
      }

      systemValue = this.grafanaVariables[variable.current.value];
      if (systemValue) {
        return this.formatValue(systemValue, fmt, variable);
      }

      value = variable.current.value;
      if (this.isAllValue(value)) {
        value = this.getAllValue(variable);
        // skip formatting of custom all values
        if (variable.allValue) {
          return this.replace(value);
        }
      }

      const res = this.formatValue(value, fmt, variable);
      return res;
    });
  }

  isAllValue(value) {
    return false;
  }

  getAllValue(variable) {
    return null;
  }
}
