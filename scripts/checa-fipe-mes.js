// A atualização mensal da FIPE, conferida com a rede e o banco dublados.
//
// Dublar aqui é deliberado: o que precisa ser provado é a REGRA (quem é
// atualizado, quem não é, e o que acontece quando a FIPE cai), não a
// conexão — e rodar isto contra a FIPE real queimaria cota, que já
// aconteceu em 10/set e 01/out.
//
// Rodar:  node scripts/checa-fipe-mes.js
const path = require('path');
const Module = require('module');

// ── Dublê do _fipe: responde o mês "outubro de 2026" ─────────────
let chamadas = [];
let modoFipe = 'ok';
const caminhoFipe = path.join(__dirname, '..', 'api', '_fipe.js');
const requireReal = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === './_fipe' || id === caminhoFipe) {
    return {
      fipeGet: async (p) => {
        chamadas.push(p);
        if (modoFipe === 'fora') throw new Error('FIPE recusou: limite de consultas atingido');
        const m = p.match(/anos\/(.+)$/);
        const valores = { '2023-1': 'R$ 124.399,00', '2019-3': 'R$ 70.100,00', '2015-1': 'R$ 38.000,00' };
        return { Valor: valores[m && m[1]] || 'R$ 1.000,00', MesReferencia: 'outubro de 2026', CodigoFipe: '002001-0' };
      },
    };
  }
  return requireReal.apply(this, arguments);
};

const { atualizarFipe } = require(path.join(__dirname, '..', 'api', '_fipe-atualiza.js'));

// ── Dublê do banco: anota os PATCH ───────────────────────────────
let patches = [];
const sbFalso = async (url, opts = {}) => {
  patches.push({ url, body: JSON.parse(opts.body || '{}') });
  return { ok: true, json: async () => ({}) };
};

const ref = (anoCod, mes) => ({ marcaCod: '56', modeloCod: '9414', anoCod, mes, nome: 'Toyota Corolla XEi' });

let falhas = 0;
const dizer = (ok, t) => { if (!ok) falhas++; console.log((ok ? '  ok  ' : '  FALHOU  ') + t); };

(async () => {
  console.log('Atualização mensal da FIPE\n');

  // 1. Carro à venda, referência de setembro → atualiza
  chamadas = []; patches = [];
  let lista = [{ id: 'a', status: 'disponivel', fipe: 125829, fipe_ref: ref('2023-1', 'setembro de 2026') }];
  let out = await atualizarFipe(sbFalso, lista);
  dizer(out[0].fipe === 124399, `valor velho vira o do mês (125829 -> ${out[0].fipe})`);
  dizer(out[0].fipe_ref.mes === 'outubro de 2026', 'a referência passa a dizer outubro');
  dizer(patches.length === 1, `gravou uma vez (${patches.length})`);
  dizer(patches[0] && patches[0].body.fipe === 124399, 'gravou o valor novo, não só na memória');

  // 2. Já no mês corrente → não faz nada
  chamadas = []; patches = [];
  out = await atualizarFipe(sbFalso, [{ id: 'b', status: 'disponivel', fipe: 124399, fipe_ref: ref('2023-1', 'outubro de 2026') }]);
  dizer(patches.length === 0, 'carro já em dia não é gravado de novo');
  dizer(out[0].fipe === 124399, 'e o valor não muda');

  // 3. Carro VENDIDO não gasta consulta — FIPE dele não decide nada
  chamadas = []; patches = [];
  out = await atualizarFipe(sbFalso, [{ id: 'c', status: 'vendido', fipe: 1, fipe_ref: ref('2023-1', 'janeiro de 2020') }]);
  dizer(chamadas.length === 0, `vendido não consulta a FIPE (${chamadas.length} chamadas)`);
  dizer(out[0].fipe === 1, 'e fica como estava');

  // 4. Carro SEM referência não é tocado — é o caso em que atualizar
  //    significaria adivinhar o carro pelo nome
  chamadas = []; patches = [];
  out = await atualizarFipe(sbFalso, [{ id: 'd', status: 'disponivel', fipe: 99999, fipe_ref: null }]);
  dizer(chamadas.length === 0, 'carro sem referência não consulta nada');
  dizer(out[0].fipe === 99999, 'e o valor antigo é preservado, não zerado');

  // 5. Referência pela metade também não serve
  chamadas = []; patches = [];
  out = await atualizarFipe(sbFalso, [{ id: 'e', status: 'disponivel', fipe: 5, fipe_ref: { marcaCod: '56', mes: 'maio de 2026' } }]);
  dizer(chamadas.length === 0, 'referência incompleta é tratada como ausente');

  // 6. FIPE fora do ar: devolve a lista como está, sem gravar nada
  chamadas = []; patches = []; modoFipe = 'fora';
  out = await atualizarFipe(sbFalso, [{ id: 'f', status: 'disponivel', fipe: 125829, fipe_ref: ref('2023-1', 'setembro de 2026') }]);
  dizer(out[0].fipe === 125829, 'FIPE fora do ar: o valor de antes continua lá');
  dizer(patches.length === 0, 'e nada é gravado');
  modoFipe = 'ok';

  // 7. Vários carros: uma consulta por carro velho, e o primeiro não é
  //    consultado duas vezes (ele descobre o mês e já se atualiza)
  chamadas = []; patches = [];
  out = await atualizarFipe(sbFalso, [
    { id: 'g', status: 'disponivel', fipe: 1, fipe_ref: ref('2023-1', 'setembro de 2026') },
    { id: 'h', status: 'reservado',  fipe: 2, fipe_ref: ref('2019-3', 'setembro de 2026') },
    { id: 'i', status: 'vendido',    fipe: 3, fipe_ref: ref('2015-1', 'setembro de 2026') },
  ]);
  dizer(chamadas.length === 2, `2 consultas para 2 carros vivos (${chamadas.length})`);
  dizer(patches.length === 2, '2 gravações');
  dizer(out[2].fipe === 3, 'o vendido segue intocado');
  dizer(out.length === 3, 'a lista volta inteira, na mesma ordem');

  // 8. Lista vazia não quebra
  out = await atualizarFipe(sbFalso, []);
  dizer(Array.isArray(out) && out.length === 0, 'lista vazia volta vazia');

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo certo'));
  process.exitCode = falhas ? 1 : 0;
})();
