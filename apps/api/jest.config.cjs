module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: [
    "/node_modules/",
    "\\.integration-spec\\.ts$",
  ],
  moduleNameMapper: {
    "^@flowforge/contracts$":
      "<rootDir>/../../packages/contracts/src/index.ts",
  },
};