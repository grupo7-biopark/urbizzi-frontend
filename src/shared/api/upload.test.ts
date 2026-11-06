import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { server } from '@/test/server';
import { ApiError } from './errors';
import { uploadFormData } from './upload';

const ROTA = '*/api/backend/v1/arquivos';

function makeBody() {
  const body = new FormData();
  body.append('nome', 'Teste');
  return body;
}

function makeSessionExpired() {
  return HttpResponse.json(
    makeErrorResponse({ statusCode: 401, code: 'NAO_AUTENTICADO' }),
    { status: 401 },
  );
}

describe('uploadFormData', () => {
  it('devolve o corpo da resposta', async () => {
    server.use(http.post(ROTA, () => HttpResponse.json({ id: '1' })));

    await expect(uploadFormData('/v1/arquivos', makeBody())).resolves.toEqual({
      id: '1',
    });
  });

  it('rejeita com o ApiError da resposta', async () => {
    server.use(
      http.post(ROTA, () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 400,
            code: 'PLANTA_GRADE_INCOMPLETA',
            message: 'A grade está incompleta',
          }),
          { status: 400 },
        ),
      ),
    );

    const error: unknown = await uploadFormData(
      '/v1/arquivos',
      makeBody(),
    ).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      code: 'PLANTA_GRADE_INCOMPLETA',
      message: 'A grade está incompleta',
    });
  });

  it('trata resposta fora do formato da API como erro inesperado', async () => {
    server.use(
      http.post(ROTA, () => new HttpResponse('<html></html>', { status: 502 })),
    );

    await expect(
      uploadFormData('/v1/arquivos', makeBody()),
    ).rejects.toMatchObject({ statusCode: 502, code: 'ERRO_INESPERADO' });
  });

  it('trata falha de conexão como erro de rede', async () => {
    server.use(http.post(ROTA, () => HttpResponse.error()));

    await expect(
      uploadFormData('/v1/arquivos', makeBody()),
    ).rejects.toMatchObject({ statusCode: 0, code: 'ERRO_DE_REDE' });
  });

  it('repete o envio uma vez quando a sessão foi renovada no 401', async () => {
    let tentativas = 0;
    server.use(
      http.post(ROTA, () => {
        tentativas += 1;
        return tentativas === 1
          ? makeSessionExpired()
          : HttpResponse.json({ id: '1' });
      }),
    );
    const onProgress = vi.fn<(fraction: number) => void>();

    await expect(
      uploadFormData('/v1/arquivos', makeBody(), { onProgress }),
    ).resolves.toEqual({ id: '1' });

    expect(tentativas).toBe(2);
    expect(onProgress).toHaveBeenCalledWith(0);
  });

  it('desiste na segunda recusa, para a sessão expirada levar ao login', async () => {
    let tentativas = 0;
    server.use(
      http.post(ROTA, () => {
        tentativas += 1;
        return makeSessionExpired();
      }),
    );

    await expect(
      uploadFormData('/v1/arquivos', makeBody()),
    ).rejects.toMatchObject({ code: 'NAO_AUTENTICADO' });

    expect(tentativas).toBe(2);
  });

  it('rejeita com AbortError ao cancelar no meio do envio', async () => {
    server.use(
      http.post(ROTA, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();

    const envio = uploadFormData('/v1/arquivos', makeBody(), {
      signal: controller.signal,
    });
    controller.abort();

    await expect(envio).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('não envia nada se já estiver cancelado', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadFormData('/v1/arquivos', makeBody(), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('informa o progresso do envio', async () => {
    const envios: XMLHttpRequest[] = [];
    class XhrRegistrado extends globalThis.XMLHttpRequest {
      override send(body?: Document | XMLHttpRequestBodyInit | null) {
        envios.push(this);
        super.send(body);
      }
    }
    vi.stubGlobal('XMLHttpRequest', XhrRegistrado);
    server.use(http.post(ROTA, () => HttpResponse.json({ id: '1' })));
    const onProgress = vi.fn<(fraction: number) => void>();

    const envio = uploadFormData('/v1/arquivos', makeBody(), { onProgress });
    const { upload } = envios[0]!;
    upload.dispatchEvent(
      new ProgressEvent('progress', { lengthComputable: false }),
    );
    upload.dispatchEvent(
      new ProgressEvent('progress', {
        lengthComputable: true,
        loaded: 1,
        total: 4,
      }),
    );
    await envio;
    vi.unstubAllGlobals();

    expect(onProgress).toHaveBeenCalledWith(0.25);
    expect(onProgress).not.toHaveBeenCalledWith(Number.NaN);
  });
});
