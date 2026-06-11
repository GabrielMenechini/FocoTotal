import { Router } from 'express';
import authRoutes from './auth.routes';
import produtosRoutes from './produtos.routes';
import clientesRoutes from './clientes.routes';
import vendasRoutes from './vendas.routes';
import estoqueRoutes from './estoque.routes';
import relatoriosRoutes from './relatorios.routes';
import usuariosRoutes from './usuarios.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/produtos', produtosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/vendas', vendasRoutes);
router.use('/estoque', estoqueRoutes);
router.use('/relatorios', relatoriosRoutes);
router.use('/usuarios', usuariosRoutes);
export default router;
