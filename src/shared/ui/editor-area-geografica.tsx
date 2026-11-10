'use client';
import { useState } from 'react';
import { Alert } from './alert';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { MapaGeografico, type ContornoMapa } from './mapa-geografico';
import {
  lerCoordenadas,
  formatarCoordenadas,
  MAX_VERTICES_GEOGRAFICOS,
} from './coordenadas-geograficas';

interface Props {
  vertices: number[][] | null;
  onChange: (vertices: number[][] | null) => void;
  contornos?: ContornoMapa[];
  enquadramento?: string;
  buscar: (
    q: string,
  ) => Promise<{ nome: string; latitude: number; longitude: number }[]>;
}
export function EditorAreaGeografica({
  vertices,
  onChange,
  contornos = [],
  enquadramento,
  buscar,
}: Props) {
  const [drawing, setDrawing] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<Props['buscar']>>>(
    [],
  );
  const [searched, setSearched] = useState(false);
  const [destino, setDestino] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [texto, setTexto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const change = (v: number[][] | null) => {
    onChange(v);
    setTexto(null);
    setError('');
  };
  return (
    <section
      aria-label="Demarcação geográfica"
      className="space-y-4 border-t border-border pt-5"
    >
      <div>
        <h2 className="text-title">Demarcar área</h2>
        <p className="text-small text-ink-muted">
          Localize o terreno e marque seus vértices. Você pode arrastar cada
          ponto para ajustar ou informar as coordenadas.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Input
            label="Buscar endereço ou local"
            value={query}
            maxLength={200}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: Jardim Veneza, Toledo, PR"
          />
        </div>
        <Button
          variant="secundario"
          loading={busy}
          disabled={query.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            setError('');
            setResults([]);
            setSearched(false);
            try {
              setResults(await buscar(query.trim()));
              setSearched(true);
            } catch {
              setError(
                'Não foi possível pesquisar. Tente novamente ou use as coordenadas.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Pesquisar local
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="divide-y divide-border border border-border">
          {results.map((r, i) => (
            <li key={i}>
              <Button
                variant="fantasma"
                className="w-full justify-start text-left"
                onClick={() => {
                  setDestino(r);
                  setResults([]);
                  setSearched(false);
                }}
              >
                {r.nome}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <output className="text-small">
          Nenhum local encontrado. Tente incluir cidade e estado.
        </output>
      )}
      <details className="text-small">
        <summary className="cursor-pointer font-bold">
          Localizar por latitude e longitude
        </summary>
        <div className="mt-3 grid items-end gap-2 sm:grid-cols-3">
          <Input
            label="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="-24.7246"
          />
          <Input
            label="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-53.7410"
          />
          <Button
            variant="secundario"
            onClick={() => {
              const latitude = Number(lat.replace(',', '.')),
                longitude = Number(lng.replace(',', '.'));
              if (
                !lat.trim() ||
                !lng.trim() ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                Math.abs(latitude) > 85 ||
                Math.abs(longitude) > 180
              ) {
                setError('Informe latitude e longitude válidas.');
                return;
              }
              setError('');
              setDestino({ latitude, longitude });
            }}
          >
            Ir para coordenadas
          </Button>
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={drawing ? 'primario' : 'secundario'}
          onClick={() => setDrawing(!drawing)}
          disabled={drawing && (vertices?.length ?? 0) < 3}
        >
          {drawing ? 'Concluir desenho' : 'Desenhar área'}
        </Button>
        <Button
          variant="fantasma"
          disabled={!vertices?.length}
          onClick={() => change(vertices!.slice(0, -1))}
        >
          Desfazer ponto
        </Button>
        <Button
          variant="fantasma"
          disabled={!vertices?.length}
          onClick={() => {
            change(null);
            setDrawing(false);
          }}
        >
          Limpar área
        </Button>
      </div>
      <output className="text-small">
        {drawing
          ? 'Clique nos cantos do terreno, na ordem do contorno. Marque pelo menos 3 pontos e conclua o desenho.'
          : 'Clique no + de uma borda para inserir um ponto. Arraste os vértices para ajustar a área ou use o campo de coordenadas.'}{' '}
        {vertices?.length ?? 0} vértices. Limite de {MAX_VERTICES_GEOGRAFICOS}{' '}
        pontos.
        {(vertices?.length ?? 0) >= MAX_VERTICES_GEOGRAFICOS &&
          ' Limite atingido: arraste os pontos existentes para ajustar o contorno.'}
      </output>
      <MapaGeografico
        contornos={contornos}
        vertices={vertices}
        desenhando={drawing}
        onChange={change}
        destino={destino}
        enquadramento={enquadramento}
      />
      <details>
        <summary className="cursor-pointer text-small font-bold">
          Informar ou editar coordenadas dos vértices
        </summary>
        <div className="mt-3 space-y-3">
          <Textarea
            label="Vértices (latitude, longitude)"
            rows={6}
            value={texto ?? formatarCoordenadas(vertices ?? [])}
            onChange={(e) => setTexto(e.target.value)}
            hint="Um ponto por linha, usando ponto decimal: -24.7246, -53.7410. Com vírgula decimal, separe por ponto e vírgula: -24,7246; -53,7410."
          />
          <Button
            variant="secundario"
            onClick={() => {
              try {
                change(
                  lerCoordenadas(texto ?? formatarCoordenadas(vertices ?? [])),
                );
                setDrawing(false);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Aplicar coordenadas
          </Button>
        </div>
      </details>
      {error && <Alert>{error}</Alert>}
      <p className="text-caption text-ink-muted">
        Busca por{' '}
        <a
          className="underline"
          href="https://operations.osmfoundation.org/policies/nominatim/"
          target="_blank"
          rel="noreferrer"
        >
          Nominatim / OpenStreetMap
        </a>
        : somente ao pesquisar, sem sugestões automáticas. As demarcações são
        conferidas ao salvar. O desenho não substitui levantamento topográfico.
      </p>
    </section>
  );
}
