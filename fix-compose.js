const fs = require('fs');

const composePath = 'docker-compose.yml';
let content = fs.readFileSync(composePath, 'utf8');

// Replace [REDACTED] with the actual password
content = content.replace(/\[REDACTED\]/g, 'ruchulu_password');

fs.writeFileSync(composePath, content);
console.log('✓ Fixed docker-compose.yml');
