// Guarda do funil: nenhum arquivo de api/ monta URL do banco por fora.
//
// ── Por que existe ───────────────────────────────────────────────────
// Desde 23/set o isolamento entre lojas é o filtro por `conta_id` que o
// `api/_db.js` põe em toda consulta. Mas a regra vivia só em comentário,
// e regra que depende de disciplina é regra que um dia falta — no dia de
// pressa em que alguém (provavelmente eu) escrever um endpoint novo com
// `fetch(`${SUPABASE_URL}/rest/v1/...`)` porque era mais rápido.
//
// Esse endpoint funcionaria. Passaria no teste manual. E seria o caminho
// sem dono que o funil existe para não deixar existir.
//
// ── Duas decisões de desenho, para quem for mexer ────────────────────
//
// 1. A regra NÃO é "não use SUPABASE_URL". Metade das funções usa, e com
//    razão: `/storage/v1` (arquivo) não passa pelo funil, que é de banco.
//    Proibir a variável daria falso positivo em quatro arquivos legítimos
//    e o guarda seria desligado na primeira semana. A regra é `/rest/v1`.
//
// 2. Este script NÃO tenta remover comentário antes de olhar. Já me
//    mordeu duas vezes (04/set e 10/set): a remoção "esperta" engoliu
//    código porque `*/` aparece dentro de expressão regular. Então um
//    `/rest/v1` escrito dentro de um comentário TAMBÉM acusa. É falso
//    positivo — mas falha para o lado seguro, e o conserto é reescrever
//    o comentário ou declarar a exceção aqui embaixo, à vista.
//
// Uso:  node scripts/checa-funil.js          (checa)
//       node scripts/checa-funil.js --teste  (prova o detector)

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'api');

// Quem tem permissão de montar URL de banco, e por quê. Lista curta de
// propósito: cada linha aqui é uma porta a mais.
const LIBERADOS = {
  '_db.js': 'é o funil',
  'utils.js': 'ping do cron — a Vercel não manda cabeçalho nosso, e ele só lê um id',
};

// Arquivos que podem declarar SUPABASE_URL sem usar para banco: os que
// falam com o storage (arquivo é isolado por pasta, não pelo funil).
const ehStorage = (src) => src.includes('/storage/v1');

function achados() {
  const erros = [];
  for (const nome of fs.readdirSync(DIR).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(DIR, nome), 'utf8');
    const linhas = src.split(/\r?\n/);

    linhas.forEach((linha, i) => {
      if (!linha.includes('/rest/v1')) return;
      if (LIBERADOS[nome]) return;
      erros.push({
        nome, linha: i + 1,
        porque: 'monta URL de banco fora do funil — use db(contaDoPedido(req))',
        trecho: linha.trim().slice(0, 90),
      });
    });

    // Constante declarada e nunca usada é a semente: ela fica ali, à mão,
    // convidando o próximo fetch a nascer por fora.
    const declara = /const\s+SUPABASE_URL\s*=/.test(src);
    const usa = /\$\{SUPABASE_URL\}|SUPABASE_URL\s*\+|!SUPABASE_URL|SUPABASE_URL\s*\)/.test(src);
    if (declara && !usa && !ehStorage(src) && !LIBERADOS[nome]) {
      erros.push({
        nome, linha: linhas.findIndex((l) => /const\s+SUPABASE_URL\s*=/.test(l)) + 1,
        porque: 'declara SUPABASE_URL e não usa — caminho sem dono esperando ser usado',
        trecho: 'const SUPABASE_URL = ...',
      });
    }
  }
  return erros;
}

// Prova que o detector enxerga o que deve e ignora o que não deve.
// Sem isto, um guarda quebrado passa por guarda funcionando — que é pior
// do que não ter guarda nenhum.
function teste() {
  const casos = [
    ['pega o caso real',        'const r = await fetch(`${SUPABASE_URL}/rest/v1/veiculos`)', true],
    ['pega com aspas simples',  "fetch(SUPABASE_URL + '/rest/v1/vendas')",                   true],
    ['ignora storage',          'fetch(`${SUPABASE_URL}/storage/v1/object/${B}/${p}`)',      false],
    ['ignora chamada do funil', 'const sb = db(contaDoPedido(req));',                        false],
    ['ignora texto qualquer',   '// fala com o Supabase via PostgREST',                      false],
  ];
  let ok = 0;
  for (const [nome, linha, esperado] of casos) {
    const viu = linha.includes('/rest/v1');
    const passou = viu === esperado;
    console.log(`${passou ? 'ok  ' : 'ERRO'} ${nome}`);
    if (passou) ok++;
  }
  console.log(`\n${ok}/${casos.length}`);
  return ok === casos.length;
}

if (process.argv.includes('--teste')) {
  process.exit(teste() ? 0 : 1);
}

const erros = achados();
if (!erros.length) {
  const nomes = Object.keys(LIBERADOS).join(', ');
  console.log(`ok — nenhuma URL de banco fora do funil (liberados: ${nomes})`);
  process.exit(0);
}
console.error('FALHOU — caminho para o banco sem passar pelo funil:\n');
for (const e of erros) {
  console.error(`  api/${e.nome}:${e.linha}  ${e.porque}`);
  console.error(`    ${e.trecho}\n`);
}
process.exit(1);
