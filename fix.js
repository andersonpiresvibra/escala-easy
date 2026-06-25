const fs = require('fs');
let html = fs.readFileSync('src/app/app.html', 'utf8');
const startTag = '<!-- DASHBOARD TAB WORKSPACE -->';
const startIndex = html.indexOf(startTag);
const endPattern = '<!-- PERSPECTIVE C: COLABORADOR INTERACTIVE PORTAL (FRENTE C) -->';
const endIndex = html.indexOf(endPattern);
if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    fs.writeFileSync('src/app/app.html', before + '\n' + after);
    console.log('Fixed');
} else {
    console.log('Not found');
}
