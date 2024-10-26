import express from 'express';
import { Server, Socket } from 'socket.io';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import multer from 'multer';
import cors from 'cors';
import settings from 'electron-settings';

export const app = express();
export const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

/**
 * calculates the folder size in bytes
 * and returns null if cannot access folder
 * @param {string} filepath
 * @returns {Promise<Number | null>}
 */
async function getFolderSizeInBytes(filepath) {
    try {
        const files = await fs.readdir(filepath, { recursive: true });
        const stats = await Promise.all(files.map(file => fs.stat(path.join(filepath, file))));
        let size = 0
        for (const stat of stats) {
            size = size + stat.size;
        }
        return size;
    } catch {
        return null;
    }
}

const staticFilesDir = path.resolve(import.meta.dirname, 'static');

app.use(cors({
    origin: "*"
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(staticFilesDir));

app.route('/download').get(async (req, res) => {
    if (!req.query?.q) {
        res.status(400).json({
            'error': 'missing query parameter q'
        });
        return;
    }

    const filepath = req.query.q;
    if (!path.isAbsolute(filepath)) {
        res.status(400).json({
            'error': 'path is not absolute',
        });
        return;
    }

    try {
        await fs.access(filepath, fs.constants.R_OK);
    } catch {
        res.status(500).json({
            'error': 'cannot access the file path'
        })
        return;
    }

    const stats = await fs.stat(filepath);
    if (stats.isDirectory()) {
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filepath)}.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        const archvie = archiver('zip', { store: true });
        archvie.directory(filepath, path.basename(filepath));
        archvie.pipe(res);
        archvie.finalize();
        return;
    }

    res.status(200).download(filepath);
});

const upload = multer({
    storage: multer.diskStorage({
        filename(req, file, cb) {
            cb(null, file.originalname);
        },
        destination(req, file, cb) {
            const uploaddir = settings.getSync('uploaddir');
            fs.access(uploaddir, fs.constants.F_OK)
                .then(() => {
                    fs.access(uploaddir, fs.constants.W_OK)
                        .then(() => {
                            cb(null, uploaddir);
                        })
                        .catch(err => cb(err));
                }).catch(err => {
                    fs.mkdir(uploaddir, { recursive: true })
                        .then(() => {
                            cb(null, uploaddir);
                        })
                        .catch((err) => cb(err));
                });
        }
    })
})

let totalCurrLength = 0, uploadPercentage = 0;

app.route('/upload').post(
    (req, res, next) => {
        let totalContentLength = Number.parseInt(req.get('x-total-upload-size'));
        let currentTotalLength = Number.parseInt(req.get('content-length'));
        let currLength = 0;
        req.on('data', (chunk) => {
            currLength += chunk.length;
            totalCurrLength += chunk.length;
            uploadPercentage = (totalCurrLength * 100 / totalContentLength);
            app.locals?.mainWindow.webContents.send('uploadProgress', uploadPercentage);
        });
        req.on('end', () => {
            if (uploadPercentage >= 100) {
                totalCurrLength = 0;
                uploadPercentage = 0;
                app.locals?.mainWindow.webContents.send('uploadProgress', 0);
            }
        });
        req.on('error', () => {
            totalContentLength = totalContentLength - currentTotalLength;
            totalCurrLength = totalCurrLength - currLength;
            uploadPercentage = (totalCurrLength * 100 / totalContentLength);
            app.locals?.mainWindow.webContents.send('uploadProgress', uploadPercentage);
        });
        next();
    }, upload.any(), (req, res) => {
        res.sendStatus(200);
    })

/**
 * @type {Socket| null}
 */
export let activeSocket = null;

/**
 * 
 * @param {Socket} socket 
 */
function setActiveSocket(socket) {
    activeSocket = socket;
    console.log(`Current SOCKET set to: ${socket.id}`);
}

/**
 * @param {Socket}
 */
export function getActiveSocket() {
    return activeSocket;
}

io.on('connection', (socket) => {
    // that means there is a active socket connection
    if (activeSocket) activeSocket.disconnect(true);
    setActiveSocket(socket);
    console.log(socket.handshake.headers['user-agent'])
})

/**
 * @param {Number} port 
 * @returns {Promise<void>}
 */
export default function startServerOnPort(port) {
    return new Promise((resolve) => server.listen(port, '0.0.0.0', () => {
        resolve();
    }));
}