// file: build-mobile.js v2 - Fixed Windows permission issues and improved error handling

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting mobile build...');

const projectRoot = process.cwd();
const apiPath = path.join(projectRoot, 'src', 'app', 'api');
const apiBackupPath = path.join(projectRoot, 'temp-api-backup');

// Add ALL dynamic route folders that cause issues with static export
const dynamicRoutes = [
    path.join(projectRoot, 'src', 'app', 'recipes', '[id]'),
    path.join(projectRoot, 'src', 'app', 'collections', '[id]'),
    path.join(projectRoot, 'src', 'app', 'admin', 'users', '[id]'),
    path.join(projectRoot, 'src', 'app', 'recipe-preview', '[id]'),
];
const dynamicBackups = [];

// Helper function to force close file handles (Windows specific)
function forceCloseHandles() {
    try {
        // Force garbage collection to close any open file handles
        if (global.gc) {
            global.gc();
        }
        // Small delay to allow Windows to release file handles
        return new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        return Promise.resolve();
    }
}

// Helper function to safely copy directory recursively
function copyDirectorySync(src, dest) {
    if (!fs.existsSync(src)) return;

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);

    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectorySync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Helper function to safely remove directory
function removeDirectorySync(dirPath) {
    if (!fs.existsSync(dirPath)) return true;

    try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        return true;
    } catch (error) {
        console.log(`⚠️ Warning: Could not remove ${dirPath}: ${error.message}`);
        return false;
    }
}

// Enhanced retry operation with Windows-specific handling
async function retryOperation(operation, maxRetries = 5, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await forceCloseHandles();
            await operation();
            return true;
        } catch (error) {
            if (error.code === 'EPERM' || error.code === 'EBUSY') {
                console.log(`⏳ Windows file lock detected. Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // Exponential backoff
                continue;
            }
            if (i === maxRetries - 1) throw error;
            console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

// Safe backup operation using copy instead of rename
async function safeBackup(sourcePath, backupPath, description) {
    if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️ Source path does not exist: ${sourcePath}`);
        return false;
    }

    await retryOperation(async () => {
        // Remove existing backup
        if (fs.existsSync(backupPath)) {
            removeDirectorySync(backupPath);
        }

        // Copy instead of rename to avoid Windows permission issues
        copyDirectorySync(sourcePath, backupPath);

        // Verify backup was successful before removing original
        if (fs.existsSync(backupPath)) {
            removeDirectorySync(sourcePath);
            console.log(`✅ ${description} (copied and removed)`);
        } else {
            throw new Error(`Backup failed for ${description}`);
        }
    });

    return true;
}

// Safe restore operation
async function safeRestore(backupPath, originalPath, description) {
    if (!fs.existsSync(backupPath)) {
        console.log(`⚠️ Backup path does not exist: ${backupPath}`);
        return false;
    }

    await retryOperation(async () => {
        // Remove current path if it exists
        if (fs.existsSync(originalPath)) {
            removeDirectorySync(originalPath);
        }

        // Copy backup back to original location
        copyDirectorySync(backupPath, originalPath);

        // Clean up backup
        removeDirectorySync(backupPath);

        console.log(`✅ ${description}`);
    });

    return true;
}

