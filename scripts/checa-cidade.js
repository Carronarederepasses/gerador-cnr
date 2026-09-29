// Confere as duas metades da limpeza de cidade.
//
// `soCidade()` em anuncios.html limpa o que JÁ está gravado no banco.
// `cidadeDoCard()` em content/olx-search.js da extensão limpa na origem.
// São gêmeas declaradas: se cortarem em pontos diferentes, o mesmo anúncio
// passa a ter duas cidades conforme o caminho, e ninguém vê isso acontecer.
//
// As duas funções são RECORTADAS dos arquivos reais, nunca copiadas para
// cá — cópia do raciocínio é como um teste passa a concordar com o erro.
//
// Rodar:  node scripts/checa-cidade.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const EXT = path.join(RAIZ, '..', '..', '02 - Captação Inteligente', 'captacao-inteligente');

function recortar(arquivo, nomeFuncao) {
  const txt = fs.readFileSync(arquivo, 'utf8');
  const i = txt.indexOf('function ' + nomeFuncao + '(');
  if (i < 0) throw new Error('não achei ' + nomeFuncao + ' em ' + arquivo);
  // Conta chaves a partir da primeira { da função.
  let abre = txt.indexOf('{', i), nivel = 0, fim = -1;
  for (let k = abre; k < txt.length; k++) {
    if (txt[k] === '{') nivel++;
    else if (txt[k] === '}') { nivel--; if (nivel === 0) { fim = k + 1; break; } }
  }
  if (fim < 0) throw new Error('função ' + nomeFuncao + ' não fecha');
  // eslint-disable-next-line no-new-func
  return new Function('return (' + txt.slice(i, fim) + ')')();
}

// Os 13 valores sujos que estavam no banco em 29/set, mais bordas.
const CASOS = [
  ['GaropabaHoje, 13:13', 'Garopaba'],
  ['Garopaba, 19:36',     'Garopaba'],
  ['Garopaba, 09:42',     'Garopaba'],
  ['GaropabaHoje, 16:24', 'Garopaba'],
  ['Garopaba, 19:10',     'Garopaba'],
  ['Garopaba, 11:43',     'Garopaba'],
  ['Garopaba, 21:43',     'Garopaba'],
  ['Imbituba, 08:52',     'Imbituba'],
  ['Garopaba, 14:06',     'Garopaba'],
  ['Imbituba, 13:30',     'Imbituba'],
  ['Imbituba, 12:57',     'Imbituba'],
  ['ImbitubaHoje, 09:34', 'Imbituba'],
  ['Imbituba, 20:11',     'Imbituba'],
  // Já limpos: não podem ser mexidos.
  ['Garopaba',            'Garopaba'],
  ['Imbituba',            'Imbituba'],
  ['Paulo Lopes',         'Paulo Lopes'],
  ['Imaruí',              'Imaruí'],
  // Outras formas de carimbo que a OLX usa.
  ['GaropabaOntem, 22:10',      'Garopaba'],
  ['Garopaba24/08/2026',        'Garopaba'],
  ['Imbituba Terça, 14:20',     'Imbituba'],
  ['Garopaba · Hoje, 10:00',    'Garopaba'],
  // Cidades que a regra ANTIGA comia — o app é nacional por decisão do
  // Yuri, então cidade de fora do litoral de SC é caso normal.
  // "Porto Seguro" virava "Porto" com `(?:seg|ter|...)`.
  ['Porto Seguro',        'Porto Seguro'],
  ['São Domingos',        'São Domingos'],
  ['Terra Boa',           'Terra Boa'],
  ['Quatro Barras',       'Quatro Barras'],
  ['Sete Lagoas',         'Sete Lagoas'],
  ['Porto Seguro, 09:15', 'Porto Seguro'],
  // Conservador: sem sinal nenhum, devolve como veio.
  ['Balneário Camboriú',  'Balneário Camboriú'],
  ['',                    ''],
];

let falhas = 0;
const dizer = (ok, txt) => { if (!ok) falhas++; console.log((ok ? '  ok  ' : '  FALHOU  ') + txt); };

console.log('Limpeza de cidade — as duas metades\n');

const soCidade = recortar(path.join(RAIZ, 'anuncios.html'), 'soCidade');

let cidadeDoCard = null;
if (fs.existsSync(path.join(EXT, 'content', 'olx-search.js'))) {
  cidadeDoCard = recortar(path.join(EXT, 'content', 'olx-search.js'), 'cidadeDoCard');
} else {
  // Guarda que "passa" sem ter olhado é pior que guarda nenhuma: aqui isto
  // é dito em voz alta e conta como falha.
  console.log('  INCONCLUSIVO  extensão não encontrada em ' + EXT);
  falhas++;
}

CASOS.forEach(([entrada, esperado]) => {
  const a = soCidade(entrada);
  dizer(a === esperado, `tela   "${entrada}" -> "${a}" (esperado "${esperado}")`);
  if (cidadeDoCard) {
    const b = cidadeDoCard(entrada);
    dizer(b === esperado, `origem "${entrada}" -> "${b}" (esperado "${esperado}")`);
    dizer(a === b, `as duas concordam em "${entrada}"`);
  }
});

console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo certo'));
process.exitCode = falhas ? 1 : 0;
