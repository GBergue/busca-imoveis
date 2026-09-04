// Extrai características de um imóvel a partir do HTML de um anúncio.
// Precedência: dados estruturados (JSON-LD, meta OpenGraph, frases de título/descrição)
// vêm primeiro; heurística sobre o texto visível só entra como último recurso.
// Campo não encontrado = null. É a única lógica de verdade do projeto; tem teste.

const CAMPOS = [
  "url", "site", "titulo", "tipo", "preco", "condominio", "iptu",
  "bairro", "cidade", "endereco", "area_util", "area_total",
  "quartos", "suites", "banheiros", "vagas", "caracteristicas",
  "descricao", "foto", "coletado_em",
];

const TIPOS = [
  "apartamento", "cobertura", "casa", "sobrado", "kitnet", "studio", "flat",
  "terreno", "lote", "chácara", "sítio", "fazenda", "galpão", "sala comercial",
  "loja", "ponto comercial",
];

const CARACTERISTICAS = [
  "piscina", "churrasqueira", "academia", "portaria 24h", "elevador",
  "sacada", "varanda gourmet", "varanda", "mobiliado", "semimobiliado",
  "área de serviço", "playground", "salão de festas", "salão de jogos",
  "quadra", "condomínio fechado", "aceita pet", "ar condicionado",
  "aquecimento solar", "gás encanado", "closet", "escritório", "lavabo",
];

// Palavras que aparecem em breadcrumb mas não são bairro.
const NAO_BAIRRO = new Set([
  "home", "início", "imóveis", "imoveis", "comprar", "à venda", "a venda",
  "alugar", "aluguel", "apartamento", "apartamentos", "casa", "casas",
  "terreno", "terrenos", "araraquara", "sp", "são paulo", "sao paulo", "brasil",
]);

// "1.250.000,50" -> 1250000.5 ; "89,5" -> 89.5 ; "450.000" -> 450000 ; "250000" -> 250000
function numBR(s) {
  if (s == null) return null;
  let t = String(s).trim().replace(/[^\d.,]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, ""); // 450.000 -> milhar
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonLdNodes(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(...flattenLd(JSON.parse(m[1].trim()))); }
    catch { /* ignora JSON-LD quebrado */ }
  }
  return out;
}

function flattenLd(node) {
  if (Array.isArray(node)) return node.flatMap(flattenLd);
  if (node && typeof node === "object") {
    let acc = [node];
    if (node["@graph"]) acc = acc.concat(flattenLd(node["@graph"]));
    return acc;
  }
  return [];
}

function meta(html, key) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const m = html.match(re) || html.match(new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"));
  return m ? m[1].trim() : null;
}

const intAfter = (text, re) => { const m = text.match(re); return m ? parseInt(m[1], 10) : null; };

// Bairro a partir de qualquer BreadcrumbList: penúltimo item (o último é o próprio anúncio).
function bairroDoBreadcrumb(lds) {
  for (const n of lds) {
    if (!/breadcrumb/i.test([].concat(n["@type"] || "").join(" "))) continue;
    const itens = (n.itemListElement || [])
      .map((it) => it.name || it.item?.name)
      .filter(Boolean);
    const cand = itens[itens.length - 2];
    if (cand && !NAO_BAIRRO.has(cand.trim().toLowerCase())) return cand.trim();
  }
  return null;
}

