export const continents = [
  { id: 'north_america', name: 'North America', bonus: 5, color: '#60a5fa', labelX: 235, labelY: 42, shape: 'M35,92 C90,52 190,45 270,62 L420,45 L478,120 L455,220 L405,268 L390,372 L315,430 L225,395 L138,405 L65,330 L88,235 L42,175 Z' },
  { id: 'south_america', name: 'South America', bonus: 2, color: '#34d399', labelX: 430, labelY: 450, shape: 'M340,410 L470,398 L575,474 L550,590 L480,735 L405,682 L382,570 L325,490 Z' },
  { id: 'europe', name: 'Europe', bonus: 5, color: '#a78bfa', labelX: 650, labelY: 55, shape: 'M505,88 L635,52 L805,83 L842,175 L805,275 L835,355 L710,397 L585,365 L535,292 L555,205 L492,152 Z' },
  { id: 'africa', name: 'Africa', bonus: 3, color: '#f59e0b', labelX: 690, labelY: 405, shape: 'M565,385 L735,352 L850,420 L888,520 L827,690 L700,738 L615,650 L570,535 L530,455 Z' },
  { id: 'asia', name: 'Asia', bonus: 7, color: '#f87171', labelX: 1035, labelY: 42, shape: 'M790,82 L955,45 L1150,55 L1280,105 L1260,235 L1300,330 L1210,430 L1125,468 L1060,540 L930,520 L850,445 L805,350 L825,245 L770,165 Z' },
  { id: 'australia', name: 'Australia', bonus: 2, color: '#22d3ee', labelX: 1135, labelY: 560, shape: 'M1010,545 L1115,520 L1218,545 L1285,625 L1260,725 L1130,742 L1040,700 L985,625 Z' },
];

export const territories = [
  { id: 'alaska', name: 'Alaska', continent: 'north_america', x: 78, y: 150 },
  { id: 'northwest_territory', name: 'NW Territory', continent: 'north_america', x: 205, y: 105 },
  { id: 'greenland', name: 'Greenland', continent: 'north_america', x: 405, y: 98 },
  { id: 'alberta', name: 'Alberta', continent: 'north_america', x: 190, y: 220 },
  { id: 'ontario', name: 'Ontario', continent: 'north_america', x: 300, y: 190 },
  { id: 'quebec', name: 'Quebec', continent: 'north_america', x: 415, y: 205 },
  { id: 'western_us', name: 'Western US', continent: 'north_america', x: 205, y: 315 },
  { id: 'eastern_us', name: 'Eastern US', continent: 'north_america', x: 355, y: 310 },
  { id: 'central_america', name: 'Central America', continent: 'north_america', x: 300, y: 405 },

  { id: 'venezuela', name: 'Venezuela', continent: 'south_america', x: 382, y: 485 },
  { id: 'peru', name: 'Peru', continent: 'south_america', x: 385, y: 585 },
  { id: 'brazil', name: 'Brazil', continent: 'south_america', x: 510, y: 545 },
  { id: 'argentina', name: 'Argentina', continent: 'south_america', x: 445, y: 690 },

  { id: 'iceland', name: 'Iceland', continent: 'europe', x: 535, y: 115 },
  { id: 'great_britain', name: 'Great Britain', continent: 'europe', x: 560, y: 225 },
  { id: 'scandinavia', name: 'Scandinavia', continent: 'europe', x: 660, y: 130 },
  { id: 'northern_europe', name: 'N. Europe', continent: 'europe', x: 680, y: 235 },
  { id: 'western_europe', name: 'W. Europe', continent: 'europe', x: 585, y: 330 },
  { id: 'southern_europe', name: 'S. Europe', continent: 'europe', x: 720, y: 340 },
  { id: 'ukraine', name: 'Ukraine', continent: 'europe', x: 795, y: 210 },

  { id: 'north_africa', name: 'N. Africa', continent: 'africa', x: 625, y: 455 },
  { id: 'egypt', name: 'Egypt', continent: 'africa', x: 750, y: 430 },
  { id: 'east_africa', name: 'E. Africa', continent: 'africa', x: 805, y: 535 },
  { id: 'congo', name: 'Congo', continent: 'africa', x: 685, y: 565 },
  { id: 'south_africa', name: 'S. Africa', continent: 'africa', x: 720, y: 680 },
  { id: 'madagascar', name: 'Madagascar', continent: 'africa', x: 855, y: 660 },

  { id: 'ural', name: 'Ural', continent: 'asia', x: 900, y: 175 },
  { id: 'siberia', name: 'Siberia', continent: 'asia', x: 1000, y: 105 },
  { id: 'yakutsk', name: 'Yakutsk', continent: 'asia', x: 1115, y: 92 },
  { id: 'kamchatka', name: 'Kamchatka', continent: 'asia', x: 1240, y: 145 },
  { id: 'irkutsk', name: 'Irkutsk', continent: 'asia', x: 1090, y: 205 },
  { id: 'mongolia', name: 'Mongolia', continent: 'asia', x: 1095, y: 305 },
  { id: 'japan', name: 'Japan', continent: 'asia', x: 1245, y: 330 },
  { id: 'afghanistan', name: 'Afghanistan', continent: 'asia', x: 880, y: 315 },
  { id: 'china', name: 'China', continent: 'asia', x: 1010, y: 385 },
  { id: 'middle_east', name: 'Middle East', continent: 'asia', x: 835, y: 405 },
  { id: 'india', name: 'India', continent: 'asia', x: 930, y: 490 },
  { id: 'siam', name: 'Siam', continent: 'asia', x: 1055, y: 495 },

  { id: 'indonesia', name: 'Indonesia', continent: 'australia', x: 1025, y: 600 },
  { id: 'new_guinea', name: 'New Guinea', continent: 'australia', x: 1175, y: 580 },
  { id: 'western_australia', name: 'W. Australia', continent: 'australia', x: 1080, y: 700 },
  { id: 'eastern_australia', name: 'E. Australia', continent: 'australia', x: 1230, y: 690 },
];

