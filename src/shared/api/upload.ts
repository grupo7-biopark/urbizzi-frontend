import {
  ApiError,
  apiErrorFromNetworkFailure,
  apiErrorFromResponse,
} from './errors';

export type UploadOptions = {
  /** Fração enviada, de 0 a 1. Chegar a 1 não significa que a API já respondeu. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

function createAbortError() {
  const error = new Error('Envio cancelado');

  error.name = 'AbortError';

  return error;
}

function send<Data>(
  path: string,
  body: FormData,
  { onProgress, signal }: UploadOptions,
) {
  return new Promise<Data>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();

    signal?.addEventListener('abort', abort, { once: true });
    xhr.open('POST', `/api/backend${path}`);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Data);
      } else {
        reject(apiErrorFromResponse(xhr.status, xhr.response));
      }
    });
    xhr.addEventListener('error', () => reject(apiErrorFromNetworkFailure()));
    xhr.addEventListener('abort', () => reject(createAbortError()));
    xhr.addEventListener('loadend', () =>
      signal?.removeEventListener('abort', abort),
    );

    xhr.send(body);
  });
}

/**
 * Envia arquivos pelo proxy BFF. Usa XHR porque o `fetch` não informa o progresso
 * do envio, e rejeita com `ApiError`, como `unwrap()`. Cancelar rejeita com `AbortError`.
 */
export async function uploadFormData<Data>(
  path: string,
  body: FormData,
  options: UploadOptions = {},
): Promise<Data> {
  try {
    return await send<Data>(path, body, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'NAO_AUTENTICADO') {
      throw error;
    }

    // Acima de 10 MB, o proxy renova a sessão no `401`, mas não consegue reenviar o
    // corpo, que seguiu em fluxo. Se a sessão acabou de vez, o `401` se repete.
    options.onProgress?.(0);

    return send<Data>(path, body, options);
  }
}
