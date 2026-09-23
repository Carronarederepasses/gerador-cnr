// Compara a estrutura do banco da CNR com a do banco do piloto.
//
// ── Por que existe ───────────────────────────────────────────────────
// São dois bancos separados (um site por loja) e as mudanças são aplicadas
// à mão em cada um. Hoje batem — conferido em 22/set, 203 de 203 colunas.
// Daqui a algumas semanas de ajuste, não batem mais, e o sintoma não é um
// erro claro: é o banco do lojista recusando um cadastro que o teu aceita,
// como aconteceu em 23/set.
//
// COMO RODAR (de dentro de gerador-cnr/):  node supabase/confere-bancos.js
// Lê as duas chaves do `.env` local. Só lê ESTRUTURA — nome de tabela,
// nome de coluna, tipo e obrigatoriedade. Nenhum dado de cliente sai daqui.
//
// ── O que este script NÃO enxerga, e importa ─────────────────────────
// A descrição que o PostgREST publica não traz valor padrão complexo
// (`default '[]'::jsonb`). Foi exatamente por isso que o banco do piloto
// nasceu sem os padrões de `opcionais`, `fotos`, `documentos`, `avaliacao`
// e `anexos` — e o defeito só apareceu ao tentar gravar.
// Então "0 divergências" aqui significa: as COLUNAS batem. Não significa
// que os dois bancos se comportam igual. Padrão e trigger continuam sendo
// conferidos rodando `supabase/piloto-defaults.sql` quando houver dúvida.
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..') + '/';

const env = {};
for (const l of fs.readFileSync(RAIZ + '.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const BANCOS = [
  { nome: 'CNR',    url: env.SUPABASE_URL,        chave: env.SUPABASE_SERVICE_ROLE_KEY },
  { nome: 'piloto', url: env.PILOTO_SUPABASE_URL, chave: env.PILOTO_SUPABASE_KEY },
];

async function estrutura({ nome, url, chave }) {
  if (!url || !chave) {
    console.error(`Falta o endereço ou a chave do banco ${nome} no .env.`);
    process.exit(1);
  }
  const r = await fetch(url + '/rest/v1/', {
    headers: { apikey: chave, Accept: 'application/openapi+json' },
  });
  if (!r.ok) {
    console.error(`Não consegui ler a estrutura do banco ${nome}: HTTP ${r.status}`);
    process.exit(1);
  }
  const defs = (await r.json()).definitions || {};
  const tabelas = {};
  for (const [tabela, def] of Object.entries(defs)) {
    const obrig = new Set(def.required || []);
    tabelas[tabela] = {};
    for (const [col, p] of Object.entries(def.properties || {})) {
      tabelas[tabela][col] = `${p.format || p.type}${obrig.has(col) ? ' NOT NULL' : ''}`;
    }
  }
  return tabelas;
}

(async () => {
  const [cnr, piloto] = await Promise.all(BANCOS.map(estrutura));
  const nomes = [...new Set([...Object.keys(cnr), ...Object.keys(piloto)])].sort();

  const dif = [];
  let colunas = 0;

  for (const t of nomes) {
    if (!piloto[t]) { dif.push(`tabela \`${t}\` só existe na CNR`); continue; }
    if (!cnr[t])    { dif.push(`tabela \`${t}\` só existe no piloto`); continue; }

    const cols = [...new Set([...Object.keys(cnr[t]), ...Object.keys(piloto[t])])].sort();
    for (const c of cols) {
      const a = cnr[t][c], b = piloto[t][c];
      if (a && b) { colunas++; if (a !== b) dif.push(`\`${t}.${c}\`: CNR é ${a}, piloto é ${b}`); }
      else if (a) dif.push(`\`${t}.${c}\` só existe na CNR`);
      else        dif.push(`\`${t}.${c}\` só existe no piloto`);
    }
  }

  console.log(`${nomes.length} tabelas · ${colunas} colunas nos dois\n`);
  if (!dif.length) {
    console.log('ok — as colunas batem.');
    console.log('(valor padrão e trigger não aparecem aqui — ver o cabeçalho do arquivo)');
    return;
  }
  console.error(`${dif.length} divergência(s):\n`);
  for (const d of dif) console.error('  ' + d);
  console.error('\nAplicar a migration que falta no banco atrasado antes de seguir.');
  // `process.exitCode` e não `process.exit()`: com a conexão ainda aberta, o
  // encerramento à força estoura no libuv do Windows e devolve 127 em vez de
  // 1 — código de saída errado faz o dia em que isto rodar sozinho mentir.
  process.exitCode = 1;
})();
