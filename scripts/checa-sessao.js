// Guarda: quem tem portão precisa saber ler sessão.
//
// ── Por que existe ───────────────────────────────────────────────────
// Cada endpoint de `api/` chama `exigirChave(req, res)` por conta própria.
// Desde a fase 1 existe um segundo jeito de entrar — sessão por telefone —
// e ela só é enxergada se o arquivo chamar `comSessao(req)` ANTES do portão.
//
// Esquecer numa rota dá o pior tipo de defeito deste projeto: a pessoa
// entra pelo telefone, o Painel abre, e o Catálogo diz "aparelho não
// liberado". Não é erro de sistema, é erro de gente — e cada tela mente
// de um jeito diferente.
//
// Aconteceu comigo em 27/set: liguei a sessão só no `utils.js` e o teste em
// produção pegou o resto em 401. Esta guarda é para não depender de eu
// lembrar na próxima.
//
// Uso:  node scripts/checa-sessao.js

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'api');

// Quem pode ter portão sem ler sessão, e por quê.
const LIBERADOS = {
  '_auth.js': 'é o portão',
};

// Linha comentada NÃO conta. A primeira versão desta guarda foi enganada
// pelo próprio teste: comentei a chamada e ela seguiu dizendo "ok", porque
// o texto continuava no arquivo. Falso negativo é o pior defeito possível
// numa guarda — ela vira um carimbo.
//
// Só comentário de linha, e comparando a linha inteira: tentar entender
// comentário de bloco com expressão regular já engoliu código aqui em
// 04/set e 10/set, porque `*/` aparece dentro de expressões regulares.
const vivas = (src) => src
  .split(/\r?\n/)
  .map((l, i) => ({ n: i + 1, t: l.trim() }))
  .filter((l) => !l.t.startsWith('//') && !l.t.startsWith('*') && !l.t.startsWith('/*'));

const achaLinha = (linhas, re) => { const a = linhas.find((l) => re.test(l.t)); return a ? a.n : -1; };

const erros = [];

for (const nome of fs.readdirSync(DIR).filter((f) => f.endsWith('.js'))) {
  if (LIBERADOS[nome]) continue;
  const linhas = vivas(fs.readFileSync(path.join(DIR, nome), 'utf8'));

  const linhaPortao = achaLinha(linhas, /if\s*\(\s*exigirChave\s*\(/);
  if (linhaPortao === -1) continue;   // sem portão, nada a cobrar

  const linhaSessao = achaLinha(linhas, /await\s+comSessao\s*\(/);
  if (linhaSessao === -1) {
    erros.push({
      nome,
      porque: 'chama exigirChave e nunca lê a sessão (com await) — quem entrar pelo telefone leva 401 aqui',
    });
    continue;
  }
  // Ordem importa: ler depois do portão não adianta, o pedido já foi recusado.
  if (linhaSessao > linhaPortao) {
    erros.push({
      nome,
      porque: `lê a sessão na linha ${linhaSessao}, depois do portão (linha ${linhaPortao}) — nessa ordem já foi recusado`,
    });
  }
}

if (!erros.length) {
  console.log('ok — todo endpoint com portão lê a sessão antes');
  process.exitCode = 0;
} else {
  console.error('FALHOU — endpoint que recusa quem entrou pelo telefone:\n');
  for (const e of erros) console.error(`  api/${e.nome}  ${e.porque}\n`);
  process.exitCode = 1;
}
