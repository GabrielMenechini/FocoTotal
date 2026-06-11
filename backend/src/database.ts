import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'focototal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((conn) => {
    logger.info('Banco de dados conectado com sucesso');
    conn.release();
  })
  .catch((err) => {
    logger.erro('Falha ao conectar com banco de dados', err.message);
  });

export default pool;
