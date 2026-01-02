# Build Instructions

This document explains how to build and package the 5eMobile module for distribution.

## Prerequisites

- **Node.js** (v12 or higher) - Required for the build script
- **Zip utility** (usually pre-installed):
  - Windows: PowerShell (built-in)
  - Mac: `zip` command (built-in)
  - Linux: `zip` package (`sudo apt-get install zip`)

## Quick Start

### Option 1: Using npm (Recommended)

```bash
npm run build
```

### Option 2: Direct Node.js execution

```bash
node build.js
```

### Option 3: Platform-specific scripts

**Windows:**
```bash
build.bat
```

**Mac/Linux:**
```bash
chmod +x build.sh
./build.sh
```

## What the Build Script Does

1. **Reads `module.json`** - Reads the current version
2. **Increments version** - Automatically bumps the patch version (e.g., `0.4.3` → `0.4.4`)
3. **Updates `module.json`** - Updates version and download URL
4. **Collects files** - Gathers only necessary files (excludes `.git`, `node_modules`, tests, etc.)
5. **Creates zip archive** - Packages everything into `build/5eMobile.zip`

## Included Files

The build script automatically includes:
- `module.json`
- `README.md`
- `LICENSE` (if present)
- `scripts/**/*` - All JavaScript files
- `styles/**/*` - All CSS files
- `templates/**/*` - All Handlebars templates
- `data/**/*` - All data files

## Excluded Files

The build script automatically excludes:
- `.git/**` - Git repository files
- `node_modules/**` - Dependencies
- `build/**` - Build artifacts
- `tests/**` - Test files
- `docs/**` - Documentation
- `*.zip` - Existing zip files
- IDE files (`.vscode/`, `.idea/`, etc.)
- OS files (`.DS_Store`, `Thumbs.db`)

## Output

After a successful build:
- **Updated `module.json`** - Version incremented and download URL updated
- **`build/5eMobile.zip`** - Ready-to-distribute module package

## Post-Build Steps

After running the build:

1. **Review changes:**
   ```bash
   git diff module.json
   ```

2. **Commit the version update:**
   ```bash
   git add module.json
   git commit -m "Bump version to X.Y.Z"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

4. **Create GitHub Release:**
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag: `vX.Y.Z` (must match the version in module.json)
   - Upload `build/5eMobile.zip` as a release asset

## Version Format

The build script uses semantic versioning:
- **Major.Minor.Patch** (e.g., `0.4.3`)
- Only the **patch** version is incremented automatically
- To increment major or minor, manually edit `module.json` before building

## Troubleshooting

### "zip command not found" (Linux)
```bash
sudo apt-get install zip
```

### "Compress-Archive not recognized" (Windows)
- Ensure you're using PowerShell (not Command Prompt)
- Windows 10+ includes PowerShell by default

### "Build failed" errors
- Check that Node.js is installed: `node --version`
- Ensure you have write permissions in the project directory
- Verify `module.json` is valid JSON

### Files missing from zip
- Check the `INCLUDE_PATTERNS` in `build.js`
- Verify file paths are correct
- Ensure files aren't excluded by `EXCLUDE_PATTERNS`

## Manual Build (Alternative)

If you prefer to build manually:

1. **Update version in `module.json`**
2. **Update download URL** to match the new version
3. **Create zip file** with only necessary files:
   ```bash
   # Windows (PowerShell)
   Compress-Archive -Path scripts,styles,templates,data,module.json,README.md -DestinationPath 5eMobile.zip
   
   # Mac/Linux
   zip -r 5eMobile.zip scripts styles templates data module.json README.md
   ```

## Automation

You can integrate the build script into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Build module
  run: npm run build
  
- name: Upload artifact
  uses: actions/upload-artifact@v2
  with:
    name: 5eMobile.zip
    path: build/5eMobile.zip
```

