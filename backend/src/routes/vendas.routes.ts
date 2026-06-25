import { Router } from 'express';
import { VendasController } from '../controllers/VendasController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);

router.get ('/',              VendasController.listar);
router.get ('/:id',           VendasController.buscarPorId);
router.post('/',              VendasController.criar);
router.put ('/:id',           VendasController.editar);
router.patch('/:id/cancelar', VendasController.cancelar);

export default router;
