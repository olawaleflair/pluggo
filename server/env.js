import process from 'node:process';
import { existsSync } from 'node:fs';
// Only the backend reads this file. Existing environment variables take priority.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
