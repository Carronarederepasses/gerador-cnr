// ═══════════════════════════════════════════════════════════════
// GERADOR — CÓDIGO COMUM às telas Captação e Parceiros
// ═══════════════════════════════════════════════════════════════
// Extraído do index.html em 07/set/2026, quando o Gerador foi
// dividido em duas telas. Recortado por linha, sem redigitar nada.
//
// POR QUE UM ARQUIVO SÓ
// As duas telas compartilham cascata FIPE, grades de opcionais,
// helpers e catálogo. Copiar para as duas faria elas divergirem em
// silêncio — foi exatamente o que aconteceu com os dois montadores
// de anúncio, que divergiram até a AVALIAÇÃO e os GASTOS sumirem do
// texto da Captação sem ninguém perceber.
//
// COMO CADA TELA SE IDENTIFICA
// Antes de carregar este arquivo, a página define:
//     window.currentMode = 'captacao'   // ou 'coletados'
// O código abaixo já sabia distinguir os dois modos, então continua
// funcionando sem alteração — e campo que só existe na outra tela
// simplesmente não é procurado.
// ═══════════════════════════════════════════════════════════════

/* global currentMode */


// ───────────────────────────────────────────────────────────────
// Opcionais e observações — estrutura e desenho das grades
// (index.html linhas 805–952)
// ───────────────────────────────────────────────────────────────
// OPCIONAIS — estrutura por categoria
// on: true = padrão (já marcado)
// on: false = diferencial (desmarcado)
// ══════════════════════════════════════════════
const CATEGORIAS = [
  {
    nome: 'Conforto & Conveniência',
    itens: [
      {id:'ar',          lbl:'Ar-condicionado',             on:false},
      {id:'ar_digital',  lbl:'Ar-condicionado digital',     on:false},
      {id:'direcao',     lbl:'Direção elétrica/hidráulica',  on:false},
      {id:'vidros',      lbl:'Vidros elétricos',             on:false},
      {id:'travas',      lbl:'Travas elétricas',             on:false},
      {id:'retrovisores',lbl:'Retrovisores elétricos',       on:false},
      {id:'volante',     lbl:'Comandos no volante',          on:false},
      {id:'multimidia',  lbl:'Multimídia',                   on:false},
      {id:'carplay',     lbl:'Android Auto / CarPlay',       on:false},
      {id:'piloto',      lbl:'Piloto automático',            on:false},
      {id:'couro',       lbl:'Bancos em couro',              on:false},
      {id:'teto_solar',  lbl:'Teto solar',                   on:false},
      {id:'teto_pan',    lbl:'Teto panorâmico',              on:false},
      {id:'keyless',     lbl:'Chave presencial / keyless',   on:false},
      {id:'partida_rem', lbl:'Partida remota',               on:false},
    ]
  },
  {
    nome: 'Segurança',
    itens: [
      {id:'abs',         lbl:'Freio ABS',                    on:false},
      {id:'airbag',      lbl:'Airbag',                       on:false},
      {id:'controle_tr', lbl:'Controle de tração',           on:false},
      {id:'sensor_estac',lbl:'Sensor de estacionamento',     on:false},
      {id:'camera_re',   lbl:'Câmera de ré',                 on:false},
    ]
  },
  {
    nome: 'Mecânica & Performance',
    itens: [
      {id:'cambio_man',  lbl:'Câmbio manual',                on:false},
      {id:'cambio_aut',  lbl:'Câmbio automático',            on:false},
      {id:'cambio_cvt',  lbl:'Câmbio CVT',                   on:false},
      {id:'tracao_4x4',  lbl:'Tração 4x4',                   on:false},
    ]
  },
  {
    nome: 'Aparência & Extras',
    itens: [
      {id:'rodas_liga',  lbl:'Rodas de liga leve',           on:false},
      {id:'farol_led',   lbl:'Faróis em LED/Xenon',          on:false},
    ]
  },
  {
    nome: 'Documentação & Histórico',
    itens: [
      {id:'unico_dono',  lbl:'Único dono',                   on:false},
      {id:'ipva_pago',   lbl:'IPVA pago',                    on:false},
      {id:'sem_debitos', lbl:'Sem multas/débitos',           on:false},
      {id:'revisoes',    lbl:'Revisões na concessionária',   on:false},
      {id:'garantia',    lbl:'Na garantia de fábrica',       on:false},
      {id:'cautelar',    lbl:'Cautelar aprovada',              on:false},
      {id:'blindado',    lbl:'🛡️ Blindado',                  on:false},
    ]
  },
];

const OBS = [
  {id:'material_completo',lbl:'📹 Material completo disponível (fotos e vídeos)'},
  {id:'paga_retira',      lbl:'⚡ Paga e retira'},
];

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
// Abre/fecha a seção de opcionais (começa fechada pra deixar a tela mais limpa)
function toggleOpcionais() {
  const box  = document.getElementById('opc-collapse');
  const chev = document.getElementById('opc-chevron');
  const fechado = box.style.display === 'none';
  box.style.display = fechado ? '' : 'none';
  chev.textContent  = fechado ? '▾' : '▸';
}

// Mostra no cabeçalho quantos opcionais estão marcados (sem precisar abrir)
function atualizaContagemOpc() {
  const n = document.querySelectorAll('#opcionais-wrap .tog.on').length;
  const badge = document.getElementById('opc-count');
  if (badge) badge.textContent = n ? `${n} marcado${n > 1 ? 's' : ''}` : '';
}

