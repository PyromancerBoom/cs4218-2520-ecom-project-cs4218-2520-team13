// Single MSW server instance shared across all frontend integration tests.
import { setupServer } from 'msw/node';

export const server = setupServer();
