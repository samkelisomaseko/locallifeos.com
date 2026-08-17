import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 5173,
      strictPort: false,
    },
    build: {
      target: 'es2017',
      assetsInlineLimit: 4096,
    },
    preview: {
      port: 4173,
      strictPort: false,
    },
    define: {
      __OPENWEATHER_API_KEY__: JSON.stringify(env.OPENWEATHER_API_KEY || ''),
    },
    plugins: [
      {
        name: 'weather-proxy',
        configureServer(server) {
          server.middlewares.use('/api/weather', (req, res) => {
            const apiKey = env.OPENWEATHER_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'OPENWEATHER_API_KEY not set' }));
              return;
            }
            const url = new URL(req.url, `http://${req.headers.host}`);
            const lat = url.searchParams.get('lat');
            const lon = url.searchParams.get('lon');
            const units = url.searchParams.get('units') || 'metric';
            if (!lat || !lon) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'lat and lon are required' }));
              return;
            }
            const target = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(apiKey)}&units=${units}`;
            fetch(target)
              .then((upstream) => upstream.json())
              .then((json) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.end(JSON.stringify(json));
              })
              .catch(() => {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'weather upstream unavailable' }));
              });
          });
        },
      },
    ],
  };
});