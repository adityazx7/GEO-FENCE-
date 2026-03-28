const fs = require('fs');
const files = ['convex/accountability.ts', 'convex/ragAgent.ts', 'convex/ogd.ts'];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(f, content);
    console.log(`Fixed ${f}`);
});
