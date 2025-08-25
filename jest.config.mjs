// jest.config.mjs
export default {
  testEnvironment: 'node',
  transform: {},
  coverageThreshold: {
    global: { statements: 70, branches: 55, functions: 65, lines: 70 },
  },
};
