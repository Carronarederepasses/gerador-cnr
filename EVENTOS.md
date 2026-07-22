# Catálogo de Eventos do CNR

> Eventos são registros imutáveis de tudo que acontece com um veículo ou negociação.
> Um evento nunca é alterado — apenas novos eventos são adicionados.
> Todo evento tem: `id`, `tipo`, `veiculo_id`, `usuario_id`, `timestamp`, `dados` (JSON), `origem`.

---

## Veículo

| Evento | Quando acontece | Quem gera | Dados capturados |
|---|---|---|---|
| `veiculo.captado` | Cadastro inicial no sistema | Usuário | data_captacao, canal_origem (OLX/indicação/Instagram/abordagem direta), cidade, responsável, valor_pedido_inicial |
| `veiculo.avaliado` | Checklist preenchido | Usuário | nota_geral, avarias, observações internas, km verificado |
| `veiculo.foto_adicionada` | Upload de foto | Usuário/Sistema | quantidade de fotos, posição na ordem, fonte (câmera/galeria) |
| `veiculo.foto_processada` | Background removido | Sistema | modo usado (fiel/IA), modelo IA, custo estimado |
| `veiculo.publicado` | Anúncio gerado e enviado | Usuário | canal de distribuição, valor anunciado, texto do anúncio |
| `veiculo.reservado` | Status mudou para reservado | Usuário | comprador_id, valor da proposta aceita |
| `veiculo.vendido` | Venda registrada | Usuário | valor_venda, comprador_id, forma_pagamento, data_venda |
| `veiculo.entregue` | Entrega realizada | Usuário | data_entrega, documentação ok (s/n) |
| `veiculo.removido` | Retirado do catálogo sem venda | Usuário | motivo (desistência do vendedor / preço / outro) |

---

## Preço

| Evento | Quando acontece | Quem gera | Dados capturados |
|---|---|---|---|
| `preco.definido` | Primeiro valor cadastrado | Usuário | valor, referência_fipe, percentual_sobre_fipe |
| `preco.alterado` | Qualquer mudança de valor | Usuário | valor_anterior, valor_novo, motivo (redução voluntária / proposta / mercado), dias_desde_publicacao |

---

## Negociação

| Evento | Quando acontece | Quem gera | Dados capturados |
|---|---|---|---|
| `negociacao.primeiro_contato` | Primeiro comprador demonstra interesse | Usuário | comprador_id, canal (WhatsApp/ligação/presencial), horas_desde_publicacao |
| `negociacao.proposta_recebida` | Comprador faz oferta | Usuário | comprador_id, valor_proposta, percentual_abaixo_anuncio |
| `negociacao.contraproposta` | CNR ou vendedor contraoferta | Usuário | valor_contra, quem_fez (cnr/vendedor) |
| `negociacao.proposta_recusada` | Proposta não aceita | Usuário | comprador_id, valor_recusado, motivo |

---

## Match

| Evento | Quando acontece | Quem gera | Dados capturados |
|---|---|---|---|
| `match.sugerido` | Sistema recomenda compradores | Sistema | lista_compradores, scores, critérios usados |
| `match.aceito` | Yuri escolhe o comprador sugerido | Usuário | comprador_escolhido, posição_na_lista (1º, 2º…), motivo (já compra modelo / paga rápido / melhor margem / confiança / região / outro) |
| `match.ignorado` | Yuri escolhe comprador diferente do sugerido | Usuário | comprador_sugerido, comprador_escolhido, motivo |

---

## Comprador

| Evento | Quando acontece | Quem gera | Dados capturados |
|---|---|---|---|
| `comprador.cadastrado` | Primeiro registro | Usuário | nome, telefone, cidade, tipo (loja/pessoa física/investidor) |
| `comprador.preferencia_atualizada` | Yuri atualiza perfil | Usuário | marcas, faixa_preco, tipos_veiculo, observações |
| `comprador.comprou` | Venda concluída com esse comprador | Sistema | veiculo_id, valor, forma_pagamento, tempo_resposta_horas |
| `comprador.recusou` | Comprador declinou proposta | Usuário | veiculo_id, motivo (preço / perfil / timing / outro) |
| `comprador.sumiu` | Não respondeu após contato | Usuário | veiculo_id, tentativas_contato |

---

## Métricas calculadas automaticamente a partir dos eventos

Com esses eventos registrados, o sistema calcula sem pedir nada ao usuário:

- **Tempo de giro** = `veiculo.vendido.timestamp` − `veiculo.captado.timestamp`
- **Tempo até primeira proposta** = `negociacao.proposta_recebida.timestamp` − `veiculo.publicado.timestamp`
- **Desconto médio aceito** = média de (`preco_anunciado` − `valor_venda`) / `preco_anunciado`
- **Taxa de Match Aceito** = `match.aceito` / (`match.aceito` + `match.ignorado`)
- **Score de confiança do comprador** = baseado em `comprador.comprou`, `comprador.recusou`, `comprador.sumiu`, tempo_resposta
- **Redução média de preço** = média de `preco.alterado.percentual`
- **Canal de captação mais eficiente** = giro médio e margem por `canal_origem`

---

## Regras do catálogo

1. **Novos eventos precisam ser documentados aqui antes de implementados no código**
2. **Eventos nunca são deletados** — apenas marcados como `anulado` com referência ao evento que o substitui
3. **`dados` é um JSON livre** — mas os campos da tabela acima são obrigatórios
4. **Eventos gerados pelo sistema** têm `usuario_id = 'system'`

---

*Dono deste documento: Yuri — Carro na Rede Repasses*
*Criado em: julho/2026*
