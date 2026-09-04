# Financiamento vs. Investimento — design

## Objetivo

Novo módulo, independente da busca de imóveis, para simular e comparar
cenários de "financiar o imóvel" vs. "investir o dinheiro" e ver qual
compensa mais ao final do prazo do financiamento.

## Escopo

- Calculadora **independente** — não puxa dados dos imóveis já raspados,
  o usuário digita os valores.
- Suporta **múltiplos cenários lado a lado**, cada um combinando um
  financiamento (PRICE ou SAC) com um investimento.
- Persistência local (localStorage), sem backend.
- Fora de escopo (simplificações deliberadas, adicionar depois se fizer
  falta): entrada/valor à vista do imóvel, IR sobre rendimento,
  valorização do imóvel, correção monetária (TR), seguros/taxas do
  financiamento.

## Arquitetura

- `financiamento.html` — página nova, mesmo estilo visual de
  `index.html` (CSS inline, sem framework/build). Link "← imóveis" no
  topo; `index.html` ganha um link "financiamento →".
- `financiamento-calc.js` — funções puras de cálculo, carregado como
  `<script>` clássico (sem `import`/`export`) para continuar
  funcionando abrindo os arquivos direto via `file://`, igual
  `data.js`/`condominios.js`. Exporta condicionalmente via
  `module.exports` guardado por `typeof module !== "undefined"`, para
  ser testável a partir do Node também.
- `test-financiamento.mjs` — testes com `node:assert/strict`, seguindo
  o padrão de `test.mjs`/`extract.mjs`. `package.json` `test` passa a
  rodar `node test.mjs && node test-financiamento.mjs`.
- Sem lib de gráfico: `<canvas>` desenhado manualmente (poucas linhas,
  evita dependência nova).

## Modelo de cálculo (`financiamento-calc.js`)

Conversão de taxa anual → mensal (composta, padrão de mercado):

```
i_mensal = (1 + i_anual) ^ (1/12) - 1
```

### Financiamento

Inputs: `valorFinanciado`, `taxaAnual`, `prazoAnos`, `tipo` (`"PRICE"` | `"SAC"`).

- **PRICE**: parcela fixa
  `parcela = VF * i / (1 - (1+i)^-n)`.
  Mês a mês: `juros = saldoDevedor * i`; `amortizacao = parcela - juros`;
  `saldoDevedor -= amortizacao`.
- **SAC**: amortização fixa `amortizacao = VF / n`.
  Mês a mês: `juros = saldoDevedor * i`; `parcela = amortizacao + juros`;
  `saldoDevedor -= amortizacao`.

Saída: array mês a mês `{ mes, parcela, juros, amortizacao, saldoDevedor }`,
mais totais (`totalPago`, `totalJuros`).

### Investimento

Inputs: `valorInicial`, `aporteMensal`, `taxaAnual`, `numMeses` (= prazo
do financiamento do mesmo cenário).

Mês a mês: `saldo = saldoAnterior * (1 + i_mensal) + aporteMensal`.

Saída: array mês a mês `{ mes, saldo }`, mais `saldoFinal`.

`aporteMensal` é pré-preenchido pela UI com o valor da parcela do mês 1
do financiamento do cenário (lógica de "investir a diferença"), mas é um
campo editável — o cálculo em si não força esse vínculo.

### Comparação

```
patrimonioFinal = valorFinanciado + saldoFinalInvestimento
```

(imóvel considerado quitado ao fim do prazo, valor nominal, sem
valorização). É esse número que ordena a tabela comparativa entre
cenários — maior primeiro.

## Dados de um cenário

```js
{
  id: string,           // uuid ou timestamp
  nome: string,          // opcional, ex: "SAC 9% 25 anos"
  financiamento: { valorFinanciado, taxaAnual, prazoAnos, tipo },
  investimento: { valorInicial, aporteMensal, taxaAnual },
}
```

Persistido como array em `localStorage["financiamento_cenarios"]`.

## UI

