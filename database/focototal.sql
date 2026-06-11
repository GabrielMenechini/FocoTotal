-- =================================================================
-- FOCOTOTAL – Sistema de Gestão para Ótica
-- Script de criação do banco de dados MySQL
-- Execute este script no DBeaver ou MySQL Workbench
-- =================================================================

CREATE DATABASE IF NOT EXISTS focototal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE focototal;

-- -----------------------------------------------------------------
-- USUÁRIOS DO SISTEMA
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  senha       VARCHAR(255) NOT NULL,             -- bcrypt hash
  cargo       ENUM('admin','vendedor','estoquista') NOT NULL DEFAULT 'vendedor',
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_cargo (cargo)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- PRODUTOS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codigo              VARCHAR(30) NOT NULL UNIQUE,
  nome                VARCHAR(150) NOT NULL,
  descricao           TEXT,
  categoria           VARCHAR(80) NOT NULL,
  preco_custo         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  preco_venda         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantidade_estoque  INT NOT NULL DEFAULT 0,
  estoque_minimo      INT NOT NULL DEFAULT 5,
  ativo               TINYINT(1) NOT NULL DEFAULT 1,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_categoria (categoria),
  INDEX idx_estoque (quantidade_estoque, estoque_minimo)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(150) NOT NULL,
  cpf       CHAR(11),                            -- apenas números
  cnpj      CHAR(14),                            -- apenas números
  email     VARCHAR(150),
  telefone  VARCHAR(20) NOT NULL,
  cep       CHAR(8),
  endereco  VARCHAR(200),
  cidade    VARCHAR(100),
  estado    CHAR(2),
  ativo     TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nome (nome),
  INDEX idx_cpf  (cpf),
  INDEX idx_cnpj (cnpj)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- VENDAS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id   INT,
  usuario_id   INT NOT NULL,
  valor_total  DECIMAL(10,2) NOT NULL,
  desconto     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  valor_final  DECIMAL(10,2) NOT NULL,
  status       ENUM('pendente','concluida','cancelada') NOT NULL DEFAULT 'concluida',
  observacoes  TEXT,
  criado_em    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id)  REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  INDEX idx_status    (status),
  INDEX idx_criado_em (criado_em),
  INDEX idx_usuario   (usuario_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- ITENS DA VENDA
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens_venda (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  venda_id       INT NOT NULL,
  produto_id     INT NOT NULL,
  quantidade     INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal       DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venda_id)   REFERENCES vendas(id)   ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_venda   (venda_id),
  INDEX idx_produto (produto_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- MOVIMENTAÇÕES DE ESTOQUE
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  produto_id  INT NOT NULL,
  tipo        ENUM('entrada','saida') NOT NULL,
  quantidade  INT NOT NULL,
  motivo      VARCHAR(255) NOT NULL,
  usuario_id  INT NOT NULL,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_produto   (produto_id),
  INDEX idx_tipo      (tipo),
  INDEX idx_criado_em (criado_em)
) ENGINE=InnoDB;

-- =================================================================
-- DADOS INICIAIS
-- =================================================================

-- Usuário admin padrão (senha: admin123)
-- Hash gerado com bcrypt, custo 10
INSERT INTO usuarios (nome, email, senha, cargo) VALUES
('Administrador', 'admin@focototal.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- OBS: A senha acima é o hash bcrypt de "password" (padrão de teste).
-- Para gerar o hash real de "admin123", execute no terminal:
--   node -e "const b=require('bcryptjs');b.hash('admin123',10).then(h=>console.log(h))"
-- E substitua o valor acima.

-- Usuário vendedor
INSERT INTO usuarios (nome, email, senha, cargo) VALUES
('Maria Vendedora', 'maria@focototal.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendedor');

-- Usuário estoquista
INSERT INTO usuarios (nome, email, senha, cargo) VALUES
('João Estoquista', 'joao@focototal.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estoquista');

-- Produtos de exemplo
INSERT INTO produtos (codigo, nome, categoria, preco_custo, preco_venda, quantidade_estoque, estoque_minimo) VALUES
('ARM001', 'Armação Titanium Classic', 'Armação', 45.00, 120.00, 15, 5),
('ARM002', 'Armação Acetato Redonda', 'Armação', 30.00, 85.00, 8, 5),
('SOL001', 'Óculos Solar Polarizado UV400', 'Solar', 60.00, 180.00, 12, 3),
('SOL002', 'Óculos Solar Esportivo', 'Solar', 35.00, 99.00, 4, 3),
('LEN001', 'Lente Monofocal Básica', 'Lente', 25.00, 80.00, 30, 10),
('LEN002', 'Lente Progressiva Premium', 'Lente', 90.00, 280.00, 10, 5),
('LEN003', 'Lente Anti-Reflexo', 'Lente', 40.00, 130.00, 20, 8),
('EST001', 'Estojo Rígido Básico', 'Acessório', 5.00, 18.00, 25, 10),
('LIM001', 'Spray Limpador de Lentes 60ml', 'Acessório', 4.00, 15.00, 3, 10),
('COR001', 'Cordão para Óculos', 'Acessório', 2.00, 8.00, 40, 15);

-- Clientes de exemplo
INSERT INTO clientes (nome, cpf, email, telefone, cidade, estado) VALUES
('Carlos Mendes', '52998224725', 'carlos@email.com', '11987654321', 'São Paulo', 'SP'),
('Ana Paula Silva', '87748248800', 'ana@email.com', '11912345678', 'São Paulo', 'SP'),
('Roberto Costa', NULL, 'roberto@email.com', '11955556666', 'Campinas', 'SP');

-- =================================================================
-- FIM DO SCRIPT
-- =================================================================
