// API falsa para o e2e do CI, que não tem o backend real. Implementa só o contrato
// da autenticação, com tokens de uso único como os da API de verdade, uma rota
// restrita a um perfil, para o e2e conferir o 403, o cadastro de loteamentos e o
// envio e a ativação de plantas.
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_API_PORT ?? 3999);
const SENHA = 'senha-de-teste-123';

function makeUsuario(id, nome, email, perfil) {
  return { id, nome, email, perfil, ativo: true };
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
  // Só para o e2e de recuperação, que troca a senha.
  makeUsuario(
    '4fad7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54',
    'Recuperação Teste',
    'recuperacao@exemplo.com',
    'CONSULTA',
  ),
];

// E-mail do dono de cada token de recuperação ainda não usado.
const tokensDeRecuperacao = new Map();
// Só o que foi redefinido: os demais usam a senha padrão.
const senhasRedefinidas = new Map();

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
// O Consulta não vê clientes (RNF08).
const PERFIS_CLIENTES = ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL'];
const PERFIS_ADMINISTRACAO = ['ADMINISTRADOR'];
// Começa com o padrão da API, que usa 7 dias quando a chave não foi gravada.
const prazos = { prazo_reserva_dias: 7, prazo_analise_dias_uteis: 7 };

function eUltimoAdministrador(usuario) {
  return (
    usuario.perfil === 'ADMINISTRADOR' &&
    usuario.ativo &&
    USUARIOS.filter(({ perfil, ativo }) => perfil === 'ADMINISTRADOR' && ativo)
      .length === 1
  );
}

function sendUltimoAdministrador(response, path) {
  sendError(
    response,
    path,
    409,
    'ULTIMO_ADMINISTRADOR',
    'Não é possível desativar ou rebaixar o último administrador ativo',
  );
}

function sendUsuarioDuplicado(response, path) {
  sendError(
    response,
    path,
    409,
    'USUARIO_EMAIL_DUPLICADO',
    'Já existe um usuário com este e-mail',
  );
}

function comUsuario(handler) {
  return protegida((request, response, path, params) => {
    const usuario = USUARIOS.find(({ id }) => id === params.id);

    if (usuario) {
      return handler(request, response, usuario, path, params);
    }

    return sendError(
      response,
      path,
      404,
      'USUARIO_NAO_ENCONTRADO',
      'Usuário não encontrado',
    );
  }, PERFIS_ADMINISTRACAO);
}
const LOTEAMENTO_SEMENTE_ID = '4f0d7a5c-2e96-4ecf-9b7d-6a1d5c9e3f54';

// Fixos: o e2e clica neles pela posição, e o backend real os recebe pela API.
const MARCADORES_DO_MAPA = [
  { numero: 'M1', x: 0.5, y: 0.5, status: 'DISPONIVEL', valor: '250000.00' },
  { numero: 'M2', x: 0.25, y: 0.25, status: 'BLOQUEADO', valor: null },
].map((marcador) => ({
  ...marcador,
  id: randomUUID(),
  loteId: randomUUID(),
  quadraId: randomUUID(),
  quadra: 'Q1',
  loteamentoId: LOTEAMENTO_SEMENTE_ID,
  loteamento: 'Loteamento Semente',
  areaM2: '360.00',
  acoes: [],
  revisar: false,
}));

function criarMarcador({ loteId, x, y }, plantaId) {
  const lote = lotes.get(loteId);
  const marcador = {
    id: randomUUID(),
    plantaId,
    loteId,
    x,
    y,
    numero: lote.numero,
    quadraId: lote.quadraId,
    quadra: quadras.get(lote.quadraId).numero,
    loteamentoId: lote.loteamentoId,
    loteamento: loteamentos.get(lote.loteamentoId).nome,
    areaM2: lote.areaM2,
    valor: lote.valor,
    status: lote.status,
    acoes: [],
    // A cópia de uma planta com outra proporção não existe aqui: pelo número, o e2e
    // tem um marcador a revisar, sem depender da ordem dos testes.
    revisar: lote.numero.startsWith('REV'),
  };
  MARCADORES_DO_MAPA.push(marcador);
  return marcador;
}

