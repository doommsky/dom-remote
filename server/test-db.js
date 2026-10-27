import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function testDB() {
  const db = await open({
    filename: 'dom-os.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash('test123', 10);
  
  try {
    await db.run('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', 
      ['test-id', 'test@domos.local', hash, Date.now()]);
    console.log('✅ User inserted');
  } catch (e) {
    console.log('Insert error (may already exist):', e.message);
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', ['test@domos.local']);
  console.log('User found:', user ? 'yes' : 'no');
  
  if (user) {
    const valid = await bcrypt.compare('test123', user.password_hash);
    console.log('Password valid:', valid);
  }

  await db.close();
}

testDB().catch(console.error);