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
});
