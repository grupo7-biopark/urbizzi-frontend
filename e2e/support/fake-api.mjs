// API falsa para o e2e do CI, que não tem o backend real. Implementa só o contrato
// da autenticação, com tokens de uso único como os da API de verdade, uma rota
// restrita a um perfil, para o e2e conferir o 403, o cadastro de loteamentos e o
// envio e a ativação de plantas.
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_API_PORT ?? 3999);
const SENHA = 'senha-de-teste-123';

function makeUsuario(id, nome, email, perfil) {
  return { id, nome, email, perfil };
}

const USUARIOS = [
  makeUsuario(
    '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    'Pessoa Teste',
    'pessoa@exemplo.com',
    'ADMINISTRADOR',
  ),
  makeUsuario(
    '1c7a4d2f-9b63-4b9f-8e4a-3d8a2f6b0c21',
    'Gestor Teste',
    'gestor@exemplo.com',
    'GESTOR',
  ),
  makeUsuario(
    '2d8b5e3a-0c74-4cad-9f5b-4e9b3a7c1d32',
    'Comercial Teste',
    'comercial@exemplo.com',
    'COMERCIAL',
  ),
  makeUsuario(
    '3e9c6f4b-1d85-4dbe-8a6c-5f0c4b8d2e43',
    'Consulta Teste',
    'consulta@exemplo.com',
    'CONSULTA',
  ),
];

// Cada token aponta para o dono, para `/v1/auth/me` responder o perfil certo.
const accessTokens = new Map();
const refreshTokens = new Map();

function issueTokens(usuario) {
  const tokens = {
    accessToken: randomUUID(),
    refreshToken: randomUUID(),
    tokenType: 'Bearer',
    expiresIn: 900,
  };
  accessTokens.set(tokens.accessToken, usuario);
  refreshTokens.set(tokens.refreshToken, usuario);
  return tokens;
}

function getUsuario(request) {
  return accessTokens.get(
    request.headers.authorization?.replace('Bearer ', ''),
  );
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

function sendError(response, path, statusCode, code, message) {
  send(response, statusCode, {
    statusCode,
    code,
    message,
    path,
    timestamp: new Date().toISOString(),
  });
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const body = await readBody(request);
  return body.length > 0 ? JSON.parse(body.toString()) : {};
}

// O processamento real leva minutos: aqui, o status avança com o tempo, para o e2e
// acompanhar a tela mudando sozinha. O relógio começa na primeira listagem feita pela
// sessão que enviou, porque o `next dev` pode levar segundos para compilar a tela. Um
// nome com "falha" termina em erro.
const PLANTA_PROCESSANDO_APOS_MS = 1000;
const PLANTA_TERMINADA_APOS_MS = 5000;
// O necessário para o visualizador: 3 níveis de zoom além do tile único.
const METADADOS_PLANTA_PRONTA = {
  larguraPx: 2048,
  alturaPx: 1536,
  maxZoom: 3,
  tamanhoTile: 256,
};
// WebP de 1 x 1 px: o e2e confere as requisições, e não a imagem.
const TILE = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  'base64',
);

const plantas = [];

function toPlantaDto({ listadaEm, enviadaPor: _enviadaPor, ...planta }) {
  const decorrido = listadaEm === null ? 0 : Date.now() - listadaEm;
  const falhou = planta.nome.includes('falha');
  let status = 'ENVIADA';

  if (decorrido >= PLANTA_TERMINADA_APOS_MS) {
    status = falhou ? 'ERRO' : 'PRONTA';
  } else if (decorrido >= PLANTA_PROCESSANDO_APOS_MS) {
    status = 'PROCESSANDO';
  }

  return {
    ...planta,
    ...(status === 'PRONTA' ? METADADOS_PLANTA_PRONTA : {}),
    status,
    mensagemErro:
      status === 'ERRO'
        ? 'Não foi possível processar a planta. Envie os arquivos novamente.'
        : null,
  };
}

function exigirGestao(request, response, path) {
  const usuario = getUsuario(request);

  if (!usuario) {
    sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
  } else if (!['ADMINISTRADOR', 'GESTOR'].includes(usuario.perfil)) {
    sendError(response, path, 403, 'ACESSO_NEGADO', 'Forbidden resource');
  }

  return usuario;
}

