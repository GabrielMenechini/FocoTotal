import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Servidor FocoTotal iniciado na porta ${PORT}`);
});

export default app;
