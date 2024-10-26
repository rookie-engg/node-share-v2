import concurrently from 'concurrently';

concurrently([
    // command to start the dev server for client application
    { command: 'npm run dev', cwd: 'frontend/client' },
    // command to start the client server
    { command: 'npm run dev', cwd: 'frontend/desktop' },
    // command to run the app
    { command: 'npm run dev', cwd: 'backend' },
    
])
 