function comMarcador(handler) {
  return protegida((request, response, path, params) => {
    const marcador = MARCADORES_DO_MAPA.find(({ id }) => id === params.id);

    if (marcador) {
      return handler(request, response, marcador);
    }

    return sendError(
      response,
      path,
      404,
      'MARCADOR_NAO_ENCONTRADO',
      'Marcador não encontrado',
    );
  }, PERFIS_CADASTRO);
}

const loteamentos = new Map();
const quadras = new Map();
const lotes = new Map();
const clientes = new Map();
const reservas = new Map();
const propostas = new Map();

function previsaoReserva() {
  const prazoDias = prazos.prazo_reserva_dias;
  return {
    prazoDias,
    dataVencimento: new Date(Date.now() + prazoDias * 86400000).toISOString(),
  };
}

/** Como a API: sem distinguir caixa e acentos. */
function semAcento(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Nome parcial ou documento com ou sem máscara. */
function buscarClientes(q) {
  const todos = [...clientes.values()];

  if (!q) {
    return todos;
  }

  const digitos = q.replace(/\D/g, '');

  return todos.filter(
    (cliente) =>
      semAcento(cliente.nome).includes(semAcento(q)) ||
      (digitos.length > 0 && cliente.documento.includes(digitos)),
  );
}

function salvarCliente(id, dados, atual = {}) {
  const agora = new Date().toISOString();
  const cliente = {
    id,
    nome: atual.nome,
    documento: atual.documento,
    telefone: null,
    email: null,
    observacoes: null,
    createdAt: agora,
    ...atual,
    ...dados,
    // Normalizado como na API, que aceita o documento formatado.
    ...(dados.documento
      ? { documento: dados.documento.replace(/\D/g, '') }
      : {}),
    updatedAt: agora,
  };

  clientes.set(id, cliente);
  return cliente;
}

function documentoEmUso(documento, idIgnorado) {
  const digitos = (documento ?? '').replace(/\D/g, '');

  return [...clientes.values()].some(
    (cliente) => cliente.id !== idIgnorado && cliente.documento === digitos,
  );
}

function sendDocumentoDuplicado(response, path) {
  sendError(
    response,
    path,
    409,
    'CLIENTE_DOCUMENTO_DUPLICADO',
    'Já existe um cliente com esse documento',
  );
}

function comCliente(handler) {
  return async (request, response, path, params) => {
    const cliente = clientes.get(params.id);

    if (cliente) {
      await handler(request, response, path, cliente);
    } else {
      sendError(
        response,
        path,
        404,
        'CLIENTE_NAO_ENCONTRADO',
        'Cliente não encontrado',
      );
    }
  };
}

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

const quadraSemente = salvarQuadra(randomUUID(), {
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

// Os marcadores fixos também precisam existir no endpoint de detalhe do lote.
const quadraDoMapa = salvarQuadra(MARCADORES_DO_MAPA[0].quadraId, {
  loteamentoId: LOTEAMENTO_SEMENTE_ID,
  numero: 'Q1',
});
for (const marcador of MARCADORES_DO_MAPA) {
  marcador.quadraId = quadraDoMapa.id;
  const lote = criarLote(quadraDoMapa, {
    numero: marcador.numero,
    areaM2: marcador.areaM2,
    valor: marcador.valor,
  });
  lotes.delete(lote.id);
  lote.id = marcador.loteId;
  lote.status = marcador.status;
  lotes.set(lote.id, lote);
}

const clienteHistorico = salvarCliente(randomUUID(), {
  nome: 'Cliente Histórico FE-18',
  documento: '52998224725',
});
const loteHistorico = criarLote(quadraSemente, {
  numero: 'FE18',
  areaM2: '360.00',
});
const reservaHistorico = {
  id: randomUUID(),
  status: 'EXPIRADA',
  dataInicio: '2026-11-01T12:00:00.000Z',
  dataVencimento: '2026-11-08T12:00:00.000Z',
  lote: {
    id: loteHistorico.id,
    numero: loteHistorico.numero,
    quadra: quadraSemente.numero,
    loteamentoId: LOTEAMENTO_SEMENTE_ID,
    loteamento: 'Loteamento Semente',
  },
};
const propostaHistorico = {
  id: randomUUID(),
  valor: '250000.50',
  status: 'REJEITADA',
  dataEnvio: '2026-11-03T12:00:00.000Z',
  prazoLimite: '2026-11-07T12:00:00.000Z',
  decisao: {
    decididoPorId: USUARIOS.find(({ perfil }) => perfil === 'GESTOR').id,
    data: '2026-11-04T12:00:00.000Z',
    motivo: 'Condições fora da política comercial.',
  },
};
const historicoCliente = [
  {
    id: propostaHistorico.id,
    tipo: 'PROPOSTA',
    data: propostaHistorico.dataEnvio,
    reserva: reservaHistorico,
    proposta: propostaHistorico,
  },
  {
    id: reservaHistorico.id,
    tipo: 'RESERVA',
    data: reservaHistorico.dataInicio,
    reserva: reservaHistorico,
    proposta: null,
  },
];

// Fixtures das listagens de reservas e propostas, que também servem à auditoria
// de tablet. A proposta pertence ao Administrador para aparecer em "Minhas
// propostas" na sessão padrão do e2e.
const propostaDaLista = {
  id: propostaHistorico.id,
  reservaId: reservaHistorico.id,
  vendedorId: USUARIOS[0].id,
  status: propostaHistorico.status,
  valor: propostaHistorico.valor,
  condicoes: 'Pagamento à vista, conforme negociação fictícia.',
  observacoes: null,
  dataEnvio: propostaHistorico.dataEnvio,
  prazoLimite: propostaHistorico.prazoLimite,
  decididoPorId: propostaHistorico.decisao.decididoPorId,
  dataDecisao: propostaHistorico.decisao.data,
  motivoDecisao: propostaHistorico.decisao.motivo,
  atrasada: false,
  encerrada: false,
  dataEncerramento: null,
  motivoEncerramento: null,
};
propostas.set(propostaDaLista.id, propostaDaLista);

const reservasDaLista = [
  {
    ...reservaHistorico,
    vendedorId: USUARIOS[0].id,
    cliente: { id: clienteHistorico.id, nome: clienteHistorico.nome },
    propostaAtual: {
      id: propostaDaLista.id,
      status: propostaDaLista.status,
      valor: propostaDaLista.valor,
    },
  },
];

/** Converte a reserva ativa usada no detalhe do lote no resumo da listagem. */
function resumosDeReservas() {
  const criadas = [...reservas.values()].flatMap((registro) => {
    const lote = lotes.get(registro.loteId);
    const quadra = lote && quadras.get(lote.quadraId);
    const loteamento = lote && loteamentos.get(lote.loteamentoId);
    const cliente = clientes.get(registro.clienteId);

    if (!lote || !quadra || !loteamento || !cliente) {
      return [];
    }

    return [
      {
        id: registro.id,
        status: registro.status,
        vendedorId: registro.vendedorId,
        dataInicio: registro.dataInicio,
        dataVencimento: registro.dataVencimento,
        lote: {
          id: lote.id,
          numero: lote.numero,
          quadra: quadra.numero,
          loteamentoId: loteamento.id,
          loteamento: loteamento.nome,
        },
        cliente: { id: cliente.id, nome: cliente.nome },
        propostaAtual: null,
      },
    ];
  });

  return [...reservasDaLista, ...criadas];
}

function listarReservas(request, apenasMinhas) {
  const { searchParams } = new URL(request.url, 'http://localhost');
  const usuario = getUsuario(request);
  const status = searchParams.getAll('status');
  const vendedorId = searchParams.get('vendedorId');
  const loteamentoId = searchParams.get('loteamentoId');
  const vencimentoDe = searchParams.get('vencimentoDe');
  const vencimentoAte = searchParams.get('vencimentoAte');

  return resumosDeReservas()
    .filter((reserva) => !apenasMinhas || reserva.vendedorId === usuario.id)
    .filter((reserva) => status.length === 0 || status.includes(reserva.status))
    .filter((reserva) => !vendedorId || reserva.vendedorId === vendedorId)
    .filter(
      (reserva) => !loteamentoId || reserva.lote.loteamentoId === loteamentoId,
    )
    .filter(
      (reserva) => !vencimentoDe || reserva.dataVencimento >= vencimentoDe,
    )
    .filter(
      (reserva) => !vencimentoAte || reserva.dataVencimento <= vencimentoAte,
    )
    .toSorted((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
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
    method: 'POST',
    pattern: /^\/v1\/links-publicos\/(?<id>[^/]+)\/desativar$/,
    handler: protegida(
      (request, response, path, params) => {
        const link = linksPublicos.get(params.id),
          usuario = getUsuario(request);
        if (!link)
          return sendError(
            response,
            path,
            404,
            'LINK_NAO_ENCONTRADO',
            'Link não encontrado',
          );
        if (usuario.perfil === 'COMERCIAL' && link.criadoPorId !== usuario.id)
          return sendError(
            response,
            path,
            403,
            'ACESSO_NEGADO',
            'Acesso negado',
          );
        link.ativo = false;
        link.updatedAt = new Date().toISOString();
        send(response, 200, link);
      },
      ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL'],
    ),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/publico\/(?<token>[^/]+)$/,
    handler: (request, response, path, params) => {
      const link = [...linksPublicos.values()].find(
        (l) => l.token === params.token && l.ativo,
      );
      if (!link)
        return sendError(
          response,
          '/v1/publico/[token]',
          404,
          'LINK_NAO_ENCONTRADO',
          'Link não encontrado',
        );
      link.acessos++;
      const itens = [...lotes.values()]
        .filter(
          (l) => !link.loteamentoId || l.loteamentoId === link.loteamentoId,
        )
        .map((l) => ({
          id: l.id,
          loteId: l.id,
          x: 0.5,
          y: 0.5,
          numero: l.numero,
          status: l.status,
          quadraId: l.quadraId,
          quadra: quadras.get(l.quadraId).numero,
          loteamentoId: l.loteamentoId,
          loteamento: loteamentos.get(l.loteamentoId).nome,
          areaM2: l.areaM2,
          ...(l.exibirValorPublico ? { valor: l.valor } : {}),
        }));
      const page = Number(
          new URL(request.url, 'http://localhost').searchParams.get('page') ??
            1,
        ),
        pageSize = 100;
      send(response, 200, {
        planta: {
          id: '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
          nome: 'Planta fictícia',
          versao: 1,
          larguraPx: 256,
          alturaPx: 256,
          maxZoom: 0,
          tamanhoTile: 256,
          tilesUrl: '/tiles',
        },
        marcadores: {
          data: itens.slice((page - 1) * pageSize, page * pageSize),
          meta: {
            page,
            pageSize,
            total: itens.length,
            totalPages: Math.ceil(itens.length / pageSize),
          },
        },
        contatoComercial: 'Fale com a equipe que compartilhou este mapa.',
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/v1\/clientes\/(?<id>[^/]+)$/,
    handler: protegida(
      comCliente((_request, response, _path, cliente) => {
        send(response, 200, cliente);
      }),
      PERFIS_CLIENTES,
    ),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/clientes\/(?<id>[^/]+)\/historico$/,
    handler: protegida(
      comCliente((request, response, _path, cliente) => {
        const podeVerSemente =
          cliente.id === clienteHistorico.id &&
          getUsuario(request).perfil !== 'COMERCIAL';
        sendPagina(request, response, podeVerSemente ? historicoCliente : []);
      }),
      PERFIS_CLIENTES,
    ),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/clientes\/(?<id>[^/]+)$/,
    handler: protegida(
      comCliente(async (request, response, path, cliente) => {
        const dados = await readJson(request);

        if (dados.documento && documentoEmUso(dados.documento, cliente.id)) {
          sendDocumentoDuplicado(response, path);
        } else {
          send(response, 200, salvarCliente(cliente.id, dados, cliente));
        }
      }),
      PERFIS_CLIENTES,
    ),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/lotes\/(?<id>[^/]+)\/detalhe$/,
    handler: protegida((request, response, path, params) => {
      const lote = lotes.get(params.id);
      if (!lote) return sendLoteNaoEncontrado(response, path);
      const usuario = getUsuario(request);
      const registro = reservas.get(lote.id);
      const visivel =
        registro &&
        usuario.perfil !== 'CONSULTA' &&
        (usuario.perfil !== 'COMERCIAL' || usuario.id === registro.vendedorId);
      send(response, 200, {
        lote,
        loteamento: {
          id: lote.loteamentoId,
          nome: loteamentos.get(lote.loteamentoId).nome,
        },
        quadra: {
          id: lote.quadraId,
          numero: quadras.get(lote.quadraId).numero,
        },
        reserva: visivel
          ? {
              id: registro.id,
              status: registro.status,
              dataInicio: registro.dataInicio,
              dataVencimento: registro.dataVencimento,
              cliente: {
                id: registro.clienteId,
                nome: clientes.get(registro.clienteId).nome,
              },
              vendedor: {
                id: registro.vendedorId,
                nome: USUARIOS.find(({ id }) => id === registro.vendedorId)
                  .nome,
              },
            }
          : null,
        propostas: [],
        historico: [],
      });
    }),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/usuarios\/(?<id>[^/]+)$/,
    handler: comUsuario((_request, response, usuario) =>
      send(response, 200, usuario),
    ),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/usuarios\/(?<id>[^/]+)$/,
    handler: comUsuario(async (request, response, usuario, path) => {
      const dados = await readJson(request);
      const email = dados.email?.trim().toLowerCase();

      if (
        email &&
        USUARIOS.some((item) => item.id !== usuario.id && item.email === email)
      ) {
        sendUsuarioDuplicado(response, path);
      } else if (
        dados.perfil &&
        dados.perfil !== 'ADMINISTRADOR' &&
        eUltimoAdministrador(usuario)
      ) {
        sendUltimoAdministrador(response, path);
      } else {
        Object.assign(usuario, dados, email ? { email } : {});
        send(response, 200, usuario);
      }
    }),
  },
  {
    method: 'POST',
    pattern: /^\/v1\/usuarios\/(?<id>[^/]+)\/(?<acao>ativar|desativar)$/,
    handler: comUsuario((_request, response, usuario, path, { acao }) => {
      if (acao === 'desativar' && eUltimoAdministrador(usuario)) {
        sendUltimoAdministrador(response, path);
      } else {
        usuario.ativo = acao === 'ativar';
        send(response, 200, usuario);
      }
    }),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/plantas\/[^/]+\/marcadores$/,
    handler: protegida((request, response) =>
      sendPagina(request, response, MARCADORES_DO_MAPA),
    ),
  },
  {
    method: 'POST',
    pattern: /^\/v1\/plantas\/(?<plantaId>[^/]+)\/marcadores\/lote$/,
    handler: protegida(async (request, response, path, { plantaId }) => {
      const { marcadores } = await readJson(request);
      const repetido = marcadores.some(({ loteId }) =>
        MARCADORES_DO_MAPA.some((marcador) => marcador.loteId === loteId),
      );

      if (repetido) {
        sendError(
          response,
          path,
          409,
          'MARCADOR_DUPLICADO',
          'O lote já tem marcador nesta planta',
        );
      } else {
        send(
          response,
          201,
          marcadores.map((marcador) => criarMarcador(marcador, plantaId)),
        );
      }
    }, PERFIS_CADASTRO),
  },
  {
    method: 'POST',
    pattern: /^\/v1\/plantas\/[^/]+\/marcadores\/(?<id>[^/]+)\/revisar$/,
    handler: comMarcador((_request, response, marcador) => {
      marcador.revisar = false;
      send(response, 200, marcador);
    }),
  },
  {
    method: 'PATCH',
    pattern: /^\/v1\/plantas\/[^/]+\/marcadores\/(?<id>[^/]+)$/,
    handler: comMarcador(async (request, response, marcador) => {
      Object.assign(marcador, await readJson(request));
      send(response, 200, marcador);
    }),
  },
  {
    method: 'DELETE',
    pattern: /^\/v1\/plantas\/[^/]+\/marcadores\/(?<id>[^/]+)$/,
    handler: comMarcador((_request, response, marcador) => {
      MARCADORES_DO_MAPA.splice(MARCADORES_DO_MAPA.indexOf(marcador), 1);
      send(response, 204);
    }),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/plantas\/[^/]+\/lotes-sem-marcador$/,
    handler: protegida((request, response) => {
      const loteamentoId = new URL(
        request.url,
        'http://localhost',
      ).searchParams.get('loteamentoId');

      sendPagina(
        request,
        response,
        [...lotes.values()].filter(
          (lote) =>
            (!loteamentoId || lote.loteamentoId === loteamentoId) &&
            !MARCADORES_DO_MAPA.some(({ loteId }) => loteId === lote.id),
        ),
      );
    }),
  },
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

const linksPublicos = new Map();
const routes = {
  'GET /v1/links-publicos': protegida(
    (request, response) => {
      const usuario = getUsuario(request);
      sendPagina(
        request,
        response,
        [...linksPublicos.values()]
          .filter(
            (l) =>
              usuario.perfil !== 'COMERCIAL' || l.criadoPorId === usuario.id,
          )
          .toReversed(),
      );
    },
    ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL'],
  ),
  'POST /v1/links-publicos': protegida(
    async (request, response, path) => {
      const dados = await readJson(request);
      if (dados.loteamentoId && !loteamentos.has(dados.loteamentoId))
        return sendError(
          response,
          path,
          404,
          'LOTEAMENTO_NAO_ENCONTRADO',
          'Loteamento não encontrado',
        );
      const agora = new Date().toISOString();
      const link = {
        id: randomUUID(),
        token: randomBytes(32).toString('base64url'),
        criadoPorId: getUsuario(request).id,
        loteamentoId: dados.loteamentoId ?? null,
        ativo: true,
        acessos: 0,
        createdAt: agora,
        updatedAt: agora,
      };
      linksPublicos.set(link.id, link);
      send(response, 201, link);
    },
    ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL'],
  ),
  'GET /v1/historico': protegida(
    (request, response) => {
      const usuario = getUsuario(request);
      const query = new URL(request.url, 'http://localhost').searchParams;
      const registros = [...lotes.values()]
        .map((lote) => ({
          id: lote.id,
          entidadeTipo: 'Lote',
          entidadeId: lote.id,
          acao: 'CRIAR',
          usuario: { id: USUARIOS[0].id, nome: USUARIOS[0].nome },
          createdAt: lote.createdAt,
          motivo: null,
          valorAnterior: null,
          valorNovo: { numero: lote.numero },
        }))
        .filter(
          (h) =>
            (usuario.perfil !== 'COMERCIAL' || h.usuario.id === usuario.id) &&
            (!query.get('entidadeTipo') ||
              h.entidadeTipo === query.get('entidadeTipo')) &&
            (!query.get('entidadeId') ||
              h.entidadeId === query.get('entidadeId')) &&
            (!query.get('usuarioId') ||
              h.usuario.id === query.get('usuarioId')) &&
            (!query.get('dataDe') || h.createdAt >= query.get('dataDe')) &&
            (!query.get('dataAte') ||
              h.createdAt.slice(0, 10) <= query.get('dataAte')),
        )
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
      sendPagina(request, response, registros);
    },
    ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL'],
  ),
  'GET /health': (_request, response) => send(response, 200, { status: 'ok' }),

  'GET /v1/mapa': protegida((request, response, path) => {
    const planta = plantas.find(({ ativa }) => ativa);

    if (!planta) {
      sendError(
        response,
        path,
        404,
        'PLANTA_ATIVA_NAO_ENCONTRADA',
        'Nenhuma planta ativa encontrada',
      );
      return;
    }

    const { searchParams } = new URL(request.url, 'http://localhost');
    const loteamentoId = searchParams.get('loteamentoId');
    const status = searchParams.get('status');
    const data = MARCADORES_DO_MAPA.filter(
      (marcador) =>
        (!loteamentoId || marcador.loteamentoId === loteamentoId) &&
        (!status || marcador.status === status),
    );

    send(response, 200, {
      planta: {
        id: planta.id,
        nome: planta.nome,
        versao: planta.versao,
        ...METADADOS_PLANTA_PRONTA,
        tilesUrl: `/v1/plantas/${planta.id}/tiles/{z}/{x}/{y}.webp`,
      },
      marcadores: {
        data,
        meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 },
      },
    });
  }),

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

  // A lista traz só id e nome, como a API.
  'GET /v1/clientes': protegida((request, response) => {
    const { searchParams } = new URL(request.url, 'http://localhost');

    sendPagina(
      request,
      response,
      buscarClientes(searchParams.get('q')).map(({ id, nome }) => ({
        id,
        nome,
      })),
    );
  }, PERFIS_CLIENTES),

  'POST /v1/clientes': protegida(async (request, response, path) => {
    const dados = await readJson(request);

    if (documentoEmUso(dados.documento)) {
      sendDocumentoDuplicado(response, path);
    } else {
      send(response, 201, salvarCliente(randomUUID(), dados));
    }
  }, PERFIS_CLIENTES),

  'GET /v1/reservas': protegida(
    (request, response) =>
      sendPagina(request, response, listarReservas(request, false)),
    ['ADMINISTRADOR', 'GESTOR'],
  ),

  'GET /v1/reservas/minhas': protegida(
    (request, response) =>
      sendPagina(request, response, listarReservas(request, true)),
    PERFIS_CLIENTES,
  ),

  'GET /v1/propostas/minhas': protegida((request, response) => {
    const usuario = getUsuario(request);
    const lista = [...propostas.values()]
      .filter((proposta) => proposta.vendedorId === usuario.id)
      .toSorted((a, b) => b.dataEnvio.localeCompare(a.dataEnvio));
    sendPagina(request, response, lista);
  }, PERFIS_CLIENTES),

  'GET /v1/reservas/previsao': protegida((_request, response) => {
    send(response, 200, previsaoReserva());
  }, PERFIS_CLIENTES),

  'POST /v1/reservas': protegida(async (request, response, path) => {
    const { loteId, clienteId } = await readJson(request);
    const lote = lotes.get(loteId);

    if (!lote) return sendLoteNaoEncontrado(response, path);
    if (!clientes.has(clienteId)) {
      return sendError(
        response,
        path,
        404,
        'CLIENTE_NAO_ENCONTRADO',
        'Cliente não encontrado',
      );
    }
    if (lote.status !== 'DISPONIVEL') {
      return sendError(
        response,
        path,
        409,
        'LOTE_NAO_DISPONIVEL',
        'O lote não está disponível',
      );
    }
    const { prazoDias, dataVencimento } = previsaoReserva();
    const reserva = {
      id: randomUUID(),
      loteId,
      clienteId,
      vendedorId: getUsuario(request).id,
      dataInicio: new Date().toISOString(),
      dataVencimento,
      status: 'ATIVA',
      tempoRestanteSegundos: prazoDias * 86400,
    };
    lote.status = 'RESERVADO';
    reservas.set(loteId, reserva);
    send(response, 201, reserva);
  }, PERFIS_CLIENTES),

  'POST /v1/auth/login': async (request, response, path) => {
    const { email, senha } = await readJson(request);

    const usuario = USUARIOS.find((item) => item.email === email);

    if (usuario?.ativo && senha === (senhasRedefinidas.get(email) ?? SENHA)) {
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

  // Responde igual, exista ou não a conta, como a API de verdade.
  'POST /v1/auth/forgot-password': async (request, response) => {
    const { email } = await readJson(request);

    if (USUARIOS.some((item) => item.email === email)) {
      tokensDeRecuperacao.set(randomBytes(32).toString('base64url'), email);
    }
    send(response, 204);
  },

  'POST /v1/auth/reset-password': async (request, response, path) => {
    const { token, senha } = await readJson(request);
    const email = tokensDeRecuperacao.get(token);

    if (email) {
      tokensDeRecuperacao.delete(token);
      senhasRedefinidas.set(email, senha);
      send(response, 204);
    } else {
      sendError(
        response,
        path,
        401,
        'TOKEN_RECUPERACAO_INVALIDO',
        'Token de recuperação inválido ou expirado',
      );
    }
  },

  // Faz o papel da caixa de entrada, que no backend real é o Mailpit.
  'GET /__e2e/token-recuperacao': (request, response) => {
    const email = new URL(request.url, 'http://localhost').searchParams.get(
      'email',
    );
    const token = [...tokensDeRecuperacao.entries()]
      .filter(([, dono]) => dono === email)
      .at(-1)?.[0];

    send(response, 200, { token: token ?? null });
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

  'GET /v1/configuracoes': protegida((request, response) => {
    sendPagina(
      request,
      response,
      Object.entries(prazos).map(([chave, valor]) => ({ chave, valor })),
    );
  }, PERFIS_ADMINISTRACAO),

  'PATCH /v1/configuracoes': protegida(async (request, response) => {
    const dados = await readJson(request);

    if (dados.prazoReservaDias !== undefined) {
      prazos.prazo_reserva_dias = dados.prazoReservaDias;
    }
    if (dados.prazoAnaliseDiasUteis !== undefined) {
      prazos.prazo_analise_dias_uteis = dados.prazoAnaliseDiasUteis;
    }
    send(response, 200, {
      prazoReservaDias: prazos.prazo_reserva_dias,
      prazoAnaliseDiasUteis: prazos.prazo_analise_dias_uteis,
    });
  }, PERFIS_ADMINISTRACAO),

  // Só o Administrador: o e2e de permissões confere o 403 por aqui.
  'GET /v1/usuarios': protegida((request, response) => {
    const { searchParams } = new URL(request.url, 'http://localhost');
    const perfil = searchParams.get('perfil');
    const ativo = searchParams.get('ativo');

    sendPagina(
      request,
      response,
      USUARIOS.filter(
        (usuario) =>
          (!perfil || usuario.perfil === perfil) &&
          (ativo === null || String(usuario.ativo) === ativo),
      ),
    );
  }, PERFIS_ADMINISTRACAO),

  'POST /v1/usuarios': protegida(async (request, response, path) => {
    const { senha, ...dados } = await readJson(request);
    const email = dados.email.trim().toLowerCase();

    if (USUARIOS.some((usuario) => usuario.email === email)) {
      sendUsuarioDuplicado(response, path);
      return;
    }

    const usuario = { ...dados, email, id: randomUUID(), ativo: true };
    USUARIOS.push(usuario);
    senhasRedefinidas.set(email, senha);
    send(response, 201, usuario);
  }, PERFIS_ADMINISTRACAO),

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
