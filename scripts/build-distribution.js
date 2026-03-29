const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const distDir = path.join(rootDir, 'dist');
const resourcesDir = path.join(rootDir, 'resources');

// Ensure resources directory exists
if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
}

console.log('📦 Starting build distribution process...');

// 1. Build Frontend
console.log('🏗️  Building frontend...');
try {
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
    console.error('❌ Frontend build failed');
    process.exit(1);
}

// 2. Prepare Backend
console.log('🚚 Moving frontend build to backend/client...');
const backendClientDir = path.join(backendDir, 'client');
if (fs.existsSync(backendClientDir)) {
    fs.rmSync(backendClientDir, { recursive: true, force: true });
}
fs.renameSync(path.join(frontendDir, 'dist'), backendClientDir);

// 3. Download yt-dlp binary
const ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
const ytDlpPath = path.join(resourcesDir, 'yt-dlp');
const ytDlpDest = path.join(ytDlpPath, 'yt-dlp');

if (!fs.existsSync(ytDlpPath)) {
    fs.mkdirSync(ytDlpPath, { recursive: true });
}

console.log('⬇️  Downloading yt-dlp binary for macOS...');

try {
    execSync(`curl -L "${ytDlpUrl}" -o "${ytDlpDest}"`, { stdio: 'inherit' });
    console.log('✅ yt-dlp downloaded');

    // Make executable
    fs.chmodSync(ytDlpDest, '755');
    console.log('🔧 Made yt-dlp executable');

    console.log('✨ Build distribution preparation complete!');
    console.log('🚀 Ready to run: npm run dist');
} catch (e) {
    console.error(`❌ Failed to download yt-dlp: ${e.message}`);
    process.exit(1);
}
