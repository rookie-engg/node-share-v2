import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure correct path resolution for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const backend = path.join(__dirname, 'backend');
const buildUiFile = path.join(__dirname, 'build-ui.mjs');
const icon = path.join(__dirname, 'file-sharing.ico');

if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true }); // Use recursive for older Node versions
}

fs.mkdirSync(dist);
try {
    fs.cpSync(backend, dist, {
        recursive: true,
        filter(src) {
            const fileName = path.basename(src);
            return !['node_modules', 'package-lock.json', 'README.md', '.git', '.gitignore'].includes(fileName);
        }
    });
} catch (error) {
    console.error(`Error copying file: ${error.message}`);
    process.exit(1);
}

const runCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        console.info(`Executing command: ${cmd}`);
        
        const process = exec(cmd);

        process.stdout.on('data', (data) => {
            console.log(data); // Output from the command
        });

        process.stderr.on('data', (data) => {
            console.error(data); // Error output from the command
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(`Command failed with exit code ${code}`);
            } else {
                resolve();
            }
        });
    });
};


let command = `node ${buildUiFile}`;
runCommand(command).then(() => {
    process.chdir(dist);
    console.info(`Current directory: ${process.cwd()}`);

    command = 'npm install --omit=dev';
    runCommand(command)
        .then(() => {
            command = `npx --yes @electron/packager ./ --platform=win32 --arch=x64 --icon="${icon}" --out=../release --overwrite --asar`;
            return runCommand(command);
        })
        .then(() => {
            // fs.rmSync(dist, {recursive: true});
            return;
        })
        .then(() => {
            console.log('All commands executed successfully.');
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });

}).catch((error) => {
    console.error(error);
    process.exit(1);
});
