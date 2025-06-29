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

// Windows-safe file operations with retry
function safeRename(oldPath, newPath, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (fs.existsSync(newPath)) {
                fs.rmSync(newPath, { recursive: true, force: true });
                // Wait a bit after deletion
                setTimeout(() => {}, 100);
            }
            fs.renameSync(oldPath, newPath);
            return true;
        } catch (error) {
            console.log(`⚠️ Rename attempt ${i + 1} failed: ${error.message}`);
            if (i === maxRetries - 1) {
                // Last attempt failed, try copy + delete approach
                try {
                    console.log('🔄 Trying copy + delete approach...');
                    copyDirectoryRecursive(oldPath, newPath);
                    fs.rmSync(oldPath, { recursive: true, force: true });
                    return true;
                } catch (copyError) {
                    console.error(`❌ Copy + delete also failed: ${copyError.message}`);
                    throw error;
                }
            }
            // Wait before retry
            setTimeout(() => {}, 1000);
        }
    }
    return false;
}

// Recursive copy function for fallback
function copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Enhanced cleanup function
function killProcessesUsingPath(targetPath) {
    try {
        if (process.platform === 'win32') {
            // Try to close any handles to the directory (Windows only)
            execSync(`handle.exe "${targetPath}" | findstr /i "handle"`, { stdio: 'pipe' });
        }
    } catch (error) {
        // Handle.exe not available or no handles found, continue
    }
}

try {
    // Kill any processes that might be using our target directories
    console.log('🔍 Checking for file locks...');
    if (fs.existsSync(apiPath)) {
        killProcessesUsingPath(apiPath);
    }

    // Move API folder
    if (fs.existsSync(apiPath)) {
        console.log('📦 Moving API folder...');
        safeRename(apiPath, apiBackupPath);
        console.log('✅ API folder moved');
    }

    // Move dynamic route folders
    dynamicRoutes.forEach((routePath, index) => {
        if (fs.existsSync(routePath)) {
            const backupPath = `${routePath}-backup-temp`;
            console.log(`📦 Moving dynamic route: ${routePath}`);
            safeRename(routePath, backupPath);
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

    // Add delay to ensure file operations complete
    setTimeout(() => {}, 500);

    // Restore API folder
    if (fs.existsSync(apiBackupPath)) {
        try {
            if (fs.existsSync(apiPath)) {
                fs.rmSync(apiPath, { recursive: true, force: true });
            }
            safeRename(apiBackupPath, apiPath);
            console.log('✅ API folder restored');
        } catch (restoreError) {
            console.error(`⚠️ Failed to restore API folder: ${restoreError.message}`);
            console.log(`📁 API backup is available at: ${apiBackupPath}`);
        }
    }

    // Restore dynamic routes
    dynamicBackups.forEach(({ original, backup }) => {
        if (fs.existsSync(backup)) {
            try {
                if (fs.existsSync(original)) {
                    fs.rmSync(original, { recursive: true, force: true });
                }
                safeRename(backup, original);
                console.log(`✅ Dynamic route restored: ${path.basename(original)}`);
            } catch (restoreError) {
                console.error(`⚠️ Failed to restore ${path.basename(original)}: ${restoreError.message}`);
                console.log(`📁 Backup is available at: ${backup}`);
            }
        }
    });

    // Restore original config
    if (fs.existsSync('next.config.backup.js')) {
        fs.copyFileSync('next.config.backup.js', 'next.config.js');
        fs.unlinkSync('next.config.backup.js');
        console.log('✅ Config restored');
    }
}

// Alternative approach: Use environment variable instead of moving files
console.log('\n💡 TIP: If this continues to fail, you can use the alternative approach:');
console.log('1. Set MOBILE_BUILD=true environment variable');
console.log('2. Modify your API routes to check process.env.MOBILE_BUILD');
console.log('3. Run: set MOBILE_BUILD=true && npm run build && npx cap sync android');

// Quick fix for immediate testing
console.log('\n🚀 QUICK FIX: Try running these commands manually:');
console.log('1. npm run build');
console.log('2. npx cap sync android');
console.log('3. npx cap open android');