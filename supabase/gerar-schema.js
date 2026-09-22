// Gera supabase/schema-completo.sql a partir da descrição que o PostgREST do
// banco VIVO publica (OpenAPI), mais o que ela não mostra e está nos scripts.
//
// Por quê: 5 das 12 tabelas nunca tiveram script — só existiam dentro do
// projeto do Supabase. Sem isto, não dá para montar o banco do piloto, e se o
// projeto se perder o desenho delas vai junto.
//
// COMO RODAR (de dentro de gerador-cnr/):   node supabase/gerar-schema.js
// Lê a chave do `.env` local (que não vai para o git). Só lê estrutura —
// nomes de coluna e tipos, nenhum dado de cliente.
// Rodar de novo sempre que o banco ganhar tabela ou coluna: é o que mantém
// a cópia da estrutura em dia, e ela é a única cópia fora do Supabase.
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..') + '/';
const SUPA = RAIZ + 'supabase/';

const env = {};
for (const l of fs.readFileSync(RAIZ + '.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

(async () => {
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/', {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, Accept: 'application/openapi+json' },
  });
  if (!r.ok) { console.error('Não consegui ler a descrição do banco: HTTP', r.status); process.exit(1); }
  gerar(await r.json());
})();

function gerar(spec) {
const defs = spec.definitions;

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const ehPK = p => /<pk\/>/.test(p.description || '');
const fkDe = p => { const m = (p.description || '').match(/<fk table='([^']+)' column='([^']+)'\/>/); return m ? { tabela: m[1], coluna: m[2] } : null; };

// ── Identidade: a descrição NÃO mostra. Vem dos scripts originais. ──
// Conferido em 22/set: só `ideias.id` é numérico gerado; o resto é uuid.
const IDENTIDADE = { 'ideias.id': 'generated always as identity' };

function padrao(p) {
  if (p.default === undefined) return '';
  const d = String(p.default);
  if (/\(.*\)/.test(d)) return ` default ${d}`;                           // gen_random_uuid(), now()
  if (p.type === 'boolean' || p.type === 'integer' || p.type === 'number') return ` default ${d}`;
  return ` default ${q(d)}`;
}

// ── Ordem: quem é apontado por chave estrangeira vem antes ──────────
const nomes = Object.keys(defs);
const dependeDe = t => Object.values(defs[t].properties).map(fkDe).filter(Boolean).map(f => f.tabela).filter(x => x !== t);
const ordem = []; const visto = new Set();
const visita = t => { if (visto.has(t)) return; visto.add(t); dependeDe(t).forEach(visita); ordem.push(t); };
nomes.sort().forEach(visita);

// ── Tabelas ─────────────────────────────────────────────────────────
const fks = [];
const blocos = ordem.map(t => {
  const d = defs[t];
  const obrig = new Set(d.required || []);
  const linhas = Object.entries(d.properties).map(([c, p]) => {
    const tipo = p.format;
    const ident = IDENTIDADE[`${t}.${c}`] ? ' ' + IDENTIDADE[`${t}.${c}`] : '';
    const pk = ehPK(p) ? ' primary key' : '';
    const nn = !pk && obrig.has(c) ? ' not null' : '';
    const f = fkDe(p); if (f) fks.push({ t, c, ...f });
    return `  ${c.padEnd(22)} ${tipo}${ident}${ident ? '' : padrao(p)}${nn}${pk}`;
  });
  return `create table if not exists public.${t} (\n${linhas.join(',\n')}\n);`;
});

// ── Regras de valor único que o CÓDIGO usa (upserts) ────────────────
// Conferido em 22/set: os três upserts do código caem em buscas (pela chave
// primária), anuncios (origem+listing_id) e olx_mensagens (msg_hash).
const unicos = [
  `alter table public.anuncios add constraint anuncios_origem_listing_id unique (origem, listing_id);`,
  `alter table public.olx_mensagens add constraint olx_mensagens_msg_hash_key unique (msg_hash);`,
];

// ── Índices dos scripts que existem, sem duplicar pelo nome ─────────
const indices = new Map();
for (const arq of fs.readdirSync(SUPA).filter(a => a.endsWith('.sql') && a !== 'schema-completo.sql' && a !== 'dump-estrutura.sql')) {
  const txt = fs.readFileSync(SUPA + arq, 'utf8').replace(/--[^\n]*/g, '');   // tira comentários antes
  for (const m of txt.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)[\s\S]*?;/gi)) {
    const nome = m[1].toLowerCase();
    if (!indices.has(nome)) indices.set(nome, { sql: m[0].replace(/\s+/g, ' ').trim(), de: arq });
  }
}
// A `historico` nunca teve script: foi criada por conexão direta em 19/ago.
// Os 5 índices estão descritos no CLAUDE.md (Reforma 35, Etapa 1).
for (const col of ['entidade', 'veiculo_id', 'venda_id', 'cliente_id', 'evento']) {
  const nome = `idx_historico_${col}`;
  const alvo = col === 'entidade' ? 'entidade, entidade_id' : col;
  indices.set(nome, { sql: `create index if not exists ${nome} on public.historico (${alvo}, created_at desc);`, de: 'CLAUDE.md — Reforma 35' });
}
// Índice cuja coluna não existe mais quebraria o script inteiro.
// Confere as colunas dos parênteses E as da condição (`where feito_em is
// null`) — a primeira versão só olhava os parênteses, e uma coluna renomeada
// na condição pararia o script no meio sem aviso.
const colunaExiste = (t, c) => !!(defs[t] && defs[t].properties[c.trim().split(/\s+/)[0]]);
const PALAVRAS_SQL = new Set(['is', 'not', 'null', 'and', 'or', 'true', 'false', 'in', 'desc', 'asc']);
const descartados = [];
const indicesOk = [...indices.values()].filter(({ sql }) => {
  const m = sql.match(/on\s+(?:public\.)?([a-z_]+)\s*\(([^)]*)\)(?:\s+where\s+(.*?))?;?$/i);
  if (!m) return true;
  const cols = m[2].split(',');
  const naCondicao = m[3] ? (m[3].match(/[a-z_][a-z0-9_]*/gi) || []).filter(w => !PALAVRAS_SQL.has(w.toLowerCase())) : [];
  const ok = cols.every(c => colunaExiste(m[1], c)) && naCondicao.every(c => colunaExiste(m[1], c));
  if (!ok) descartados.push(sql);
  return ok;
});

