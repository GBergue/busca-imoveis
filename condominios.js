// Características por condomínio. Curado à mão a partir dos anúncios coletados.
// Cada amenidade: true = tem, false = não tem, null = não sei (anúncio não diz).
// `match`: trechos (minúsculos) procurados em título+descrição+endereço+url do
// imóvel; o primeiro condomínio da lista que casar vence, então deixe os nomes
// mais específicos no topo (ex.: "tulipas ii" antes de "residencial tulipas").
window.CONDOMINIOS = [
  {
    nome: "Residencial Tulipas II",
    bairro: "Jardim Celiamar",
    match: ["tulipas ii", "luiz saska"],
    elevador: true, portaria: null, piscina: true, churrasqueira: true,
    playground: null, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Sacada, área de serviço, aceita pet.",
  },
  {
    nome: "Residencial Parque das Tulipas",
    bairro: "Jardim das Magnólias",
    match: ["parque das tulipas"],
    elevador: null, portaria: null, piscina: true, churrasqueira: true,
    playground: true, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Dois quiosques com churrasqueira, bicicletário, sacada.",
  },
  {
    nome: "Residencial Tulipas",
    bairro: "Jardim Magnólias",
    match: ["residencial tulipas"],
    elevador: true, portaria: null, piscina: null, churrasqueira: null,
    playground: null, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Varanda, acesso por elevador.",
  },
  {
    nome: "Edifício Regência",
    bairro: "Centro",
    match: ["regência", "regencia"],
    elevador: null, portaria: null, piscina: false, churrasqueira: null,
    playground: false, academia: false, salao_festas: null, salao_jogos: null, quadra: false,
    obs: "Prédio central compacto, sem área de lazer informada.",
  },
  {
    nome: "Villagio Harmonia",
    bairro: "Vila Harmonia",
    match: ["villagio harmonia", "villaggio harmonia", "caetano nigro"],
    elevador: true, portaria: true, piscina: true, churrasqueira: true,
    playground: true, academia: true, salao_festas: true, salao_jogos: true, quadra: true,
    obs: "Brinquedoteca, coworking, pet place, lavanderia, mini mercado 24h, bicicletário.",
  },
  {
    nome: "Residencial Parque das Violetas",
    bairro: "Jardim Gardênias",
    match: ["parque das violetas", "das violetas"],
    elevador: null, portaria: null, piscina: null, churrasqueira: null,
    playground: null, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Anúncio cita \"área de lazer completa\" sem detalhar. Varanda.",
  },
  {
    nome: "Vistas do Botânico Cedros",
    bairro: "Residencial Cambuy",
    match: ["vistas do botânico", "vistas do botanico", "botânico cedros", "botanico cedros"],
    elevador: true, portaria: null, piscina: true, churrasqueira: true,
    playground: true, academia: true, salao_festas: true, salao_jogos: true, quadra: null,
    obs: "Complexo aquático, SPA, sauna, coworking, lavanderia compartilhada, mercado 24h. Empreendimento Vitta Residencial.",
  },
  {
    nome: "Parque dos Jequitibás",
    bairro: "Jardim Botânico",
    match: ["jequitibás", "jequitibas"],
    elevador: true, portaria: null, piscina: null, churrasqueira: null,
    playground: null, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Prédio alto (15º andar); \"lazer completo\" não detalhado no anúncio. Sacada.",
  },
  {
    nome: "Edifício Parque do Sol",
    bairro: "Parque Residencial Vale do Sol",
    match: ["parque do sol"],
    elevador: true, portaria: null, piscina: null, churrasqueira: null,
    playground: true, academia: null, salao_festas: null, salao_jogos: null, quadra: null,
    obs: "Bicicletário, mercadinho.",
  },
  {
    nome: "Residencial Antares",
    bairro: "Jardim Botânico",
    match: ["antares"],
    elevador: false, portaria: true, piscina: true, churrasqueira: true,
    playground: true, academia: false, salao_festas: true, salao_jogos: null, quadra: false,
    obs: "Espaço gourmet, bicicletário, condomínio fechado.",
  },
];
