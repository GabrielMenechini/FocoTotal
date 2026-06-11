import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { logger } from '../utils/logger';
import { ValidatorService } from '../utils/validators';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, senha } = req.body;

      if (!ValidatorService.campoObrigatorio(email) || !ValidatorService.campoObrigatorio(senha)) {
        res.status(400).json({ erro: 'Email e senha são obrigatórios' });
        return;
      }
      if (!ValidatorService.validarEmail(email)) {
        res.status(400).json({ erro: 'Email inválido' });
        return;
      }

      const [rows] = await db.query(
        'SELECT * FROM usuarios WHERE email = ? AND ativo = 1',
        [email]
      );
      const usuarios = rows as any[];

      if (usuarios.length === 0) {
        res.status(401).json({ erro: 'Credenciais inválidas' });
        return;
      }

      const usuario = usuarios[0];
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        res.status(401).json({ erro: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign(
        { id: usuario.id, nome: usuario.nome, cargo: usuario.cargo },
        process.env.JWT_SECRET || 'focototal_secret',
        { expiresIn: '8h' }
      );

      logger.info('Login realizado', { usuarioId: usuario.id, cargo: usuario.cargo });
      res.json({
        token,
        usuario: { id: usuario.id, nome: usuario.nome, cargo: usuario.cargo },
      });
    } catch (err) {
      logger.erro('Erro no login', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  }
}
