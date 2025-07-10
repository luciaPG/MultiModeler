const fs = require('fs');

// Read the CSS file
const cssFile = 'app/css/app.css';
let content = fs.readFileSync(cssFile, 'utf8');

// Remove all lines that contain problematic data URLs
content = content.split('\n').filter(line => {
  // Remove lines that contain data:image/svg+xml with long URLs that are causing issues
  if (line.includes('background-image: url("data:image/svg+xml,%3C') && line.length > 500) {
    return false;
  }
  return true;
}).join('\n');

// Fix any broken comments or syntax issues
content = content.replace(/\/\*\s*$/gm, ''); // Remove dangling open comments
content = content.replace(/\{\s*\/\*[^}]*$/gm, '{'); // Remove broken comment starts in rules

// Write the cleaned content back to the file
fs.writeFileSync(cssFile, content, 'utf8');

console.log('Cleaned CSS file by removing problematic lines');
