const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// Watch the src directory for changes
console.log("Watching for changes in src directory...");

fs.watch("src", { recursive: true }, (eventType, filename) => {
  if (filename) {
    console.log(`File changed: ${filename}`);
    
    // Run the build script
    console.log("Copying changes to public directory...");
    child_process.execSync("node build.js");
    
    console.log("Changes applied. Refresh your browser to see updates.");
  }
});

console.log("File watcher started. Edit files in the src directory and they'll be automatically copied to public.");
console.log("Press Ctrl+C to stop the watcher.");
