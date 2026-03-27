import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import workoutRoutes from './routes/workout.routes';
import sessionRoutes from './routes/session.routes';
import aiRoutes from './routes/ai.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
