import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dom-os-secret-change-in-production';
const JWT_EXPIRY = '30d';

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function initDatabase() {
  db = await open({
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

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      platform TEXT NOT NULL,
      public_key TEXT,
      last_seen INTEGER,
      remote_access_enabled INTEGER DEFAULT 0,
      unattended_access INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '{}',
      visible INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      host_device_id TEXT NOT NULL,
      client_device_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (host_device_id) REFERENCES devices(id),
      FOREIGN KEY (client_device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS connection_history (
      id TEXT PRIMARY KEY,
      host_device_id TEXT NOT NULL,
      client_device_id TEXT NOT NULL,
      connected_at INTEGER NOT NULL,
      disconnected_at INTEGER,
      duration INTEGER,
      FOREIGN KEY (host_device_id) REFERENCES devices(id),
      FOREIGN KEY (client_device_id) REFERENCES devices(id)
    );
  `);
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map(); // ws -> { userId, deviceId, deviceType, authenticated }

function authenticateSocket(ws, token) {
  const decoded = verifyToken(token);
  if (!decoded) return false;
  
  ws.userId = decoded.userId;
  ws.authenticated = true;
  return true;
}

function broadcastToUser(userId, message, excludeWs = null) {
  for (const [ws, client] of clients) {
    if (client.userId === userId && ws !== excludeWs && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }
}

function broadcastToDevice(deviceId, message) {
  for (const [ws, client] of clients) {
    if (client.deviceId === deviceId && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }
}

async function getUserDevices(userId) {
  return db.all('SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC', [userId]);
}

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth': {
          if (authenticateSocket(ws, message.token)) {
            const device = await db.get('SELECT * FROM devices WHERE id = ?', [message.deviceId]);
            if (device && device.user_id === ws.userId) {
              ws.deviceId = message.deviceId;
              ws.deviceType = device.type;
              clients.set(ws, { 
                userId: ws.userId, 
                deviceId: message.deviceId, 
                deviceType: device.type,
                authenticated: true 
              });
              
              await db.run('UPDATE devices SET last_seen = ? WHERE id = ?', [Date.now(), message.deviceId]);
              
              ws.send(JSON.stringify({ type: 'auth_success', deviceId: message.deviceId }));
              
              const userDevices = await getUserDevices(ws.userId);
              ws.send(JSON.stringify({ type: 'device_list', devices: userDevices }));
              
              broadcastToUser(ws.userId, { 
                type: 'device_online', 
                deviceId: message.deviceId,
                deviceType: device.type
              }, ws);
            } else {
              ws.send(JSON.stringify({ type: 'auth_error', error: 'Device not found or unauthorized' }));
            }
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          }
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          if (!ws.authenticated) break;
          
          const targetDeviceId = message.targetDeviceId;
          const targetClient = Array.from(clients.entries()).find(([_, c]) => c.deviceId === targetDeviceId);
          
          if (targetClient) {
            const [targetWs] = targetClient;
            if (targetWs.readyState === 1) {
              targetWs.send(JSON.stringify({
                type: message.type,
                fromDeviceId: ws.deviceId,
                payload: message.payload
              }));
            }
          }
          break;
        }

        case 'session_request': {
          if (!ws.authenticated) break;
          
          const hostDevice = await db.get('SELECT * FROM devices WHERE id = ?', [message.hostDeviceId]);
          if (!hostDevice || hostDevice.user_id !== ws.userId) {
            ws.send(JSON.stringify({ type: 'session_error', error: 'Host device not found' }));
            break;
          }

          if (!hostDevice.remote_access_enabled) {
            ws.send(JSON.stringify({ type: 'session_error', error: 'Remote access disabled on host' }));
            break;
          }

          const sessionId = uuidv4();
          await db.run(
            'INSERT INTO sessions (id, host_device_id, client_device_id, started_at, status) VALUES (?, ?, ?, ?, ?)',
            [sessionId, message.hostDeviceId, ws.deviceId, Date.now(), 'pending']
          );

          broadcastToDevice(message.hostDeviceId, {
            type: 'incoming_session',
            sessionId,
            clientDeviceId: ws.deviceId,
            clientName: (await db.get('SELECT name FROM devices WHERE id = ?', [ws.deviceId]))?.name
          });

          ws.send(JSON.stringify({ type: 'session_pending', sessionId }));
          break;
        }

        case 'session_accept': {
          if (!ws.authenticated) break;
          
          const session = await db.get('SELECT * FROM sessions WHERE id = ? AND host_device_id = ?', [message.sessionId, ws.deviceId]);
          
          if (session && session.status === 'pending') {
            await db.run('UPDATE sessions SET status = ? WHERE id = ?', ['active', message.sessionId]);
            
            broadcastToDevice(session.client_device_id, {
              type: 'session_accepted',
              sessionId: message.sessionId,
              hostDeviceId: ws.deviceId
            });
          }
          break;
        }

        case 'session_reject':
        case 'session_end': {
          if (!ws.authenticated) break;
          
          const session = await db.get(
            'SELECT * FROM sessions WHERE id = ? AND (host_device_id = ? OR client_device_id = ?)',
            [message.sessionId, ws.deviceId, ws.deviceId]
          );
          
          if (session && session.status === 'active') {
            await db.run('UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?', ['ended', Date.now(), message.sessionId]);
            
            const otherDeviceId = ws.deviceId === session.host_device_id 
              ? session.client_device_id 
              : session.host_device_id;
            
            broadcastToDevice(otherDeviceId, {
              type: 'session_ended',
              sessionId: message.sessionId
            });

            await db.run(
              'INSERT INTO connection_history (id, host_device_id, client_device_id, connected_at, disconnected_at, duration) VALUES (?, ?, ?, ?, ?, ?)',
              [uuidv4(), session.host_device_id, session.client_device_id, session.started_at, Date.now(), Date.now() - session.started_at]
            );
          }
          break;
        }

        case 'get_devices': {
          if (!ws.authenticated) break;
          const devices = await getUserDevices(ws.userId);
          ws.send(JSON.stringify({ type: 'device_list', devices }));
          break;
        }

        case 'update_device': {
          if (!ws.authenticated) break;
          
          const device = await db.get('SELECT * FROM devices WHERE id = ?', [message.deviceId]);
          if (!device || device.user_id !== ws.userId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Device not found' }));
            break;
          }

          const updates = [];
          const params = [];
          
          if (message.name !== undefined) { updates.push('name = ?'); params.push(message.name); }
          if (message.remote_access_enabled !== undefined) { updates.push('remote_access_enabled = ?'); params.push(message.remote_access_enabled ? 1 : 0); }
          if (message.unattended_access !== undefined) { updates.push('unattended_access = ?'); params.push(message.unattended_access ? 1 : 0); }
          if (message.permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(message.permissions)); }
          if (message.visible !== undefined) { updates.push('visible = ?'); params.push(message.visible ? 1 : 0); }
          
          if (updates.length > 0) {
            params.push(message.deviceId);
            await db.run(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params);
            
            const updated = await db.get('SELECT * FROM devices WHERE id = ?', [message.deviceId]);
            ws.send(JSON.stringify({ type: 'device_updated', device: updated }));
            
            broadcastToUser(ws.userId, { type: 'device_updated', device: updated }, ws);
          }
          break;
        }

        case 'revoke_device': {
          if (!ws.authenticated) break;
          
          const device = await db.get('SELECT * FROM devices WHERE id = ?', [message.deviceId]);
          if (!device || device.user_id !== ws.userId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Device not found' }));
            break;
          }

          await db.run('DELETE FROM devices WHERE id = ?', [message.deviceId]);
          
          const targetClient = Array.from(clients.entries()).find(([_, c]) => c.deviceId === message.deviceId);
          if (targetClient) {
            const [targetWs] = targetClient;
            targetWs.send(JSON.stringify({ type: 'revoked' }));
            targetWs.close();
          }
          
          ws.send(JSON.stringify({ type: 'device_revoked', deviceId: message.deviceId }));
          broadcastToUser(ws.userId, { type: 'device_offline', deviceId: message.deviceId }, ws);
          break;
        }

        case 'get_history': {
          if (!ws.authenticated) break;
          
          const history = await db.all(`
            SELECT ch.*, 
              h.name as host_name, h.type as host_type,
              c.name as client_name, c.type as client_type
            FROM connection_history ch
            JOIN devices h ON ch.host_device_id = h.id
            JOIN devices c ON ch.client_device_id = c.id
            WHERE h.user_id = ? OR c.user_id = ?
            ORDER BY ch.connected_at DESC
            LIMIT 50
          `, [ws.userId, ws.userId]);
          
          ws.send(JSON.stringify({ type: 'history', history }));
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(`Device disconnected: ${client.deviceId}`);
      clients.delete(ws);
      
      if (client.authenticated) {
        broadcastToUser(client.userId, { 
          type: 'device_offline', 
          deviceId: client.deviceId 
        }, ws);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();

    await db.run('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [userId, email, passwordHash, now]);

    const token = generateToken(userId);
    res.json({ token, userId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.all('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.json({ userId: decoded.userId });
});

app.post('/api/devices/register', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { name, type, platform, publicKey } = req.body;
  if (!name || !type || !platform) {
    return res.status(400).json({ error: 'Name, type, and platform required' });
  }

  const deviceId = uuidv4();
  const now = Date.now();

  await db.run(`
    INSERT INTO devices (id, user_id, name, type, platform, public_key, created_at, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [deviceId, decoded.userId, name, type, platform, publicKey || null, now, now]);

  const device = await db.get('SELECT * FROM devices WHERE id = ?', [deviceId]);
  res.json({ deviceId, device });
});

app.get('/api/devices', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const devices = await getUserDevices(decoded.userId);
  res.json({ devices });
});

app.get('/api/devices/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const device = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json({ device });
});

app.patch('/api/devices/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const device = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const { name, remote_access_enabled, unattended_access, permissions, visible } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (remote_access_enabled !== undefined) { updates.push('remote_access_enabled = ?'); params.push(remote_access_enabled ? 1 : 0); }
  if (unattended_access !== undefined) { updates.push('unattended_access = ?'); params.push(unattended_access ? 1 : 0); }
  if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
  if (visible !== undefined) { updates.push('visible = ?'); params.push(visible ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(req.params.id);
  await db.run(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params);

  const updated = await db.get('SELECT * FROM devices WHERE id = ?', [req.params.id]);
  broadcastToUser(decoded.userId, { type: 'device_updated', device: updated });
  res.json({ success: true, device: updated });
});

app.delete('/api/devices/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const device = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  await db.run('DELETE FROM devices WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function main() {
  await initDatabase();
  console.log('Database initialized');

  server.listen(PORT, () => {
    console.log(`DOM-OS Signaling Server running on port ${PORT}`);
    console.log(`HTTP API: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (db) await db.close();
  server.close(() => process.exit(0));
});