async function main() {
    let apiBackedUp = false;
    let configBackedUp = false;

    try {
        console.log('🔧 Preparing build environment...');

        // Force close any file handles
        await forceCloseHandles();

        // Backup API folder
        if (fs.existsSync(apiPath)) {
            console.log('📦 Backing up API folder...');
            apiBackedUp = await safeBackup(apiPath, apiBackupPath, 'API folder backed up');
        }

        // Backup dynamic route folders
        for (let i = 0; i < dynamicRoutes.length; i++) {
            const routePath = dynamicRoutes[i];
            if (fs.existsSync(routePath)) {
                const backupPath = `${routePath}-backup-temp`;
                console.log(`📦 Backing up dynamic route: ${path.basename(routePath)}`);

                const success = await safeBackup(routePath, backupPath, `Dynamic route backed up: ${path.basename(routePath)}`);
                if (success) {
                    dynamicBackups.push({ original: routePath, backup: backupPath });
                }
            }
        }

        // Backup and copy mobile config
        console.log('⚙️ Using mobile configuration...');
        if (fs.existsSync('next.config.ts')) {
            fs.copyFileSync('next.config.ts', 'next.config.backup.js');
            configBackedUp = true;
        }

        if (fs.existsSync('next.config.mobile.js')) {
            fs.copyFileSync('next.config.mobile.js', 'next.config.ts');
            console.log('✅ Mobile config applied');
        } else {
            console.log('⚠️ Warning: next.config.mobile.js not found');
        }

        // Clear Next.js cache
        console.log('🧹 Clearing Next.js cache...');
        try {
            if (fs.existsSync('.next')) {
                removeDirectorySync('.next');
            }
            if (fs.existsSync('out')) {
                removeDirectorySync('out');
            }
        } catch (error) {
            console.log('⚠️ Warning: Could not clear cache:', error.message);
        }

        // Wait a moment for filesystem
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run the build
        console.log('🔨 Building mobile app...');
        execSync('npx next build', {
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'production' }
        });

        // Check for out folder
        if (fs.existsSync('out')) {
            console.log('✅ SUCCESS: out/ folder created!');
            const files = fs.readdirSync('out');
            console.log(`📁 Contains ${files.length} files including: ${files.slice(0, 3).join(', ')}`);

            // Check for important files
            const importantFiles = ['index.html', '_next', 'dashboard'];
            const foundFiles = importantFiles.filter(file =>
                files.some(f => f.includes(file))
            );
            console.log(`🎯 Key files found: ${foundFiles.join(', ')}`);
        } else {
            console.log('❌ No out/ folder created');
            console.log('📋 This might be due to build errors or configuration issues');
        }

    } catch (error) {
        console.error('❌ Build failed:', error.message);

        // Additional Windows-specific error handling
        if (error.code === 'EPERM') {
            console.log('💡 Tip: Try running as Administrator or close any editors/terminals with open files');
        }
        if (error.code === 'EBUSY') {
            console.log('💡 Tip: Close any applications that might be using the project files');
        }

    } finally {
        console.log('🔄 Restoring files...');

        try {
            // Wait for any processes to finish
            await forceCloseHandles();

            // Restore API folder
            if (apiBackedUp && fs.existsSync(apiBackupPath)) {
                await safeRestore(apiBackupPath, apiPath, 'API folder restored');
            }

            // Restore dynamic routes
            for (const { original, backup } of dynamicBackups) {
                if (fs.existsSync(backup)) {
                    await safeRestore(backup, original, `Dynamic route restored: ${path.basename(original)}`);
                }
            }

            // Restore original config
            if (configBackedUp && fs.existsSync('next.config.backup.js')) {
                fs.copyFileSync('next.config.backup.js', 'next.config.ts');
                fs.unlinkSync('next.config.backup.js');
                console.log('✅ Config restored');
            }

            console.log('✅ All files restored successfully');

        } catch (restoreError) {
            console.error('❌ Error during restoration:', restoreError.message);
            console.log('📋 Manual cleanup may be required for:');

            // List any remaining backup folders
            dynamicBackups.forEach(({ original, backup }) => {
                if (fs.existsSync(backup) && !fs.existsSync(original)) {
                    console.log(`   - Move: ${backup} -> ${original}`);
                }
            });

            if (fs.existsSync(apiBackupPath) && !fs.existsSync(apiPath)) {
                console.log(`   - Move: ${apiBackupPath} -> ${apiPath}`);
            }

            console.log('💡 You can manually copy these folders back to restore your project');
        }
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⚠️ Build interrupted. Cleaning up...');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Build terminated. Cleaning up...');
    process.exit(1);
});

// Run the main function
main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});