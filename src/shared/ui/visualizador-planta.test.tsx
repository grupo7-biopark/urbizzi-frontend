// Os nomes com `_` são internos do Leaflet, usados para testar o desenho das formas.
// oxlint-disable no-underscore-dangle
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import L from 'leaflet';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { VisualizadorPlanta, type MarcadorPlanta } from './visualizador-planta';
import VisualizadorPlantaLeaflet from './visualizador-planta-leaflet';

const PLANTA = {
  nome: 'Masterplan',
  larguraPx: 2048,
  alturaPx: 1024,
  maxZoom: 3,
  tamanhoTile: 256,
  tilesUrl: '/tiles/{z}/{x}/{y}.webp',
};

const MARCADORES: MarcadorPlanta[] = [
  { id: 'a', x: 0.25, y: 0.5, cor: '--status-disponivel' },
  { id: 'b', x: 0.75, y: 0.5, cor: '--status-vendido' },
];

/** O jsdom não tem layout: o mapa precisa de um tamanho para calcular o zoom. */
function simularTamanho(width = 800, height = 600) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    height,
  );
}

function espionarMarcadores() {
  const criados: L.CircleMarker[] = [];
  const original = L.circleMarker.bind(L);

  vi.spyOn(L, 'circleMarker').mockImplementation((...args) => {
    const marcador = original(...args);
    criados.push(marcador);
    return marcador;
  });

  return criados;
}

function espionarMapa() {
  const mapas: L.Map[] = [];
  const original = L.map.bind(L);

  vi.spyOn(L, 'map').mockImplementation((...args) => {
    const mapa = original(...args);
    mapas.push(mapa);
    return mapa;
  });

  return mapas;
}

beforeEach(() => {
  simularTamanho();
  // O jsdom não desenha: qualquer método do contexto do canvas não faz nada.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({}, { get: () => () => undefined }) as CanvasRenderingContext2D,
  );
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Ficam até o fim do arquivo: um efeito pode rodar depois do fim de um teste.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    addEventListener() {},
    removeEventListener() {},
  }));
});

describe('VisualizadorPlanta', () => {
  it('carrega o Leaflet só no navegador, mostrando o carregamento antes', async () => {
    render(<VisualizadorPlanta planta={PLANTA} />);

    expect(
      await screen.findByRole('application', { name: /Planta Masterplan/ }),
    ).toBeInTheDocument();
  });
});

