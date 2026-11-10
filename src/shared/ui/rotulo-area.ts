/** Evita rótulos de terrenos sobre mapas de cidades/estados ou áreas minúsculas. */
export function cabeRotuloNaArea(
  zoom: number,
  largura: number,
  altura: number,
  texto: string,
) {
  return (
    zoom >= 15 && largura >= Math.max(80, texto.length * 6 + 16) && altura >= 32
  );
}
