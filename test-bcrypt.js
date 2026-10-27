const bcrypt = require('bcryptjs');
bcrypt.hash('test123', 10)
  .then(h => console.log('bcrypt works:', h.slice(0,20)))
  .catch(e => console.error('bcrypt error:', e.message));