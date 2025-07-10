const fs = require('fs');

// Read the CSS file
const cssFile = 'app/css/app.css';
let content = fs.readFileSync(cssFile, 'utf8');

// Comment out problematic background-image lines with long data URLs
content = content.replace(/(\s*background-image:\s*url\("data:image\/svg\+xml,%3C[^"]*"\)\s*!important;?)/g, '  /* $1 */');

// Write the fixed content back to the file
fs.writeFileSync(cssFile, content, 'utf8');

console.log('Fixed CSS file by commenting out problematic background-image data URLs');