function buildOpcionais() {
  const wrap = document.getElementById('opcionais-wrap');
  const docs = document.getElementById('opc-docs');
  wrap.innerHTML = ''; docs.innerHTML = '';
  CATEGORIAS.forEach(cat => {
    // Documentação & Histórico fica fora da cascata, em seção própria sempre visível
    const ehDocs = cat.nome === 'Documentação & Histórico';
    const alvo = ehDocs ? docs : wrap;

    if (!ehDocs) {
      const catLbl = document.createElement('div');
      catLbl.className = 'cat-label';
      catLbl.textContent = cat.nome;
      alvo.appendChild(catLbl);
    }

    const grid = document.createElement('div');
    grid.className = 'tog-grid';

    cat.itens.forEach(item => {
      const div = document.createElement('div');
      div.className = 'tog ' + (item.on ? 'on' : '');
      div.dataset.id = item.id;
      div.innerHTML = `<div class="togbox">${item.on ? '✓' : ''}</div><span class="toglbl">${item.lbl}</span>`;
      div.addEventListener('click', () => {
        const isOn = div.classList.toggle('on');
        div.querySelector('.togbox').textContent = isOn ? '✓' : '';
        if (item.id === 'blindado') {
          document.getElementById('blind-wrap').classList.toggle('show', isOn);
          // scroll suave até blindagem
          if (isOn) document.getElementById('blind-wrap').scrollIntoView({behavior:'smooth', block:'nearest'});
        }
        atualizaContagemOpc();
      });
      grid.appendChild(div);
    });
    alvo.appendChild(grid);
  });
  atualizaContagemOpc();
}

function buildObs() {
  const c = document.getElementById('obs-grid');
  if (!c) return; // chips de "Observação final" removidos — nada a montar
  c.innerHTML = '';
  OBS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'tog';
    div.dataset.id = item.id;
    div.innerHTML = `<div class="togbox"></div><span class="toglbl">${item.lbl}</span>`;
    div.addEventListener('click', () => {
      const isOn = div.classList.toggle('on');
      div.querySelector('.togbox').textContent = isOn ? '✓' : '';
    });
    c.appendChild(div);
  });
}

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// FIPE — base, cascata reutilizável e seletores
// (index.html linhas 1143–1340)
// ───────────────────────────────────────────────────────────────
const BASE = '/api/fipe?path=';

// #fipe-st é o status da cascata da Captação. Na tela de Parceiros ele não
// existe — e loadMarcas(), que as duas telas chamam, passa por aqui. Sem esta
// guarda a tela de Parceiros quebrava na inicialização, antes de desenhar
// qualquer coisa. A irmã cSetSt() já era protegida assim.
function setSt(msg, cls) {
  const el = document.getElementById('fipe-st');
  if (!el) return;
  el.textContent = msg;
  el.className = 'fipe-st ' + (cls || '');
}

