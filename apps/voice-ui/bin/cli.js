#!/usr/bin/env node
import { spawn } from 'child_process';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}`;
const uiPath = path.join(__dirname, '..');

console.log('Starting WebGAL Voice UI...');

// 直接启动生产服务器（.next 文件夹已包含在包中）
const serverProcess = spawn('npx', [
    'next',
    'start',
    '-p',
    port
], {
    cwd: uiPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
});

let opened = false;

serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    if (!opened && output.includes('started server on')) {
        opened = true;
        console.log(`UI Server is ready! Opening ${url} in your browser...`);
        open(url).catch(err => {
            console.error(`Failed to open browser. Please open this URL manually: ${url}`);
        });
    }
});

serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

serverProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`UI server process exited with code ${code}`);
    }
});

serverProcess.on('error', (err) => {
    console.error('Failed to start the UI server:', err);
    process.exit(1);
}); 