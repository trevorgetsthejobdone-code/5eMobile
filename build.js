#!/usr/bin/env node
/**
 * Build script for 5eMobile module
 * - Increments version in module.json
 * - Creates a zip file with only necessary files
 * - Updates download URL in module.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MODULE_NAME = '5eMobile';
const MODULE_JSON_PATH = path.join(__dirname, 'module.json');
const BUILD_DIR = path.join(__dirname, 'build');
const ZIP_NAME = `${MODULE_NAME}.zip`;

// Files and directories to include in the build
const INCLUDE_PATTERNS = [
  'module.json',
  'README.md',
  'LICENSE',
  'scripts/**/*',
  'styles/**/*',
  'templates/**/*',
  'data/**/*'
];

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  '.git/**',
  '.gitignore',
  '.gitattributes',
  'node_modules/**',
  'build/**',
  'dist/**',
  '*.zip',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '*.md', // Exclude markdown files except README
  '!README.md',
  'tests/**',
  'docs/**',
  '*.test.js',
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '*~'
];

/**
 * Parse version string and increment patch version
 * @param {string} version - Version string (e.g., "0.4.3")
 * @returns {string} Incremented version (e.g., "0.4.4")
 */
function incrementVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}. Expected format: X.Y.Z`);
  }
  
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10) + 1; // Increment patch version
  
  return `${major}.${minor}.${patch}`;
}

/**
 * Read and parse module.json
 */
function readModuleJson() {
  const content = fs.readFileSync(MODULE_JSON_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * Write module.json with new version
 */
function writeModuleJson(moduleData) {
  const content = JSON.stringify(moduleData, null, 2) + '\n';
  fs.writeFileSync(MODULE_JSON_PATH, content, 'utf8');
  console.log(`✓ Updated module.json with version ${moduleData.version}`);
}

/**
 * Check if a file should be included
 */
function shouldIncludeFile(filePath) {
  const relativePath = path.relative(__dirname, filePath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // Check exclude patterns first
  for (const pattern of EXCLUDE_PATTERNS) {
    const regex = patternToRegex(pattern);
    if (regex.test(normalizedPath)) {
      // Check if it's a negation pattern (starts with !)
      if (pattern.startsWith('!')) {
        return true; // Explicitly included
      }
      return false; // Excluded
    }
  }
  
  // Check include patterns
  for (const pattern of INCLUDE_PATTERNS) {
    const regex = patternToRegex(pattern);
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  
  // Default: include if it's in the module directory structure
  return normalizedPath.startsWith('scripts/') ||
         normalizedPath.startsWith('styles/') ||
         normalizedPath.startsWith('templates/') ||
         normalizedPath.startsWith('data/') ||
         normalizedPath === 'module.json' ||
         normalizedPath === 'README.md';
}

/**
 * Convert glob pattern to regex
 */
function patternToRegex(pattern) {
  // Remove negation prefix
  const cleanPattern = pattern.startsWith('!') ? pattern.slice(1) : pattern;
  
  // Escape special regex characters except * and ?
  let regexStr = cleanPattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE_STAR___/g, '.*')
    .replace(/\?/g, '[^/]');
  
  return new RegExp(`^${regexStr}$`);
}

/**
 * Get all files to include in the build
 */
function getFilesToInclude() {
  const files = [];
  
  function walkDir(dir, baseDir = __dirname) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!shouldIncludeFile(fullPath)) {
          continue;
        }
        walkDir(fullPath, baseDir);
      } else if (entry.isFile()) {
        if (shouldIncludeFile(fullPath)) {
          files.push({
            fullPath,
            relativePath: relativePath.replace(/\\/g, '/')
          });
        }
      }
    }
  }
  
  walkDir(__dirname);
  return files;
}

/**
 * Create zip file using system command
 */
function createZip(files, outputPath) {
  // Ensure build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
  
  const zipPath = path.join(BUILD_DIR, ZIP_NAME);
  
  // Remove old zip if it exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  // Try different zip commands based on platform
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  
  try {
    if (isWindows) {
      // Use PowerShell Compress-Archive (Windows 10+)
      // Create a temporary directory structure
      const tempDir = path.join(BUILD_DIR, 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Copy files maintaining directory structure
      for (const file of files) {
        const destPath = path.join(tempDir, file.relativePath);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(file.fullPath, destPath);
      }
      
      // Create zip from temp directory
      const psScript = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -Force`;
      execSync(`powershell -Command "${psScript}"`, { stdio: 'inherit' });
      
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else {
      // Use zip command (Unix/Mac)
      // Change to module directory and create zip with relative paths
      const cwd = __dirname;
      const fileArgs = files.map(f => f.relativePath).join(' ');
      execSync(`cd "${cwd}" && zip -r "${zipPath}" ${fileArgs}`, { stdio: 'inherit' });
    }
    
    console.log(`✓ Created zip file: ${zipPath}`);
    return zipPath;
  } catch (error) {
    console.error('Error creating zip file:', error.message);
    console.error('\nNote: You may need to install a zip utility:');
    console.error('  Windows: Built-in (PowerShell)');
    console.error('  Mac: Built-in (zip command)');
    console.error('  Linux: sudo apt-get install zip');
    throw error;
  }
}

/**
 * Main build function
 */
function build() {
  console.log('🚀 Starting build process...\n');
  
  // Step 1: Read current module.json
  console.log('📖 Reading module.json...');
  const moduleData = readModuleJson();
  const currentVersion = moduleData.version;
  console.log(`   Current version: ${currentVersion}`);
  
  // Step 2: Increment version
  console.log('\n🔢 Incrementing version...');
  const newVersion = incrementVersion(currentVersion);
  console.log(`   New version: ${newVersion}`);
  
  // Step 3: Update module.json
  console.log('\n📝 Updating module.json...');
  moduleData.version = newVersion;
  moduleData.download = `https://github.com/trevorgetsthejobdone-code/5eMobile/releases/download/v${newVersion}/${ZIP_NAME}`;
  writeModuleJson(moduleData);
  
  // Step 4: Get files to include
  console.log('\n📦 Collecting files...');
  const files = getFilesToInclude();
  console.log(`   Found ${files.length} files to include`);
  
  // Step 5: Create zip file
  console.log('\n🗜️  Creating zip archive...');
  const zipPath = createZip(files, BUILD_DIR);
  
  // Step 6: Summary
  console.log('\n✅ Build complete!');
  console.log(`   Version: ${currentVersion} → ${newVersion}`);
  console.log(`   Zip file: ${zipPath}`);
  console.log(`   Files included: ${files.length}`);
  console.log('\n📋 Next steps:');
  console.log(`   1. Review the changes in module.json`);
  console.log(`   2. Commit the version update: git add module.json && git commit -m "Bump version to ${newVersion}"`);
  console.log(`   3. Create a GitHub release with tag v${newVersion}`);
  console.log(`   4. Upload ${ZIP_NAME} to the release`);
}

// Run build
try {
  build();
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}