export const adjacency = {
  alaska: ['northwest_territory', 'alberta', 'kamchatka'],
  northwest_territory: ['alaska', 'alberta', 'ontario', 'greenland'],
  greenland: ['northwest_territory', 'ontario', 'quebec', 'iceland'],
  alberta: ['alaska', 'northwest_territory', 'ontario', 'western_us'],
  ontario: ['northwest_territory', 'greenland', 'quebec', 'eastern_us', 'western_us', 'alberta'],
  quebec: ['greenland', 'ontario', 'eastern_us'],
  western_us: ['alberta', 'ontario', 'eastern_us', 'central_america'],
  eastern_us: ['ontario', 'quebec', 'western_us', 'central_america'],
  central_america: ['western_us', 'eastern_us', 'venezuela'],
  venezuela: ['central_america', 'peru', 'brazil'],
  peru: ['venezuela', 'brazil', 'argentina'],
  brazil: ['venezuela', 'peru', 'argentina', 'north_africa'],
  argentina: ['peru', 'brazil'],
  iceland: ['greenland', 'scandinavia', 'great_britain'],
  great_britain: ['iceland', 'scandinavia', 'northern_europe', 'western_europe'],
  scandinavia: ['iceland', 'great_britain', 'northern_europe', 'ukraine'],
  northern_europe: ['great_britain', 'scandinavia', 'ukraine', 'southern_europe', 'western_europe'],
  western_europe: ['great_britain', 'northern_europe', 'southern_europe', 'north_africa'],
  southern_europe: ['western_europe', 'northern_europe', 'ukraine', 'middle_east', 'egypt', 'north_africa'],
  ukraine: ['scandinavia', 'northern_europe', 'southern_europe', 'middle_east', 'afghanistan', 'ural'],
  north_africa: ['brazil', 'western_europe', 'southern_europe', 'egypt', 'east_africa', 'congo'],
  egypt: ['southern_europe', 'middle_east', 'east_africa', 'north_africa'],
  east_africa: ['egypt', 'middle_east', 'madagascar', 'south_africa', 'congo', 'north_africa'],
  congo: ['north_africa', 'east_africa', 'south_africa'],
  south_africa: ['congo', 'east_africa', 'madagascar'],
  madagascar: ['east_africa', 'south_africa'],
  ural: ['ukraine', 'afghanistan', 'china', 'siberia'],
  siberia: ['ural', 'china', 'mongolia', 'irkutsk', 'yakutsk'],
  yakutsk: ['siberia', 'irkutsk', 'kamchatka'],
  kamchatka: ['alaska', 'yakutsk', 'irkutsk', 'mongolia', 'japan'],
  irkutsk: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'],
  mongolia: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'],
  japan: ['kamchatka', 'mongolia'],
  afghanistan: ['ukraine', 'ural', 'china', 'india', 'middle_east'],
  china: ['ural', 'siberia', 'mongolia', 'siam', 'india', 'afghanistan'],
  middle_east: ['southern_europe', 'ukraine', 'afghanistan', 'india', 'east_africa', 'egypt'],
  india: ['middle_east', 'afghanistan', 'china', 'siam'],
  siam: ['india', 'china', 'indonesia'],
  indonesia: ['siam', 'new_guinea', 'western_australia'],
  new_guinea: ['indonesia', 'western_australia', 'eastern_australia'],
  western_australia: ['indonesia', 'new_guinea', 'eastern_australia'],
  eastern_australia: ['new_guinea', 'western_australia'],
};

export const bridges = new Set([
  'alaska:kamchatka',
  'brazil:north_africa',
  'greenland:iceland',
  'egypt:southern_europe',
  'east_africa:middle_east',
  'indonesia:siam',
]);

export function territoryById(id) {
  return territories.find((territory) => territory.id === id);
}

export function continentById(id) {
  return continents.find((continent) => continent.id === id);
}

export function edgeKey(a, b) {
  return [a, b].sort().join(':');
}

export function validateAdjacency() {
  const errors = [];
  for (const [id, neighbors] of Object.entries(adjacency)) {
    for (const neighbor of neighbors) {
      if (!adjacency[neighbor]?.includes(id)) {
        errors.push(`${id} -> ${neighbor} is not reciprocal`);
      }
    }
  }
  return errors;
}
