const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class SignalingClient {
  constructor() {
    this.ws = null;
    this.token = null;
    this.deviceId = null;
    this.userId = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  setAuth(token, deviceId, userId) {
    this.token = token;
    this.deviceId = deviceId;
    this.userId = userId;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(SIGNALING_URL);

      this.ws.onopen = () => {
        console.log('Signaling connected');
        this.reconnectAttempts = 0;
        this.authenticate();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('Signaling disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('Signaling error:', err);
        reject(err);
      };
    });
  }

  authenticate() {
    if (!this.token || !this.deviceId) {
      console.error('No auth token or device ID');
      return;
    }
    this.send({ type: 'auth', token: this.token, deviceId: this.deviceId });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event, data) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  handleMessage(message) {
    this.emit(message.type, message);
    
    switch (message.type) {
      case 'auth_success':
        this.emit('authenticated', message);
        break;
      case 'auth_error':
        this.emit('auth_error', message.error);
        break;
      case 'device_list':
        this.emit('devices', message.devices);
        break;
      case 'device_online':
      case 'device_offline':
      case 'device_updated':
        this.emit('device_change', message);
        break;
      case 'incoming_session':
        this.emit('incoming_session', message);
        break;
      case 'session_accepted':
        this.emit('session_accepted', message);
        break;
      case 'session_ended':
        this.emit('session_ended', message);
        break;
      case 'session_error':
        this.emit('session_error', message.error);
        break;
      case 'session_pending':
        this.emit('session_pending', message);
        break;
      case 'history':
        this.emit('history', message.history);
        break;
      case 'revoked':
        this.emit('revoked');
        break;
    }
  }

  // WebRTC Signaling
  sendOffer(targetDeviceId, offer) {
    this.send({ type: 'offer', targetDeviceId, payload: offer });
  }

  sendAnswer(targetDeviceId, answer) {
    this.send({ type: 'answer', targetDeviceId, payload: answer });
  }

  sendIceCandidate(targetDeviceId, candidate) {
    this.send({ type: 'ice-candidate', targetDeviceId, payload: candidate });
  }

  // Session Management
  requestSession(hostDeviceId) {
    this.send({ type: 'session_request', hostDeviceId });
  }

  acceptSession(sessionId) {
    this.send({ type: 'session_accept', sessionId });
  }

  rejectSession(sessionId) {
    this.send({ type: 'session_reject', sessionId });
  }

  endSession(sessionId) {
    this.send({ type: 'session_end', sessionId });
  }

  // Device Management
  getDevices() {
    this.send({ type: 'get_devices' });
  }

  updateDevice(deviceId, updates) {
    this.send({ type: 'update_device', deviceId, ...updates });
  }

  revokeDevice(deviceId) {
    this.send({ type: 'revoke_device', deviceId });
  }

  getHistory() {
    this.send({ type: 'get_history' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const signaling = new SignalingClient();

export class WebRTCManager {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.remoteStreams = new Map();
    this.isHost = false;
    this.sessionId = null;
    this.pendingOfferTarget = null;
    // Register signaling handlers up-front so offers/answers arriving before
    // initialize() (e.g. during screen-capture consent) are not dropped.
    signaling.on('offer', this.handleOffer.bind(this));
    signaling.on('answer', this.handleAnswer.bind(this));
    signaling.on('ice-candidate', this.handleIceCandidate.bind(this));
    signaling.on('session_ended', this.handleSessionEnded.bind(this));
    signaling.on('session_error', this.handleSessionError.bind(this));
  }

  async initialize(isHost = false) {
    this.isHost = isHost;

    if (isHost && !this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });
      } catch (err) {
        console.error('Screen capture failed:', err);
        throw err;
      }
    }
  }

  createPeerConnection(targetDeviceId) {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendIceCandidate(targetDeviceId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      this.remoteStreams.set(targetDeviceId, stream);
      this.emit('remote_stream', { deviceId: targetDeviceId, stream });
    };

    pc.onconnectionstatechange = () => {
      this.emit('connection_state', { deviceId: targetDeviceId, state: pc.connectionState });
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.cleanupPeerConnection(targetDeviceId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    this.peerConnections.set(targetDeviceId, pc);
    return pc;
  }

  async handleOffer({ fromDeviceId, payload }) {
    const pc = this.createPeerConnection(fromDeviceId);
    await pc.setRemoteDescription(new RTCSessionDescription(payload));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    signaling.sendAnswer(fromDeviceId, answer);
  }

  async handleAnswer({ fromDeviceId, payload }) {
    const pc = this.peerConnections.get(fromDeviceId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
    }
  }

  async handleIceCandidate({ fromDeviceId, payload }) {
    const pc = this.peerConnections.get(fromDeviceId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch (err) {
        console.error('ICE candidate error:', err);
      }
    }
  }

  async startSession(hostDeviceId) {
    signaling.requestSession(hostDeviceId);
  }

  async startHostSession(clientDeviceId, sessionId) {
    this.isHost = true;
    if (!this.localStream) {
      await this.initialize(true);
    }
    this.sessionId = sessionId;
    const pc = this.createPeerConnection(clientDeviceId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signaling.sendOffer(clientDeviceId, offer);
    this.emit('session_started', { sessionId, hostDeviceId: null });
  }

  handleSessionAccepted({ sessionId, hostDeviceId }) {
    this.sessionId = sessionId;
    this.emit('session_started', { sessionId, hostDeviceId });
  }

  handleSessionEnded({ sessionId }) {
    if (this.sessionId === sessionId) {
      this.cleanupAll();
      this.emit('session_ended', { sessionId });
    }
  }

  handleSessionError({ error }) {
    this.emit('session_error', { error });
  }

  cleanupPeerConnection(deviceId) {
    const pc = this.peerConnections.get(deviceId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(deviceId);
    }
    this.remoteStreams.delete(deviceId);
  }

  cleanupAll() {
    for (const deviceId of this.peerConnections.keys()) {
      this.cleanupPeerConnection(deviceId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.sessionId = null;
  }

  getRemoteStream(deviceId) {
    return this.remoteStreams.get(deviceId);
  }

  getLocalStream() {
    return this.localStream;
  }

  // Event emitter pattern
  handlers = new Map();
  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event, data) {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}

export const webrtc = new WebRTCManager();

// API Client
export const api = {
  async register(email, password) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async verifyToken(token) {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  async registerDevice(token, deviceInfo) {
    const res = await fetch(`${API_URL}/api/devices/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(deviceInfo)
    });
    return res.json();
  },

  async getDevices(token) {
    const res = await fetch(`${API_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  async updateDevice(token, deviceId, updates) {
    const res = await fetch(`${API_URL}/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteDevice(token, deviceId) {
    const res = await fetch(`${API_URL}/api/devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  }
};

export function generateDeviceId() {
  return 'device-' + Math.random().toString(36).substr(2, 16);
}

export function getDeviceInfo() {
  return {
    name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
    type: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
    platform: navigator.platform,
    userAgent: navigator.userAgent
  };
}