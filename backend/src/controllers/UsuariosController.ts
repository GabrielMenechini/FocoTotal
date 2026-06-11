import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { logger } from '../utils/logger';
import { ValidatorService } from '../utils/validators';

export class UsuariosController {
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(
        'SELECT id, nome, email, cargo, ativo, criado_em FROM usuarios ORDER BY nome'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
  }

  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, email, senha, cargo } = req.body;

      if (
        !ValidatorService.campoObrigatorio(nome) ||
        !ValidatorService.campoObrigatorio(email) ||
        !ValidatorService.campoObrigatorio(senha) ||
        !ValidatorService.campoObrigatorio(cargo)
      ) {
        res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
        return;
      }
      if (!ValidatorService.validarEmail(email)) {
        res.status(400).json({ erro: 'Email inválido' });
        return;
      }
      if (!['admin', 'vendedor', 'estoquista'].includes(cargo)) {
        res.status(400).json({ erro: 'Cargo inválido' });
        return;
      }
      if (String(senha).length < 6) {
        res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
        return;
      }

      const [existente] = await db.query(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
      );
      if ((existente as any[]).length > 0) {
        res.status(409).json({ erro: 'Email já cadastrado' });
        return;
      }

      const senhaHash = await bcrypt.hash(senha, 10);
      const [result] = await db.query(
        'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
        [nome, email, senhaHash, cargo]
      );
      logger.info('Usuário criado', { usuarioId: (result as any).insertId, cargo });
      res.status(201).json({ id: (result as any).insertId, mensagem: 'Usuário criado com sucesso' });
    } catch (err) {
      logger.erro('Erro ao criar usuário', err);
      res.status(500).json({ erro: 'Erro ao criar usuário' });
    }
  }

  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cargo, ativo } = req.body;
      if (!ValidatorService.campoObrigatorio(nome)) {
        res.status(400).json({ erro: 'Nome é obrigatório' });
        return;
      }
      const [result] = await db.query(
        'UPDATE usuarios SET nome=?, cargo=?, ativo=? WHERE id=?',
        [nome, cargo, ativo ? 1 : 0, req.params.id]
      );
      const r = result as any;
      if (r.affectedRows === 0) {
        res.status(404).json({ erro: 'Usuário não encontrado' });
        return;
      }
      logger.info('Usuário atualizado', { usuarioId: req.params.id });
      res.json({ mensagem: 'Usuário atualizado com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao atualizar usuário' });
    }
  }

  static async alterarSenha(req: Request, res: Response): Promise<void> {
    try {
      const { senha_atual, senha_nova } = req.body;
      if (!senha_atual || !senha_nova || String(senha_nova).length < 6) {
        res.status(400).json({ erro: 'Senha nova deve ter pelo menos 6 caracteres' });
        return;
      }
      const [rows] = await db.query(
        'SELECT senha FROM usuarios WHERE id = ?',
        [req.params.id]
      );
      const usuario = (rows as any[])[0];
      if (!usuario) {
        res.status(404).json({ erro: 'Usuário não encontrado' });
        return;
      }
      const senhaOk = await bcrypt.compare(senha_atual, usuario.senha);
      if (!senhaOk) {
        res.status(401).json({ erro: 'Senha atual incorreta' });
        return;
      }
      const hash = await bcrypt.hash(senha_nova, 10);
      await db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [hash, req.params.id]);
      res.json({ mensagem: 'Senha alterada com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao alterar senha' });
    }
  }
}
