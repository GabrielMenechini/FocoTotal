import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.erro(`Erro na rota ${req.method} ${req.path}`, err.message);
  res.status(500).json({ erro: 'Erro interno do servidor', detalhe: err.message });
};
