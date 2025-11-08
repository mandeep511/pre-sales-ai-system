const fs = require('fs');
const path = require('path');

// Parse gitignore patterns into regex
function parseGitignorePattern(pattern, gitignoreDir) {
    if (!pattern || pattern.trim() === '') return null;
    
    const trimmed = pattern.trim();
    if (trimmed.startsWith('#')) return null; // Comment
    
    const isNegation = trimmed.startsWith('!');
    const actualPattern = isNegation ? trimmed.slice(1) : trimmed;
    if (!actualPattern) return null;
    
    const isDir = actualPattern.endsWith('/');
    const cleanPattern = isDir ? actualPattern.slice(0, -1) : actualPattern;
    
    // Convert gitignore pattern to regex
    let regexStr = cleanPattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '___DOUBLESTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/___DOUBLESTAR___/g, '.*');
    
    // Handle anchored patterns (starting with /) - matches from gitignore dir
    if (cleanPattern.startsWith('/')) {
        regexStr = '^' + regexStr.slice(1) + (isDir ? '/?$' : '$');
    } else {
        // Unanchored pattern - can match anywhere in subdirectories
        regexStr = '(^|/)' + regexStr + (isDir ? '/?$' : '(/?$|/)');
    }
    
    return {
        regex: new RegExp(regexStr),
        isNegation,
        isDir,
        gitignoreDir: gitignoreDir // Store the directory this rule came from
    };
}

// Load gitignore rules from a directory
function loadGitignore(dirPath) {
    const gitignorePath = path.join(dirPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return [];
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const rules = [];
    
    content.split('\n').forEach(line => {
        const rule = parseGitignorePattern(line, dirPath);
        if (rule) rules.push(rule);
    });
    
    return rules;
}

// Check if a path should be ignored
function shouldIgnore(filePath, isDirectory, rules) {
    let ignored = false;
    
    for (const rule of rules) {
        // Get path relative to the gitignore file's directory
        const relativePath = path.relative(rule.gitignoreDir, filePath).replace(/\\/g, '/');
        
        // Empty relative path means the file IS the gitignore directory - skip
        if (relativePath === '' || relativePath === '.') continue;
        
        // If path goes up (../), it's outside this gitignore's scope - skip
        if (relativePath.startsWith('../')) continue;
        
        // Test the pattern against the relative path
        const matches = rule.regex.test(relativePath) || 
                       (rule.isDir && isDirectory && rule.regex.test(relativePath + '/'));
        
        if (matches) {
            if (rule.isNegation) {
                ignored = false;
            } else {
                ignored = true;
            }
        }
    }
    
    return ignored;
}

function getTree(dirPath, rootPath = null, parentRules = []) {
    if (rootPath === null) rootPath = dirPath;
    
    let results = [];
    const list = fs.readdirSync(dirPath);
    
    // Load gitignore rules for current directory
    const currentRules = loadGitignore(dirPath);
    const allRules = [...parentRules, ...currentRules];
    
    list.forEach(function(file) {
        // Skip .git directories
        if (file === '.git') return;
        
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        // Check if should be ignored (pass full path, rules will handle relative paths)
        if (shouldIgnore(filePath, stat.isDirectory(), allRules)) {
            return;
        }
        
        if (stat && stat.isDirectory()) {
            results.push({
                name: file,
                type: 'directory',
                children: getTree(filePath, rootPath, allRules)
            });
        } else {
            results.push({
                name: file,
                type: 'file'
            });
        }
    });
    
    return results;
}

function printTree(tree, prefix = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    console.log(prefix + connector + tree.name);

    if (tree.type === 'directory' && tree.children) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        tree.children.forEach((child, index) => {
            const isLastChild = index === tree.children.length - 1;
            printTree(child, newPrefix, isLastChild);
        });
    }
}

// Get directory from command line argument or use current directory
const dirPath = process.argv[2] || process.cwd();
const tree = getTree(dirPath);

// Print the root directory name
console.log(path.basename(dirPath) || dirPath);

// Print each item in the tree
tree.forEach((item, index) => {
    const isLast = index === tree.length - 1;
    printTree(item, '', isLast);
});
