import { filterOptions } from './QueryEditorField';

describe('filterOptions', () => {
  describe('when called with both exact and any match options', () => {
    it('then options should be correctly filtered and exact matches should be on top', async () => {
      const options = [
        { value: 'rubberduck', label: 'rubberduck' },
        { value: 'duck', label: 'duck' },
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
});
