const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWin = os.platform() === 'win32';

console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 CIVIORA Platform - Single-Command Demo Startup');
console.log('\x1b[36m%s\x1b[0m', '=======================================================\n');

let backendProcess = null;
let frontendProcess = null;
let browserOpened = false;

function checkPortOpen(port, host = '127.0.0.1', timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
}

function openBrowser(url) {
  if (browserOpened) return;
  browserOpened = true;
  console.log('\n\x1b[35m%s\x1b[0m', `🎉 CIVIORA is live! Launching ${url} in your default browser...`);
  
  if (isWin) {
    exec(`cmd.exe /c start ${url}`);
  } else if (os.platform() === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
}

async function checkServicesReady(attempts = 0) {
  if (browserOpened) return;
  
  const [backendOk, frontendOk] = await Promise.all([
    checkPortOpen(8000),
    checkPortOpen(3000)
  ]);
  
  if (browserOpened) return;

  if (backendOk && frontendOk) {
    openBrowser('http://localhost:3000');
  } else {
    if (attempts < 60) { // Retry for up to 18s
      setTimeout(() => checkServicesReady(attempts + 1), 300);
    } else {
      openBrowser('http://localhost:3000');
    }
  }
}

async function start() {
  const backendRunning = await checkPortOpen(8000);
  if (backendRunning) {
    console.log('\x1b[34m[Backend]\x1b[0m FastAPI Backend is already running on Port 8000.');
  } else {
    console.log('📦 Starting FastAPI Backend (Port 8000)...');
    const pythonCmd = isWin ? 'python' : 'python3';
    backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
      cwd: backendDir,
      shell: true,
      stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => {
      process.stdout.write(`\x1b[34m[Backend]\x1b[0m ${data.toString()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      const str = data.toString();
      if (!str.includes("WinError 10013")) {
        process.stderr.write(`\x1b[34m[Backend]\x1b[0m ${str}`);
      }
    });
  }

  const frontendRunning = await checkPortOpen(3000);
  if (frontendRunning) {
    console.log('\x1b[32m[Frontend]\x1b[0m Next.js Frontend is already running on Port 3000.');
  } else {
    console.log('💻 Starting Next.js Frontend (Port 3000)...');
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    frontendProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      stdio: 'pipe'
    });

    frontendProcess.stdout.on('data', (data) => {
      process.stdout.write(`\x1b[32m[Frontend]\x1b[0m ${data.toString()}`);
    });

    frontendProcess.stderr.on('data', (data) => {
      process.stderr.write(`\x1b[32m[Frontend]\x1b[0m ${data.toString()}`);
    });
  }

  setTimeout(() => checkServicesReady(), 500);
}

start();

// Cleanup on exit
function cleanup() {
  console.log('\n🛑 Stopping CIVIORA servers...');
  if (isWin) {
    if (backendProcess && backendProcess.pid) exec(`taskkill /pid ${backendProcess.pid} /t /f`);
    if (frontendProcess && frontendProcess.pid) exec(`taskkill /pid ${frontendProcess.pid} /t /f`);
  } else {
    if (backendProcess) backendProcess.kill();
    if (frontendProcess) frontendProcess.kill();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

