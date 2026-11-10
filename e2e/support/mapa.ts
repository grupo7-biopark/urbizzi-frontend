import type { Page } from '@playwright/test';

/** Confere se algum canvas do Leaflet pintou pixels com a cor do token. */
export async function temCorNoMapa(page: Page, token: string) {
  return page.locator('.leaflet-overlay-pane canvas').evaluateAll(
    (elementos, variavel) =>
      elementos.some((elemento) => {
        if (!(elemento instanceof HTMLCanvasElement)) return false;
        const contexto = elemento.getContext('2d');
        if (!contexto || !elemento.width || !elemento.height) return false;
        const amostra = document.createElement('canvas');
        amostra.width = 1;
        amostra.height = 1;
        const pincel = amostra.getContext('2d');
        if (!pincel) return false;
        const resolvedor = document.createElement('span');
        resolvedor.style.color = 'var(' + variavel + ')';
        elemento.parentElement?.append(resolvedor);
        pincel.fillStyle = getComputedStyle(resolvedor).color;
        resolvedor.remove();
        pincel.fillRect(0, 0, 1, 1);
        const cor = pincel.getImageData(0, 0, 1, 1).data;
        const pixels = contexto.getImageData(
          0,
          0,
          elemento.width,
          elemento.height,
        ).data;
        for (let posicao = 0; posicao < pixels.length; posicao += 4) {
          if (
            pixels[posicao + 3] > 0 &&
            Math.abs(pixels[posicao] - cor[0]) <= 2 &&
            Math.abs(pixels[posicao + 1] - cor[1]) <= 2 &&
            Math.abs(pixels[posicao + 2] - cor[2]) <= 2
          )
            return true;
        }
        return false;
      }),
    token,
  );
}
