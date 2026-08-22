import { buildApp } from './app.mjs';

const port = Number(process.env.PORT_API ?? 3001);
const app = await buildApp({ prettyLogs: process.env.NODE_ENV !== 'production' });

app.listen({ port, host: '127.0.0.1' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
