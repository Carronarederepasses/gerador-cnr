// Regressão da busca de FIPE: roda o HANDLER REAL de api/fipe-search.js
// contra a FIPE real, com títulos de verdade do estoque e dos anúncios.
//
// Existe porque a busca já quebrou três vezes em lugares diferentes —
// combustível ignorado (02/set), pontuação empatando (07/set), âncora de
// família curta demais (16/set) — e nas três o sintoma na tela foi o
// mesmo: "não encontrei". Um teste que roda o handler inteiro é o único
// que pega isso; testar a pontuação sozinha não pega.
//
// Demora ~1 min: são buscas de verdade, com rede. Rodar depois de mexer
// em fipe-search.js ou em _fipe.js.
//
// Rodar:  node scripts/checa-fipe-busca.js
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const handler = require(path.join(RAIZ, 'api', 'fipe-search.js'));

async function buscar(veiculo, ano) {
  return new Promise((resolve) => {
    const req = { method: 'POST', body: { veiculo, ano: String(ano || '') }, headers: {} };
    const res = {
      _st: 200,
      setHeader() {}, status(c) { this._st = c; return this; },
      json(o) { resolve({ st: this._st, ...o }); },
      end() { resolve({ st: this._st }); },
    };
    handler(req, res).catch((e) => resolve({ erro: e.message }));
  });
}

const CASOS = [
  ['Toyota Corolla XEi 2.0 Flex 16V Aut.', 2023],
  ['Corolla XEi 2.0', 2023],
  ['Toyota Corolla Cross XRE 2.0', 2023],
  ['Volkswagen Polo Highline 200 TSI', 2022],
  ['VW Polo 1.0', 2021],
  ['Jeep Renegade Sport 1.8 4x2 Flex', 2019],
  ['Jeep Compass Limited 2.0 Diesel', 2021],
  ['Citroen C3 Tendance 1.5', 2015],
  ['Nissan March 1.0', 2015],
  ['Hyundai HB20S 1.0 Manual', 2021],
  ['Fiat Argo Drive 1.0', 2021],
  ['Chevrolet Onix LT 1.0', 2020],
  ['Hilux SRV 2.8 diesel', 2020],
  ['Fiat Strada Freedom 1.3', 2022],
  ['Honda HR-V EXL 1.8', 2019],
  ['Volkswagen T-Cross Comfortline 200 TSI', 2021],
  ['Ford Ka SE 1.0', 2019],
  ['Renault Kwid Zen 1.0', 2022],
  // Caso do parceiro em 01/out: na FIPE e 'Hilux SW4', o mercado escreve so 'SW4'.
  ['Toyota SW4 Diamond', 2024],
  ['SW4 Diamond 2.8', 2024],
];

(async () => {
  let achou = 0, falhou = 0, semCota = 0;
  for (const [v, a] of CASOS) {
    const r = await buscar(v, a);
    // Cota da FIPE estourada NÃO é busca quebrada. Rodar este script
    // algumas vezes seguidas esgota o limite por IP (aconteceu em 10/set
    // e de novo em 01/out), e marcar isso como FALHOU faria o script
    // acusar código que está certo — o erro que mais custou caro aqui.
    if (/limite de consultas|429/i.test(String(r.error || ''))) {
      semCota++;
      console.log(`  INCONCLUSIVO ${v} (${a})\n          -> cota da FIPE esgotada nesta máquina, tente de novo em algumas horas`);
      continue;
    }
    const ok = r.found;
    if (ok) achou++; else falhou++;
    console.log(
      (ok ? '  ok   ' : '  FALHOU ') + `${v} (${a})` +
      (ok ? `\n          -> ${r.modelo || r.nome || '?'}  ${r.valor || ''}`
          : `\n          -> ${r.reason || JSON.stringify(r).slice(0, 120)}`)
    );
  }
  console.log(`\nachou ${achou} · falhou ${falhou}` + (semCota ? ` · ${semCota} INCONCLUSIVO (cota)` : ''));
  if (semCota) {
    console.log('A cota da FIPE acabou no meio — o resultado acima NÃO vale como aprovação.');
  }
  // Falha de verdade: busca que funcionava e parou. E cota esgotada também
  // devolve erro: "passou" sem ter conferido é pior que não ter conferido.
  process.exitCode = (falhou || semCota) ? 1 : 0;
})();
