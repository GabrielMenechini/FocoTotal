-- ============================================================
-- FOCOTOTAL – Migration v4 – Despesas da Empresa
-- Execute após migration_v3.sql (ou sobre o banco existente)
-- ============================================================

USE focototal;

CREATE TABLE IF NOT EXISTS despesas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  tipo             ENUM('compra_estoque','despesa_administrativa','pagamento_fornecedor','outro')
                   NOT NULL DEFAULT 'compra_estoque',
  categoria        VARCHAR(80) NOT NULL,
  descricao        TEXT,
  fornecedor       VARCHAR(150),
  produto_id       INT DEFAULT NULL,
  quantidade       DECIMAL(10,2) NOT NULL DEFAULT 1,
  valor_unitario   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  valor_total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  data_competencia DATE NOT NULL,
  usuario_id       INT NOT NULL,
  observacoes      TEXT,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  INDEX idx_tipo        (tipo),
  INDEX idx_categoria   (categoria),
  INDEX idx_data        (data_competencia),
  INDEX idx_usuario     (usuario_id),
  INDEX idx_criado_em   (criado_em)
) ENGINE=InnoDB;

-- Dados de exemplo (inseridos apenas se a tabela estiver vazia)
INSERT INTO despesas (tipo, categoria, descricao, fornecedor, quantidade, valor_unitario, valor_total, data_competencia, usuario_id)
SELECT 'compra_estoque', 'Armação', 'Compra de armações titanium', 'ÓticaPro Distribuidora', 10, 45.00, 450.00, CURDATE(), u.id
FROM usuarios u WHERE u.cargo = 'admin'
AND (SELECT COUNT(*) FROM despesas) = 0 LIMIT 1;

INSERT INTO despesas (tipo, categoria, descricao, fornecedor, quantidade, valor_unitario, valor_total, data_competencia, usuario_id)
SELECT 'compra_estoque', 'Lente', 'Lentes progressivas premium', 'LensFactory Brasil', 5, 90.00, 450.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY), u.id
FROM usuarios u WHERE u.cargo = 'admin'
AND (SELECT COUNT(*) FROM despesas) = 1 LIMIT 1;

INSERT INTO despesas (tipo, categoria, descricao, fornecedor, quantidade, valor_unitario, valor_total, data_competencia, usuario_id)
SELECT 'despesa_administrativa', 'Aluguel', 'Aluguel da loja – mensal', NULL, 1, 1800.00, 1800.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY), u.id
FROM usuarios u WHERE u.cargo = 'admin'
AND (SELECT COUNT(*) FROM despesas) = 2 LIMIT 1;

INSERT INTO despesas (tipo, categoria, descricao, fornecedor, quantidade, valor_unitario, valor_total, data_competencia, usuario_id)
SELECT 'pagamento_fornecedor', 'Fornecedor', 'Pagamento parcial ÓticaPro', 'ÓticaPro Distribuidora', 1, 600.00, 600.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY), u.id
FROM usuarios u WHERE u.cargo = 'admin'
AND (SELECT COUNT(*) FROM despesas) = 3 LIMIT 1;

INSERT INTO despesas (tipo, categoria, descricao, fornecedor, quantidade, valor_unitario, valor_total, data_competencia, usuario_id)
SELECT 'compra_estoque', 'Acessório', 'Estojos rígidos e cordões', 'AcessóriosÓtica', 20, 5.00, 100.00, CURDATE(), u.id
FROM usuarios u WHERE u.cargo = 'admin'
AND (SELECT COUNT(*) FROM despesas) = 4 LIMIT 1;
