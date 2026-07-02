import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) =>
  res.json({ status: 'ok', sistema: 'FocoTotal', versao: '1.0.0' })
);

app.use('/api', routes);
app.use(errorHandler);

export default app;
