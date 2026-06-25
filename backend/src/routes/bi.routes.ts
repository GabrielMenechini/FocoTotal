import { Router } from 'express';
import { BiController } from '../controllers/BiController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);

router.get('/insights', BiController.insights);

export default router;
