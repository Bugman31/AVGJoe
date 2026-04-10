import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import authRoutes from './routes/auth.routes';
import workoutRoutes from './routes/workout.routes';
import sessionRoutes from './routes/session.routes';
import aiRoutes from './routes/ai.routes';
import profileRoutes from './routes/profile.routes';
import exerciseRoutes from './routes/exercise.routes';
import programRoutes from './routes/program.routes';
import analysisRoutes from './routes/analysis.routes';
import bodyRoutes from './routes/body.routes';
import sharedProgramRoutes from './routes/sharedProgram.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Security headers
app.use(helmet());

// Request logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Gzip compression
app.use(compression());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    maxAge: 86400,
  })
);

// Body parsing — 50kb limit to prevent payload DoS
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/body', bodyRoutes);
app.use('/api/shared-programs', sharedProgramRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
