/**
 * Substitui o `EventSource` do navegador nos testes de componente:
 *
 *   vi.stubGlobal('EventSource', EventSourceFalso);
 *
 * O teste abre, falha e emite eventos manualmente, sem rede.
 */
export class EventSourceFalso extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  static instancias: EventSourceFalso[] = [];

  static limpar() {
    EventSourceFalso.instancias = [];
  }

  readyState: number = EventSourceFalso.CONNECTING;
  readonly url: string;
  withCredentials = false;

  constructor(url: string) {
    super();
    this.url = url;
    EventSourceFalso.instancias.push(this);
  }

  close() {
    this.readyState = EventSourceFalso.CLOSED;
  }

  get fechado() {
    return this.readyState === EventSourceFalso.CLOSED;
  }

  abrir() {
    this.readyState = EventSourceFalso.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  falhar() {
    this.dispatchEvent(new Event('error'));
  }

  emitir(tipo: string, dados: unknown = {}) {
    this.emitirBruto(tipo, JSON.stringify(dados));
  }

  emitirBruto(tipo: string, dados: string) {
    this.dispatchEvent(new MessageEvent(tipo, { data: dados }));
  }
}
