# Fornecedores de Informações — Carro na Rede

> Atualizado em: agosto de 2026

---

## 1. FIPE (Tabela de Preços)

**API Parallelum**
- Site: https://parallelum.com.br/fipe/api/v1
- Uso: Cascata FIPE no gerador (marca → modelo → ano → valor)
- Custo: Gratuita, sem chave
- Status: ✅ Ativo e funcionando
- Obs: Trocada da BrasilAPI (instável) para Parallelum em mai/2026

---

## 2. Dados Básicos do Veículo por Placa

**APiBrasil** — endpoint `tipo: 'fipe'`
- Site: https://gateway.apibrasil.io
- Arquivo: `api/placa.js`
- Env var Vercel: `APIBRASIL_TOKEN`
- Retorna: Marca, modelo, ano, RENAVAM, **nome do proprietário**, valor FIPE, IPVA estimado (calculado FIPE × alíquota SC — NÃO é débito real)
- ✅ RENAVAM retornado aqui é salvo automaticamente em `veiculos.renavam` (commit `242467f`). Se APiBrasil não retornar, o campo pode ser preenchido manualmente no formulário de Captação e persiste no localStorage.
- Custo: Créditos pré-pagos
- Status: ✅ Token configurado no Vercel
- ⚠️ O campo `fipe.ipva.valor_formatado` é uma **estimativa**, não um débito real. Não indica se está pago ou em aberto.

---

## 2b. Débitos Veiculares — Pesquisa e Decisão (agosto/2026)

> **Decisão: não implementar consulta automática de débitos por ora.**

### APiBrasil — Débitos V4 (Marketplace)
- Endpoint: serviço separado do Marketplace APiBrasil, NÃO é um `tipo` do endpoint `/credits`
- Preço: **R$ 8,00 por requisição**
- Requisito: **Conta PJ** (conta atual é PF/Hobby — bloqueada com 403)
- Retorna: IPVA + multas + licenciamento + outros débitos em uma única chamada
- Parâmetro: `tipo: 'debitos-v4'` + placa (só placa, sem RENAVAM)
- Testado em: ago/2026 — retornou 403 Forbidden (conta PF não habilitada)
- Status: ❌ Inviável — R$ 8,00/veículo é caro demais + exige CNPJ

### ConsultarPlaca — RENAINF (Multas SENATRAN)
- Endpoint: `/v2/renainf` (via `api/consulta.js` com `?acao=renainf`)
- Preço: **R$ 4,50 por requisição**
- Retorna: Multas registradas no SENATRAN nacional — apenas multas, sem IPVA
- Parâmetros: só placa (sem RENAVAM)
- Cobertura SC: ✅ Nacional (SENATRAN cobre SC)
- Status: ⏳ Não implementado — viável para multas, mas sem IPVA

### IPVA real de SC — Por que é difícil
- IPVA em SC é administrado pela SEF-SC (não pelo DETRAN)
- Para consultar, SEF-SC exige placa + RENAVAM
- Não há API pública da SEF-SC para terceiros
- Serviços que conseguem (Zapay, Celcoin) são B2B/B2C sem API self-service barata
- RENAVAM é retornado pela APiBrasil `tipo: 'fipe'` e **já está salvo em `veiculos.renavam`** (desde commit `242467f`) — disponível para uso futuro nesta consulta

### Decisão registrada

- **Agora:** não implementar consulta automática de IPVA/multas.
- **Cadastro:** manter o campo "IPVA pago ☑️" como declaração manual do proprietário — adequado para o fluxo atual.
- **Não gastar R$ 4,50/veículo** só para obter multas enquanto o IPVA continua sem solução — não faz sentido implementar metade.
- **No futuro, após CNPJ:** reavaliar APiBrasil Débitos V4, Infosimples e ConsultarPlaca considerando preço PJ e volume.
- **No fechamento da negociação:** aí sim fazer consulta atualizada, caso a operação justifique o custo — não automático no cadastro.

> ⚠️ Sobre MEI/CNPJ: a abertura de MEI e a escolha do CNAE correto para intermediação de veículos é uma questão tributária e cadastral — verificar no Portal do Empreendedor/Receita antes de qualquer decisão. Não é apenas uma questão de acesso a APIs.

---

## 3. Consulta Veicular Completa (Relatório PDF)

