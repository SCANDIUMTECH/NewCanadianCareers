const path = require('path');

// Trust Traefik's self-signed cert for server-side fetches in dev
// Must be set before Next.js boots — .env.local loads too late for this
process.env.NODE_EXTRA_CA_CERTS = path.join(__dirname, 'certs', 'local.crt');

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';

const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'local.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'local.crt')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://${hostname}:${port}`);
  });
});
