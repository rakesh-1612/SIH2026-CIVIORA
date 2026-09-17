const { spawn, exec } = require('child_process');
const http = require('http');
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

function checkPort(port, callback) {
  const req = http.get(`http://127.0.0.1:${port}`, (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.end();
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

function checkFrontendReady(attempts = 0) {
  if (browserOpened) return;
  
  const req = http.get('http://localhost:3000', () => {
    openBrowser('http://localhost:3000');
  });

  req.on('error', () => {
    if (attempts < 60) {
      setTimeout(() => checkFrontendReady(attempts + 1), 500);
    } else {
      openBrowser('http://localhost:3000');
    }
  });

  req.end();
}

// 1. Check & Start FastAPI Backend
checkPort(8000, (running) => {
  if (running) {
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
});

// 2. Check & Start Next.js Frontend
checkPort(3000, (running) => {
  if (running) {
    console.log('\x1b[32m[Frontend]\x1b[0m Next.js Frontend is already running on Port 3000.');
    openBrowser('http://localhost:3000');
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

    setTimeout(() => checkFrontendReady(), 1500);
  }
});

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

