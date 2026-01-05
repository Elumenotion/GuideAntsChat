// Simple local webhook server for testing Published Guide authentication.
// Run with:
//   node minimal/harnesses/vanilla/webhook-server.js
//
// Then set AuthValidationWebhookUrl for your PublishedGuide to:
//   http://localhost:5199/auth/webhook
//
// The harness uses a hard-coded demo token (see index.html). When the token
// matches, this server returns a successful auth response; otherwise it returns
// an auth failure.

const http = require('http');

const PORT = process.env.WF_WEBHOOK_PORT || 5199;
const VALID_TOKEN = process.env.WF_DEMO_WEBHOOK_TOKEN || 'demo-valid-token';

/** Utility: send JSON response */
function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json)
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/auth/webhook') {
    res.statusCode = 404;
    return res.end('Not Found');
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    // Basic guard against absurdly large bodies in a test harness
    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on('end', () => {
    let payload = {};
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      return sendJson(res, 400, {
        valid: false,
        error: 'Invalid JSON payload'
      });
    }

    const authHeader = req.headers['authorization'] || '';
    const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const bodyToken = (payload.token || '').replace(/^Bearer\s+/i, '').trim();
    const token = headerToken || bodyToken;

    if (!token) {
      return sendJson(res, 401, {
        valid: false,
        error: 'No token provided'
      });
    }

    if (token !== VALID_TOKEN) {
      return sendJson(res, 401, {
        valid: false,
        error: 'Token invalid (expected demo token)'
      });
    }

    // Successful auth: return a demo user identity
    return sendJson(res, 200, {
      valid: true,
      userIdentity: 'demo.user@example.com'
    });
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[wf-webhook] Listening on http://localhost:${PORT}/auth/webhook (valid token: "${VALID_TOKEN}")`
  );
});





