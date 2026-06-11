import { Router } from 'express';
import { ClientesController } from '../controllers/ClientesController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);
router.get('/', ClientesController.listar);
router.get('/:id', ClientesController.buscarPorId);
router.post('/', ClientesController.criar);
router.put('/:id', ClientesController.atualizar);
router.delete('/:id', ClientesController.excluir);
export default router;
