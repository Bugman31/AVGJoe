import { env } from './config/env';
import app from './app';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`[AVGJoe] Server running on port ${PORT} (${env.NODE_ENV})`);
  console.log(`[AVGJoe] Health check: http://localhost:${PORT}/health`);
});