// Extrai preço / quartos / vagas / área / bairro de frases de alta confiança
// (og:title, og:description, meta description, name/description do JSON-LD).
// Ex.: "... 50 m² por R$ 265.000,00 - Vila Velosa - Araraquara"
//      "Comprar Apartamento na Rua X, Vila Harmonia em Araraquara por R$ 250000 com 2 quartos, 1 garagem e com 46m²"
function parseFrases(frases) {
  const t = frases.join("  ||  ");
  const r = {};
  const preco = t.match(/por\s+R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (preco) r.preco = numBR(preco[1]);
  const area = t.match(/(\d{2,4}(?:[.,]\d+)?)\s*m[²2](?!\w)/i);
  if (area) r.area = numBR(area[1]);
  r.quartos = intAfter(t, /(\d+)\s*(?:quartos?|dormit[óo]rios?)/i);
  r.vagas = intAfter(t, /(\d+)\s*(?:vagas?|garagens?)/i);
  // "<Bairro> em Araraquara"  |  " - <Bairro> - Araraquara"
  const b1 = t.match(/,\s*([A-ZÁÉÍÓÚÂÃ][\wÀ-ÿ]+(?: [A-ZÁÉÍÓÚÂÃa-zà-ÿ]+){0,3})\s+em\s+Araraquara/);
  const b2 = t.match(/[-–]\s*([A-ZÁÉÍÓÚÂÃ][\wÀ-ÿ]+(?: [A-ZÁÉÍÓÚÂÃa-zà-ÿ]+){0,3})\s*[-–]\s*Araraq/);
  const b = (b1 || b2)?.[1]?.trim();
  if (b && !NAO_BAIRRO.has(b.toLowerCase())) r.bairro = b;
  return r;
}

export function extrair(html, url) {
  const texto = stripTags(html);
  const lower = texto.toLowerCase();
  const r = Object.fromEntries(CAMPOS.map((c) => [c, null]));
  r.url = url;
  try { r.site = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  r.coletado_em = new Date().toISOString();

  const lds = jsonLdNodes(html);
  const ld = lds.find((x) => {
    const ty = [].concat(x["@type"] || []).join(" ").toLowerCase();
    return /listing|residence|apartment|house|product|offer|place/.test(ty);
  }) || {};
  const offer = [].concat(ld.offers || [])[0] || {};

  const ogTitle = meta(html, "og:title");
  const ogDesc = meta(html, "og:description");
  const metaDesc = meta(html, "description");
  const frases = parseFrases([
    ogTitle, ogDesc, metaDesc, ld.name, ld.description,
  ].filter(Boolean));

  // --- título / descrição / foto ---
  r.titulo = ld.name || ogTitle || html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  r.descricao = ld.description || ogDesc || metaDesc || null;
  const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
  r.foto = (typeof img === "object" ? img?.url : img) || meta(html, "og:image") || null;

  // --- preço (estruturado > frase > meta > heurística) ---
  r.preco =
    numBR(offer.price ?? offer.lowPrice) ??
    frases.preco ??
    numBR(meta(html, "product:price:amount") || meta(html, "og:price:amount")) ??
    null;

  // custos rotulados
  r.condominio = numBR(lower.match(/condom[íi]nio[^r$]{0,20}r\$ ?([\d.,]+)/)?.[1]);
  r.iptu = numBR(lower.match(/iptu[^r$]{0,20}r\$ ?([\d.,]+)/)?.[1]);

  if (r.preco == null) {
    const excl = new Set([r.condominio, r.iptu].filter((x) => x != null));
    const cands = [...lower.matchAll(/r\$ ?([\d.]{4,}(?:,\d{2})?)/g)]
      .map((m) => numBR(m[1]))
      .filter((n) => n != null && n >= 1000 && n < 1e9 && !excl.has(n))
      .sort((a, b) => b - a);
    r.preco = cands[0] ?? null;
  }

  // --- área (frase > JSON-LD floorSize > heurística) ---
  const floor = ld.floorSize?.value ?? ld.floorSize;
  const areasTexto = [...lower.matchAll(/(\d{1,4}(?:[.,]\d+)?)\s*m[²2](?!\w)/g)]
    .map((m) => numBR(m[1]))
    .filter((n) => n != null && n >= 10 && n <= 100000);
  r.area_util = frases.area ?? numBR(floor) ?? (areasTexto.length ? Math.min(...areasTexto) : null);
  if (areasTexto.length) {
    const max = Math.max(...areasTexto);
    if (r.area_util != null && max > r.area_util) r.area_total = max;
  }

  // --- cômodos ---
  r.quartos = (ld.numberOfRooms ? parseInt(ld.numberOfRooms, 10) : null)
    ?? frases.quartos
    ?? intAfter(lower, /(\d+)\s*(?:quartos?|dormit[óo]rios?|dorm\b)/);
  r.suites = intAfter(lower, /(\d+)\s*su[íi]tes?/);
  r.banheiros = intAfter(lower, /(\d+)\s*banheiros?/);
  r.vagas = frases.vagas ?? intAfter(lower, /(\d+)\s*(?:vagas?|garagens?)/);

  // --- tipo ---
  r.tipo = TIPOS.find((tp) => lower.includes(tp)) || null;
  if (r.tipo) r.tipo = r.tipo[0].toUpperCase() + r.tipo.slice(1);

  // --- localização (JSON-LD > meta og não-padrão > breadcrumb > frase > rótulo) ---
  const addr = ld.address || ld.about?.address || {};
  r.bairro = addr.addressDistrict || addr.addressNeighborhood
    || meta(html, "og:neighborhood")
    || bairroDoBreadcrumb(lds)
    || frases.bairro
    || texto.match(/[Bb]airro:?\s*([A-ZÁÉÍÓÚ][A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+){0,3})/)?.[1]?.trim()
    || null;
  r.cidade = addr.addressLocality || meta(html, "og:locality") || null;
  r.endereco = addr.streetAddress || null;

  r.caracteristicas = CARACTERISTICAS.filter((c) => lower.includes(c));

  return r;
}

// Mescla correções manuais (overrides.json) por cima do que foi raspado.
export function aplicarOverride(imovel, overrides) {
  const o = overrides?.[imovel.url];
  return o ? { ...imovel, ...o } : imovel;
}

export { CAMPOS };