/** O bastante para os campos de texto e os nomes de arquivo do multipart. */
function parseEnvioPlanta(body) {
  const texto = body.toString('latin1');

  return {
    nome: /name="nome"\r\n\r\n([^\r]*)/.exec(texto)?.[1] ?? '',
    copiarMarcadores: /name="copiarMarcadores"\r\n\r\ntrue/.test(texto),
    arquivos: [...texto.matchAll(/name="arquivos"; filename="([^"]+)"/g)].map(
      (match) => match[1],
    ),
  };
}

function ativarPlanta(request, response, path, id) {
  if (!exigirGestao(request, response, path)) {
    return;
  }

  const planta = plantas.find((item) => item.id === id);

  if (!planta) {
    sendError(response, path, 404, 'PLANTA_NAO_ENCONTRADA', 'Não encontrada');
  } else if (toPlantaDto(planta).status !== 'PRONTA') {
    sendError(
      response,
      path,
      409,
      'PLANTA_NAO_PRONTA',
      'A planta não está pronta',
    );
  } else {
    plantas.forEach((item) => {
      item.ativa = item === planta;
    });
    send(response, 200, toPlantaDto(planta));
  }
}

const PERFIS_CADASTRO = ['ADMINISTRADOR', 'GESTOR'];
const LOTEAMENTO_SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

const loteamentos = new Map();
const quadras = new Map();
const lotes = new Map();
const clientes = new Set();

function salvarLoteamento(id, dados, atual = {}) {
  const agora = new Date().toISOString();
  const loteamento = {
    id,
    nome: atual.nome,
    descricao: null,
    localizacao: null,
    createdAt: agora,
    ...atual,
    ...dados,
    updatedAt: agora,
  };
  loteamentos.set(id, loteamento);
  return loteamento;
}

salvarLoteamento(LOTEAMENTO_SEMENTE_ID, { nome: 'Loteamento Semente' });

function salvarQuadra(id, dados, atual = {}) {
  const agora = new Date().toISOString();
  const quadra = {
    id,
    createdAt: agora,
    ...atual,
    ...dados,
    updatedAt: agora,
  };
  quadras.set(id, quadra);
  return quadra;
}

salvarQuadra(randomUUID(), {
  loteamentoId: LOTEAMENTO_SEMENTE_ID,
  numero: 'Quadra Semente',
});

function numeroEmUso({ loteamentoId, numero }, idIgnorado) {
  return [...quadras.values()].some(
    (item) =>
      item.id !== idIgnorado &&
      item.loteamentoId === loteamentoId &&
      item.numero.toLowerCase() === numero.toLowerCase(),
  );
}

function numeroDeLoteEmUso(quadraId, numero, idIgnorado) {
  return [...lotes.values()].some(
    (item) =>
      item.id !== idIgnorado &&
      item.quadraId === quadraId &&
      item.numero.toLowerCase() === numero.toLowerCase(),
  );
}

function criarLote(quadra, dados) {
  const agora = new Date().toISOString();
  const lote = {
    valor: null,
    exibirValorPublico: false,
    observacoes: null,
    ...dados,
    id: randomUUID(),
    quadraId: quadra.id,
    loteamentoId: quadra.loteamentoId,
    status: 'DISPONIVEL',
    createdAt: agora,
    updatedAt: agora,
  };
  lotes.set(lote.id, lote);
  return lote;
}

function parseImportacao(body) {
  const texto = body.toString('utf8');
  const arquivo =
    /name="arquivo"; filename="([^"]+)"\r\n[^\r]*\r\n\r\n([\s\S]*?)\r\n--/.exec(
      texto,
    );

  return {
    nome: arquivo?.[1] ?? '',
    conteudo: arquivo?.[2] ?? '',
    confirmar: /name="confirmar"\r\n\r\ntrue/.test(texto),
    criarCadastros: /name="criarCadastros"\r\n\r\ntrue/.test(texto),
  };
}

