# CLAUDE.md — Contexto do Projeto (ler sempre ao abrir a pasta)

> **Para o Claude:** Sempre que o Yuri abrir esta pasta, aja como o assistente de desenvolvimento dele neste projeto. Leia este arquivo, entenda o estado atual e ajude a desenvolver a aplicação "Carro na Rede Repasses". Fale em português brasileiro, de forma direta e sem enrolação. Antes de qualquer tarefa de várias etapas, confirme rapidamente o escopo com ele.

---

## 1. O Negócio

**Nome:** Carro na Rede Repasses
**Instagram:** @carronarederepasses
**Responsável:** Yuri
**Região:** Garopaba, Praia da Rosa, Imbituba — Litoral de Santa Catarina

Intermediação de veículos (repasse), modelo **C2B**:
- Pessoa física traz o carro
- Carro na Rede conecta com rede de +200 compradores (dealers, revendas, investidores)
- Cobra taxa de intermediação sobre o negócio fechado
- Sem estoque próprio — 100% intermediação
- Tempo médio de venda ~48h

**Diferencial:** conhecimento profundo do mercado regional do litoral de SC, rede ativa de compradores, operação sem vitrine pública, velocidade.

---

## 2. Identidade Visual

- **Cores:** Preto e branco (identidade editorial)
- **Tipografia:** Playfair Display (serif) + DM Sans
- **Tom:** Premium, direto, sem enrolação
- **Logo:** "Carro na Rede" — canto inferior direito nos materiais

---

## 3. Aplicação Principal — Gerador de Anúncio WhatsApp

**URL publicada:** https://carronarederepasses.github.io/gerador-cnr/
**GitHub:** https://github.com/Carronarederepasses/gerador-cnr
**Versão atual:** v4 (HTML/CSS/JS puro, single file `index.html`)

### Funcionalidades v4
- **Modo Manual:** preenchimento campo a campo
- **Modo Colar Anúncio:** cola texto de qualquer anúncio (OLX, Webmotors, WhatsApp) e a IA extrai os dados
- **Cascata FIPE completa:** Marca → Modelo/Versão → Ano → FIPE automática
- **Opcionais por categoria** (estilo Webmotors): Conforto & Conveniência, Segurança, Mecânica & Performance, Aparência & Extras, Documentação & Histórico
- **Blindagem:** campo expansível (marca, nível, tipo de vidro)
- **Observações finais** pré-definidas + campo personalizado
- **Preview** em tempo real estilo bolha do WhatsApp
- **Botões:** Copiar texto + Enviar pelo WhatsApp

### Formato do anúncio gerado
```
🚗*Volkswagen Virtus Sense 1.0 Flex*, 2026, 5.000 km
📍 Carro na região de Rio Preto-SP
✅ ÚNICO DONO
✅ Câmbio manual
✅ 4 pneus zero
✅ Ar-condicionado
✅ Multimídia
✅ Comandos no volante
✅ Direção elétrica
✅ Vidros e travas elétricas
🚨 Veículo impecável
 *VALOR: R$ 88.990,00*
 *FIPE: R$ 98.776,00*
```

---

## 4. Stack Técnica

### Atual (publicado)
- HTML/CSS/JS puro — single file `index.html`
- **API FIPE: `parallelum.com.br/fipe/api/v1`** (gratuita, sem chave, com CORS).
  - Trocada da BrasilAPI (que estava fora do ar e travava a marca em "Carregando...") para a Parallelum em mai/2026.
  - Estrutura: marca/modelo/ano usam `codigo`; valor vem no campo `Valor` (V maiúsculo) e `MesReferencia`.
- IA para parsing/geração: **OpenRouter** (chave NUNCA no código — só em variável de ambiente no Vercel)
- **Hospedagem: Vercel** (migrou do Netlify por excesso de uso)
  - Funções serverless em `api/` (parse.js, fipe-search.js, fipe.js)
  - Deploy automático a cada push no GitHub

### Próxima versão (planejada)
- **Frontend:** React + Next.js
- **Backend/DB:** Supabase
- **Hospedagem:** Vercel (já em uso)
- **Repositório:** GitHub (`Carronarederepasses/gerador-cnr`)
- **IA (Colar Anúncio / geração):** OpenRouter via Vercel API Route (chave em env var secreta)

---

## 5. Conectores / Infra configurada

| Serviço | Status | Como usar |
|---|---|---|
| Supabase | Conectar via MCP (sugerido) | Banco de dados, auth, storage |
| Vercel | MCP conectado ✅ | Deploy + API Routes (backend serverless) |
| GitHub | Via git CLI na pasta | Versionamento — push dispara deploy no Vercel |
| OpenRouter | Chave em env var (NUNCA no código) | IA pra gerar/parsear anúncios |

> **Segurança das chaves:** a chave do OpenRouter (e qualquer outra) NUNCA vai no `index.html` nem em código que sobe pro GitHub, porque o código é público. Ela mora só como variável de ambiente secreta no painel do Vercel. Quem digita a chave é o Yuri.

> Se algum conector cair ou pedir login, o Claude deve sugerir reconectar.

---

## 6. Próximos Passos

### Gerador (curto prazo)
- [ ] Corrigir upload do `index.html` v4 no GitHub (subiu como `index-1.html`)
- [ ] Testar modo "Colar Anúncio" com anúncios reais de parceiros
- [ ] Validar FIPE carregando no link publicado

### Projeto completo (médio prazo)
- [ ] Migrar para Next.js + Vercel
- [ ] Integrar Supabase (histórico de anúncios, cadastro de compradores, estoque)
- [ ] Definir estrutura do banco de dados
- [ ] Desenvolvimento assistido por IA configurado nesta pasta

---

## 7. Conteúdo Instagram (@carronarederepasses)

- **Segunda:** Post educativo (dicas sobre repasse, mercado)
- **Quarta:** Tip ou destaque de mercado (alternando)
- **Sexta:** Carrossel de 5 slides com notícias automotivas (fonte inline)

**Tom de voz:** direto, social proof (comprovantes, narrativa deadline→venda), CTA via DM/WhatsApp, português natural.

**Audiências:** (1) pessoa física frustrada com OLX/Webmotors, (2) dealers com trade-ins fora do perfil, (3) investidores e revendedores.

---

## 8. Referência de mercado — Vaapty

Intermediadora C2B no modelo franqueadora (350 franquias em 2024, rebranding 2025 para C2B2C). Carro na Rede tem modelo C2B similar, mas com vantagem de conhecimento local profundo, relacionamento direto e operação independente (sem franqueadora).

---

*Briefing original gerado em sessão com Claude — Maio 2026. Mantenha este arquivo atualizado conforme o projeto evolui.*
