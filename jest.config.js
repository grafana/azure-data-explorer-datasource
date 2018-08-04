module.exports = {
  verbose: true,
  "globals": {
    "ts-jest": {
      "tsConfigFile": "tsconfig.jest.json"
    }
  },
  "moduleNameMapper": {
    'app/core/utils/kbn': '<rootDir>/src/__mocks__/kbn.ts',
    'app/plugins/sdk': '<rootDir>/src/__mocks__/sdk.ts',
  },
  "transformIgnorePatterns": [
    "<rootDir>/node_modules/(?!grafana-sdk-mocks)"
  ],
  "transform": {
    ".(ts|tsx)": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  },
  "testRegex": "(\\.|/)(test)\\.ts$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ]
};
