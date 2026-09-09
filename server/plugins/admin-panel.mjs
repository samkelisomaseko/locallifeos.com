/**
 * @module server/plugins/admin-panel
 * Serves the minimal admin panel at GET /admin.
 * The HTML is a self-contained SPA that calls the /admin/v1/* API.
 * No build step required — vanilla HTML/CSS/JS.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PANEL_PATH = join(__dirname, '..', 'admin-panel.html');

export default async function adminPanelPlugin(app) {
  let cachedHtml = null;

  app.get('/admin', async (_req, reply) => {
    if (!cachedHtml) {
      cachedHtml = await readFile(PANEL_PATH, 'utf-8');
    }
    return reply.type('text/html').send(cachedHtml);
  });
}
