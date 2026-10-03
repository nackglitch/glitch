import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));

// Persistent Database File Path
const DB_FILE = path.resolve(__dirname, 'server_storage.json');

interface StoredUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  phone?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  createdAt: string;
  blockedUserIds: string[];
  passwordHash: string;
}

interface StoredConversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string;
  description?: string;
  participantIds: string[];
  isPinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessage?: any;
  createdAt: string;
}

interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  voiceDuration?: number;
  reactions: Record<string, string[]>;
  isPinned?: boolean;
  status: string;
  createdAt: string;
}

interface DatabaseState {
  users: StoredUser[];
  conversations: StoredConversation[];
  messages: StoredMessage[];
}

function loadDatabase(): DatabaseState {
  let loadedState: DatabaseState = { users: [], conversations: [], messages: [] };

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      loadedState = {
        users: Array.isArray(data.users) ? data.users : [],
        conversations: Array.isArray(data.conversations) ? data.conversations : [],
        messages: Array.isArray(data.messages) ? data.messages : [],
      };
    }
  } catch (err) {
    console.error('Error reading database file, initializing state:', err);
  }

  // Ensure owner account NAOL (@glitch) exists with password "nack __123"
  const ownerIndex = loadedState.users.findIndex((u) => u.username.toLowerCase() === 'glitch');
  if (ownerIndex >= 0) {
    loadedState.users[ownerIndex].name = 'NAOL';
    loadedState.users[ownerIndex].passwordHash = 'nack __123';
    loadedState.users[ownerIndex].bio = 'Owner & Founder of Glitch.';
    loadedState.users[ownerIndex].avatar =
      loadedState.users[ownerIndex].avatar ||
      'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=glitch_naol_owner';
  } else {
    loadedState.users.unshift({
      id: 'u_glitch_owner',
      name: 'NAOL',
      username: 'glitch',
      avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=glitch_naol_owner',
      bio: 'Owner & Founder of Glitch.',
      status: 'online',
      lastSeen: 'Active right now',
      createdAt: new Date().toISOString(),
      blockedUserIds: [],
      passwordHash: 'nack __123',
    });
  }

  if (loadedState.conversations.length === 0) {
    loadedState.conversations.push({
      id: 'c_welcome_glitch',
      type: 'direct',
      name: 'NAOL (Owner)',
      avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=glitch_naol_owner',
      description: 'Official direct channel with NAOL',
      participantIds: ['glitch'],
      isPinned: true,
      isMuted: false,
      unreadCount: 0,
      lastMessage: {
        text: 'Welcome to Glitch! Your username is protected and your chats are live everywhere.',
        senderId: 'u_glitch_owner',
        senderName: 'NAOL',
        createdAt: new Date().toISOString(),
        status: 'delivered',
        type: 'text',
      },
      createdAt: new Date().toISOString(),
    });
  }

  // Clean up any previously auto-generated placeholder bios
  loadedState.users.forEach((u) => {
    if (u.bio === 'Hey there! I am using Glitch.') {
      u.bio = '';
    }
  });

  return loadedState;
}

let db = loadDatabase();
saveDatabase(db);

function saveDatabase(data: DatabaseState = db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Connected WebSocket clients
interface SocketClient {
  ws: WebSocket;
  userId?: string;
  userName?: string;
}

const connectedClients: Set<SocketClient> = new Set();

function broadcast(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload);
  connectedClients.forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(json);
    }
  });
}

function getOnlineUsernames(): Set<string> {
  const online = new Set<string>();
  connectedClients.forEach((c) => {
    if (c.userName) online.add(c.userName.toLowerCase());
  });
  return online;
}

function sanitizeUser(u: StoredUser) {
  const onlineUsernames = getOnlineUsernames();
  const isOnline = onlineUsernames.has(u.username.toLowerCase()) || u.username === 'glitch';
  const { passwordHash, ...rest } = u;
  return {
    ...rest,
    status: (isOnline ? 'online' : 'offline') as 'online' | 'offline' | 'away',
  };
}

// ---------------- REST API ENDPOINTS ---------------- //

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Glitch Messenger Engine',
    timestamp: new Date().toISOString(),
    onlineUsers: connectedClients.size,
    totalUsers: db.users.length,
  });
});

