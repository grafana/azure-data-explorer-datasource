import { filterOptions } from './QueryEditorField';

describe('filterOptions', () => {
  describe('when called with both exact and any match options', () => {
    it('then options should be correctly filtered and exact matches should be on top', async () => {
      const options = [
        { value: 'dog', label: 'dog' },
        { value: 'rubberduck', label: 'rubberduck' },
        { value: 'goldfish', label: 'goldfish' },
        { value: 'duck', label: 'duck' },
        { value: 'cat', label: 'cat' },
        { value: 'steelduck', label: 'steelduck' },
      ];
      const filterFunc = filterOptions(options);

      const result = await filterFunc('DuCk');

      expect(result).toEqual([
        { value: 'duck', label: 'duck' },
        { value: 'rubberduck', label: 'rubberduck' },
        { value: 'steelduck', label: 'steelduck' },
      ]);
    });
  });

  describe('when called with text that one option starts with and contains', () => {
    it('then options should be unique', async () => {
      const options = [
        { value: 'dog', label: 'dog' },
        { value: 'rubberduck', label: 'rubberduck' },
        { value: 'goldfish', label: 'goldfish' },
        { value: 'duckdu', label: 'duckdu' },
        { value: 'cat', label: 'cat' },
        { value: 'steelduck', label: 'steelduck' },
      ];
      const filterFunc = filterOptions(options);

      const result = await filterFunc('Du');

      expect(result).toEqual([
        { value: 'duckdu', label: 'duckdu' },
        { value: 'rubberduck', label: 'rubberduck' },
        { value: 'steelduck', label: 'steelduck' },
      ]);
    });
  });
});
