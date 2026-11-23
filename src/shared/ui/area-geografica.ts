/** Estimativa sobre esfera de raio médio, em m², para contornos em latitude/longitude. */
export function estimarAreaM2(vertices: number[][] | null): number | null {
  if (!vertices || vertices.length < 3 || vertices.length > 500) return null;
  if (
    vertices.some(
      (p) =>
        p.length !== 2 ||
        !p.every(Number.isFinite) ||
        Math.abs(p[0]) > 85 ||
        Math.abs(p[1]) > 180,
    )
  )
    return null;
  const longitudes = vertices.map((p) => p[1]);
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180) return null;
  const radianos = Math.PI / 180;
  const base = Math.sin(vertices[0][0] * radianos);
  let soma = 0;
  for (let i = 0; i < vertices.length; i++) {
    const atual = vertices[i];
    const proximo = vertices[(i + 1) % vertices.length];
    soma +=
      (proximo[1] - atual[1]) *
      radianos *
      (Math.sin(atual[0] * radianos) +
        Math.sin(proximo[0] * radianos) -
        2 * base);
  }
  const area = (Math.abs(soma) * 6371008.8 ** 2) / 2;
  return Number.isFinite(area) && area >= 0.005
    ? Math.round(area * 100) / 100
    : null;
}
