// A trava de sub-linha do fipe-search, conferida contra a FIPE real.
//
// Caso que a motivou (01/out): o Yuri colou o card do Corolla no Parceiros e
// voltou a FIPE do Corolla Cross. A pontuação acertava (XEi 22, Cross 19) —
// quem errava era a janela de família, porque a âncora é só a primeira
// palavra e "Corolla Cross" tem a mesma.
//
// A função é RECORTADA do arquivo real. Cópia do raciocínio é como um teste
// passa a concordar com o erro.
//
// Rodar:  node scripts/checa-sublinha.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const { fipeGet, baseModelo } = require(path.join(RAIZ, 'api', '_fipe.js'));
const txt = fs.readFileSync(path.join(RAIZ, 'api', 'fipe-search.js'), 'utf8');

// `subLinha` é arrow dentro do handler: recorta da declaração até o `};`.
const i = txt.indexOf('const subLinha = (nome) => {');
if (i < 0) { console.log('FALHOU: não achei subLinha em api/fipe-search.js'); process.exitCode = 1; return; }
const fim = txt.indexOf('\n    };', i);
const corpo = txt.slice(i, fim + 7);
const NORM = txt.match(/const normalize = [^\n]*/)[0];
const subLinha = new Function(NORM + '\n' + corpo + '\nreturn subLinha;')();
const normalize = new Function(NORM + '\nreturn normalize;')();

let falhas = 0;
const dizer = (ok, t) => { if (!ok) falhas++; console.log((ok ? '  ok  ' : '  FALHOU  ') + t); };

// ── 1. A função sozinha ──────────────────────────────────────────
const CASOS = [
  ['Corolla Cross XRE 2.0 16V Flex Aut.', 'cross'],
  ['Corolla XEi 2.0 Flex 16V Aut.',       'xei'],
  ['Corolla Fielder SW 1.8/1.8 XEi Flex', 'fielder'],
  ['Corolla ALTIS/A.Premiu. 2.0 Flex',    'altis'],
  // Segunda palavra com dígito não é sub-linha — é motor/versão.
  ['Gol 1.0 Flex 12V 5p',                 null],
  ['HB20S 1.0 Evolution',                 null],
  // Segunda palavra curta demais também não.
  ['Argo HD 1.0',                         null],
  ['Onix LT 1.0',                         null],
  // Nome de uma palavra só.
  ['Corolla',                             null],
];
console.log('subLinha() isolada\n');
CASOS.forEach(([nome, esperado]) => {
  const r = subLinha(nome);
  dizer(r === esperado, `"${nome}" -> ${r === null ? 'null' : '"' + r + '"'} (esperado ${esperado === null ? 'null' : '"' + esperado + '"'})`);
});

// ── 2. Contra a FIPE real ────────────────────────────────────────
// Reproduz a janela: mesma marca + mesma âncora, depois a trava de sub-linha.
function janela(modelos, textoUsuario, nomeTopo) {
  const ancora = baseModelo(nomeTopo).toLowerCase();
  const texto = normalize(textoUsuario.toLowerCase());
  const familia = modelos.filter(m => baseModelo(m.nome).toLowerCase() === ancora);
  // Mesma regra do fipe-search: a trava só vale se o texto nomeia alguma
  // sub-linha da família.
  const pedidas = familia.map(m => subLinha(m.nome)).filter(s => s && texto.includes(s));
  const filtrada = pedidas.length
    ? familia.filter(m => { const sub = subLinha(m.nome); return !sub || texto.includes(sub); })
    : familia;
  return { familia, usada: filtrada, semTrava: !pedidas.length };
}

(async () => {
  console.log('\nContra a FIPE real\n');
  const toyota = (await fipeGet('/marcas/56/modelos')).modelos || [];

  // O caso do Yuri: o Cross tem de sair da janela.
  const a = janela(toyota, 'Corolla XEi 2.0 Flex 16V Aut.', 'Corolla XEi 2.0 Flex 16V Aut.');
  dizer(a.familia.some(m => /cross/i.test(m.nome)), `a família crua TEM Corolla Cross (${a.familia.length} modelos) — é o problema`);
  dizer(!a.usada.some(m => /cross/i.test(m.nome)), 'nenhum Corolla Cross na janela usada');
  dizer(!a.usada.some(m => /fielder/i.test(m.nome)), 'nenhum Corolla Fielder na janela usada');
  dizer(a.usada.some(m => /^Corolla XEi/i.test(m.nome)), 'o Corolla XEi continua na janela');
  dizer(!a.semTrava, 'não precisou do recuo');

  // Quem PEDE o Cross tem de receber o Cross.
  const b = janela(toyota, 'Corolla Cross XRE 2.0 Flex', 'Corolla Cross XRE 2.0 16V Flex Aut.');
  dizer(b.usada.some(m => /cross/i.test(m.nome)), 'pedindo Cross, o Cross está na janela');

  // Sem versão nenhuma, a trava esvaziaria tudo: tem de cair no recuo e NÃO
  // responder "não encontrei" para um carro que a FIPE tem.
  const c = janela(toyota, 'Corolla 2023', 'Corolla XEi 2.0 Flex 16V Aut.');
  dizer(c.semTrava, 'so "Corolla 2023" nao ativa a trava — o texto nao nomeia sub-linha');
  dizer(c.usada.length === c.familia.length, 'sem trava, a janela e a familia inteira');
  dizer(c.usada.some(m => /XEi/i.test(m.nome)), 'o Corolla XEi continua alcancavel sem versao no texto');

  // Regressão do caso que criou a âncora, em 16/set: F-250 e F-1000.
  const ford = (await fipeGet('/marcas/22/modelos')).modelos || [];
  const d = janela(ford, 'Ford F-250 XLT 4x4', 'F-250 XL/XLT 4x2 Turbo');
  dizer(d.usada.length > 0, `Ford F-250 continua achando candidato (${d.usada.length})`);

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo certo'));
  process.exitCode = falhas ? 1 : 0;
})();
