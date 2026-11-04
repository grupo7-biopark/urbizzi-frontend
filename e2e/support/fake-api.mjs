// API falsa para o e2e do CI, que não tem o backend real. Implementa só o contrato
// da autenticação, com tokens de uso único como os da API de verdade.
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_API_PORT ?? 3999);
const EMAIL = 'pessoa@exemplo.com';
const SENHA = 'senha-de-teste-123';
const USUARIO = {
  id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
  nome: 'Pessoa Teste',
  email: EMAIL,
  perfil: 'ADMINISTRADOR',
};

const accessTokens = new Set();
const refreshTokens = new Set();

function issueTokens() {
  const tokens = {
    accessToken: randomUUID(),
    refreshToken: randomUUID(),
    tokenType: 'Bearer',
    expiresIn: 900,
  };
  accessTokens.add(tokens.accessToken);
  refreshTokens.add(tokens.refreshToken);
  return tokens;
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

const routes = {
  'GET /health': (_request, response) => send(response, 200, { status: 'ok' }),

  'POST /v1/auth/login': async (request, response, path) => {
    const { email, senha } = await readJson(request);

    if (email === EMAIL && senha === SENHA) {
      send(response, 200, issueTokens());
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

    if (refreshTokens.delete(refreshToken)) {
      send(response, 200, issueTokens());
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
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (accessTokens.has(token)) {
      send(response, 200, USUARIO);
    } else {
      sendError(response, path, 401, 'NAO_AUTENTICADO', 'Não autenticado');
    }
  },
};

createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const route = routes[`${request.method} ${path}`];

  if (route) {
    void route(request, response, path);
  } else {
    sendError(response, path, 404, 'RECURSO_NAO_ENCONTRADO', 'Não encontrado');
  }
}).listen(PORT);
