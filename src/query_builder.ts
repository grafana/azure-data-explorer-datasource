import { ScopedVars } from '@grafana/data';

export default function interpolateKustoQuery(query: string, scopedVars?: ScopedVars): string {
  if (!query) {
    return '';
  }
  const macroRegexp = /\$__([_a-zA-Z0-9]+)\(([^\)]*)\)/gi;
  const intervalRegexp = /\$(__interval|__interval_ms)/gi;

  query = query.replace(macroRegexp, (match, p1, p2) => {
    if (p1 === 'contains') {
      return getMultiContains(p2);
    }
    return match;
  });

  query = query.replace(intervalRegexp, (match, p1) => {
    if (!scopedVars) {
      return match;
    }
    const values = scopedVars[p1];
    return values?.value ?? match;
  });

  return query.replace(/\$__escapeMulti\(('[^]*')\)/gi, (match, p1) => escape(p1));
}

function getMultiContains(inputs: string) {
  const firstCommaIndex = inputs.indexOf(',');
  const field = inputs.substring(0, firstCommaIndex);
  const templateVar = inputs.substring(inputs.indexOf(',') + 1);

  if (templateVar && templateVar.toLowerCase().trim() === 'all') {
    return '1 == 1';
  }

  return `${field.trim()} in (${singleQuote(templateVar.trim())})`;
}

function escape(inputs: string) {
  return inputs
    .substring(1, inputs.length - 1)
    .split(`','`)
    .map((v) => `@'${v}'`)
    .join(', ');
}

function singleQuote(input: string) {
  if (input.match(/,+/i)) {
    return input.split(',').map(singleQuote).join(',');
  }

  if (input.match(/^'(.*)'$/i)) {
    return input;
  }

  return `'${input}'`;
}
