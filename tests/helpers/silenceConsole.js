// Suppresses console.log noise from middleware/controllers during integration tests
// (JWT errors, validation errors, etc.) while keeping test output clean.
// console.error is left intact so unexpected errors still surface.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => { });
});

afterAll(() => {
  if (jest.isMockFunction(console.log)) {
    console.log.mockRestore();
  }
  if (jest.isMockFunction(console.error)) {
    console.error.mockRestore();
  }
});
