const fs = require('fs');
const path = require('path');

function searchInFile(filePath, content) {
    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, index) => {
        if (line.includes('useSession()') ||
            (line.includes('useSession') && line.includes('{ data')) ||
            (line.includes('useSession') && line.includes('{data'))) {
            issues.push({
                file: filePath,
                line: index + 1,
                content: line.trim()
            });
        }
    });

    return issues;
}

function searchDirectory(dir) {
    const issues = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
            issues.push(...searchDirectory(fullPath));
        } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.jsx') || file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                issues.push(...searchInFile(fullPath, content));
            } catch (error) {
                // Skip files that can't be read
            }
        }
    });

    return issues;
}

const issues = searchDirectory('./src');
console.log('Found useSession issues:');
issues.forEach(issue => {
    console.log(`${issue.file}:${issue.line} - ${issue.content}`);
});