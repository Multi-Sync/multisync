// jest.config.mjs
export default {
  testEnvironment: 'node',
  transform: {},
  coverageThreshold: {
    global: { statements: 70, branches: 50, functions: 65, lines: 70 },
  },
};
