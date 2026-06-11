import { Router } from 'express';
import { ProdutosController } from '../controllers/ProdutosController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);
router.get('/alertas', ProdutosController.alertasEstoque);
router.get('/', ProdutosController.listar);
router.get('/:id', ProdutosController.buscarPorId);
router.post('/', ProdutosController.criar);
router.put('/:id', ProdutosController.atualizar);
router.delete('/:id', ProdutosController.excluir);
export default router;
