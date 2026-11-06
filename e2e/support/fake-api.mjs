// API falsa para o e2e do CI, que não tem o backend real. Implementa só o contrato
// da autenticação, com tokens de uso único como os da API de verdade, uma rota
// restrita a um perfil, para o e2e conferir o 403, e o cadastro de loteamentos.
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

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

const PERFIS_CADASTRO = ['ADMINISTRADOR', 'GESTOR'];
const LOTEAMENTO_SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

const loteamentos = new Map();
// Id da quadra e id do loteamento a que ela pertence.
const quadras = new Map();

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
        if ([...quadras.values()].includes(loteamento.id)) {
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
      comLoteamento(async (request, response, _path, loteamento) => {
        const { numero } = await readJson(request);
        const id = randomUUID();
        quadras.set(id, loteamento.id);
        send(response, 201, { id, numero, loteamentoId: loteamento.id });
      }),
      PERFIS_CADASTRO,
    ),
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/quadras\/(?<id>[^/]+)$/,
    handler: protegida((_request, response, _path, params) => {
      quadras.delete(params.id);
      send(response, 204);
    }, PERFIS_CADASTRO),
  },
];

const routes = {
  'GET /health': (_request, response) => send(response, 200, { status: 'ok' }),

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
};

createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const route = routes[`${request.method} ${path}`];
  const dynamic = dynamicRoutes
    .filter(({ method }) => method === request.method)
    .map(({ pattern, handler }) => ({ handler, match: path.match(pattern) }))
    .find(({ match }) => match);

  if (route) {
    void route(request, response, path);
  } else if (dynamic) {
    void dynamic.handler(request, response, path, dynamic.match.groups);
  } else {
    sendError(response, path, 404, 'RECURSO_NAO_ENCONTRADO', 'Não encontrado');
  }
}).listen(PORT);
