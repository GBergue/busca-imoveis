# busca-imoveis

Coleta características de anúncios de imóveis e mostra tudo num dashboard para comparar.

## Uso

```bash
npm install
npx playwright install chromium   # baixa o navegador (uma vez)

node scrape.mjs "https://site.com/imovel/1" "https://site.com/imovel/2"
```

Abra `index.html` no navegador. Rode `scrape.mjs` de novo a qualquer momento —
ele faz append em `data.json`/`data.js` e atualiza imóveis já coletados (dedupe por URL).

Alternativa: colocar as URLs em `links.txt` (uma por linha) e rodar `node scrape.mjs` sem argumentos.

## Corrigir dados errados

A extração é heurística e erra em alguns sites. Edite `overrides.json`:

```json
{
  "https://site.com/imovel/1": { "bairro": "Centro", "preco": 445000, "quartos": 3 }
}
```

Rode `scrape.mjs` de novo para aplicar (os campos do override vencem os raspados).

## Arquivos

| | |
|---|---|
| `scrape.mjs`    | CLI: abre cada URL no Chromium headless e grava os dados |
| `extract.mjs`   | `extrair(html, url)` → imóvel. JSON-LD → OpenGraph → regex. Tem teste (`npm test`) |
| `index.html`   | tabela ordenável/filtrável, R$/m² calculado. Abre via `file://` |
| `data.json`     | fonte da verdade (lista de imóveis) |
| `data.js`       | mesma lista, gerada para o dashboard |
| `overrides.json`| correções manuais por URL |