**Consultar Placa**
- Site: https://www.consultarplaca.com.br
- Arquivo: `api/consulta.js`
- Env vars Vercel: `CP_EMAIL` + `CP_KEY`
- Retorna: Identificação básica, sinistro, leilão, restrições, recall, RENAJUD, gravame
- Planos: Bronze R$19,90 / Prata R$39,90 / Ouro R$49,90 / Diamante R$64,90
  - Diamante inclui "Guia de Imagens" (possível foto de leilão — verificar)
- Créditos bulk: R$189,91 a R$479,20 (desconto 5–20%)
- Status: 🔧 Configurado mas não testado em produção
- Contato: contato@consultarplaca.com.br

---

## 4. Consulta Veicular — APIs (Pendente reativação com CNPJ)

**Infosimples**
- Site: https://api.infosimples.com
- Env var Vercel: `INFOSIMPLES_API_KEY` (configurada, mas integração removida temporariamente)
- APIs disponíveis no plano:
  | Endpoint | O que retorna | Parâmetros | Status |
  |---|---|---|---|
  | `detran/sc/veiculo` | Situação + restrições SC | Placa + GOV.BR | ❌ Requer GOV.BR |
  | `detran/restricoes` | Restrições unificadas | Placa + GOV.BR | ❌ Requer GOV.BR |
  | `ecrvsp/multas/placa` | Multas SP (RENAINF) | Só placa | ⏳ Aguardando aprovação |
  | `laudos-veiculares/dekra/ecv` | Laudo sinistro/leilão DEKRA | Placa + login_usuario/senha | 🔧 Endpoint correto, não testado |
  | `serpro/radar/veiculo` | Dados SERPRO | Placa + RENAVAM | ❌ Requer RENAVAM |
- Custo: Créditos pré-pagos (R$100 mínimo)
- Pendência: Abrir CNPJ → deletar conta atual → criar nova conta com CNPJ → reenviar formulário de habilitação
- Contato: suporte@infosimples.com.br

---

## 5. Fotos de Leilão / Histórico Veicular

**Autocrivo**
- Site: https://autocrivo.com.br
- Diferencial: Mostra **fotos do carro tiradas no leilão** quando houve sinistro/perda total
- Contato: contato@autocrivo.com.br / (47) 3285-3168 ou 3285-3169
- Status: ⏳ A verificar — testar conta e confirmar feature de fotos
- Obs: Referência do mercado para histórico veicular com fotos de sinistro

**Laudocar**
- Site: https://laudocar.com.br
- Retorna: Passagem por leilão, sinistros, multas, restrições
- Planos: R$49 (básico) / R$99/mês
- Status: ⏳ A verificar

---

## 6. Sites de Leilão (Monitoramento)

Para acompanhar veículos disponíveis em leilão:

| Site | URL | Foco |
|---|---|---|
| Superbid | superbid.net | Maior do Brasil — geral (+1.200 carros agora) |
| Mega Leilões | megaleiloes.com.br | Seguradoras (Porto Seguro, Mapfre etc.) |
| Sodré Santoro | sodresantoro.com.br | Judicial + extrajudicial — SP |
| Instant Leilões | instantleiloes.com.br | Seguradoras |
| Leilão VIP | leilaovip.com.br | Carros de financeiras |
| Libertar | libertar.com.br | Recuperação de crédito — bancos |

---

## 7. IA (Parsing e Geração de Anúncios)

**OpenRouter**
- Site: https://openrouter.ai
- Env var Vercel: `OPENROUTER_API_KEY` (nunca no código — só no Vercel)
- Uso: Modo "Colar Anúncio" — extrai dados de anúncios colados
- Status: ✅ Ativo

---

## Resumo de Status

| Fornecedor | Função | Status |
|---|---|---|
| Parallelum FIPE | Tabela FIPE | ✅ Ativo |
| APiBrasil (tipo: fipe) | Dados básicos + proprietário + IPVA estimado | ✅ Ativo |
| APiBrasil (Débitos V4) | IPVA + multas reais | ❌ Requer CNPJ + R$ 8,00/consulta |
| Consultar Placa (RENAINF) | Multas SENATRAN (sem IPVA) | ⏳ Disponível, não implementado (R$ 4,50) |
| Consultar Placa | Relatório PDF completo | 🔧 Configurado |
| Infosimples | Multas, restrições, laudo | ⏳ Aguarda CNPJ |
| Autocrivo | Fotos de leilão | ⏳ A testar |
| OpenRouter | IA parsing de anúncios | ✅ Ativo |
