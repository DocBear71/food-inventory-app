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
];
const dynamicBackups = [];

// Helper function to retry file operations with delay
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await operation();
            return true;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

// Helper function to safely rename with retry
async function safeRename(oldPath, newPath, description) {
    await retryOperation(async () => {
        if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
        }
        fs.renameSync(oldPath, newPath);
        console.log(`✅ ${description}`);
    });
}

async function main() {
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
        for (let i = 0; i < dynamicRoutes.length; i++) {
            const routePath = dynamicRoutes[i];
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
        }

        // Copy mobile config
        console.log('⚙️ Using mobile configuration...');
        if (fs.existsSync('next.config.ts')) {
            fs.copyFileSync('next.config.ts', 'next.config.backup.js');
        }
        fs.copyFileSync('next.config.mobile.js', 'next.config.ts');

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

        try {
            // Restore API folder with retry
            if (fs.existsSync(apiBackupPath)) {
                await safeRename(apiBackupPath, apiPath, 'API folder restored');
            }

            // Restore dynamic routes with retry
            for (const { original, backup } of dynamicBackups) {
                if (fs.existsSync(backup)) {
                    await safeRename(backup, original, `Dynamic route restored: ${path.basename(original)}`);
                }
            }

            // Restore original config
            if (fs.existsSync('next.config.backup.js')) {
                fs.copyFileSync('next.config.backup.js', 'next.config.ts');
                fs.unlinkSync('next.config.backup.js');
                console.log('✅ Config restored');
            }

        } catch (restoreError) {
            console.error('❌ Error during restoration:', restoreError.message);
            console.log('📋 Manual cleanup may be required for:');

            // List any remaining backup folders
            dynamicBackups.forEach(({ original, backup }) => {
                if (fs.existsSync(backup) && !fs.existsSync(original)) {
                    console.log(`   - Rename: ${backup} -> ${original}`);
                }
            });

            if (fs.existsSync(apiBackupPath) && !fs.existsSync(apiPath)) {
                console.log(`   - Rename: ${apiBackupPath} -> ${apiPath}`);
            }
        }
    }
}

// Run the main function
main().catch(console.error);