async function fipeGet(path) {
  const r = await fetch(`${BASE}${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error('FIPE HTTP ' + r.status);
  return r.json();
}

async function loadMarcas() {
  setSt('Carregando marcas...', 'loading');
  try {
    const marcas = await fipeGet('/marcas');
    ['sel-marca', 'csel-marca'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecione a marca</option>';
      marcas.forEach(m => {
        const o = document.createElement('option');
        o.value = m.codigo; o.textContent = m.nome;
        sel.appendChild(o);
      });
    });
    setSt('');
  } catch(e) {
    // Antes só consertava 'sel-marca', que é da Captação. Na tela de
    // Parceiros o campo ficava em "Carregando..." para sempre, e o aviso ia
    // para um elemento que não existe ali — falha muda, que é o pior tipo.
    ['sel-marca', 'csel-marca'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.innerHTML = '<option value="">Indisponível — recarregue a página</option>';
    });
    setSt('API FIPE indisponível — preencha a FIPE manualmente abaixo', 'err');
    const cSt = document.getElementById('cfipe-st');
    if (cSt) { cSt.textContent = 'API FIPE indisponível — preencha a FIPE manualmente.'; cSt.className = 'fipe-st err'; }
  }
}

// ── Cascata FIPE reutilizável (Captação e Coletados) ──────────────────────────
// Cada contexto aponta para seus próprios IDs de campos e guarda seus dados.
const CASCATA = {
  cap: { marca:'sel-marca',  modelo:'sel-modelo',  ano:'sel-ano',  versao:'sel-versao',  fipe:'fipe-val',   st:'fipe-st',  ml:'ml-st',  data:null },
  col: { marca:'csel-marca', modelo:'csel-modelo', ano:'csel-ano', versao:'csel-versao', fipe:'colet-fipe', st:'cfipe-st', ml:'cml-st', data:null },
};

function resetSel(id, txt) {
  const s = document.getElementById(id);
  if (s) { s.innerHTML = `<option value="">${txt}</option>`; s.disabled = true; }
}

function cSetSt(cfg, msg, cls) {
  const el = document.getElementById(cfg.st);
  if (el) { el.textContent = msg; el.className = 'fipe-st ' + (cls || ''); }
}

async function cascataMarca(cfg) {
  const marca = document.getElementById(cfg.marca).value;
  resetSel(cfg.modelo, '— selecione a marca');
  resetSel(cfg.ano, '— selecione o modelo');
  resetSel(cfg.versao, '— selecione o ano');
  document.getElementById(cfg.fipe).value = '';
  cfg.data = null;
  if (!marca) { cSetSt(cfg, ''); return; }
  const marcaNome = document.getElementById(cfg.marca).selectedOptions[0]?.text || '';
  cSetSt(cfg, `Buscando modelos de ${marcaNome}...`, 'loading');
  try {
    const data = await fipeGet(`/marcas/${marca}/modelos`);
    const modelos = data.modelos || [];
    const bases = [...new Set(modelos.map(m => m.nome.split(/[\s\-\/.]+/)[0]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const sM = document.getElementById(cfg.modelo);
    sM.innerHTML = '<option value="">Selecione o modelo</option>';
    bases.forEach(b => {
      const o = document.createElement('option');
      o.value = b; o.textContent = b;
      sM.appendChild(o);
    });
    sM.disabled = false;
    cSetSt(cfg, `${bases.length} modelos`, 'ok');
  } catch(e) { cSetSt(cfg, 'Erro ao buscar modelos', 'err'); }
}

async function cascataModelo(cfg) {
  const marca = document.getElementById(cfg.marca).value;
  const base = document.getElementById(cfg.modelo).value;
  resetSel(cfg.ano, '— selecione o modelo');
  resetSel(cfg.versao, '— selecione o ano');
  document.getElementById(cfg.fipe).value = '';
  cfg.data = null;
  if (!base) return;
  const marcaNomeM = document.getElementById(cfg.marca).selectedOptions[0]?.text || '';
  cSetSt(cfg, `⏳ Buscando "${base}" em ${marcaNomeM}...`, 'loading');
  try {
    const r = await fetch(`/api/fipe?marca=${encodeURIComponent(marca)}&base=${encodeURIComponent(base.toLowerCase())}`);
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || 'erro');
    cfg.data = data;

    // Mapeia, por ano, quantos combustíveis diferentes existem entre as versões
    // (ex: 2020 Gasolina + 2020 Diesel). Só mostra o combustível no rótulo quando
    // há mais de um pro mesmo ano — evita ruído no caso comum (só Flex/Gasolina).
    const combsPorAno = {};
    data.versoes.forEach(v => (v.anos || []).forEach(a => {
      if (!combsPorAno[a.anoNum]) combsPorAno[a.anoNum] = new Set();
      if (a.combustivel) combsPorAno[a.anoNum].add(a.combustivel);
    }));

    // Chave interna "ano::combustível" pra não misturar valores de combustíveis
    // diferentes no mesmo ano civil (bug reportado: FIPE de Gasolina saindo pro Diesel).
    const chaves = new Set();
    data.versoes.forEach(v => (v.anos || []).forEach(a => chaves.add(`${a.anoNum}::${a.combustivel}`)));

    const sA = document.getElementById(cfg.ano);
    sA.innerHTML = '<option value="">Selecione o ano</option>';
    [...chaves]
      .sort((a, b) => b.localeCompare(a))
      .forEach(chave => {
        const [anoNum, combustivel] = chave.split('::');
        const ambiguo = combsPorAno[anoNum] && combsPorAno[anoNum].size > 1;
        const o = document.createElement('option');
        o.value = chave;
        o.textContent = ambiguo && combustivel ? `${anoNum} — ${combustivel}` : anoNum;
        sA.appendChild(o);
      });
    sA.disabled = false;
    cSetSt(cfg, `${chaves.size} ano(s) disponível(is)`, 'ok');
  } catch(e) { cSetSt(cfg, 'Erro ao buscar anos/versões', 'err'); }
}

function cascataAno(cfg) {
  const chave = document.getElementById(cfg.ano).value;
  const sV = document.getElementById(cfg.versao);
  resetSel(cfg.versao, '— selecione o ano');
  document.getElementById(cfg.fipe).value = '';
  if (!chave || !cfg.data) return;
  const [anoNum, combustivel] = chave.split('::');
  sV.innerHTML = '<option value="">Selecione a versão</option>';
  let n = 0;
  cfg.data.versoes.forEach(v => {
    // Casa ano E combustível — não deixa uma versão Diesel aparecer pro ano
    // selecionado como Gasolina (e vice-versa).
    const anoObj = (v.anos || []).find(a => a.anoNum === anoNum && a.combustivel === combustivel);
    if (anoObj) {
      const o = document.createElement('option');
      o.value = `${v.codigo}|${anoObj.codigo}`;
      o.textContent = v.nome;
      sV.appendChild(o);
      n++;
    }
  });
  sV.disabled = false;
  cSetSt(cfg, `${n} versão(ões) em ${anoNum}`, 'ok');
}

async function cascataVersao(cfg) {
  const marca = document.getElementById(cfg.marca).value;
  const v = document.getElementById(cfg.versao).value;
  document.getElementById(cfg.fipe).value = '';
  const mlEl = document.getElementById(cfg.ml);
  if (mlEl) mlEl.textContent = '';
  if (!v) return;
  const [modeloCod, anoCod] = v.split('|');
  cSetSt(cfg, '⏳ Consultando FIPE do mês...', 'loading');
  try {
    const data = await fipeGet(`/marcas/${marca}/modelos/${modeloCod}/anos/${anoCod}`);
    const limpo = (data.Valor || '').replace('R$', '').trim();
    document.getElementById(cfg.fipe).value = limpo;
    // Marca que o usuário selecionou a FIPE manualmente pela cascata
    if (cfg.fipe === 'colet-fipe') _coletFipeManual = true;
    cSetSt(cfg, `✓ FIPE ${data.MesReferencia || 'atual'}: ${data.Valor}`, 'ok');
    // Busca preços no Mercado Livre para contexto de mercado
    const marcaNome = document.getElementById(cfg.marca).selectedOptions[0]?.text || '';
    const modeloBase = document.getElementById(cfg.modelo).value;
    const anoNum = document.getElementById(cfg.ano).value.split('::')[0];
    if (marcaNome && modeloBase && anoNum && cfg.ml)
      buscarMercadoML(`${marcaNome} ${modeloBase} ${anoNum}`, cfg.ml);
  } catch(e) {
    const marcaNomeV = document.getElementById(cfg.marca).selectedOptions[0]?.text || '?';
    const modeloBaseV = document.getElementById(cfg.modelo).value || '?';
    cSetSt(cfg, `Não encontrado (${marcaNomeV} ${modeloBaseV}) — use a busca manual abaixo`, 'err');
  }
}

// Wrappers — Captação
function onMarca()  { cascataMarca(CASCATA.cap); }
function onModelo() { cascataModelo(CASCATA.cap); }
function onAno()    { cascataAno(CASCATA.cap); }
function onVersao() { cascataVersao(CASCATA.cap); }
// Wrappers — Coletados (fallback manual)
function onMarcaCol()  { cascataMarca(CASCATA.col); }
function onModeloCol() { cascataModelo(CASCATA.col); }
function onAnoCol()    { cascataAno(CASCATA.col); }
function onVersaoCol() { cascataVersao(CASCATA.col); }

function abrirCascataColet() {
  const d = document.getElementById('colet-cascata');
  if (d) d.open = true;
}

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Helpers de formatação e linhas do anúncio
// (index.html linhas 1341–1484)
// ───────────────────────────────────────────────────────────────
// HELPERS
// ══════════════════════════════════════════════
function getOnIds(selector) {
  return [...document.querySelectorAll(selector + ' .tog.on')].map(e => e.dataset.id);
}

function getAllOnIds() {
  return [...document.querySelectorAll('#opcionais-wrap .tog.on, #opc-docs .tog.on')].map(e => e.dataset.id);
}

function getLblById(id) {
  for (const cat of CATEGORIAS) {
    const item = cat.itens.find(i => i.id === id);
    if (item) return item.lbl.replace('🛡️ ', '');
  }
  return id;
}

const EMOJI_OPC = { 'unico_dono': '👤', 'ipva_pago': '💰', 'revisoes': '🛠️', 'cautelar': '🕵️' };

// Preenche os seletores de pneus com o que a IA extraiu do texto.
//
// Os campos de pneus existiam no formulário, mas o extrator não tinha onde
// pôr essa informação: dizer "dois pneus novos e dois meia vida" não mexia em
// nada, e no melhor caso a frase caía em "extras". Agora o parse devolve
// [{qtd, estado}] e isso vira os dois grupos da tela.
//
// Nunca sobrescreve escolha já feita — se o Yuri mexeu no seletor, o valor
// dele manda.
function aplicarPneus(pneus) {
  if (!Array.isArray(pneus) || !pneus.length) return;
  const ESTADOS = ['novos', 'bons', 'meia-vida', 'fracos'];

  const grupos = pneus
    .filter(p => p && ESTADOS.includes(String(p.estado)))
    .slice(0, 2);
  if (!grupos.length) return;

  grupos.forEach((g, i) => {
    const selQtd = document.getElementById(`pneus-qtd-${i + 1}`);
    const selEst = document.getElementById(`pneus-estado-${i + 1}`);
    if (!selQtd || !selEst || selEst.value) return; // já preenchido: não mexe

    const qtd = String(parseInt(g.qtd, 10) || (i === 0 ? 4 : 2));
    // Só aceita quantidade que exista no seletor daquela linha (a 2ª não tem "4")
    if ([...selQtd.options].some(o => o.value === qtd)) selQtd.value = qtd;
    selEst.value = g.estado;
  });
}

// Linha dos pneus para o anúncio — aceita até 2 combinações (ex: 2 novos + 2 meia-vida)
function linhaPneus() {
  const ESTADOS = { 'novos':'novos', 'bons':'bons', 'meia-vida':'meia-vida', 'fracos':'a trocar' };
  // "1 novos" saía errado no anúncio quando um grupo tinha um pneu só.
  const SING    = { 'novos':'novo', 'bons':'bom', 'meia-vida':'meia-vida', 'fracos':'a trocar' };
  const estado  = (q, e) => (q === '1' ? SING : ESTADOS)[e];
  const get = id => (document.getElementById(id) || {}).value || '';
  const grupos = [];
  if (get('pneus-estado-1')) grupos.push({ q: get('pneus-qtd-1') || '4', e: get('pneus-estado-1') });
  if (get('pneus-estado-2')) grupos.push({ q: get('pneus-qtd-2') || '2', e: get('pneus-estado-2') });
  if (!grupos.length) return null;

  const icone = '🛞';
  if (grupos.length === 1) {
    const g = grupos[0];
    return `${icone} ${g.q} ${g.q === '1' ? 'pneu' : 'pneus'} ${estado(g.q, g.e)}`;
  }
  return `${icone} Pneus: ${grupos.map(g => `${g.q} ${estado(g.q, g.e)}`).join(' + ')}`;
}

// Item com estado "Tem" / "A confirmar" (chave reserva, manual)
function linhaItemConfirmavel(selId, label, ico = '✅') {
  const v = (document.getElementById(selId) || {}).value || '';
  if (v === 'tem')      return `${ico} ${label}`;
  if (v === 'nao-tem')  return `⚠️ Sem ${label.toLowerCase()}`;
  if (v === 'confirmar') return `🔎 ${label} (a confirmar)`;
  return null;
}

// Formata km só com dígitos → separador de milhar (ex: "40000" → "40.000")
function fmtKm(v) {
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  return isNaN(n) ? '' : n.toLocaleString('pt-BR');
}

// Linha de revisões registradas — por km, por data, ou os dois.
// A data (mês/ano) entrou em 10/set a pedido do Yuri: km sozinho não diz se a
// revisão é recente. Os dois campos são opcionais e independentes.
function linhaRevisoes() {
  const km   = fmtKm((document.getElementById('revisoes-km')   || {}).value || '');
  const data = ((document.getElementById('revisoes-data') || {}).value || '').trim();
  if (km && data) return `🛠️ Revisões até ${km}km (${data})`;
  if (km)         return `🛠️ Revisões até ${km}km`;
  if (data)       return `🛠️ Revisões até ${data}`;
  return null;
}

// Todas as linhas extras (pneus, chave, manual, revisões) que entram no anúncio
function linhasExtras() {
  return [
    linhaPneus(),
    linhaItemConfirmavel('chave-reserva', 'Chave reserva', '🔑'),
    linhaItemConfirmavel('manual-veiculo', 'Manual do veículo', '📖'),
    linhaRevisoes(),
  ].filter(Boolean);
}

function getSelTxt(id) {
  const s = document.getElementById(id);
  return s.options[s.selectedIndex]?.text || '';
}

function fmtR(val) {
  if (!val) return '';
  const n = parseFloat(val.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return val;
  return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function badSel(s) {
  return !s || s === '—' || s.startsWith('Selecione') || s.startsWith('Carregando') || s.startsWith('—');
}

// Nomes de veículo chegam de duas fontes desalinhadas: a FIPE manda modelo em
// caixa alta ("VIRTUS 1.6 MSI Flex 16V 4p Aut.") e a IA manda em caixa baixa.
// A versão antiga rebaixava a palavra inteira antes de capitalizar, e com isso
// destruía as siglas: XEI virava "Xei", 16V virava "16v", MPI virava "Mpi".
//
// Agora só é alterado o que está claramente fora do lugar:
//   • palavra com dígito       → intocada (16V, 1.4, 4p, 250TSI)
//   • CAIXA ALTA com 4+ letras → nome de modelo (VIRTUS → Virtus)
//   • CAIXA ALTA com até 3     → sigla, intocada (XEI, MSI, LTZ, CS, AT)
//   • já misturada             → alguém escreveu certo, intocada (Flex, Aut.)
//   • toda minúscula           → capitaliza (strada → Strada)
function toTitleCase(str) {
  if (!str) return str;
  return String(str).split(/(\s+)/).map(p => {
    if (!p.trim()) return p;
    if (/\d/.test(p)) return p;
    const letras = p.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (!letras) return p;
    const alta   = p === p.toUpperCase();
    const baixa  = p === p.toLowerCase();
    if (alta && letras.length < 4) return p;
    if (!alta && !baixa) return p;
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join('');
}

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Normalização final do anúncio (as duas telas usam)
// (index.html linhas 1487–1503)
// ───────────────────────────────────────────────────────────────
// As seções do anúncio são montadas de forma independente e cada uma decide
// se abre com uma linha em branco. Quando uma delas fica vazia — sem valor e
// sem FIPE, por exemplo — sobram duas linhas em branco coladas, e no WhatsApp
// isso vira um buraco no meio do anúncio. A linha da região ainda usa um "\n"
// no começo, o que fazia o texto abrir em branco quando não havia veículo.
//
// Em vez de acertar cada seção (e voltar a errar na próxima que for criada),
// o bloco inteiro é normalizado no fim: nunca mais de uma linha em branco
// seguida, e nada de branco na abertura ou no fecho.
function _normalizarAnuncio(linhas) {
  return linhas
    .join('\n')
    .replace(/[ \t]+$/gm, '')    // espaço sobrando no fim das linhas
    .replace(/\n{3,}/g, '\n\n')  // no máximo uma linha em branco seguida
    .replace(/^\n+/, '')         // não começa em branco
    .replace(/\n+$/, '');        // nem termina
}

// ───────────────────────────────────────────────────────────────
// Preview do balão e botão copiar
// (index.html linhas 1639–1662)
// ───────────────────────────────────────────────────────────────
function renderPreview(texto) {
  document.getElementById('wa-txt').innerHTML = texto
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*(.*?)\*/g,'<b>$1</b>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:#53bdeb;text-decoration:none">$1</a>')
    .replace(/\n/g,'<br>');

  const now = new Date();
  document.getElementById('wa-time').textContent =
    now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function copiar() {
  const txt = document.getElementById('btn-wa').dataset.texto || '';
  navigator.clipboard.writeText(txt).then(() => {
    const b = document.getElementById('btn-copy');
    b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copiado!';
    b.classList.add('copied');
    setTimeout(() => {
      b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar';
      b.classList.remove('copied');
    }, 2200);
  });
}

// ───────────────────────────────────────────────────────────────
// Catálogo — ficha, salvar, margem
// (index.html linhas 1818–2002)
// ───────────────────────────────────────────────────────────────
// CATÁLOGO DE OPORTUNIDADES
// ══════════════════════════════════════════════
// Lê os mesmos campos do gerar() e monta a ficha estruturada do veículo.
function coletarFichaVeiculo() {
  const numFromR = v => {
    if (!v) return null;
    const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };
  const txtOrNull = v => { const t = (v || '').trim(); return t || null; };

  // Cada tela guarda o carro em campos próprios. Antes esta função lia só os
  // da Captação: no modo Parceiros ela devolvia tudo vazio e o "Salvar no
  // catálogo" respondia "preencha marca e modelo" mesmo com a tela cheia.
  // Na tela separada os campos nem existem, e aí quebrava de vez.
  const PARC = (typeof currentMode !== 'undefined' && currentMode === 'coletados');
  const val = id => document.getElementById(id)?.value ?? '';

  // No Parceiros o veículo vem de um campo de texto só ("Jeep Renegade
  // Longitude"), não de marca/modelo separados. A primeira palavra é a marca
  // e o resto é o modelo — é o mesmo corte que o anúncio já faz.
  const veicParc = val('colet-veiculo').trim();
  const partes   = veicParc.split(/\s+/);

  const mNome     = PARC ? (partes[0] || '')           : getSelTxt('sel-marca');
  const modBase   = PARC ? partes.slice(1).join(' ')   : getSelTxt('sel-modelo');
  const versaoTxt = PARC ? ''                          : getSelTxt('sel-versao');
  const anoTxt    = PARC ? val('colet-ano').trim()
                         : getSelTxt('sel-ano').replace(/\s*—.*$/, '').trim();

  // Opcionais (rótulos legíveis) + extras (pneus, chave, etc.)
  const opcionais = getAllOnIds().map(id => id === 'blindado' ? 'Blindado' : getLblById(id));
  linhasExtras().forEach(l => opcionais.push(l.replace(/^[^\s]+\s/, '').trim()));

  // Observações: selecionadas + personalizada
  const obsMap = {}; OBS.forEach(o => obsMap[o.id] = o.lbl);
  const obs = getOnIds('#obs-grid').map(id => (obsMap[id] || id).replace(/^[^\s]+\s/, ''));
  const obsCustom = (document.getElementById('obs-custom')?.value || '').trim();
  if (obsCustom) obs.push(obsCustom);

  return {
    marca:        badSel(mNome) ? null : mNome,
    modelo:       badSel(modBase) ? null : modBase,
    versao:       badSel(versaoTxt) ? null : versaoTxt,
    complemento:  txtOrNull(val('complemento')),
    ano:          badSel(anoTxt) ? null : anoTxt,
    ano_int:      parseInt((anoTxt.match(/\d{4}/) || [])[0], 10) || null,
    km:           parseInt(val(PARC ? 'colet-km'          : 'km').replace(/\D/g, ''), 10) || null,
    cor:          txtOrNull(val(PARC ? 'colet-cor'         : 'cor')),
    combustivel:  txtOrNull(val(PARC ? 'colet-combustivel' : 'combustivel')),
    regiao:       txtOrNull(val(PARC ? 'colet-regiao'      : 'regiao')),
    // Uso interno, ao lado de placa e renavam — nunca entra no anúncio.
    emplacado_em: txtOrNull(document.getElementById('emplacado-em')?.value),
    placa:        (txtOrNull(val('placa')) || '').toUpperCase() || null,
    valor:        numFromR(val(PARC ? 'colet-valor' : 'valor')),
    fipe:         numFromR(val(PARC ? 'colet-fipe'  : 'fipe-val')),
    valor_compra:      numFromR(document.getElementById('valor-compra')?.value),
    gastos_valor:      numFromR(document.getElementById('gastos-valor')?.value),
    vendedor_nome:     txtOrNull(document.getElementById('vendedor-nome')?.value),
    vendedor_telefone: txtOrNull(document.getElementById('vendedor-telefone')?.value),
    opcionais,
    observacoes:  obs.length ? obs.join('; ') : null,
    ...(txtOrNull(document.getElementById('renavam')?.value) ? { renavam: txtOrNull(document.getElementById('renavam').value) } : {}),
    gastos:       txtOrNull(val('gastos')),
    ...(txtOrNull(val('avaliacao'))
        ? { avaliacao: { inspecao: txtOrNull(val('avaliacao')) } }
        : {}),
    anuncio_texto: document.getElementById('btn-wa')?.dataset.texto || montarTextoAnuncio(),
    status:       'disponivel',
  };
}

// Calcula e exibe a margem estimada em tempo real
function calcMargem() {
  const numFromR = v => {
    if (!v) return null;
    const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };
  const vVenda  = numFromR(document.getElementById('valor')?.value);
  const vCompra = numFromR(document.getElementById('valor-compra')?.value);
  const vGastos = numFromR(document.getElementById('gastos-valor')?.value);
  const el = document.getElementById('margem-display');
  if (!el) return;
  if (vVenda == null && vCompra == null && vGastos == null) {
    el.textContent = '—'; el.style.color = 'var(--light)'; return;
  }
  const margem = (vVenda || 0) - (vCompra || 0) - (vGastos || 0);
  const fmt = n => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  el.textContent = (margem >= 0 ? '▲ R$ ' : '▼ R$ ') + fmt(margem);
  el.style.color = margem >= 0 ? '#4caf50' : '#e55';
}

// Qual veículo do catálogo esta tela está editando. Duas variáveis por
// motivo histórico: `_catalogoId` é a do fluxo do anúncio, `catalogoId` a das
// abas Fotos e Checklist. `salvarNoCatalogo` sincroniza as duas.
//
// Elas moram AQUI desde 08/set/2026. Quando este arquivo foi recortado do
// index.html, as declarações ficaram para trás — fora das faixas recortadas —
// e o código comum passou a usar duas variáveis que não existiam. Como a
// leitura acontece dentro de um try, não quebrava a tela: virava um alerta
// dizendo "Não consegui salvar: _catalogoId is not defined", que não quer
// dizer nada para quem está com o carro na mão.
let _catalogoId = null;
let catalogoId  = null;

async function salvarNoCatalogo(btnEl) {
  const btn = btnEl || document.getElementById('btn-salvar-catalogo');
  const ficha = coletarFichaVeiculo();
  const nome = [ficha.marca, ficha.versao || ficha.modelo].filter(Boolean).join(' ');
  if (!nome) {
    alert('Preencha ao menos a marca e o modelo antes de salvar.');
    return;
  }
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    let r, veiculoId;
    if (_catalogoId) {
      // Já foi criado pelo auto-save — só atualiza para não duplicar
      r = await fetch('/api/catalogo?id=' + _catalogoId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ficha),
      });
      veiculoId = _catalogoId;
    } else {
      r = await fetch('/api/catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ficha),
      });
      if (r.ok) {
        const j = await r.json();
        veiculoId = (Array.isArray(j) ? j[0] : j)?.id || null;
      }
    }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'erro');

    // Sincroniza variáveis das abas Fotos e Checklist
    _catalogoId = veiculoId;
    catalogoId  = veiculoId;

    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Salvo!';
    btn.classList.add('copied');

    // Atualiza link do painel e exibe
    const linkEl = document.getElementById('link-ver-catalogo');
    if (linkEl && veiculoId) linkEl.href = '/catalogo.html?id=' + veiculoId;
    const panel = document.getElementById('pos-save-panel');
    if (panel) panel.style.display = '';

    mostrarMatchPopup(ficha.marca, ficha.valor);
  } catch (e) {
    alert('Não consegui salvar: ' + e.message);
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

// Limpa o formulário para iniciar uma nova captação
function iniciarNovaCaptacao() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
  _catalogoId = null;
  catalogoId  = null;
  location.reload();
}

async function mostrarMatchPopup(marca, valor) {
  try {
    const p = new URLSearchParams();
    if (marca) p.set('marca', marca);
    if (valor)  p.set('valor', valor);
    const r = await fetch('/api/compradores?match=1&' + p.toString());
    if (!r.ok) return;
    const lista = await r.json();
    const top = lista.filter(c => c.score >= 40).slice(0, 5);
    if (!top.length) return;

    const old = document.getElementById('cnr-match-popup');
    if (old) old.remove();

    const moedaK = n => n ? 'R$' + Math.round(Number(n) / 1000) + 'k' : '?';
    const rows = top.map(c => {
      const faixa = (c.preco_min || c.preco_max) ? moedaK(c.preco_min) + '–' + moedaK(c.preco_max) : '';
      return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.08)">
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nome}</div>
          <div style="font-size:.68rem;color:#888">${[faixa, c.score + '%'].filter(Boolean).join(' · ')}</div>
        </div>
      </div>`;
    }).join('');

    const popup = document.createElement('div');
    popup.id = 'cnr-match-popup';
    popup.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9998;background:#1c1c1e;border:1px solid #2c2c2e;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.5);padding:1rem 1.1rem;max-width:290px;width:calc(100vw - 3rem);font-family:"DM Sans",sans-serif;color:#f0f0f0;animation:slideUp .25s ease';
    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
        <span style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:#888">🔔 Compradores compatíveis</span>
        <button onclick="document.getElementById('cnr-match-popup').remove()" style="background:none;border:none;color:#888;font-size:1.1rem;cursor:pointer;padding:0;line-height:1">×</button>
      </div>
      ${rows}
      <div style="margin-top:.6rem;text-align:right">
        <a href="/catalogo.html" style="font-size:.72rem;color:#aaa;text-decoration:none">Ofertar pelo catálogo →</a>
      </div>`;
    document.body.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 15000);
  } catch(_) {}
}

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Preço de mercado (Mercado Livre)
// (index.html linhas 1759–1817)
// ───────────────────────────────────────────────────────────────
// PREÇO DE MERCADO — Mercado Livre (gratuita)
// ──────────────────────────────────────────────
async function buscarMercadoML(query, elId) {
  const el = document.getElementById(elId);
  if (!el || !query.trim()) return;
  el.textContent = '📊 Buscando preços no ML...';
  el.className = 'fipe-st loading';
  el.onclick = null;
  try {
    const r = await fetch(`/api/utils?type=mercado&q=${encodeURIComponent(query.trim())}`);
    const data = await r.json();
    if (!r.ok || !data.found) { el.textContent = ''; return; }
    const fmt = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
    el.textContent = `📊 ML: ${data.count} anúncios · ${fmt(data.min)} – ${fmt(data.max)} (mediana ${fmt(data.med)})`;
    el.className = 'fipe-st ok';
    el.title = 'Abrir pesquisa no Mercado Livre';
    el.onclick = () => window.open(data.searchUrl, '_blank');
  } catch {
    el.textContent = '';
  }
}

function onPreviewEdit() {
  const el = document.getElementById('wa-txt');
  // Extrai texto puro preservando quebras de linha
  const txt = el.innerText;
  const wa = document.getElementById('btn-wa');
  wa.href = `https://wa.me/?text=${encodeURIComponent(txt)}`;
  wa.dataset.texto = txt;
}

