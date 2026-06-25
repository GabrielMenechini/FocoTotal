-- =================================================================
-- FOCOTOTAL – Migração v2
-- Execute APÓS o script focototal.sql já ter sido executado
-- =================================================================

USE focototal;

-- Adiciona forma de pagamento nas vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50) NOT NULL DEFAULT 'Dinheiro' AFTER valor_final;

-- Índice para relatórios por forma de pagamento
ALTER TABLE vendas
  ADD INDEX IF NOT EXISTS idx_forma_pagamento (forma_pagamento);

-- =================================================================
-- FIM DA MIGRAÇÃO v2
-- =================================================================