// 2. Auth: Sign Up (Permanent Registration - Prevents any overwrite)
app.post('/api/auth/signup', (req, res) => {
  const { username, password, name, bio } = req.body;
  const cleanUsername = String(username || '').replace(/^@/, '').toLowerCase().trim();
  const cleanPassword = String(password || '').trim();
  const displayName = String(name || '').trim() || cleanUsername;
  const userBio = bio ? String(bio).trim() : '';

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  // Check if username already exists in permanent server database
  const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (existing) {
    return res.status(409).json({
      error: `Username @${cleanUsername} is already taken! Once created, a username cannot be replaced or overwritten by another person. Please choose a unique username or log in with your password.`,
    });
  }

  const newUser: StoredUser = {
    id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: displayName,
    username: cleanUsername,
    avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${cleanUsername}`,
    bio: userBio,
    status: 'online',
    lastSeen: 'Active right now',
    createdAt: new Date().toISOString(),
    blockedUserIds: [],
    passwordHash: cleanPassword,
  };

  db.users.push(newUser);
  saveDatabase();

  const safeUser = sanitizeUser(newUser);

  // Broadcast to all other active tabs/devices that a new person joined Glitch!
  broadcast({
    type: 'user_registered',
    user: safeUser,
  });

  return res.status(201).json({ success: true, user: safeUser });
});

// 3. Auth: Login (Validates existing user credentials)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = String(username || '').replace(/^@/, '').toLowerCase().trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }

  const user = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (!user) {
    return res.status(404).json({
      error: `No account exists with username @${cleanUsername}. Please sign up to create your permanent account.`,
    });
  }

  const isValidOwnerPassword =
    user.username.toLowerCase() === 'glitch' &&
    (cleanPassword === 'nack __123' ||
      cleanPassword === 'nack__123' ||
      cleanPassword.replace(/\s+/g, '') === 'nack__123');

  if (user.passwordHash !== cleanPassword && !isValidOwnerPassword) {
    return res.status(401).json({
      error: 'Incorrect password. This username is owned by an existing user and cannot be replaced.',
    });
  }

  return res.json({ success: true, user: sanitizeUser(user) });
});

// 4. Get all users present in Glitch
app.get('/api/users', (_req, res) => {
  const users = db.users.map(sanitizeUser);
  return res.json({ users });
});

// 5. Update user profile
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, bio, avatar } = req.body;

  const userIndex = db.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (name) db.users[userIndex].name = String(name).trim();
  if (bio !== undefined) db.users[userIndex].bio = String(bio).trim();
  if (avatar) db.users[userIndex].avatar = String(avatar).trim();

  saveDatabase();

  const safeUser = sanitizeUser(db.users[userIndex]);

  broadcast({
    type: 'user_updated',
    user: safeUser,
  });

  return res.json({ success: true, user: safeUser });
});

// 6. Get conversations for a user
app.get('/api/conversations', (req, res) => {
  const username = String(req.query.username || '').toLowerCase().trim();
  if (!username) {
    return res.json({ conversations: db.conversations });
  }

  const userConvs = db.conversations.filter(
    (c) =>
      c.participantIds.includes(username) ||
      c.participantIds.includes(username.toLowerCase()) ||
      c.type === 'group'
  );

  return res.json({ conversations: userConvs });
});

// 7. Create Conversation (Direct or Group)
app.post('/api/conversations', (req, res) => {
  const { type, name, avatar, description, participantIds } = req.body;

  const cleanParticipants = (participantIds || []).map((p: string) =>
    String(p).replace(/^@/, '').toLowerCase().trim()
  );

  // If direct chat, check if already exists
  if (type === 'direct' && cleanParticipants.length > 0) {
    const target = cleanParticipants[0];
    const existing = db.conversations.find(
      (c) => c.type === 'direct' && c.participantIds.includes(target)
    );
    if (existing) {
      return res.json({ conversation: existing });
    }
  }

  const newConv: StoredConversation = {
    id: `${type === 'group' ? 'grp' : 'c'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: type || 'direct',
    name: name || 'New Conversation',
    avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || 'chat')}`,
    description: description || '',
    participantIds: cleanParticipants,
    isPinned: false,
    isMuted: false,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.conversations.unshift(newConv);
  saveDatabase();

  broadcast({
    type: 'conversation_created',
    conversation: newConv,
  });

  return res.status(201).json({ conversation: newConv });
});

// 8. Update Group profile
app.put('/api/conversations/:id', (req, res) => {
  const convId = req.params.id;
  const { name, avatar, description } = req.body;

  const conv = db.conversations.find((c) => c.id === convId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  if (name) conv.name = String(name).trim();
  if (avatar) conv.avatar = String(avatar).trim();
  if (description !== undefined) conv.description = String(description).trim();

  saveDatabase();

  broadcast({
    type: 'conversation_updated',
    conversation: conv,
  });

  return res.json({ success: true, conversation: conv });
});

// 9. Add Member to Group
app.post('/api/conversations/:id/members', (req, res) => {
  const convId = req.params.id;
  const { username } = req.body;
  const clean = String(username || '').replace(/^@/, '').toLowerCase().trim();

  const conv = db.conversations.find((c) => c.id === convId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  if (!conv.participantIds.includes(clean)) {
    conv.participantIds.push(clean);
    saveDatabase();
  }

  broadcast({
    type: 'conversation_updated',
    conversation: conv,
  });

  return res.json({ success: true, conversation: conv });
});

// 10. Remove Member from Group
app.delete('/api/conversations/:id/members/:username', (req, res) => {
  const convId = req.params.id;
  const clean = String(req.params.username || '').replace(/^@/, '').toLowerCase().trim();

  const conv = db.conversations.find((c) => c.id === convId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  conv.participantIds = conv.participantIds.filter((p) => p !== clean);
  saveDatabase();

  broadcast({
    type: 'conversation_updated',
    conversation: conv,
  });

  return res.json({ success: true, conversation: conv });
});

// 11. Delete Conversation
app.delete('/api/conversations/:id', (req, res) => {
  const convId = req.params.id;
  db.conversations = db.conversations.filter((c) => c.id !== convId);
  db.messages = db.messages.filter((m) => m.conversationId !== convId);
  saveDatabase();

  broadcast({
    type: 'conversation_deleted',
    conversationId: convId,
  });

  return res.json({ success: true });
});

// 12. Get messages for conversation
app.get('/api/messages/:conversationId', (req, res) => {
  const convId = req.params.conversationId;
  const messages = db.messages.filter((m) => m.conversationId === convId);
  return res.json({ messages });
});

// 13. Post new message (Live store + WebSocket broadcast)
app.post('/api/messages', (req, res) => {
  const {
    id,
    conversationId,
    senderId,
    senderName,
    senderAvatar,
    text,
    type,
    mediaUrl,
    voiceDuration,
  } = req.body;

  if (!conversationId || !senderId) {
    return res.status(400).json({ error: 'Missing conversationId or senderId' });
  }

  const newMessage: StoredMessage = {
    id: id || `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId,
    senderName: senderName || 'User',
    senderAvatar: senderAvatar || '',
    text: text ? String(text).trim() : '',
    type: type || 'text',
    mediaUrl,
    voiceDuration,
    reactions: {},
    status: 'delivered',
    createdAt: new Date().toISOString(),
  };

  db.messages.push(newMessage);

  // Update conversation's last message
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = {
      text: newMessage.text || (newMessage.type === 'image' ? 'Photo' : 'Voice memo'),
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      createdAt: newMessage.createdAt,
      status: 'delivered',
      type: newMessage.type,
    };
  }

  saveDatabase();

  // Broadcast live message to all connected clients!
  broadcast({
    type: 'new_message',
    payload: newMessage,
  });

  return res.status(201).json({ message: newMessage });
});

