# Sprint 1 — Match Ativo

**Status:** Implementação concluída — validação em produção em andamento

---

## Hipótese
O Match Ativo aumenta a velocidade e/ou a taxa de conversão dos veículos,
mostrando os compradores certos no momento em que um carro entra no sistema.

## O que foi construído (versão original — Sprint 1 base)
- Top 3 compradores por score (faixa de preço + marca)
- Razões visíveis do match (✓ Faixa de preço, ✓ Marca Honda)
- Mensagem personalizada com nome, carro, km, cor, valor e tom de exclusividade
- Botão Copiar + Botão WhatsApp
- Botão Notifiquei → 5 opções de resultado → registra evento no banco
- Evento salvo: `score_match`, `motivos_match`, `mensagem_gerada`, `resultado`

## Evoluções implementadas durante a Sprint (Match Ativo 2.0)

### Fix de normalização de marca — commit `ee0a477`
**Problema identificado em produção:** FIPE retorna "VW - VolksWagen", mas compradores cadastram "Volkswagen" → o match não pontuava a marca corretamente, gerando scores incorretos para veículos VW e GM.

**Solução:** função `normMarca()` + dicionário `MARCA_ALIAS` aplicados nos 6 pontos de comparação de marca (4 em `catalogo.html`, 2 em `api/compradores.js`). Sem alteração de pesos ou lógica de score.

### Oferta com 1 clique + negociação automática
**Problema:** fluxo de 2 etapas (abre WA → volta pro app → clica "Notifiquei") gerava fricção e omissão de registros.

**Solução implementada:**
- Clicar "Ofertar" abre o WhatsApp E registra o evento + cria a negociação automaticamente em background (`Promise.all().catch()`)
- "Não adequado" disponível antes de ofertar — registra `match_nao_adequado` sem criar negociação
- Chips de resultado pós-oferta: **Interessado** / **Recusou** (+ sub-chips: preço alto / não é o perfil / sem mercado) / **Não respondeu**
- Proteção contra duplo-clique (flag `dataset.ofertado`)
- `veiculo_id` registrado em `negociacoes` (coluna adicionada via migration)

## Definição de acerto
Um match é considerado **acertado** quando pelo menos um dos 3 compradores sugeridos
inicia uma negociação ou demonstra interesse qualificado após o contato.

> Essa definição não muda durante o período de validação.

## Período
De: 05/08/2026
Até: ____/____/______ *(em andamento)*

## Métricas

| Métrica | Resultado |
|---|---|
| Veículos cadastrados no período | |
| Matches gerados (Top 3 exibidos) | |
| Mensagens enviadas (clicou Notifiquei) | |
| Compradores que responderam | |
| Negociações iniciadas | |
| Vendas originadas | |
| **Top 1 acertou?** (1º sugerido era o certo) | |
| **Top 3 acertou?** (certo estava entre os 3) | |
| **Compradores contatados por veículo** (média até 1º interesse) | |

> A distinção Top 1 vs Top 3 revela se o algoritmo **encontra** as pessoas certas
> mas ainda precisa melhorar a **ordenação** — ou se o problema é mais profundo.

## Observações da semana

- **O Top 3 fez sentido?** (os compradores sugeridos eram realmente os mais prováveis)
  > 

- **Algum comprador importante ficou de fora?** (quem você teria chamado mas o sistema não sugeriu)
  > 

- **A mensagem precisou de muita edição antes de enviar?**
  > 

- **O recurso economizou tempo?**
  > 

- **Usei naturalmente ou precisei lembrar que existia?**
  > 

## Registros de uso

### Primeiro teste (05/08/2026)
Jeep Renegade cadastrado. Sistema sugeriu comprador que Yuri teria chamado de cabeça.
Comprador confirmou interesse. Negociação em andamento.
→ **Top 3: acertou. Top 1: a confirmar.**

> *Adicionar novos registros aqui conforme o Match for usado em produção.*
> *Mínimo de 5 veículos com resultado registrado para fechar a sprint.*

## Critérios de Encerramento da Sprint

A Sprint será considerada encerrada quando:

- [ ] Pelo menos **5 veículos** tiverem utilizado o Match Ativo
- [ ] Todos os contatos tiverem resultado registrado (nenhum "Notifiquei" sem resposta pendente)
- [ ] A taxa de acerto do Top 1 for calculada
- [ ] A taxa de acerto do Top 3 for calculada
- [ ] As observações qualitativas forem revisadas
- [ ] Houver uma decisão explícita abaixo

> Sem esses 6 critérios cumpridos, a Sprint não fecha — mesmo que o período de tempo acabe.

## Decisão (preencher ao fim do período)

- [ ] Manter como está
- [ ] Ajustar algoritmo de score
- [ ] Ajustar texto da mensagem
- [ ] Evoluir para Sprint 2 — Central de Oportunidades

## Notas livres
<!-- Qualquer coisa que surgiu durante a semana que não cabia nos campos acima -->

---

## Lições Aprendidas (preencher ao encerrar a Sprint)

> Uma página só. Não técnico. Para o Yuri do futuro.

- **O que imaginávamos:** 
- **O que realmente aconteceu:** 
- **O que nos surpreendeu:** 
- **O que faremos diferente na Sprint 2:** 

---

*Criado em 04/08/2026 — atualizado em 12/08/2026 (Match Ativo 2.0 documentado)*
*Preencher métricas e decisão ao encerrar formalmente a Sprint.*
