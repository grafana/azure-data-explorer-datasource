import moment from 'moment';

export default class QueryBuilder {
  constructor(public rawQuery, public options) {}

  interpolate() {
    if (!this.rawQuery) {
      return { query: '' };
    }
    let query = this.rawQuery;
    const macroRegexp = /\$__([_a-zA-Z0-9]+)\(([^\)]*)\)/gi;
    query = query.replace(macroRegexp, (match, p1, p2) => {
      if (p1 === 'contains') {
        return this.getMultiContains(p2);
      }

      return match;
    });

    query = query.replace(/\$__escapeMulti\(('[^]*')\)/gi, (match, p1) => this.escape(p1));

    // if query or annotation query
    if (this.options) {
      //let timeField = '';
      // TEMP TODO commented out to move timeFilter expansion to backend
      // query = query.replace(macroRegexp, (match, p1, p2) => {
      //   if (p1 === 'timeFilter') {
      //     timeField = p2.trim();
      //     return this.getTimeFilter(p2, this.options);
      //   }

      //   return match;
      // });
      // query = query.replace(/\$__interval/gi, this.options.interval);
      // query = query.replace(/\$__from/gi, this.getFrom(this.options));
      // query = query.replace(/\$__to/gi, this.getUntil(this.options));

      // const orderByRegexp = /order\s+by/gi;
      // if (!orderByRegexp.test(query)) {
      //   if (!timeField) {
      //     const binRegex = /bin\(([_a-zA-Z0-9]+),/;
      //     const match = binRegex.exec(query);
      //     timeField = match? match[1]: '';
      //   }

      //   if (timeField) {
      //     query += `\n| order by ${timeField} asc`;
      //   }
      // }
    }

    return { query };
  }

  getFrom(options) {
    var from = options.range.from;
    return `datetime(${moment(from)
      .startOf('minute')
      .toISOString()})`;
  }

  getUntil(options) {
    if (options.rangeRaw.to === 'now') {
      return 'now()';
    } else {
      var until = options.range.to;
      return `datetime(${moment(until)
        .startOf('minute')
        .toISOString()})`;
    }
  }

  getTimeFilter(timeField, options) {
    if (options.rangeRaw.to === 'now') {
      return `${timeField} >= ${this.getFrom(options)}`;
    } else {
      return `${timeField}  >= ${this.getFrom(options)} and ${timeField} <= ${this.getUntil(options)}`;
    }
  }

  getMultiContains(inputs: string) {
    const firstCommaIndex = inputs.indexOf(',');
    const field = inputs.substring(0, firstCommaIndex);
    const templateVar = inputs.substring(inputs.indexOf(',') + 1);

    if (templateVar && templateVar.toLowerCase().trim() === 'all') {
      return '1 == 1';
    }

    return `${field.trim()} in (${templateVar.trim()})`;
  }

  escape(inputs: string) {
    return inputs
      .substring(1, inputs.length - 1)
      .split(`','`)
      .map(v => `@'${v}'`)
      .join(', ');
  }
}
