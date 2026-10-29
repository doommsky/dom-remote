const fs = require('fs');
let s = fs.readFileSync('server/index.js', 'utf8');
const old = "    const token = generateToken(userId);\n    res.json({ token, userId });";
console.log(s.includes(old));
EOF