- **Formulário "novo cenário"**: nome (opcional), bloco financiamento
  (valor financiado, taxa %/ano, prazo em anos, PRICE/SAC), bloco
  investimento (valor investido inicial, aporte mensal — auto-preenchido
  ao preencher o financiamento, editável, rendimento %/ano). Botão
  "adicionar cenário".
- **Tabela comparativa** no topo: uma linha por cenário — nome, total
  pago no financiamento, total de juros, saldo final investido,
  patrimônio final — ordenada por patrimônio final (desc).
- **Cards de cenário** (um por cenário, removível):
  - resumo (mesmos números da tabela comparativa);
  - gráfico canvas: saldo devedor do financiamento (caindo) vs. saldo do
    investimento (subindo), mês a mês, mesmo eixo X (meses);
  - `<details>` recolhível com a tabela mês a mês (parcela, juros,
    amortização, saldo devedor, saldo investido).
- Estilo visual reaproveita o CSS de `index.html` (mesmas variáveis de
  cor, mesma fonte, mesmo padrão de espaçamento).

## Testes

`test-financiamento.mjs` cobre, com valores calculados à mão ou
verificados externamente:
- PRICE: parcela fixa correta, soma de amortizações = valor financiado,
  saldo devedor zera no último mês.
- SAC: amortização constante, parcela decrescente, saldo devedor zera no
  último mês.
- Conversão de taxa anual → mensal.
- Evolução do investimento com aporte mensal (juros compostos).
- Patrimônio final combinando os dois.

## Fora de escopo / próximos passos possíveis

Entrada/valor à vista do imóvel, correção monetária (TR/IPCA) no saldo
devedor, comparação "comprar à vista vs. investir tudo" como modelo
alternativo, exportar/importar cenários (JSON), integração com a lista
de imóveis (puxar preço automaticamente).

## Atualização: amortização extra, valorização, IR e cenário de aluguel

Adicionados depois da primeira versão:

- **Amortização extra**: campo opcional no financiamento
  (`amortizacaoExtra: { valor, periodicidadeMeses }`). A cada
  `periodicidadeMeses`, soma `valor` à amortização do mês — a parcela
  nominal não muda ("reduz prazo"), então `meses` sai mais curto que
  `prazoAnos*12` quando o valor extra é maior que zero.
- **Valorização do imóvel**: campo `valorizacaoAnual` (%) no
  financiamento. `valorImovelFinal()` capitaliza o valor financiado
  mensalmente por essa taxa, pelo número de meses que o financiamento
  durou (o mesmo horizonte da amortização extra).
- **IR sobre o investimento**: campo `aliquotaIR` (%) no bloco
  investimento (compartilhado entre financiamento e aluguel).
  `aplicarIR()` aplica a alíquota sobre o ganho (`saldoFinal -
  totalAportado`), nunca sobre o principal.
- **Cenário "aluguel"**: novo `tipo: "aluguel"` no lugar de
  `"financiamento"`. Dados: `aluguel: { valorMensal, prazoAnos }` (sem
  reajuste automático do aluguel — fixo pelo prazo; crie outro cenário
  para comparar valores de aluguel diferentes). O aporte mensal
  investido é um campo manual, sem vínculo automático com a parcela do
  financiamento (decisão do usuário: comparar por orçamento igual foi
  descartado a favor de liberdade pra simular qualquer aporte).
  Patrimônio final = só o saldo investido líquido de IR (sem imóvel).
  Horizonte da simulação = `prazoAnos` do próprio cenário de aluguel,
  independente do prazo de qualquer financiamento cadastrado.

Pegadinha de implementação: um `<fieldset hidden>` não isenta seus
campos `required` da validação nativa do form — o `hidden` só isenta o
próprio elemento, não descendentes. O toggle de tipo de cenário
também precisa alternar `required` nos campos de financiamento
(`valorFinanciado`, `taxaFin`, `prazoAnos`), senão o submit falha
silenciosamente quando o cenário de aluguel está selecionado.
