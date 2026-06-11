import { Router } from 'express';
import { UsuariosController } from '../controllers/UsuariosController';
import { autenticar, exigirCargo } from '../middlewares/auth';

const router = Router();
router.use(autenticar);
router.get('/', exigirCargo('admin'), UsuariosController.listar);
router.post('/', exigirCargo('admin'), UsuariosController.criar);
router.put('/:id', exigirCargo('admin'), UsuariosController.atualizar);
router.patch('/:id/senha', UsuariosController.alterarSenha);
export default router;
