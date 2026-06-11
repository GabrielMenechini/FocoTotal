/**
 * SOLID – SRP (Single Responsibility Principle)
 * Esta classe tem UMA responsabilidade: registrar logs em arquivo.
 *
 * IMPLEMENTAÇÃO DE LOCK:
 * A propriedade `locked` age como mutex. Enquanto uma escrita está em andamento,
 * novas chamadas ficam enfileiradas em `queue` e executam sequencialmente após
 * a liberação do lock. Isso garante que linhas de log não se misturem em
 * cenários de alta concorrência (múltiplas requisições simultâneas).
 */
import fs from 'fs';
import path from 'path';

class Logger {
  private logDir: string;
  private locked: boolean;
  private queue: Array<() => void>;

  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.locked = false;
    this.queue = [];
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Adquire o lock antes de escrever
  private acquireLock(callback: () => void): void {
    if (!this.locked) {
      this.locked = true;
      callback();
    } else {
      this.queue.push(callback);
    }
  }

  // Libera o lock e executa o próximo da fila
  private releaseLock(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }

  private escrever(nivel: string, mensagem: string, dados?: unknown): void {
    this.acquireLock(() => {
      try {
        const agora = new Date();
        const dataArquivo = agora.toISOString().split('T')[0];
        const arquivo = path.join(this.logDir, `focototal-${dataArquivo}.log`);
        const entrada =
          JSON.stringify({
            timestamp: agora.toISOString(),
            nivel,
            mensagem,
            dados: dados ?? null,
          }) + '\n';
        fs.appendFileSync(arquivo, entrada, 'utf8');
      } finally {
        this.releaseLock();
      }
    });
  }

  info(mensagem: string, dados?: unknown): void {
    this.escrever('INFO', mensagem, dados);
    console.log(`[INFO] ${mensagem}`);
  }

  erro(mensagem: string, dados?: unknown): void {
    this.escrever('ERRO', mensagem, dados);
    console.error(`[ERRO] ${mensagem}`);
  }

  aviso(mensagem: string, dados?: unknown): void {
    this.escrever('AVISO', mensagem, dados);
    console.warn(`[AVISO] ${mensagem}`);
  }
}

export const logger = new Logger();
