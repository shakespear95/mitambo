/**
 * Mitambo game server entry point.
 * WebSocket-only backend for Railway deployment.
 */
import { createServer } from 'node:http';
import { config } from './config/env.js';
import { initSupabase } from './config/supabase.js';
import { initWebSocket } from './routes/ws-handler.js';
import { logger } from './utils/logger.js';

// Initialize Supabase admin client
try {
  initSupabase();
} catch (err) {
  logger.warn('Supabase not configured — auth will fail until configured.');
  logger.warn('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env');
}

// Create HTTP server (health check only — no static files, no API)
const server = createServer((req, res) => {
  // CORS headers for preflight
  const origin = req.headers.origin || '*';
  const allowed = config.ALLOWED_ORIGINS;
  const corsOrigin = allowed === '*' ? '*' : (allowed.split(',').includes(origin) ? origin : '');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
    });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Initialize WebSocket
initWebSocket(server);

// Start listening
server.listen(config.PORT, () => {
  logger.info(`Mitambo WS server running on port ${config.PORT}`);
});
