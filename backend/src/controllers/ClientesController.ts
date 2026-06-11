import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';
import { ValidatorService } from '../utils/validators';

export class ClientesController {
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const { busca } = req.query;
      let query =
        'SELECT id, nome, cpf, cnpj, email, telefone, cidade, estado FROM clientes WHERE ativo = 1';
      const params: unknown[] = [];
      if (busca) {
        query += ' AND (nome LIKE ? OR cpf LIKE ? OR email LIKE ?)';
        params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      }
      query += ' ORDER BY nome ASC';
      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (err) {
      logger.erro('Erro ao listar clientes', err);
      res.status(500).json({ erro: 'Erro ao listar clientes' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(
        'SELECT * FROM clientes WHERE id = ? AND ativo = 1',
        [req.params.id]
      );
      const lista = rows as any[];
      if (lista.length === 0) {
        res.status(404).json({ erro: 'Cliente não encontrado' });
        return;
      }
      res.json(lista[0]);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar cliente' });
    }
  }

  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cpf, cnpj, email, telefone, cep, endereco, cidade, estado } = req.body;

      if (!ValidatorService.campoObrigatorio(nome) || !ValidatorService.campoObrigatorio(telefone)) {
        res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
        return;
      }
      if (cpf && !ValidatorService.validarCPF(cpf)) {
        res.status(400).json({ erro: 'CPF inválido' });
        return;
      }
      if (cnpj && !ValidatorService.validarCNPJ(cnpj)) {
        res.status(400).json({ erro: 'CNPJ inválido' });
        return;
      }
      if (email && !ValidatorService.validarEmail(email)) {
        res.status(400).json({ erro: 'Email inválido' });
        return;
      }

      const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
      if (cpfLimpo) {
        const [existente] = await db.query(
          'SELECT id FROM clientes WHERE cpf = ? AND ativo = 1',
          [cpfLimpo]
        );
        if ((existente as any[]).length > 0) {
          res.status(409).json({ erro: 'CPF já cadastrado' });
          return;
        }
      }

      const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;
      const cepLimpo = cep ? cep.replace(/\D/g, '') : null;

      const [result] = await db.query(
        'INSERT INTO clientes (nome, cpf, cnpj, email, telefone, cep, endereco, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nome, cpfLimpo, cnpjLimpo, email || null, telefone, cepLimpo, endereco || null, cidade || null, estado || null]
      );
      const r = result as any;
      logger.info('Cliente criado', { clienteId: r.insertId, nome });
      res.status(201).json({ id: r.insertId, mensagem: 'Cliente criado com sucesso' });
    } catch (err) {
      logger.erro('Erro ao criar cliente', err);
      res.status(500).json({ erro: 'Erro ao criar cliente' });
    }
  }

  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cpf, cnpj, email, telefone, cep, endereco, cidade, estado } = req.body;

      if (!ValidatorService.campoObrigatorio(nome)) {
        res.status(400).json({ erro: 'Nome é obrigatório' });
        return;
      }
      if (cpf && !ValidatorService.validarCPF(cpf)) {
        res.status(400).json({ erro: 'CPF inválido' });
        return;
      }
      if (cnpj && !ValidatorService.validarCNPJ(cnpj)) {
        res.status(400).json({ erro: 'CNPJ inválido' });
        return;
      }
      if (email && !ValidatorService.validarEmail(email)) {
        res.status(400).json({ erro: 'Email inválido' });
        return;
      }

      const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
      const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;
      const cepLimpo = cep ? cep.replace(/\D/g, '') : null;

      const [result] = await db.query(
        'UPDATE clientes SET nome=?, cpf=?, cnpj=?, email=?, telefone=?, cep=?, endereco=?, cidade=?, estado=? WHERE id=? AND ativo=1',
        [nome, cpfLimpo, cnpjLimpo, email || null, telefone, cepLimpo, endereco || null, cidade || null, estado || null, req.params.id]
      );
      const r = result as any;
      if (r.affectedRows === 0) {
        res.status(404).json({ erro: 'Cliente não encontrado' });
        return;
      }
      logger.info('Cliente atualizado', { clienteId: req.params.id });
      res.json({ mensagem: 'Cliente atualizado com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao atualizar cliente' });
    }
  }

  static async excluir(req: Request, res: Response): Promise<void> {
    try {
      const [result] = await db.query(
        'UPDATE clientes SET ativo=0 WHERE id=?',
        [req.params.id]
      );
      const r = result as any;
      if (r.affectedRows === 0) {
        res.status(404).json({ erro: 'Cliente não encontrado' });
        return;
      }
      logger.info('Cliente desativado', { clienteId: req.params.id });
      res.json({ mensagem: 'Cliente excluído com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao excluir cliente' });
    }
  }
}
