// LOW WEI SHENG, A0259272X
// client/src/__tests__/integration/silenceConsole.js
// Suppresses console.log and the React act() console.error warnings during
// frontend integration tests. Keeps test output clean without hiding real failures.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
    // Let through anything that isn't a known noisy React/MSW warning
    if (
      typeof msg === 'string' &&
      (msg.includes('Warning: An update to') ||
        msg.includes('not wrapped in act') ||
        msg.includes('Warning: ReactDOM.render'))
    ) {
      return;
    }
    // eslint-disable-next-line no-console
    process.stderr.write(`${msg}\n`);
  });
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});
