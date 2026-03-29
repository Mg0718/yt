const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const portfinder = require('portfinder');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;

// Determine if we are in development mode
const isDev = !app.isPackaged;

async function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
    });

    const url = isDev
        ? 'http://localhost:5173'
        : `http://localhost:${port}`;

    console.log(`Loading app from: ${url}`);

    try {
        await mainWindow.loadURL(url);
    } catch (e) {
        console.error('Failed to load window:', e);
        // Retry after a short delay
        setTimeout(async () => {
            try {
                await mainWindow.loadURL(url);
            } catch (e2) {
                console.error('Retry failed:', e2);
            }
        }, 2000);
    }

    // Open links in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

/**
 * Wait for the backend to be ready by polling the health endpoint
 */
function waitForBackend(port, maxAttempts = 60, interval = 500) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = () => {
            attempts++;
            console.log(`Checking backend health (attempt ${attempts}/${maxAttempts})...`);

            const req = http.get(`http://localhost:${port}/api/health`, (res) => {
                if (res.statusCode === 200) {
                    console.log('Backend is ready!');
                    resolve();
                } else {
                    retry();
                }
            });

            req.on('error', () => {
                retry();
            });

            req.setTimeout(1000, () => {
                req.destroy();
                retry();
            });
        };

        const retry = () => {
            if (attempts >= maxAttempts) {
                reject(new Error('Backend failed to start in time'));
            } else {
                setTimeout(check, interval);
            }
        };

        check();
    });
}

async function startBackend() {
    try {
        // Find a free port
        const port = await portfinder.getPortPromise({ port: 3001, stopPort: 3999 });
        console.log(`Found free port: ${port}`);

        // Path to the backend entry point
        let backendScript;
        let cwd;

        if (isDev) {
            backendScript = path.join(__dirname, '../backend/src/index.js');
            cwd = path.join(__dirname, '../backend');
        } else {
            backendScript = path.join(__dirname, '../backend/src/index.js');
            cwd = path.join(__dirname, '../backend');
        }

        console.log(`Starting backend from: ${backendScript}`);
        console.log(`Current working directory: ${cwd}`);

        // Determine a writable temp directory
        const tempDir = isDev
            ? path.join(__dirname, '../temp')
            : path.join(app.getPath('userData'), 'temp');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Environment variables for the backend
        const env = {
            ...process.env,
            PORT: port.toString(),
            IS_ELECTRON: 'true',
            TEMP_DIR: tempDir,
            NODE_ENV: 'production',
            ELECTRON_RESOURCES_PATH: isDev ? path.join(__dirname, '../resources') : process.resourcesPath
        };

        // Use spawn with node to run ES module
        // Get the node executable from the Electron process
        const nodeExecutable = process.execPath;

        console.log(`Using node executable: ${nodeExecutable}`);

        backendProcess = spawn(nodeExecutable, [backendScript], {
            cwd,
            env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        backendProcess.on('error', (err) => {
            console.error('Backend failed to start:', err);
        });

        backendProcess.stdout.on('data', (data) => {
            console.log(`[Backend]: ${data.toString()}`);
        });

        backendProcess.stderr.on('data', (data) => {
            console.error(`[Backend Error]: ${data.toString()}`);
        });

        backendProcess.on('exit', (code) => {
            console.log(`Backend process exited with code: ${code}`);
        });

        // Wait for backend to be ready
        await waitForBackend(port);

        return port;

    } catch (err) {
        console.error('Failed to start backend:', err);
        throw err;
    }
}

app.whenReady().then(async () => {
    try {
        const port = await startBackend();
        await createWindow(port);
    } catch (e) {
        console.error('Startup error:', e);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Kill backend when app quits
app.on('before-quit', () => {
    if (backendProcess) {
        console.log('Killing backend process...');
        backendProcess.kill();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        // Re-start if needed logic here
    }
});
