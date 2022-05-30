import { columnsToDefinition } from './mapper';

describe('columnsToDefinition', () => {
  it('should convert a column to a definition', () => {
    expect(columnsToDefinition([{ Name: 'foo', CslType: 'string' }])).toEqual([
      {
        label: 'foo',
        type: 'string',
        value: 'foo',
      },
    ]);
  });

  it('should parse a dynamic column', () => {
    expect(columnsToDefinition([{ Name: 'foo>bar', CslType: 'string' }])).toEqual([
      {
        label: 'foo > bar',
        type: 'string',
        value: 'todynamic(foo)["bar"]',
      },
    ]);
  });
});
