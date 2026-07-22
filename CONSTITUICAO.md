# Constituição do CNR

> **Manifesto:** Cada interação deve deixar o sistema mais inteligente do que estava cinco minutos antes.

Estes cinco princípios guiam toda decisão de produto do Carro na Rede. Antes de construir qualquer feature, pergunte: ela respeita esses princípios?

---

## 1. Nunca perder histórico

Nunca sobrescrever um dado importante sem preservar o valor anterior.

- Preço alterado → salva o preço antigo, o novo e o motivo
- Status alterado → registra quem alterou, quando e por quê
- Venda cancelada → o registro permanece, apenas marcado como cancelado

**Na prática:** Use eventos imutáveis. O presente é mutável; o passado não.

---

## 2. Nunca pedir o que pode ser inferido

Se o sistema consegue calcular ou deduzir um dado, ele calcula. O usuário não é formulário.

- Tempo de giro → sistema calcula (data_venda − data_captacao)
- Margem bruta → sistema calcula (valor_venda − valor_compra)
- Desconto aceito → sistema calcula (valor_anunciado − valor_venda)
- Número de propostas → sistema conta pelos eventos

**Na prática:** Cada campo pedido ao usuário deve ter justificativa clara de por que o sistema não pode obtê-lo sozinho.

---

## 3. Toda funcionalidade deve gerar conhecimento

Se uma feature não cria um ativo de dados, questione sua prioridade.

| Feature | Ativo gerado |
|---|---|
| Gerador de anúncios | Base de anúncios + padrões de conversão |
| CRM de compradores | Grafo de relacionamentos |
| Motor de Match | Histórico de decisões rotuladas |
| Pipeline | Histórico de tempo por etapa |
| Financeiro | Base de margens reais por segmento |

**Na prática:** Antes de construir, pergunte: "Que dado essa feature produz? Que pergunta esse dado vai responder daqui a dois anos?"

---

## 4. A IA aprende com os especialistas

O sistema observa primeiro, automatiza depois. O Yuri é o primeiro modelo de IA do CNR.

- Quando o Yuri escolhe um comprador, o sistema registra o motivo
- Quando o Yuri define um preço, o sistema registra o raciocínio
- Quando o Yuri identifica uma boa oportunidade, o sistema aprende o padrão

O objetivo não é substituir o conhecimento do Yuri. É escalá-lo.

**Na prática:** O KPI mais importante nos próximos anos é a **Taxa de Match Automático Aceito** — quantas vezes o sistema sugeriu o comprador certo sem intervenção.

---

## 5. A confiança vale mais que a automação

No repasse, uma recomendação errada não é um bug — é uma relação comercial danificada. O sistema deve sempre mostrar o raciocínio da sugestão, não apenas o resultado.

- "Sugiro o João Veículos (94%) porque já comprou 3 Corollas, paga via PIX em 24h e está ativo há 8 dias sem compra."
- O usuário decide. O sistema explica.

**Na prática:** Transparência primeiro, automação depois. Nunca confiar cegamente em uma sugestão que o sistema não consegue explicar.

---

*Dono deste documento: Yuri — Carro na Rede Repasses*
*Criado em: julho/2026*
