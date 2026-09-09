/**
 * @module server/plugins/weather
 * Weather proxy — moved from legacy serve.mjs into Fastify pipeline.
 * SSRF allow-listed to api.openweathermap.org only.
 * Key read from env (server-side only), rate-limited by Fastify plugin.
 */
import { URL } from 'node:url';

const ALLOWED_HOST = 'api.openweathermap.org';

export default async function weatherPlugin(app) {
  app.get('/api/weather', async (req, reply) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return reply.code(500).send({ error: 'OPENWEATHER_API_KEY not set' });
    }

    const { lat, lon, units = 'metric' } = req.query ?? {};
    if (!lat || !lon) {
      return reply.code(400).send({ error: 'lat and lon are required' });
    }

    // Build upstream URL and validate host (SSRF guard)
    const target = new URL('https://api.openweathermap.org/data/2.5/weather');
    target.searchParams.set('lat', lat);
    target.searchParams.set('lon', lon);
    target.searchParams.set('appid', apiKey);
    target.searchParams.set('units', units);

    if (target.hostname !== ALLOWED_HOST) {
      return reply.code(400).send({ error: 'Invalid upstream host' });
    }

    try {
      const upstream = await fetch(target.toString(), {
        signal: AbortSignal.timeout(5000),
      });
      const json = await upstream.json();
      return reply
        .code(upstream.status)
        .header('Content-Type', 'application/json')
        .header('Cache-Control', 'public, max-age=300')
        .send(json);
    } catch (err) {
      app.log.warn({ err: err.message }, 'Weather upstream unavailable');
      return reply.code(502).send({ error: 'weather upstream unavailable' });
    }
  });
}