/** Só o CSV com `;` que o e2e envia: tudo ou nada, como a API. */
function importarPlanilha({ conteudo, confirmar, criarCadastros }) {
  const [, ...linhas] = conteudo.split(/\r?\n/).filter(Boolean);
  const erros = [];
  const novosLoteamentos = new Set();
  const novasQuadras = new Set();
  const validas = [];

  linhas.forEach((texto, index) => {
    const [loteamento, quadra, numero, area] = texto.split(';');
    const mensagens = [];
    const existente = [...loteamentos.values()].find(
      ({ nome }) => nome.toLowerCase() === loteamento.toLowerCase(),
    );
    const quadraExistente = [...quadras.values()].find(
      (item) => item.loteamentoId === existente?.id && item.numero === quadra,
    );

    if (!area) {
      mensagens.push('area_m2 é obrigatório');
    }
    if (!existente && !criarCadastros) {
      mensagens.push('Loteamento não encontrado');
    }

    if (mensagens.length > 0) {
      erros.push({ linha: index + 2, mensagens });
      return;
    }

    if (!existente) {
      novosLoteamentos.add(loteamento);
    }
    if (!quadraExistente) {
      novasQuadras.add(`${loteamento}/${quadra}`);
    }
    validas.push({ loteamento, quadra, numero, area });
  });

  const importado = confirmar && erros.length === 0;

  if (importado) {
    for (const { loteamento, quadra, numero, area } of validas) {
      const cadastrado =
        [...loteamentos.values()].find(
          ({ nome }) => nome.toLowerCase() === loteamento.toLowerCase(),
        ) ?? salvarLoteamento(randomUUID(), { nome: loteamento });
      const quadraCadastrada =
        [...quadras.values()].find(
          (item) =>
            item.loteamentoId === cadastrado.id && item.numero === quadra,
        ) ??
        salvarQuadra(randomUUID(), {
          loteamentoId: cadastrado.id,
          numero: quadra,
        });

      criarLote(quadraCadastrada, {
        numero,
        areaM2: area.replace(',', '.'),
      });
    }
  }

  return {
    importado,
    totalLinhas: linhas.length,
    lotes: validas.length,
    loteamentosNovos: novosLoteamentos.size,
    quadrasNovas: novasQuadras.size,
    erros,
  };
}

function sendLoteDuplicado(response, path) {
  sendError(
    response,
    path,
    409,
    'LOTE_JA_EXISTE',
    'Já existe um lote com esse número nesta quadra',
  );
}

function sendLoteNaoEncontrado(response, path) {
  sendError(response, path, 404, 'LOTE_NAO_ENCONTRADO', 'Lote não encontrado');
}

function sendQuadraDuplicada(response, path) {
  sendError(
    response,
    path,
    409,
    'QUADRA_JA_EXISTE',
    'Já existe uma quadra com esse número neste loteamento',
  );
}

function sendPagina(request, response, itens) {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 20);

  send(response, 200, {
    data: itens.slice((page - 1) * pageSize, page * pageSize),
    meta: {
      page,
      pageSize,
      total: itens.length,
      totalPages: Math.max(Math.ceil(itens.length / pageSize), 1),
    },
  });
}

function nomeEmUso(nome, idIgnorado) {
  return [...loteamentos.values()].some(
    (item) =>
      item.id !== idIgnorado && item.nome.toLowerCase() === nome.toLowerCase(),
  );
}

/** Confere a sessão e o perfil antes de executar a rota, como os guards da API. */
function protegida(handler, perfis) {
  return async (request, response, path, params) => {
    const usuario = getUsuario(request);

    if (!usuario) {
      sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
    } else if (perfis && !perfis.includes(usuario.perfil)) {
      sendError(response, path, 403, 'ACESSO_NEGADO', 'Forbidden resource');
    } else {
      await handler(request, response, path, params);
    }
  };
}

function comLoteamento(handler) {
  return async (request, response, path, params) => {
    const loteamento = loteamentos.get(params.id);

    if (loteamento) {
      await handler(request, response, path, loteamento);
    } else {
      sendError(
        response,
        path,
        404,
        'LOTEAMENTO_NAO_ENCONTRADO',
        'Loteamento não encontrado',
      );
    }
  };
}

