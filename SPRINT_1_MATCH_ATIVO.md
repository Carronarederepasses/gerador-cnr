# Sprint 1 — Match Ativo

## Hipótese
O Match Ativo aumenta a velocidade e/ou a taxa de conversão dos veículos,
mostrando os compradores certos no momento em que um carro entra no sistema.

## O que foi construído
- Top 3 compradores por score (faixa de preço + marca)
- Razões visíveis do match (✓ Faixa de preço, ✓ Marca Honda)
- Mensagem personalizada com nome, carro, km, cor, valor e tom de exclusividade
- Botão Copiar + Botão WhatsApp
- Botão Notifiquei → 5 opções de resultado → registra evento no banco
- Evento salvo: `score_match`, `motivos_match`, `mensagem_gerada`, `resultado`

## Definição de acerto
Um match é considerado **acertado** quando pelo menos um dos 3 compradores sugeridos
inicia uma negociação ou demonstra interesse qualificado após o contato.

> Essa definição não muda durante o período de validação.

## Período
De: 05/08/2026
Até: ____/____/______

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

## Primeiro teste (05/08/2026)
Jeep Renegade cadastrado. Sistema sugeriu comprador que Yuri teria chamado de cabeça.
Comprador confirmou interesse. Negociação em andamento.
→ **Top 3: acertou. Top 1: a confirmar.**

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

*Criado em 04/08/2026 — preencher ao fim do período de observação*
