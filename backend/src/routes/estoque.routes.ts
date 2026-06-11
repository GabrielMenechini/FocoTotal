import { Router } from 'express';
import { EstoqueController } from '../controllers/EstoqueController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);
router.get('/', EstoqueController.listarMovimentacoes);
router.post('/', EstoqueController.registrarMovimentacao);
export default router;
