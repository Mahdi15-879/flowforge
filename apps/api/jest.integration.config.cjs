module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: ".*\\.integration-spec\\.ts$",
  setupFiles: ["<rootDir>/jest.integration.setup.cjs"],
  moduleNameMapper: {
    "^@flowforge/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
  },
};
