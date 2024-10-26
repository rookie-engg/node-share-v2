import concurrently from 'concurrently';
import path from 'path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = path.join(__dirname, 'frontend', 'client');
const server = path.join(__dirname, 'frontend', 'desktop');

concurrently([
    // command to start the dev server for client application
    { command: 'npm run build', cwd:  client},
    // command to start the client server
    { command: 'npm run build', cwd:  server},
])
