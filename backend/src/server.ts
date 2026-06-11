import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) =>
  res.json({ status: 'ok', sistema: 'FocoTotal', versao: '1.0.0' })
);

app.use('/api', routes);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Servidor FocoTotal iniciado na porta ${PORT}`);
});

export default app;
