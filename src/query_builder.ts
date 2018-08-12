export default class QueryBuilder {
  constructor(public rawQuery, public options) {}

  interpolate() {
    let query = this.rawQuery;
    const macroRegexp = /\$__([_a-zA-Z0-9]+)\(([^\)]*)\)/gi;
    if (this.options) {
      query = query.replace(macroRegexp, (match, p1, p2) => {
        if (p1 === 'timeFilter') {
          return this.getTimeFilter(p2, this.options);
        }

        return match;
      });
      query = query.replace(/\$__interval/gi, this.options.interval);
      query = query.replace(/\$__from/gi, this.getFrom(this.options));
      query = query.replace(/\$__to/gi, this.getUntil(this.options));
    }

    return { query};
  }

  getFrom(options) {
    var from = options.range.from;
    return `datetime(${from.toISOString()})`;
  }

  getUntil(options) {
    if (options.rangeRaw.to === 'now') {
      return "now()";
    } else {
      var until = options.range.to;
      return `datetime(${until.toISOString()})`;
    }
  }

  getTimeFilter(timeField, options) {
    if (options.rangeRaw.to === 'now') {
      return `${timeField} >= ${this.getFrom(options)}`;
    } else {
      return `${timeField}  >= ${this.getFrom(options)} and ${timeField} <= ${this.getUntil(options)}`;
    }
  }
}