function compartilharNativo() {
  const txt = document.getElementById('btn-wa').dataset.texto || '';
  navigator.share({ text: txt }).catch(() => {});
}

function mostrarShare(texto) {
  document.getElementById('empty').style.display = 'none';
  document.getElementById('wa-preview').style.display = 'block';

  const wa = document.getElementById('btn-wa');
  wa.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  wa.dataset.texto = texto;

  document.getElementById('share-row').classList.add('show');

  if (navigator.share) {
    document.getElementById('btn-share').style.display = 'flex';
  }

  // No mobile, rola automaticamente até o botão do WhatsApp
  if (window.innerWidth < 768) {
    setTimeout(() => {
      document.getElementById('share-row').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }
}

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Auto-save do rascunho
// (index.html linhas 2597–2715)
// ───────────────────────────────────────────────────────────────
// AUTO-SAVE — preserva o preenchimento se a aba recarregar (comum no celular)
// ══════════════════════════════════════════════
// Uma chave por tela, e não uma só para as duas.
// Quando o Yuri está no meio de uma captação e aparece um carro de parceiro
// como oportunidade, ele larga a captação e vai fazer o outro — ele mesmo
// descreveu isso. Com chave única, o segundo rascunho apagaria o primeiro.
// A chave antiga ('cnr_form_v1') fica com o index.html, que segue no ar.
const SAVE_KEY = 'cnr_form_' + currentMode;
const CAMPOS_SIMPLES = ['complemento','km','cor','regiao','placa','renavam','emplacado-em','valor','fipe-val','combustivel',
  'texto-colado','colet-veiculo','colet-km','colet-cor','colet-ano','colet-regiao','colet-valor','colet-fipe','colet-combustivel',
  'avaliacao','gastos','obs-custom','blind-marca','blind-nivel','blind-vidro','pneus-qtd-1','pneus-estado-1','pneus-qtd-2','pneus-estado-2','chave-reserva','manual-veiculo','revisoes-km','revisoes-data',
  'valor-compra','vendedor-nome','vendedor-telefone','gastos-valor'];
const CAMPOS_CASCATA = ['sel-marca','sel-modelo','sel-ano','sel-versao'];
let _saveTimer = null;

function salvarEstado() {
  try {
    const estado = { mode: currentMode, campos: {}, opcionais: getAllOnIds(), obs: getOnIds('#obs-grid') };
    [...CAMPOS_SIMPLES, ...CAMPOS_CASCATA].forEach(id => {
      const el = document.getElementById(id);
      if (el) estado.campos[id] = el.value;
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(estado));
  } catch (e) { /* localStorage indisponível — ignora */ }
}
function salvarEstadoDebounced() { clearTimeout(_saveTimer); _saveTimer = setTimeout(salvarEstado, 400); }

async function restaurarEstado() {
  let estado;
  try { estado = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return; }
  if (!estado || !estado.campos) return;
  const c = estado.campos;

  // Toggles (opcionais + observações)
  const marcarTogs = (sel, ids) => {
    document.querySelectorAll(sel + ' .tog').forEach(tog => {
      if ((ids || []).includes(tog.dataset.id)) {
        tog.classList.add('on');
        const box = tog.querySelector('.togbox'); if (box) box.textContent = '✓';
        if (tog.dataset.id === 'blindado') document.getElementById('blind-wrap').classList.add('show');
      }
    });
  };
  marcarTogs('#opcionais-wrap', estado.opcionais);
  marcarTogs('#opc-docs', estado.opcionais);
  atualizaContagemOpc();

  if (estado.mode) setMode(estado.mode);

  // Cascata FIPE da Captação — refeita em sequência (depende de chamadas à API)
  try {
    if (c['sel-marca']) {
      const sM = document.getElementById('sel-marca');
      sM.value = c['sel-marca'];
      if (sM.value === c['sel-marca']) {
        await onMarca();
        if (c['sel-modelo']) {
          document.getElementById('sel-modelo').value = c['sel-modelo'];
          await onModelo();
          if (c['sel-ano']) {
            document.getElementById('sel-ano').value = c['sel-ano'];
            onAno();
            if (c['sel-versao']) {
              document.getElementById('sel-versao').value = c['sel-versao'];
              await onVersao();
            }
          }
        }
      }
    }
  } catch (e) { /* se a cascata falhar, os campos abaixo ainda são restaurados */ }

  // Campos simples por último (sobrescreve fipe-val da cascata pelo valor salvo)
  CAMPOS_SIMPLES.forEach(id => {
    const el = document.getElementById(id);
    if (el && c[id] != null && c[id] !== '') el.value = c[id];
  });
}

function limparEstado() {
  if (!confirm('Limpar todos os campos e começar um anúncio novo?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  sessionStorage.setItem('cnr_restore_mode', currentMode);
  _catalogoId = null;
  location.reload();
}

let _toastTimer;
function toast(msg, tipo = 'ok', duracao = 2800) {
  const el = document.getElementById('cnr-toast');
  if (!el) return;
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = tipo === 'erro' ? 'erro show' : 'show';
  _toastTimer = setTimeout(() => el.className = '', duracao);
}

function limparRascunho() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  _catalogoId = null;
  location.reload();
}

let _limpezaTimer = null;
// Flag: usuário corrigiu a FIPE manualmente → buscarFIPEColetados não sobrescreve
let _coletFipeManual = false;
function agendarLimpeza() {
  if (_limpezaTimer) return; // já agendado
  let seg = 8;
  toast(`✓ WhatsApp aberto! Limpando formulário em ${seg}s… (clique em Limpar dados para cancelar)`, '', 9000);
  _limpezaTimer = setInterval(() => {
    seg--;
    if (seg <= 0) {
      clearInterval(_limpezaTimer); _limpezaTimer = null;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      sessionStorage.setItem('cnr_restore_mode', currentMode);
      _catalogoId = null;
      location.reload();
    }
  }, 1000);
}


// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Select com busca
// (index.html linhas 2716–2799)
// ───────────────────────────────────────────────────────────────
// SELECT COM BUSCA — campo de digitar que filtra a lista.
// Mantém o <select> original como fonte do valor (não quebra a cascata FIPE).
// ══════════════════════════════════════════════
const _ssSync = {};

function makeSearchable(selectId, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel || sel.dataset.ss) return;
  sel.dataset.ss = '1';
  sel.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'ss-wrap';
  const input = document.createElement('input');
  input.type = 'text'; input.autocomplete = 'off'; input.className = 'ss-input';
  const list = document.createElement('div');
  list.className = 'ss-list'; list.style.display = 'none';
  wrap.appendChild(input); wrap.appendChild(list);
  sel.parentNode.insertBefore(wrap, sel.nextSibling);

  let hi = -1; // item destacado (teclado)
  const opts = () => [...sel.options].filter(o => o.value !== '');

  function syncInput() {
    const o = sel.options[sel.selectedIndex];
    input.value = (o && o.value) ? o.text : '';
    input.disabled = sel.disabled;
    input.placeholder = sel.disabled ? (sel.options[0]?.text || '') : (placeholder || 'Digite para filtrar...');
  }
  _ssSync[selectId] = syncInput;

  function render(filtro) {
    const f = (filtro || '').toLowerCase().trim();
    const items = opts().filter(o => o.text.toLowerCase().includes(f));
    list.innerHTML = ''; hi = -1;
    if (!items.length) {
      list.innerHTML = '<div class="ss-empty">Nada encontrado</div>';
      list.style.display = 'block'; return;
    }
    items.slice(0, 80).forEach(o => {
      const d = document.createElement('div');
      d.className = 'ss-item'; d.textContent = o.text; d.dataset.val = o.value;
      d.onmousedown = (e) => { e.preventDefault(); escolher(o.value); };
      list.appendChild(d);
    });
    list.style.display = 'block';
  }
  function escolher(val) {
    sel.value = val;
    syncInput();
    list.style.display = 'none';
    sel.dispatchEvent(new Event('change'));
  }
  function mover(d) {
    const its = [...list.querySelectorAll('.ss-item')];
    if (!its.length) return;
    if (hi >= 0) its[hi].classList.remove('ss-hi');
    hi = (hi + d + its.length) % its.length;
    its[hi].classList.add('ss-hi');
    its[hi].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', () => { if (!sel.disabled) { render(''); input.select(); } });
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('blur', () => setTimeout(() => { list.style.display = 'none'; syncInput(); }, 150));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.style.display === 'none') render(input.value); else mover(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
    else if (e.key === 'Enter') {
      const its = [...list.querySelectorAll('.ss-item')];
      if (hi >= 0 && its[hi]) { e.preventDefault(); escolher(its[hi].dataset.val); }
      else if (its.length === 1) { e.preventDefault(); escolher(its[0].dataset.val); }
    }
    else if (e.key === 'Escape') { list.style.display = 'none'; }
  });

  // Resync quando as opções ou o estado (disabled) mudam
  new MutationObserver(syncInput).observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });
  syncInput();
}

function resyncSearchables() { Object.values(_ssSync).forEach(fn => fn()); }

// ══════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Aviso de negociações
// (index.html linhas 3122–3143)
// ───────────────────────────────────────────────────────────────
// ══ AVISO NEGOCIAÇÕES ══
(function checkNegociacoes() {
  try {
    const neg = JSON.parse(localStorage.getItem('cnr-negociacoes')) || [];
    const STATUS_ATIVOS = ['primeiro-contato','respondeu','negociando','aguardando'];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const pendentes = neg.filter(n => {
      if (!STATUS_ATIVOS.includes(n.status)) return false;
      if (!n.ultimoContato) return true;
      const d = new Date(n.ultimoContato + 'T00:00:00');
      return Math.floor((hoje - d) / 86400000) >= 1;
    });
    if (pendentes.length === 0) return;
    const aviso = document.getElementById('neg-aviso');
    const txt = document.getElementById('neg-aviso-txt');
    txt.textContent = pendentes.length === 1
      ? `⚠️ 1 negociação aguardando retorno — ${pendentes[0].veiculo}`
      : `⚠️ ${pendentes.length} negociações aguardando retorno`;
    aviso.style.display = 'flex';
  } catch(e) {}
})();