// 14. React / Like a message
app.post('/api/messages/:id/react', (req, res) => {
  const messageId = req.params.id;
  const { emoji, userId, conversationId } = req.body;

  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (!msg.reactions) msg.reactions = {};
  const currentUsers = msg.reactions[emoji] || [];

  if (currentUsers.includes(userId)) {
    msg.reactions[emoji] = currentUsers.filter((u) => u !== userId);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    msg.reactions[emoji] = [...currentUsers, userId];
  }

  saveDatabase();

  broadcast({
    type: 'reaction',
    messageId,
    conversationId: conversationId || msg.conversationId,
    emoji,
    userId,
    reactions: msg.reactions,
  });

  return res.json({ success: true, reactions: msg.reactions });
});

const httpServer = createServer(app);

// ---------------- WEBSOCKET LIVE ENGINE ---------------- //
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const client: SocketClient = { ws };
  connectedClients.add(client);

  ws.on('message', (messageData: string) => {
    try {
      const data = JSON.parse(messageData.toString());

      if (data.type === 'identify') {
        client.userId = data.userId;
        client.userName = data.userName;

        // Broadcast user presence live everywhere
        broadcast({
          type: 'presence',
          userId: data.userId,
          userName: data.userName,
          status: 'online',
          onlineUsers: Array.from(getOnlineUsernames()),
        });
      } else if (data.type === 'new_message') {
        // Broadcast message to all connected clients
        broadcast({
          type: 'new_message',
          payload: data.payload,
        });
      } else if (data.type === 'typing') {
        broadcast({
          type: 'typing',
          conversationId: data.conversationId,
          userName: data.userName,
        });
      } else if (data.type === 'reaction') {
        broadcast({
          type: 'reaction',
          messageId: data.messageId,
          conversationId: data.conversationId,
          emoji: data.emoji,
          userId: data.userId,
        });
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    connectedClients.delete(client);
    if (client.userId || client.userName) {
      broadcast({
        type: 'presence',
        userId: client.userId,
        userName: client.userName,
        status: 'offline',
        onlineUsers: Array.from(getOnlineUsernames()),
      });
    }
  });

  ws.on('error', () => {
    connectedClients.delete(client);
  });
});

// Attach Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Glitch Engine] Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
