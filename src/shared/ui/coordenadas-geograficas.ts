export type Coordenada = [number, number];
export const MAX_VERTICES_GEOGRAFICOS = 500;
export function lerCoordenadas(texto: string): Coordenada[] {
  const linhas = texto
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (linhas.length < 3 || linhas.length > MAX_VERTICES_GEOGRAFICOS)
    throw new Error(
      `Informe de 3 a ${MAX_VERTICES_GEOGRAFICOS} linhas, uma para cada vértice.`,
    );
  return linhas.map((linha, i) => {
    const partes = linha.includes(';')
      ? linha.split(';').map((v) => v.trim().replace(',', '.'))
      : linha.trim().split(/[\s,]+/);
    const [lat, lng] = partes.map(Number);
    if (
      partes.length !== 2 ||
      partes.some((v) => !v.trim()) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 85 ||
      Math.abs(lng) > 180
    )
      throw new Error(`Confira latitude e longitude na linha ${i + 1}.`);
    return [lat, lng];
  });
}
export function formatarCoordenadas(vertices: number[][]) {
  return vertices.map((p) => p.map((n) => n.toFixed(7)).join(', ')).join('\n');
}