describe('VisualizadorPlantaLeaflet', () => {
  it('tem os controles de zoom com nome acessível, sem violações', async () => {
    const { container } = render(<VisualizadorPlantaLeaflet planta={PLANTA} />);

    for (const nome of [
      'Aproximar',
      'Afastar',
      'Centralizar a planta',
      'Tela cheia',
    ]) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    await expectNoA11yViolations(container);
  });

  it('usa o CRS.Simple e a camada de tiles do contrato', () => {
    const mapas = espionarMapa();
    render(<VisualizadorPlantaLeaflet planta={PLANTA} />);

    const mapa = mapas[0] as L.Map;
    expect(mapa.options.crs).toBe(L.CRS.Simple);
    expect(mapa.getMaxZoom()).toBe(3);

    const camadas: L.TileLayer[] = [];
    mapa.eachLayer((camada) => {
      if (camada instanceof L.TileLayer) {
        camadas.push(camada);
      }
    });
    expect(camadas[0]?.options).toMatchObject({
      tileSize: 256,
      maxNativeZoom: 3,
      noWrap: true,
    });
  });

  it('aproxima e afasta, e os botões respeitam os limites', async () => {
    const mapas = espionarMapa();
    const user = userEvent.setup();
    render(<VisualizadorPlantaLeaflet planta={PLANTA} />);
    const mapa = mapas[0] as L.Map;
    const aproximar = screen.getByRole('button', { name: 'Aproximar' });

    // A planta cabe inteira na tela: é o menor zoom útil, e não dá para afastar.
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeDisabled();

    act(() => {
      mapa.setZoom(3, { animate: false });
    });
    await waitFor(() => expect(aproximar).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeEnabled();

    const zoomOut = vi.spyOn(mapa, 'zoomOut');
    await user.click(screen.getByRole('button', { name: 'Afastar' }));
    expect(zoomOut).toHaveBeenCalledOnce();
  });

  it('passa a forma ao marcador e aumenta o destacado', () => {
    const criados = espionarMarcadores();
    render(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={[
          { ...(MARCADORES[0] as MarcadorPlanta), forma: 'losango' },
          { ...(MARCADORES[1] as MarcadorPlanta), destacado: true },
        ]}
      />,
    );

    expect(criados[0]?.options).toMatchObject({ forma: 'losango', radius: 7 });
    expect(criados[1]?.getRadius()).toBeGreaterThan(7);
  });

  it('desenha cada forma no canvas', () => {
    const desenho = {
      beginPath: vi.fn<() => void>(),
      arc: vi.fn<() => void>(),
      lineTo: vi.fn<() => void>(),
      closePath: vi.fn<() => void>(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      new Proxy(desenho, {
        get: (alvo, nome) =>
          alvo[nome as keyof typeof desenho] ?? (() => undefined),
        set: () => true,
      }) as unknown as CanvasRenderingContext2D,
    );
    const criados = espionarMarcadores();
    render(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={[
          { ...(MARCADORES[0] as MarcadorPlanta), forma: 'quadrado' },
          { ...(MARCADORES[1] as MarcadorPlanta), forma: 'circulo' },
        ]}
      />,
    );
    const interno = criados[0]?.options.renderer as unknown as {
      _drawing: boolean;
      _updateCircle: (marcador: L.CircleMarker) => void;
    };

    interno._drawing = true;
    interno._updateCircle(criados[0] as L.CircleMarker);
    expect(desenho.lineTo).toHaveBeenCalledTimes(4);
    expect(desenho.closePath).toHaveBeenCalledOnce();

    interno._updateCircle(criados[1] as L.CircleMarker);
    expect(desenho.arc).toHaveBeenCalledOnce();
  });

  it('aproxima até o zoom máximo ao receber um foco', () => {
    const mapas = espionarMapa();
    const { rerender } = render(<VisualizadorPlantaLeaflet planta={PLANTA} />);
    const setView = vi.spyOn(mapas[0] as L.Map, 'setView');

    expect(setView).not.toHaveBeenCalled();

    rerender(
      <VisualizadorPlantaLeaflet planta={PLANTA} foco={{ x: 0.25, y: 0.5 }} />,
    );

    expect(setView).toHaveBeenCalledWith([-64, 64], 3);
  });

  it('centraliza a planta', async () => {
    const mapas = espionarMapa();
    const user = userEvent.setup();
    render(<VisualizadorPlantaLeaflet planta={PLANTA} />);
    const fitBounds = vi.spyOn(mapas[0] as L.Map, 'fitBounds');

    await user.click(
      screen.getByRole('button', { name: 'Centralizar a planta' }),
    );

    expect(fitBounds).toHaveBeenCalledOnce();
  });

  it('desenha os marcadores na posição convertida e avisa o clique', () => {
    const criados = espionarMarcadores();
    const onMarcadorClick = vi.fn<(id: string) => void>();
    render(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={MARCADORES}
        onMarcadorClick={onMarcadorClick}
      />,
    );

    expect(criados).toHaveLength(2);
    expect(criados[0]?.getLatLng()).toMatchObject({ lat: -64, lng: 64 });

    criados[1]?.fire('click');

    expect(onMarcadorClick).toHaveBeenCalledWith('b');
  });

  it('troca os marcadores sem recriar o mapa', () => {
    const mapas = espionarMapa();
    const criados = espionarMarcadores();
    const { rerender } = render(
      <VisualizadorPlantaLeaflet planta={PLANTA} marcadores={MARCADORES} />,
    );

    rerender(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={[MARCADORES[0] as MarcadorPlanta]}
      />,
    );

    expect(mapas).toHaveLength(1);
    expect(criados).toHaveLength(3);
    const mapa = mapas[0] as L.Map;
    expect(mapa.hasLayer(criados[0] as L.CircleMarker)).toBe(false);
    expect(mapa.hasLayer(criados[2] as L.CircleMarker)).toBe(true);
  });

  it('usa o callback mais recente sem recriar os marcadores', () => {
    const criados = espionarMarcadores();
    const primeiro = vi.fn<(id: string) => void>();
    const segundo = vi.fn<(id: string) => void>();
    const { rerender } = render(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={MARCADORES}
        onMarcadorClick={primeiro}
      />,
    );

    rerender(
      <VisualizadorPlantaLeaflet
        planta={PLANTA}
        marcadores={MARCADORES}
        onMarcadorClick={segundo}
      />,
    );
    criados[0]?.fire('click');

    expect(criados).toHaveLength(2);
    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledWith('a');
  });

  it('remove o mapa ao sair da tela', () => {
    const mapas = espionarMapa();
    const { unmount } = render(<VisualizadorPlantaLeaflet planta={PLANTA} />);
    const remove = vi.spyOn(mapas[0] as L.Map, 'remove');

    unmount();

    expect(remove).toHaveBeenCalledOnce();
  });

  it('entra e sai da tela cheia', async () => {
    const user = userEvent.setup();
    const entrar = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const sair = vi.fn<() => Promise<void>>(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = entrar;
    document.exitFullscreen = sair;
    const { container } = render(<VisualizadorPlantaLeaflet planta={PLANTA} />);

    await user.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(entrar).toHaveBeenCalledOnce();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: container.firstElementChild,
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    await user.click(
      screen.getByRole('button', { name: 'Sair da tela cheia' }),
    );
    expect(sair).toHaveBeenCalledOnce();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
  });

  it('esconde a tela cheia onde o navegador não oferece', () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: false,
    });

    render(<VisualizadorPlantaLeaflet planta={PLANTA} />);

    expect(
      screen.queryByRole('button', { name: 'Tela cheia' }),
    ).not.toBeInTheDocument();
  });
});
