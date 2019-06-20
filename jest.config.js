module.exports = {
  preset: 'ts-jest',
  "collectCoverage": true,
  verbose: true,
  "globals": {
    "ts-jest": {
      "tsConfig": "tsconfig.jest.json"
    }
  },
  "moduleNameMapper": {
    'app/core/utils/kbn': '<rootDir>/src/__mocks__/kbn.ts',
    'app/plugins/sdk': '<rootDir>/src/__mocks__/sdk.ts'
  },
  "transformIgnorePatterns": [
    "<rootDir>/node_modules/(?!grafana-sdk-mocks)"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.(j|t)sx?$": "ts-jest",
  },
  "testRegex": "(\\.|/)(spec|jest|test)\\.(jsx?|tsx?)$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ]
};
