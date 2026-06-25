-- =================================================================
-- FOCOTOTAL – Migração v3
-- Execute APÓS migration_v2.sql
-- =================================================================

USE focototal;

-- ── 1. Adiciona motivo_cancelamento em vendas ─────────────────────
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT DEFAULT NULL AFTER observacoes;

-- ── 2. Adiciona parcelas em vendas ────────────────────────────────
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS parcelas TINYINT UNSIGNED NOT NULL DEFAULT 1
  AFTER forma_pagamento;

-- ── 3. Remove perfis vendedor / estoquista (somente admin) ────────
-- Primeiro converte todos os registros existentes
UPDATE usuarios SET cargo = 'admin' WHERE cargo != 'admin';

-- Depois altera o ENUM para aceitar apenas 'admin'
ALTER TABLE usuarios
  MODIFY COLUMN cargo ENUM('admin') NOT NULL DEFAULT 'admin';

-- ── 4. Padroniza valores de forma_pagamento (uppercase interno) ───
-- Apenas se a coluna já existir (migration_v2 já devia ter criado)
UPDATE vendas SET forma_pagamento = 'DINHEIRO'
  WHERE LOWER(forma_pagamento) IN ('dinheiro', 'dinhero');

UPDATE vendas SET forma_pagamento = 'PIX'
  WHERE LOWER(forma_pagamento) = 'pix';

UPDATE vendas SET forma_pagamento = 'CARTAO_CREDITO'
  WHERE forma_pagamento LIKE '%r%dito%'
     OR LOWER(forma_pagamento) = 'cartão de crédito'
     OR LOWER(forma_pagamento) = 'cartao_credito';

UPDATE vendas SET forma_pagamento = 'CARTAO_DEBITO'
  WHERE forma_pagamento LIKE '%bito%'
     OR LOWER(forma_pagamento) = 'cartão de débito'
     OR LOWER(forma_pagamento) = 'cartao_debito';

UPDATE vendas SET forma_pagamento = 'BOLETO'
  WHERE LOWER(forma_pagamento) = 'boleto';

UPDATE vendas SET forma_pagamento = 'CHEQUE'
  WHERE LOWER(forma_pagamento) = 'cheque';

-- Índice para forma_pagamento (se não existir)
CREATE INDEX IF NOT EXISTS idx_forma_pagamento ON vendas (forma_pagamento);

-- =================================================================
-- FIM DA MIGRAÇÃO v3
-- =================================================================
