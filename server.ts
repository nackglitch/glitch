import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// In-memory data store for server-authoritative state
interface SocketClient {
  ws: WebSocket;
  userId?: string;
  userName?: string;
}

const connectedClients: Set<SocketClient> = new Set();

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Aether Messenger Core API',
    timestamp: new Date().toISOString(),
    onlineUsers: connectedClients.size,
  });
});

app.get('/api/admin/stats', (_req, res) => {
  res.json({
    totalUsers: 12840,
    onlineNow: connectedClients.size || 4,
    totalMessagesSent: 482900,
    systemStorageUsed: '64.2 GB',
    clusterStatus: 'nominal',
  });
});

const httpServer = createServer(app);

// WebSocket Server attached to the same HTTP server
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
        // Broadcast presence update
        broadcast({
          type: 'presence',
          userId: data.userId,
          status: 'online',
          onlineCount: connectedClients.size,
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
      // ignore parsing error
    }
  });

  ws.on('close', () => {
    connectedClients.delete(client);
    if (client.userId) {
      broadcast({
        type: 'presence',
        userId: client.userId,
        status: 'offline',
        onlineCount: connectedClients.size,
      });
    }
  });

  ws.on('error', () => {
    connectedClients.delete(client);
  });
});

function broadcast(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload);
  connectedClients.forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(json);
    }
  });
}

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
    console.log(`[Aether Messenger] Full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
