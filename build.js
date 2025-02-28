const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy a file
function copyFile(source, target) {
  fs.copyFileSync(source, target);
  console.log(`Copied: ${source} -> ${target}`);
}

// Copy a directory recursively
function copyDirectory(source, target) {
  ensureDirectoryExists(target);
  
  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  }
}

// Main build function
function build() {
  console.log('Building project...');
  
  // Ensure public directory exists
  ensureDirectoryExists('public');
  
  // Copy core files
  ensureDirectoryExists('public/core');
  copyFile('src/core/game.js', 'public/core/game.js');
  copyFile('src/core/entities.js', 'public/core/entities.js');
  copyFile('src/core/controls.js', 'public/core/controls.js');
  copyFile('src/core/assets.js', 'public/core/assets.js');
  copyFile('src/core/soundSystem.js', 'public/core/soundSystem.js');
  
  // Copy lib files
  ensureDirectoryExists('public/lib');
  copyDirectory('src/lib', 'public/lib');
  
  // Copy shader files
  ensureDirectoryExists('public/shaders');
  copyDirectory('src/shaders', 'public/shaders');
  
  // Copy assets
  ensureDirectoryExists('public/assets');
  ensureDirectoryExists('public/assets/images');
  ensureDirectoryExists('public/assets/fonts');
  copyDirectory('src/assets/images', 'public/assets/images');
  copyDirectory('src/assets/fonts', 'public/assets/fonts');
  
  // Copy CSS file
  copyFile('src/styles.css', 'public/styles.css');
  
  console.log('Build completed successfully!');
}

// Run the build
build(); 