const dynamicRoutes = [
  {
    method: 'GET',
    pattern: /^\/v1\/plantas\/ativa$/,
    handler: protegida((_request, response, path) => {
      const planta = plantas.find(({ ativa }) => ativa);

      if (planta) {
        send(response, 200, {
          ...toPlantaDto(planta),
          tilesUrl: `/v1/plantas/${planta.id}/tiles/{z}/{x}/{y}.webp`,
        });
      } else {
        sendError(
          response,
          path,
          404,
          'PLANTA_ATIVA_NAO_ENCONTRADA',
          'Nenhuma planta ativa encontrada',
        );
      }
    }),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/plantas\/[^/]+\/tiles\/\d+\/\d+\/\d+\.webp$/,
    handler: (_request, response) => {
      response.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
      });
      response.end(TILE);
    },
  },
  {
    method: 'POST',
    pattern: /^\/v1\/plantas\/(?<id>[^/]+)\/ativar$/,
    handler: (request, response, path, { id }) =>
      ativarPlanta(request, response, path, id),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/loteamentos\/(?<id>[^/]+)$/,
    handler: protegida(
      comLoteamento((_request, response, _path, loteamento) =>
        send(response, 200, loteamento),
      ),
    ),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/loteamentos\/(?<id>[^/]+)$/,
    handler: protegida(
      comLoteamento(async (request, response, path, loteamento) => {
        const dados = await readJson(request);

        if (dados.nome && nomeEmUso(dados.nome, loteamento.id)) {
          sendError(
            response,
            path,
            409,
            'LOTEAMENTO_JA_EXISTE',
            'Já existe um loteamento com esse nome',
          );
        } else {
          send(
            response,
            200,
            salvarLoteamento(loteamento.id, dados, loteamento),
          );
        }
      }),
      PERFIS_CADASTRO,
    ),
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/loteamentos\/(?<id>[^/]+)$/,
    handler: protegida(
      comLoteamento((_request, response, path, loteamento) => {
        if (
          [...quadras.values()].some(
            ({ loteamentoId }) => loteamentoId === loteamento.id,
          )
        ) {
          sendError(
            response,
            path,
            409,
            'LOTEAMENTO_COM_QUADRAS',
            'Não é possível excluir um loteamento com quadras cadastradas',
          );
        } else {
          loteamentos.delete(loteamento.id);
          send(response, 204);
        }
      }),
      PERFIS_CADASTRO,
    ),
  },
  {
    method: 'POST',
    pattern: /^\/v1\/loteamentos\/(?<id>[^/]+)\/quadras$/,
    handler: protegida(
      comLoteamento(async (request, response, path, loteamento) => {
        const { numero } = await readJson(request);
        const quadra = { loteamentoId: loteamento.id, numero };

        if (numeroEmUso(quadra)) {
          sendQuadraDuplicada(response, path);
        } else {
          send(response, 201, salvarQuadra(randomUUID(), quadra));
        }
      }),
      PERFIS_CADASTRO,
    ),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/loteamentos\/(?<id>[^/]+)\/quadras$/,
    handler: protegida(
      comLoteamento((request, response, _path, loteamento) =>
        sendPagina(
          request,
          response,
          [...quadras.values()].filter(
            ({ loteamentoId }) => loteamentoId === loteamento.id,
          ),
        ),
      ),
    ),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/quadras\/(?<id>[^/]+)$/,
    handler: protegida(async (request, response, path, params) => {
      const atual = quadras.get(params.id);
      const { numero } = await readJson(request);

      if (numeroEmUso({ ...atual, numero }, params.id)) {
        sendQuadraDuplicada(response, path);
      } else {
        send(response, 200, salvarQuadra(params.id, { numero }, atual));
      }
    }, PERFIS_CADASTRO),
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/quadras\/(?<id>[^/]+)$/,
    handler: protegida((_request, response, path, params) => {
      if ([...lotes.values()].some(({ quadraId }) => quadraId === params.id)) {
        sendError(
          response,
          path,
          409,
          'QUADRA_COM_LOTES',
          'Não é possível excluir uma quadra com lotes cadastrados',
        );
      } else {
        quadras.delete(params.id);
        send(response, 204);
      }
    }, PERFIS_CADASTRO),
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/lotes\/(?<id>[^/]+)$/,
    handler: protegida((_request, response, path, params) => {
      const lote = lotes.get(params.id);

      if (!lote) {
        sendLoteNaoEncontrado(response, path);
      } else if (lote.status !== 'DISPONIVEL') {
        sendError(
          response,
          path,
          409,
          'LOTE_NAO_DISPONIVEL',
          'Só um lote disponível pode ser excluído',
        );
      } else {
        lotes.delete(params.id);
        send(response, 204);
      }
    }, PERFIS_CADASTRO),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/lotes\/(?<id>[^/]+)$/,
    handler: protegida((_request, response, path, params) => {
      const lote = lotes.get(params.id);

      if (lote) {
        send(response, 200, lote);
      } else {
        sendLoteNaoEncontrado(response, path);
      }
    }),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/lotes\/(?<id>[^/]+)$/,
    handler: protegida(async (request, response, path, params) => {
      const atual = lotes.get(params.id);
      const dados = await readJson(request);

      if (!atual) {
        sendLoteNaoEncontrado(response, path);
      } else if (
        dados.numero &&
        numeroDeLoteEmUso(atual.quadraId, dados.numero, atual.id)
      ) {
        sendLoteDuplicado(response, path);
      } else {
        const lote = { ...atual, ...dados };
        lotes.set(lote.id, lote);
        send(response, 200, lote);
      }
    }, PERFIS_CADASTRO),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/quadras\/(?<id>[^/]+)$/,
    handler: protegida((_request, response, path, params) => {
      const quadra = quadras.get(params.id);

      if (quadra) {
        send(response, 200, quadra);
      } else {
        sendError(
          response,
          path,
          404,
          'QUADRA_NAO_ENCONTRADA',
          'Quadra não encontrada',
        );
      }
    }),
  },
];

