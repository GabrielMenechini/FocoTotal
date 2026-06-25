import { Router } from 'express';
import { RelatoriosController } from '../controllers/RelatoriosController';
import { autenticar } from '../middlewares/auth';

const router = Router();
router.use(autenticar);

router.get('/dashboard',     RelatoriosController.resumoDashboard);
router.get('/dashboard-bi',  RelatoriosController.dashboardBi);
router.get('/caixa',         RelatoriosController.resumoCaixa);
router.get('/mais-vendidos',    RelatoriosController.produtosMaisVendidos);
router.get('/movimentacoes',    RelatoriosController.movimentacoesEstoque);
router.get('/margem-lucro',     RelatoriosController.margemLucro);
export default router;
