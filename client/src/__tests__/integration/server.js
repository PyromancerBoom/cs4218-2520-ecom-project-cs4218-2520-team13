// LOW WEI SHENG, A0259272X
// client/src/__tests__/integration/server.js
// LOW WEI SHENG, A0259272X
// Single MSW server instance shared across all frontend integration tests.
import { setupServer } from 'msw/node';

export const server = setupServer();
