import { createServer as createHttpServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { getCredentials, resetClient } from './utils/client.js';
import { logger } from './utils/logger.js';

const HEADER_TO_ENV: Record<string, string> = {
  'x-iqms-oracle-user': 'IQMS_ORACLE_USER',
  'x-iqms-oracle-password': 'IQMS_ORACLE_PASSWORD',
  'x-iqms-oracle-connect-string': 'IQMS_ORACLE_CONNECT_STRING',
  'x-iqms-webapi-base-url': 'IQMS_WEBAPI_BASE_URL',
  'x-iqms-webapi-user': 'IQMS_WEBAPI_USER',
  'x-iqms-webapi-password': 'IQMS_WEBAPI_PASSWORD',
};

function startHttpServer(): void {
  const port = parseInt(process.env.MCP_HTTP_PORT || '8080', 10);
  const host = process.env.MCP_HTTP_HOST || '0.0.0.0';
  const isGatewayMode = process.env.AUTH_MODE === 'gateway';

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health') {
      const creds = getCredentials();
      const statusCode = creds ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: creds ? 'ok' : 'degraded',
          transport: 'http',
          credentials: { configured: !!creds, webapi: !!creds?.webapi },
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/mcp', '/health'] }));
      return;
    }

    if (isGatewayMode) {
      // Copy injected headers into env so the rest of the codebase only knows about env.
      let credsChanged = false;
      for (const [header, envVar] of Object.entries(HEADER_TO_ENV)) {
        const value = req.headers[header];
        if (typeof value === 'string' && value.length > 0 && process.env[envVar] !== value) {
          process.env[envVar] = value;
          credsChanged = true;
        }
      }
      if (credsChanged) resetClient();
      // Don't reject requests without credentials — tools/list works either way.
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      logger.error('MCP transport error', { error: (err as Error).message });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
            id: null,
          }),
        );
      }
    }
  });

  httpServer.listen(port, host, () => {
    logger.info(`HTTP streaming server listening on ${host}:${port}`, {
      gatewayMode: isGatewayMode,
    });
  });
}

const transport = process.env.MCP_TRANSPORT;
if (transport === 'http') {
  startHttpServer();
} else {
  // Defer to stdio entry — keeps a single Docker image usable for both transports.
  await import('./index.js');
}
