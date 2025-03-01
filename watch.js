const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// Watch the src directory for changes
console.log("Watching for changes in src directory...");

// Function to watch a directory and its subdirectories
function watchDirectory(dir) {
  console.log(`Setting up watcher for: ${dir}`);
  
  // Watch the current directory
  fs.watch(dir, (eventType, filename) => {
    if (filename) {
      const fullPath = path.join(dir, filename);
      console.log(`File changed: ${fullPath}`);
      
      // Run the build script
      console.log("Copying changes to public directory...");
      try {
        child_process.execSync("node build.js");
        console.log("Changes applied. Refresh your browser to see updates.");
      } catch (error) {
        console.error("Error running build script:", error.message);
      }
    }
  });
  
  // Watch subdirectories
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdir = path.join(dir, entry.name);
        watchDirectory(subdir);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

// Start watching the src directory and all its subdirectories
watchDirectory('src');

console.log("File watcher started. Edit files in the src directory and they'll be automatically copied to public.");
console.log("Press Ctrl+C to stop the watcher.");