const routes = {
  'GET /health': (_request, response) => send(response, 200, { status: 'ok' }),

  'POST /v1/lotes': protegida(async (request, response, path) => {
    const dados = await readJson(request);
    const quadra = quadras.get(dados.quadraId);

    if (!quadra) {
      sendError(
        response,
        path,
        404,
        'QUADRA_NAO_ENCONTRADA',
        'Quadra não encontrada',
      );
    } else if (numeroDeLoteEmUso(dados.quadraId, dados.numero)) {
      sendLoteDuplicado(response, path);
    } else {
      send(response, 201, criarLote(quadra, dados));
    }
  }, PERFIS_CADASTRO),

  'GET /v1/lotes': protegida((request, response) => {
    const { searchParams } = new URL(request.url, 'http://localhost');
    const filtros = {
      loteamentoId: searchParams.get('loteamentoId'),
      quadraId: searchParams.get('quadraId'),
      status: searchParams.get('status'),
    };
    const busca = searchParams.get('q')?.toLowerCase() ?? '';

    sendPagina(
      request,
      response,
      [...lotes.values()].filter(
        (lote) =>
          Object.entries(filtros).every(
            ([campo, valor]) => !valor || lote[campo] === valor,
          ) && lote.numero.toLowerCase().includes(busca),
      ),
    );
  }),

  'GET /v1/lotes/importacao/modelo': protegida((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-lotes.csv"',
    });
    response.end(
      '﻿loteamento;quadra;numero;area_m2;valor;exibir_valor\r\nExemplo;A;1;360,00;250000,00;sim\r\n',
    );
  }, PERFIS_CADASTRO),

  'POST /v1/lotes/importacao': protegida(async (request, response, path) => {
    const envio = parseImportacao(await readBody(request));

    if (!/\.(csv|xlsx)$/i.test(envio.nome)) {
      sendError(
        response,
        path,
        422,
        'IMPORTACAO_FORMATO_INVALIDO',
        'Envie um arquivo .csv ou .xlsx',
      );
    } else {
      send(response, 200, importarPlanilha(envio));
    }
  }, PERFIS_CADASTRO),

  // Só o que o e2e precisa para ter um lote reservado.
  'POST /v1/clientes': protegida(async (request, response) => {
    const dados = await readJson(request);
    const id = randomUUID();
    clientes.add(id);
    send(response, 201, { ...dados, id });
  }),

  'POST /v1/reservas': protegida(async (request, response, path) => {
    const { loteId, clienteId } = await readJson(request);
    const lote = lotes.get(loteId);

    if (lote && clientes.has(clienteId)) {
      lote.status = 'RESERVADO';
      send(response, 201, { id: randomUUID(), loteId, clienteId });
    } else {
      sendLoteNaoEncontrado(response, path);
    }
  }),

  'POST /v1/auth/login': async (request, response, path) => {
    const { email, senha } = await readJson(request);

    const usuario = USUARIOS.find((item) => item.email === email);

    if (usuario && senha === SENHA) {
      send(response, 200, issueTokens(usuario));
    } else {
      sendError(
        response,
        path,
        401,
        'CREDENCIAIS_INVALIDAS',
        'E-mail ou senha inválidos',
      );
    }
  },

  'POST /v1/auth/refresh': async (request, response, path) => {
    const { refreshToken } = await readJson(request);

    const usuario = refreshTokens.get(refreshToken);

    if (usuario) {
      refreshTokens.delete(refreshToken);
      send(response, 200, issueTokens(usuario));
    } else {
      sendError(
        response,
        path,
        401,
        'REFRESH_TOKEN_INVALIDO',
        'Refresh token inválido',
      );
    }
  },

  'POST /v1/auth/logout': async (request, response) => {
    const { refreshToken } = await readJson(request);
    refreshTokens.delete(refreshToken);
    send(response, 204);
  },

  'GET /v1/auth/me': (request, response, path) => {
    const usuario = getUsuario(request);

    if (usuario) {
      send(response, 200, usuario);
    } else {
      sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
    }
  },

  'GET /v1/loteamentos': protegida((request, response) => {
    const { searchParams } = new URL(request.url, 'http://localhost');
    const q = (searchParams.get('q') ?? '').toLowerCase();
    const page = Number(searchParams.get('page') ?? 1);
    const pageSize = Number(searchParams.get('pageSize') ?? 20);
    const encontrados = [...loteamentos.values()]
      .filter((item) => item.nome.toLowerCase().includes(q))
      .toReversed();

    send(response, 200, {
      data: encontrados.slice((page - 1) * pageSize, page * pageSize),
      meta: {
        page,
        pageSize,
        total: encontrados.length,
        totalPages: Math.ceil(encontrados.length / pageSize),
      },
    });
  }),

  'POST /v1/loteamentos': protegida(async (request, response, path) => {
    const dados = await readJson(request);

    if (nomeEmUso(dados.nome)) {
      sendError(
        response,
        path,
        409,
        'LOTEAMENTO_JA_EXISTE',
        'Já existe um loteamento com esse nome',
      );
    } else {
      send(response, 201, salvarLoteamento(randomUUID(), dados));
    }
  }, PERFIS_CADASTRO),

  'GET /v1/usuarios': (request, response, path) => {
    const usuario = getUsuario(request);

    if (!usuario) {
      sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
    } else if (usuario.perfil !== 'ADMINISTRADOR') {
      sendError(response, path, 403, 'ACESSO_NEGADO', 'Forbidden resource');
    } else {
      send(response, 200, {
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });
    }
  },

  'GET /v1/plantas': (request, response, path) => {
    if (!getUsuario(request)) {
      sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
      return;
    }

    const pagina = plantas.slice(0, 20);

    pagina.forEach((item) => {
      if (item.enviadaPor === request.headers.authorization) {
        item.listadaEm ??= Date.now();
      }
    });

    send(response, 200, {
      data: pagina.map(toPlantaDto),
      meta: {
        page: 1,
        pageSize: 20,
        total: plantas.length,
        totalPages: plantas.length > 0 ? 1 : 0,
      },
    });
  },

  'POST /v1/plantas': async (request, response, path) => {
    const body = await readBody(request);
    const usuario = exigirGestao(request, response, path);

    if (!usuario) {
      return;
    }

    const { nome, arquivos, copiarMarcadores } = parseEnvioPlanta(body);

    if (copiarMarcadores && !plantas.some((item) => item.ativa)) {
      sendError(
        response,
        path,
        404,
        'PLANTA_ATIVA_NAO_ENCONTRADA',
        'Não há planta ativa para copiar os marcadores',
      );
      return;
    }

    const planta = {
      id: randomUUID(),
      nome,
      versao: plantas.length + 1,
      ativa: false,
      gradeLinhas: arquivos.length > 1 ? Math.sqrt(arquivos.length) : 1,
      gradeColunas: arquivos.length > 1 ? Math.sqrt(arquivos.length) : 1,
      larguraPx: null,
      alturaPx: null,
      maxZoom: null,
      tamanhoTile: null,
      criadoPorId: usuario.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      listadaEm: null,
      // Testes em paralelo listam as mesmas plantas: só a sessão que enviou conta.
      enviadaPor: request.headers.authorization,
    };

    plantas.unshift(planta);
    send(response, 201, toPlantaDto(planta));
  },
};

createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const route = routes[`${request.method} ${path}`];
  const dynamic = dynamicRoutes
    .filter(({ method }) => method === request.method)
    .map(({ pattern, handler }) => ({ handler, match: path.match(pattern) }))
    .find(({ match }) => match);

  if (route) {
    // Um envio cancelado interrompe a leitura do corpo: não pode derrubar a API falsa.
    Promise.resolve(route(request, response, path)).catch(() => {
      response.destroy();
    });
  } else if (dynamic) {
    void dynamic.handler(request, response, path, dynamic.match.groups);
  } else {
    sendError(response, path, 404, 'RECURSO_NAO_ENCONTRADO', 'Não encontrado');
  }
}).listen(PORT);