const saida = `-- ═════════════════════════════════════════════════════════════════
-- Estrutura COMPLETA do banco do Gerador — gerada em 22/set/2026
--
-- POR QUE EXISTE
-- 5 das 12 tabelas (compradores, negociacoes, eventos, historico,
-- observacoes) nunca tiveram script: foram criadas no painel ou por conexão
-- direta, e só existiam dentro do projeto vivo do Supabase. Isso travava o
-- piloto com o lojista (não havia como montar um banco vazio igual) e, pior,
-- se o projeto se perdesse, o DESENHO dessas tabelas ia junto.
--
-- DE ONDE VEIO
-- Colunas, tipos, padrões, obrigatórias, chaves primárias e estrangeiras:
-- da descrição que o próprio banco publica (OpenAPI do PostgREST), lida em
-- 22/set. Não é redigitado de memória.
-- Regras de valor único, índices e numeração automática: dos scripts
-- antigos da pasta supabase/, porque a descrição NÃO mostra isso.
--
-- O QUE A DESCRIÇÃO NÃO MOSTRA — e o que foi feito com cada coisa
--   • padrões mais complexos (ex.: negociacoes.anexos '[]'): omitidos. O
--     código já trata a coluna vazia; nada quebra.
--   • regras de valor único das 5 tabelas sem script: desconhecidas. Nenhum
--     upsert do código depende delas (conferido); no pior caso, um banco
--     novo aceita uma duplicata que o de produção recusaria.
--   • ação ao apagar nas chaves estrangeiras: a descrição não diz; ficou o
--     padrão do Postgres (bloqueia apagar quem é referenciado).
--
-- COMO SE CONFERE
-- Rodar isto num projeto NOVO e comparar a descrição dele com a de
-- produção: as duas têm de bater tabela por tabela, coluna por coluna.
--
-- Rodar num projeto VAZIO. Em produção não faz nada (if not exists), mas não
-- é para lá.
-- ═════════════════════════════════════════════════════════════════


-- ── Tabelas (${ordem.length}) ─ em ordem: quem é apontado vem antes ──────

${blocos.join('\n\n')}


-- ── Chaves estrangeiras (${fks.length}) ────────────────────────────────
-- Só as que EXISTEM em produção. veiculo_id e venda_id da historico, por
-- exemplo, NÃO têm chave estrangeira de propósito (19/ago): o histórico não
-- pode sumir quando um carro ou venda é apagado.

${fks.map(f => `alter table public.${f.t} add constraint ${f.t}_${f.c}_fkey foreign key (${f.c}) references public.${f.tabela} (${f.coluna});`).join('\n')}


-- ── Valor único que o código usa ──────────────────────────────────
-- Sem estes, os upserts do Radar e do espelho de conversa dariam erro 42P10.

${unicos.join('\n')}


-- ── Índices (${indicesOk.length}) ──────────────────────────────────────

${indicesOk.map(i => `${i.sql}   -- de ${i.de}`).join('\n')}
${descartados.length ? `\n-- Descartados porque a coluna não existe mais em produção:\n${descartados.map(s => '--   ' + s).join('\n')}\n` : ''}

-- ── RLS em TODAS, sem policy ──────────────────────────────────────
-- Igual a produção desde 08/set: o acesso é só pelo servidor (service_role,
-- que ignora RLS). Sem policy, a chave pública não enxerga nada — que é o
-- certo, e é por isso que a Caixa Preta deixou de ficar aberta.

${ordem.map(t => `alter table public.${t} enable row level security;`).join('\n')}


-- ── Armazenamento de arquivos ─────────────────────────────────────
-- veiculos:    PÚBLICO — é o que deixa a foto aparecer no <img> e no story.
-- vendas-docs: PRIVADO — CPF, CRLV, contrato, comprovante. Só com link
--              temporário gerado pelo servidor.

insert into storage.buckets (id, name, public) values ('veiculos', 'veiculos', true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('vendas-docs', 'vendas-docs', false)
  on conflict (id) do update set public = false;
`;

fs.writeFileSync(SUPA + 'schema-completo.sql', saida);
console.log('tabelas:', ordem.length, '→', ordem.join(', '));
console.log('chaves estrangeiras:', fks.length, fks.map(f => `${f.t}.${f.c}→${f.tabela}`).join(', '));
console.log('índices:', indicesOk.length, '| descartados:', descartados.length);
descartados.forEach(d => console.log('   descartado:', d));
console.log('linhas no arquivo:', saida.split('\n').length);
}
