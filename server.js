/**
 * Decor Plus - Multi-Account WhatsApp CRM & Automation Server
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const { initDatabase } = require('./src/db/database');
const SessionManager = require('./src/whatsapp/session-manager');
const SchedulerService = require('./src/services/scheduler');
const createApiRoutes = require('./src/routes/api');

// 1. Initialize SQLite Database
initDatabase();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 2. Setup WebSocket Broadcast Channel
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

function broadcast(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const client of wsClients) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

// 3. Initialize Services
const sessionManager = new SessionManager(broadcast);
const schedulerService = new SchedulerService(sessionManager);

// 4. Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 5. Static Files (Arabic RTL Dashboard)
app.use(express.static(path.join(__dirname, 'public')));

// 6. Mount REST API Routes
app.use('/api', createApiRoutes(sessionManager, schedulerService));

// Catch-all fallback to serve the Single Page Application
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Start Server & Restore Sessions
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`================================================================`);
  console.log(`  🌿 Decor Plus - WhatsApp Business CRM & Automation System   `);
  console.log(`  🚀 Server listening on: http://localhost:${PORT}             `);
  console.log(`  🌐 Full Arabic RTL Interface: http://localhost:${PORT}        `);
  console.log(`================================================================`);

  // Start Background Scheduler Queue
  schedulerService.start();

  // Auto-restore any existing WhatsApp multi-device sessions
  sessionManager.autoStartAllAccounts().catch(err => {
    console.error('Error during auto-restoring sessions:', err);
  });
});
