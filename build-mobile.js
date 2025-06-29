const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting mobile build...');

const projectRoot = process.cwd();
const apiPath = path.join(projectRoot, 'src', 'app', 'api');
const apiBackupPath = path.join(projectRoot, 'temp-api-backup');

// Add ALL dynamic route folders that cause issues with static export
const dynamicRoutes = [
    path.join(projectRoot, 'src', 'app', 'recipes', '[id]'),
    path.join(projectRoot, 'src', 'app', 'collections', '[id]'),
    // Add any other dynamic routes you might have
];
const dynamicBackups = [];

try {
    // Move API folder
    if (fs.existsSync(apiPath)) {
        console.log('📦 Moving API folder...');
        if (fs.existsSync(apiBackupPath)) {
            fs.rmSync(apiBackupPath, { recursive: true, force: true });
        }
        fs.renameSync(apiPath, apiBackupPath);
        console.log('✅ API folder moved');
    }

    // Move dynamic route folders
    dynamicRoutes.forEach((routePath, index) => {
        if (fs.existsSync(routePath)) {
            const backupPath = `${routePath}-backup-temp`;
            console.log(`📦 Moving dynamic route: ${routePath}`);
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }
            fs.renameSync(routePath, backupPath);
            dynamicBackups.push({ original: routePath, backup: backupPath });
            console.log(`✅ Dynamic route moved: ${path.basename(routePath)}`);
        }
    });

    // Copy mobile config
    console.log('⚙️ Using mobile configuration...');
    if (fs.existsSync('next.config.js')) {
        fs.copyFileSync('next.config.js', 'next.config.backup.js');
    }
    fs.copyFileSync('next.config.mobile.js', 'next.config.js');

    // Run the build
    console.log('🔨 Building mobile app...');
    execSync('npx next build', { stdio: 'inherit' });

    // Check for out folder
    if (fs.existsSync('out')) {
        console.log('✅ SUCCESS: out/ folder created!');
        const files = fs.readdirSync('out');
        console.log(`📁 Contains ${files.length} files including: ${files.slice(0, 3).join(', ')}`);
    } else {
        console.log('❌ No out/ folder created');
    }

} catch (error) {
    console.error('❌ Build failed:', error.message);
} finally {
    console.log('🔄 Restoring files...');

    // Restore API folder
    if (fs.existsSync(apiBackupPath)) {
        if (fs.existsSync(apiPath)) {
            fs.rmSync(apiPath, { recursive: true, force: true });
        }
        fs.renameSync(apiBackupPath, apiPath);
        console.log('✅ API folder restored');
    }

    // Restore dynamic routes
    dynamicBackups.forEach(({ original, backup }) => {
        if (fs.existsSync(backup)) {
            if (fs.existsSync(original)) {
                fs.rmSync(original, { recursive: true, force: true });
            }
            fs.renameSync(backup, original);
            console.log(`✅ Dynamic route restored: ${path.basename(original)}`);
        }
    });

    // Restore original config
    if (fs.existsSync('next.config.backup.js')) {
        fs.copyFileSync('next.config.backup.js', 'next.config.js');
        fs.unlinkSync('next.config.backup.js');
        console.log('✅ Config restored');
    }
}