import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EditorAreaGeografica } from './editor-area-geografica';
vi.mock('./mapa-geografico', () => ({
  MapaGeografico: ({
    vertices,
    destino,
    onChange,
  }: {
    vertices: number[][];
    destino?: { latitude: number };
    onChange: (v: number[][]) => void;
  }) => (
    <div>
      <output data-testid="mapa">
        {JSON.stringify({ vertices, destino })}
      </output>
      <button
        type="button"
        onClick={() => onChange([...(vertices ?? []), [1, 1]])}
      >
        Ponto de teste
      </button>
    </div>
  ),
}));
function Harness({
  buscar = vi
    .fn<
      (
        q: string,
      ) => Promise<{ nome: string; latitude: number; longitude: number }[]>
    >()
    .mockResolvedValue([]),
}: {
  buscar?: (
    q: string,
  ) => Promise<{ nome: string; latitude: number; longitude: number }[]>;
}) {
  const [vertices, setVertices] = useState<number[][] | null>(null);
  return (
    <EditorAreaGeografica
      vertices={vertices}
      onChange={setVertices}
      buscar={buscar}
    />
  );
}
describe('Editor geográfico', () => {
  it('aplica coordenadas, desfaz ponto e limpa área', async () => {
    const u = userEvent.setup();
    render(<Harness />);
    await u.click(
      screen.getByText('Informar ou editar coordenadas dos vértices'),
    );
    await u.type(
      screen.getByLabelText('Vértices (latitude, longitude)'),
      '0,0\n0,1\n1,0',
    );
    await u.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
    expect(screen.getByTestId('mapa')).toHaveTextContent('[[0,0],[0,1],[1,0]]');
    await u.click(screen.getByRole('button', { name: 'Desenhar área' }));
    expect(
      screen.getByRole('button', { name: 'Concluir desenho' }),
    ).toBeEnabled();
    await u.click(screen.getByRole('button', { name: 'Concluir desenho' }));
    await u.click(screen.getByRole('button', { name: 'Desfazer ponto' }));
    expect(screen.getByTestId('mapa')).toHaveTextContent('[[0,0],[0,1]]');
    await u.click(screen.getByRole('button', { name: 'Limpar área' }));
    expect(screen.getByTestId('mapa')).toHaveTextContent('"vertices":null');
  });
  it('mostra erro de coordenadas e permite localizar por posição', async () => {
    const u = userEvent.setup();
    render(<Harness />);
    await u.click(
      screen.getByText('Informar ou editar coordenadas dos vértices'),
    );
    await u.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
    expect(screen.getByRole('alert')).toHaveTextContent('3 a 500');
    await u.click(screen.getByText('Localizar por latitude e longitude'));
    await u.click(screen.getByRole('button', { name: 'Ir para coordenadas' }));
    expect(screen.getByRole('alert')).toHaveTextContent('válidas');
    await u.type(screen.getByLabelText('Latitude'), '-24,72');
    await u.type(screen.getByLabelText('Longitude'), '-53.74');
    await u.click(screen.getByRole('button', { name: 'Ir para coordenadas' }));
    expect(screen.getByTestId('mapa')).toHaveTextContent('-24.72');
  });
  it('só pesquisa por ação explícita e centraliza o resultado', async () => {
    const buscar = vi
      .fn<
        (
          q: string,
        ) => Promise<{ nome: string; latitude: number; longitude: number }[]>
      >()
      .mockResolvedValue([
        { nome: 'Toledo PR', latitude: -24.72, longitude: -53.74 },
      ]);
    const u = userEvent.setup();
    render(<Harness buscar={buscar} />);
    await u.type(screen.getByLabelText('Buscar endereço ou local'), 'Toledo');
    expect(buscar).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: 'Pesquisar local' }));
    await u.click(await screen.findByRole('button', { name: 'Toledo PR' }));
    expect(screen.getByTestId('mapa')).toHaveTextContent('-24.72');
    expect(buscar).toHaveBeenCalledWith('Toledo');
  });
  it('trata busca vazia e indisponível sem bloquear coordenadas', async () => {
    const buscar = vi
      .fn<
        (
          q: string,
        ) => Promise<{ nome: string; latitude: number; longitude: number }[]>
      >()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error());
    const u = userEvent.setup();
    render(<Harness buscar={buscar} />);
    await u.type(screen.getByLabelText('Buscar endereço ou local'), 'Toledo');
    await u.click(screen.getByRole('button', { name: 'Pesquisar local' }));
    expect(
      await screen.findByText(/Nenhum local encontrado/),
    ).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Pesquisar local' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível pesquisar',
      ),
    );
  });
});
