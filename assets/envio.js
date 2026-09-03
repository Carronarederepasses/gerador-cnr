// ─────────────────────────────────────────────────────────────────
// Lista de envio — escolher quem recebe e percorrer a fila
//
// A "lista de transmissão" do Gerador. O WhatsApp tirou/limitou a dele, e
// a que existia só entregava para quem tinha o número do Yuri salvo, sem
// avisar quem ficou de fora.
//
// REGRA QUE NÃO MUDA: nada sai sozinho. A fila prepara e abre a conversa
// com o texto pronto; quem envia é ele, um contato de cada vez. Não há
// disparo automático, agendamento nem enfileiramento de envio.
//
// Mora aqui, e não dentro de catalogo.html, porque o Gerador precisa do
// mesmo fluxo. Duas cópias divergem: este projeto já teve três montadores
// do texto do anúncio, um deles com uma seção que os outros dois não
// tinham, e ninguém percebeu porque só um aparecia no preview.
//
// Uso:
//   CNR_ENVIO.escolher({ titulo, mensagem, veiculoId })
//   CNR_ENVIO.fila({ titulo, detalhe, mensagem, contatos, aoEnviar })
// ─────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var TIPOS = ['lojista', 'repassador', 'investidor', 'particular'];
  var esc = function (s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var soDigitos = function (t) { return (t || '').replace(/\D/g, ''); };

  // A agenda do celular só é legível pelo navegador em Chrome no Android
  // (Android 6+). No iPhone é recurso experimental, desligado de fábrica; no
  // notebook não existe. Onde não dá, o botão não aparece e a tela explica —
  // botão morto é pior que botão ausente.
  function agendaDisponivel() {
    return ('contacts' in navigator) && ('ContactsManager' in window);
  }

  var estado = null;   // escolha em andamento
  var fila   = null;   // fila em andamento

  // ── Estilos ────────────────────────────────────────────────────
  function estilos() {
    if (document.getElementById('cnr-envio-css')) return;
    var s = document.createElement('style');
    s.id = 'cnr-envio-css';
    s.textContent = [
      '.cnre-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);display:none;',
      '  align-items:flex-end;justify-content:center;z-index:400;padding:0}',
      '.cnre-bg.on{display:flex}',
      '.cnre-box{background:var(--surface-raise);border-radius:20px 20px 0 0;width:100%;',
      '  max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}',
      '.cnre-head{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;',
      '  padding:1.1rem 1.2rem .65rem;border-bottom:1px solid var(--line)}',
      ".cnre-tit{font-family:'Playfair Display',serif;font-weight:700;font-size:1.05rem;line-height:1.25}",
      '.cnre-sub{font-size:.75rem;color:var(--text-mid);margin-top:.15rem}',
      '.cnre-x{background:none;border:none;font-size:1.15rem;cursor:pointer;color:var(--text-mid);padding:0;line-height:1;flex:none}',
      '.cnre-atalhos{padding:.8rem 1.2rem .2rem}',
      '.cnre-rot{font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:var(--text-faint);font-weight:700;margin:.5rem 0 .35rem}',
      '.cnre-chips{display:flex;flex-wrap:wrap;gap:.35rem}',
      ".cnre-chip{font-family:'DM Sans',sans-serif;font-size:.72rem;padding:.3rem .65rem;border-radius:99px;",
      '  border:1px solid var(--line);background:none;color:var(--text-mid);cursor:pointer;text-transform:capitalize}',
      '.cnre-chip:hover{border-color:var(--text);color:var(--text)}',
      '.cnre-chip.agenda{border-color:var(--accent);color:var(--text)}',
      '.cnre-lista{flex:1;overflow-y:auto;padding:.4rem 1.2rem;min-height:6rem;max-height:40vh}',
      '.cnre-item{display:flex;align-items:center;gap:.6rem;padding:.45rem 0;border-bottom:1px solid var(--line);cursor:pointer}',
      '.cnre-item:last-child{border-bottom:none}',
      '.cnre-item input{width:1.05rem;height:1.05rem;flex:none;accent-color:var(--accent)}',
      '.cnre-nome{flex:1;font-size:.88rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.cnre-tag{font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint);flex:none}',
      '.cnre-pe{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;',
      '  padding:.8rem 1.2rem 1.4rem;border-top:1px solid var(--line)}',
      '.cnre-cont{font-size:.82rem;font-weight:700}',
      '.cnre-nota{font-size:.7rem;color:var(--text-faint);margin-top:.15rem;max-width:17rem;line-height:1.35}',
      '.cnre-acoes{display:flex;gap:.5rem;align-items:stretch}',
      ".cnre-btn{font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;padding:.7rem 1.1rem;",
      '  border-radius:11px;border:none;background:var(--text);color:var(--surface);cursor:pointer;text-decoration:none;',
      '  display:flex;align-items:center;justify-content:center;text-align:center}',
      ".cnre-btn2{font-family:'DM Sans',sans-serif;font-size:.82rem;padding:.7rem .9rem;border-radius:11px;",
      '  border:1px solid var(--line);background:none;color:var(--text-mid);cursor:pointer}',
      '.cnre-btn:disabled,.cnre-btn2:disabled{opacity:.45;cursor:default}',
      '.cnre-vazio{padding:1.6rem .2rem;text-align:center;color:var(--text-mid);font-size:.86rem;line-height:1.5}',
      '.cnre-barra{height:3px;background:var(--line)}',
      '.cnre-barra i{display:block;height:100%;background:var(--text);width:0;transition:width .3s ease}',
      '.cnre-passo{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint);padding:.7rem 1.2rem .2rem;font-weight:700}',
      ".cnre-quem{padding:.1rem 1.2rem .6rem;font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700}",
      '.cnre-msg{margin:.6rem 1.2rem;padding:.55rem .75rem;font-size:.84rem;color:var(--text-mid);line-height:1.55;',
      '  border-left:2px solid var(--line);background:var(--surface);border-radius:0 6px 6px 0;',
      '  white-space:pre-wrap;max-height:9rem;overflow-y:auto}',
      '.cnre-fim{padding:2.2rem 1.2rem 2.6rem;text-align:center}',
      '.cnre-fim-ico{font-size:2rem}',
      '.cnre-fim-txt{font-weight:700;margin-top:.5rem}',
      '.cnre-fim-sub{font-size:.8rem;color:var(--text-mid);margin-top:.25rem}',
    ].join('');
    document.head.appendChild(s);
  }

  function montar() {
    estilos();
    if (document.getElementById('cnre-escolha')) return;

    var e = document.createElement('div');
    e.id = 'cnre-escolha';
    e.className = 'cnre-bg';
    e.innerHTML =
      '<div class="cnre-box">' +
        '<div class="cnre-head"><div>' +
          '<div class="cnre-tit">Enviar anúncio</div>' +
          '<div class="cnre-sub" id="cnre-veiculo"></div>' +
        '</div><button class="cnre-x" id="cnre-fechar1">✕</button></div>' +
        '<div class="cnre-atalhos" id="cnre-atalhos"></div>' +
        '<div class="cnre-lista" id="cnre-lista"></div>' +
        '<div class="cnre-pe">' +
          '<div><div class="cnre-cont" id="cnre-cont"></div>' +
          '<div class="cnre-nota" id="cnre-nota"></div></div>' +
          '<div class="cnre-acoes">' +
            '<button class="cnre-btn2" id="cnre-salvar">★ Salvar lista</button>' +
            '<button class="cnre-btn" id="cnre-comecar">Começar →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(e);

    var f = document.createElement('div');
    f.id = 'cnre-fila';
    f.className = 'cnre-bg';
    f.innerHTML =
      '<div class="cnre-box">' +
        '<div class="cnre-head"><div>' +
          '<div class="cnre-tit" id="cnre-f-tit"></div>' +
          '<div class="cnre-sub" id="cnre-f-sub"></div>' +
        '</div><button class="cnre-x" id="cnre-fechar2">✕</button></div>' +
        '<div class="cnre-barra"><i id="cnre-f-barra"></i></div>' +
        '<div id="cnre-f-corpo">' +
          '<div class="cnre-passo" id="cnre-f-passo"></div>' +
          '<div class="cnre-quem" id="cnre-f-quem"></div>' +
          '<div class="cnre-msg" id="cnre-f-msg"></div>' +
          '<div class="cnre-pe">' +
            '<div class="cnre-nota" id="cnre-f-nota"></div>' +
            '<div class="cnre-acoes">' +
              '<button class="cnre-btn2" id="cnre-f-pular">⏭ Pular</button>' +
              '<a class="cnre-btn" id="cnre-f-wa" target="_blank">Abrir WhatsApp</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cnre-fim" id="cnre-f-fim" style="display:none">' +
          '<div class="cnre-fim-ico">✅</div>' +
          '<div class="cnre-fim-txt">Fim da lista</div>' +
          '<div class="cnre-fim-sub" id="cnre-f-fim-sub"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(f);

    document.getElementById('cnre-fechar1').onclick = fecharEscolha;
    document.getElementById('cnre-fechar2').onclick = fecharFila;
    e.onclick = function (ev) { if (ev.target === e) fecharEscolha(); };
    f.onclick = function (ev) { if (ev.target === f) fecharFila(); };
    document.getElementById('cnre-salvar').onclick  = salvarLista;
    document.getElementById('cnre-comecar').onclick = comecar;
    document.getElementById('cnre-f-pular').onclick = avancar;
  }

  // ── Escolha ────────────────────────────────────────────────────
  async function escolher(op) {
    montar();
    estado = { titulo: op.titulo || '', mensagem: op.mensagem || '',
               veiculoId: op.veiculoId || null, aoEnviar: op.aoEnviar || null,
               contatos: [], listas: [], marcados: new Set(), semTel: 0 };

    document.getElementById('cnre-veiculo').textContent = estado.titulo;
    document.getElementById('cnre-lista').innerHTML = '<div class="cnre-vazio">Carregando…</div>';
    document.getElementById('cnre-atalhos').innerHTML = '';
    document.getElementById('cnre-escolha').classList.add('on');

    try {
      var rc = await fetch('/api/compradores?ativo=true');
      if (!rc.ok) throw new Error('não consegui carregar os clientes (HTTP ' + rc.status + ')');
      var todos = await rc.json();
      var comTel = todos.filter(function (c) { return soDigitos(c.telefone).length >= 10; });
      estado.semTel   = todos.length - comTel.length;
      estado.contatos = comTel.map(function (c) {
        return { id: c.id, nome: c.nome, tipo: c.tipo || '', tel: soDigitos(c.telefone), origem: 'crm' };
      });
    } catch (err) {
      document.getElementById('cnre-lista').innerHTML =
        '<div class="cnre-vazio">' + esc(err.message) + '<br>Feche e tente de novo.</div>';
      return;
    }

    // Listas salvas são conveniência. Se a tabela ainda não existir, dá para
    // seguir escolhendo por tipo — só não pode fingir que carregou.
    try {
      var rl = await fetch('/api/compradores?listas=1');
      estado.listas = rl.ok ? await rl.json() : [];
      if (!rl.ok) console.warn('[ENVIO] listas salvas indisponíveis:', rl.status);
    } catch (e) { estado.listas = []; }

    render();
  }

  function render() {
    var st = estado;
    var porTipo = TIPOS.map(function (t) {
      return { t: t, n: st.contatos.filter(function (c) { return c.tipo === t; }).length };
    }).filter(function (x) { return x.n > 0; });

    var html = '';
    if (st.listas.length) {
      html += '<div class="cnre-rot">Listas salvas</div><div class="cnre-chips">' +
        st.listas.map(function (l) {
          return '<button class="cnre-chip" data-lista="' + l.id + '">★ ' + esc(l.nome) +
                 ' (' + ((l.comprador_ids || []).length) + ')</button>';
        }).join('') + '</div>';
    }
    html += '<div class="cnre-rot">Por tipo de cliente</div><div class="cnre-chips">' +
      porTipo.map(function (x) {
        return '<button class="cnre-chip" data-tipo="' + x.t + '">' + x.t + ' (' + x.n + ')</button>';
      }).join('') +
      '<button class="cnre-chip" data-todos="1">todos (' + st.contatos.length + ')</button>' +
      '<button class="cnre-chip" data-limpar="1">limpar</button>' +
      '</div>';

    if (agendaDisponivel()) {
      html += '<div class="cnre-rot">Agenda do celular</div><div class="cnre-chips">' +
        '<button class="cnre-chip agenda" data-agenda="1">📱 Buscar da agenda</button></div>';
    }
    document.getElementById('cnre-atalhos').innerHTML = html;

    document.getElementById('cnre-atalhos').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        var d = b.dataset;
        if (d.tipo)   st.contatos.filter(function (c) { return c.tipo === d.tipo; })
                        .forEach(function (c) { st.marcados.add(c.id); });
        if (d.todos)  st.contatos.forEach(function (c) { st.marcados.add(c.id); });
        if (d.limpar) st.marcados.clear();
        if (d.lista)  usarLista(Number(d.lista));
        if (d.agenda) return pegarDaAgenda();
        render();
      };
    });

    document.getElementById('cnre-lista').innerHTML = st.contatos.length
      ? st.contatos.map(function (c) {
          return '<label class="cnre-item">' +
            '<input type="checkbox" data-id="' + esc(c.id) + '"' +
              (st.marcados.has(c.id) ? ' checked' : '') + '>' +
            '<span class="cnre-nome">' + esc(c.nome || 'Sem nome') + '</span>' +
            '<span class="cnre-tag">' + esc(c.origem === 'agenda' ? 'da agenda' : c.tipo) + '</span>' +
          '</label>';
        }).join('')
      : '<div class="cnre-vazio">Nenhum cliente com telefone cadastrado.</div>';

    document.getElementById('cnre-lista').querySelectorAll('input').forEach(function (i) {
      i.onchange = function () {
        i.checked ? st.marcados.add(i.dataset.id) : st.marcados.delete(i.dataset.id);
        atualizarRodape();
      };
    });

    atualizarRodape();
  }

  function atualizarRodape() {
    var n = estado.marcados.size;
    document.getElementById('cnre-cont').textContent =
      n ? n + ' selecionado' + (n > 1 ? 's' : '') : 'ninguém selecionado ainda';
    var notas = [];
    if (estado.semTel) notas.push(estado.semTel + ' cliente(s) fora por não ter telefone.');
    if (!agendaDisponivel()) {
      notas.push('A agenda do celular só abre no Chrome do Android.');
    }
    document.getElementById('cnre-nota').textContent = notas.join(' ');
    document.getElementById('cnre-comecar').disabled = n === 0;
    // Contato vindo da agenda não tem cadastro para entrar numa lista salva.
    var soCrm = [...estado.marcados].some(function (id) {
      var c = estado.contatos.find(function (x) { return x.id === id; });
      return c && c.origem === 'crm';
    });
    document.getElementById('cnre-salvar').disabled = !soCrm;
  }

  function usarLista(id) {
    var l = estado.listas.find(function (x) { return x.id === id; });
    if (!l) return;
    // Soma em vez de substituir: dá para juntar duas listas. Id de comprador
    // apagado depois de a lista ser salva simplesmente não casa e some.
    (l.comprador_ids || []).forEach(function (cid) {
      if (estado.contatos.some(function (c) { return c.id === cid; })) estado.marcados.add(cid);
    });
  }

  async function pegarDaAgenda() {
    try {
      var sel = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!sel || !sel.length) return;
      var novos = 0;
      sel.forEach(function (c) {
        var tel = soDigitos((c.tel || [])[0] || '');
        if (tel.length < 10) return;
        var nome = ((c.name || [])[0] || '').trim() || tel;
        // Se o número já é de um cliente do CRM, marca aquele em vez de criar
        // uma linha repetida com o mesmo telefone.
        var existente = estado.contatos.find(function (x) { return x.tel === tel; });
        if (existente) { estado.marcados.add(existente.id); return; }
        var id = 'ag:' + tel;
        estado.contatos.push({ id: id, nome: nome, tipo: '', tel: tel, origem: 'agenda' });
        estado.marcados.add(id);
        novos++;
      });
      render();
      if (!novos) alert('Os contatos escolhidos já estavam na lista, ou estão sem número válido.');
    } catch (e) {
      // Cancelar o seletor cai aqui e não é erro — não vale alarme.
      if (e && e.name === 'AbortError') return;
      alert('Não consegui abrir a agenda: ' + (e && e.message ? e.message : e));
    }
  }

  async function salvarLista() {
    var ids = [...estado.marcados].filter(function (id) {
      var c = estado.contatos.find(function (x) { return x.id === id; });
      return c && c.origem === 'crm';
    });
    if (!ids.length) { alert('Só dá para salvar clientes do cadastro. Contatos da agenda não têm ficha.'); return; }
    var nome = prompt('Nome da lista (ex: "Meus 8 principais"):');
    if (nome === null) return;
    if (!nome.trim()) { alert('A lista precisa de um nome.'); return; }
    var btn = document.getElementById('cnre-salvar');
    btn.disabled = true;
    try {
      var r = await fetch('/api/compradores?listas=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), comprador_ids: ids }),
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
      estado.listas.push(d);
      render();
      alert('Lista "' + d.nome + '" salva com ' + ids.length + ' cliente(s).');
    } catch (err) {
      alert('Não consegui salvar a lista: ' + err.message);
    } finally { atualizarRodape(); }
  }

  function fecharEscolha() { document.getElementById('cnre-escolha').classList.remove('on'); }

  function comecar() {
    var escolhidos = estado.contatos.filter(function (c) { return estado.marcados.has(c.id); });
    if (!escolhidos.length) return;
    fecharEscolha();
    abrirFila({
      titulo: 'Enviando anúncio', detalhe: estado.titulo,
      mensagem: estado.mensagem, contatos: escolhidos,
      veiculoId: estado.veiculoId, aoEnviar: estado.aoEnviar,
    });
  }

  // ── Fila ───────────────────────────────────────────────────────
  function abrirFila(op) {
    montar();
    if (!op.contatos || !op.contatos.length) return;
    fila = { i: 0, ...op, enviados: 0 };
    document.getElementById('cnre-f-tit').textContent = op.titulo || 'Enviando anúncio';
    document.getElementById('cnre-f-sub').textContent = op.detalhe || '';
    document.getElementById('cnre-f-corpo').style.display = '';
    document.getElementById('cnre-f-fim').style.display   = 'none';
    document.getElementById('cnre-fila').classList.add('on');
    desenharItem();
  }

  function desenharItem() {
    if (!fila) return;
    var c = fila.contatos[fila.i];
    var total = fila.contatos.length;
    var msg = typeof fila.mensagem === 'function' ? fila.mensagem(c) : fila.mensagem;

    document.getElementById('cnre-f-passo').textContent = (fila.i + 1) + ' / ' + total;
    document.getElementById('cnre-f-quem').textContent  = c.nome || c.tel;
    document.getElementById('cnre-f-msg').textContent   = msg;
    document.getElementById('cnre-f-barra').style.width = Math.round(fila.i / total * 100) + '%';
    document.getElementById('cnre-f-nota').textContent  =
      'Confira antes de enviar — o WhatsApp abre com o texto pronto.';

    var wa = document.getElementById('cnre-f-wa');
    wa.href = 'https://wa.me/55' + c.tel + '?text=' + encodeURIComponent(msg);
    wa.onclick = function () {
      fila.enviados++;
      if (typeof fila.aoEnviar === 'function') {
        try { fila.aoEnviar(c, msg); } catch (e) { console.warn('[ENVIO] registro falhou:', e); }
      }
      setTimeout(avancar, 350);
    };
  }

  function avancar() {
    if (!fila) return;
    fila.i++;
    if (fila.i >= fila.contatos.length) {
      document.getElementById('cnre-f-barra').style.width  = '100%';
      document.getElementById('cnre-f-corpo').style.display = 'none';
      document.getElementById('cnre-f-fim').style.display   = '';
      document.getElementById('cnre-f-fim-sub').textContent =
        fila.enviados + ' de ' + fila.contatos.length + ' abertos no WhatsApp.';
      return;
    }
    desenharItem();
  }

  function fecharFila() { document.getElementById('cnre-fila').classList.remove('on'); fila = null; }

  window.CNR_ENVIO = {
    escolher: escolher,
    fila: abrirFila,
    agendaDisponivel: agendaDisponivel,
  };
})();
