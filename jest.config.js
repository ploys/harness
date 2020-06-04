module.exports = {
  roots: ['<rootDir>/packages/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    "@ploys/harness(.*)": "<rootDir>/packages/harness$1/src/index.ts"
  },
}
