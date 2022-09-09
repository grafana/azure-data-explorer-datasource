import { isMulti, toOperatorOptions } from './operators';

describe('toOperatorOptions', () => {
  it('should return operators', () => {
    expect(toOperatorOptions().length).toBeGreaterThan(1);
  });

  it('should include descriptions', () => {
    toOperatorOptions().forEach((op) => expect(op.description).toBeDefined());
  });
});

describe('isMulti', () => {
  it('detect an operator with multiple possible values', () => {
    expect(isMulti('in')).toBe(true);
    expect(isMulti('==')).toBe(false);
  });
});
