const SVG_PATTERN_CATALOG = [
  { family: "vegetation", familyLabel: "Vegetation", value: "grass-tuft", label: "Grass tuft" },
  { family: "vegetation", familyLabel: "Vegetation", value: "fern", label: "Fern" },
  { family: "vegetation", familyLabel: "Vegetation", value: "small-bush", label: "Small bush" },
  { family: "vegetation", familyLabel: "Vegetation", value: "heath", label: "Heath" },
  { family: "trees", familyLabel: "Trees", value: "round-canopy", label: "Broadleaf · filled" },
  { family: "trees", familyLabel: "Trees", value: "broadleaf-outline", label: "Broadleaf · outline" },
  { family: "trees", familyLabel: "Trees", value: "conifer", label: "Conifer · filled" },
  { family: "trees", familyLabel: "Trees", value: "conifer-outline", label: "Conifer · outline" },
  { family: "trees", familyLabel: "Trees", value: "palm", label: "Palm" },
  { family: "trees", familyLabel: "Trees", value: "forest-mixed", label: "Mixed forest" },
  { family: "agriculture", familyLabel: "Agriculture", value: "orchard", label: "Orchard" },
  { family: "agriculture", familyLabel: "Agriculture", value: "vineyard", label: "Vineyard" },
  { family: "agriculture", familyLabel: "Agriculture", value: "grapes", label: "Grapes" },
  { family: "agriculture", familyLabel: "Agriculture", value: "crop-rows", label: "Crop rows" },
  { family: "agriculture", familyLabel: "Agriculture", value: "pasture", label: "Pasture" },
  { family: "water", familyLabel: "Water", value: "droplet", label: "Droplet" },
  { family: "water", familyLabel: "Water", value: "wave-lines", label: "Wave lines" },
  { family: "water", familyLabel: "Water", value: "reeds", label: "Reeds" },
  { family: "water", familyLabel: "Water", value: "snow-ice", label: "Snow / ice" },
  { family: "water", familyLabel: "Water", value: "fish", label: "Fish" },
  { family: "terrain", familyLabel: "Terrain", value: "sand", label: "Sand" },
  { family: "terrain", familyLabel: "Terrain", value: "gravel", label: "Gravel" },
  { family: "terrain", familyLabel: "Terrain", value: "rocks", label: "Rocks" },
  { family: "terrain", familyLabel: "Terrain", value: "scree", label: "Scree" },
  { family: "land-use", familyLabel: "Land use", value: "cemetery", label: "Cemetery" },
  { family: "land-use", familyLabel: "Land use", value: "camping", label: "Camping" },
  { family: "land-use", familyLabel: "Land use", value: "industrial", label: "Industrial" },
  { family: "land-use", familyLabel: "Land use", value: "house", label: "Residential" },
  { family: "shapes", familyLabel: "Shapes", value: "triangle", label: "Triangle" },
  { family: "shapes", familyLabel: "Shapes", value: "hexagon", label: "Hexagon" },
  { family: "shapes", familyLabel: "Shapes", value: "confetti", label: "Confetti" },
  { family: "shapes", familyLabel: "Shapes", value: "circle", label: "Circle" },
  { family: "shapes", familyLabel: "Shapes", value: "diamond", label: "Diamond" },
  { family: "shapes", familyLabel: "Shapes", value: "star", label: "Star" },
  { family: "custom", familyLabel: "Custom", value: "custom", label: "Custom SVG" },
];

// Bundled sample SVGs (kept in sync by hand with ./patterns/*.svg and
// ./icons/*.svg). They are inlined so the demo works from file:// with zero
// server: browsers block fetch() of local files, but a checked-in string
// constant has no such restriction).
const SVG_PATTERN_SAMPLES = {
  // Vegetation
  "grass-tuft": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="4" stroke-linecap="round">
      <path d="M32 57 C30 40 31 23 32 8" />
      <path d="M31 57 C24 43 17 35 8 30" />
      <path d="M33 57 C40 43 47 35 56 30" />
    </g>
  </svg>`,
  "fern": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round">
      <path d="M32 58 L32 10" />
      <path d="M32 46 L20 38" />
      <path d="M32 46 L44 38" />
      <path d="M32 36 L21 29" />
      <path d="M32 36 L43 29" />
      <path d="M32 26 L22 20" />
      <path d="M32 26 L42 20" />
      <path d="M32 16 L24 11" />
      <path d="M32 16 L40 11" />
    </g>
  </svg>`,
  "small-bush": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <circle cx="32" cy="30" r="10" />
      <circle cx="18" cy="40" r="12" />
      <circle cx="46" cy="40" r="12" />
      <circle cx="32" cy="44" r="14" />
    </g>
  </svg>`,
  "heath": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round">
      <path d="M32 56 C31 43 31 29 32 13" />
      <path d="M31 46 L18 34 M32 39 L45 27 M32 31 L22 21 M32 24 L41 15" />
    </g>
    <g fill="#2c6a5b">
      <circle cx="16" cy="32" r="4" /><circle cx="21" cy="20" r="4" />
      <circle cx="46" cy="26" r="4" /><circle cx="42" cy="14" r="4" />
      <circle cx="32" cy="11" r="4" />
    </g>
  </svg>`,
  // Trees
  "round-canopy": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="29" y="40" width="6" height="20" fill="#2c6a5b" />
    <circle cx="32" cy="26" r="18" fill="#2c6a5b" />
    <circle cx="20" cy="34" r="12" fill="#2c6a5b" />
    <circle cx="44" cy="34" r="12" fill="#2c6a5b" />
  </svg>`,
  "broadleaf-outline": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 58 V39" />
      <path d="M32 44 L22 34 M32 40 L42 30" />
      <path d="M32 7 C42 6 49 14 48 23 C56 28 54 39 46 42 C41 48 34 47 32 43 C27 49 17 47 15 40 C7 35 10 24 17 21 C17 12 25 6 32 7 Z" />
    </g>
  </svg>`,
  "conifer": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="29" y="48" width="6" height="12" fill="#2c6a5b" />
    <path d="M32 6 L46 28 L40 28 L49 42 L42 42 L51 54 H13 L22 42 H15 L24 28 H18 Z" fill="#2c6a5b" />
  </svg>`,
  "conifer-outline": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 6 L46 28 H40 L49 42 H42 L51 54 H13 L22 42 H15 L24 28 H18 Z" />
      <path d="M32 54 V60" />
    </g>
  </svg>`,
  "palm": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M31 60 C29 44 30 34 34 24" stroke="#2c6a5b" stroke-width="4" stroke-linecap="round" fill="none" />
    <g fill="none" stroke="#2c6a5b" stroke-width="4" stroke-linecap="round">
      <path d="M34 22 C24 16 14 16 8 22" />
      <path d="M34 22 C26 10 18 6 10 6" />
      <path d="M34 22 C34 12 32 6 30 2" />
      <path d="M34 22 C42 10 50 6 58 6" />
      <path d="M34 22 C44 16 54 16 60 22" />
    </g>
  </svg>`,
  "forest-mixed": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <path d="M18 13 C26 11 32 18 31 26 C37 30 34 39 28 41 C23 46 13 45 10 39 C3 34 7 25 12 23 C11 18 14 14 18 13 Z" />
      <rect x="16" y="39" width="5" height="17" />
      <path d="M45 7 L56 27 H51 L59 41 H52 L60 53 H31 L38 41 H32 L40 27 H35 Z" />
      <rect x="43" y="50" width="5" height="9" />
    </g>
  </svg>`,
  // Water
  "reeds": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round">
      <path d="M16 48 V13 M32 48 V8 M48 48 V16" />
      <path d="M7 54 C15 49 23 59 31 54 C39 49 47 59 57 53" />
    </g>
    <g fill="#2c6a5b">
      <rect x="12" y="5" width="8" height="14" rx="4" />
      <rect x="28" y="0" width="8" height="14" rx="4" />
      <rect x="44" y="8" width="8" height="14" rx="4" />
    </g>
  </svg>`,
  "wave-lines": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round">
      <path d="M4 22 C12 16 20 28 28 22 C36 16 44 28 52 22 C56 20 58 20 60 21" />
      <path d="M4 34 C12 28 20 40 28 34 C36 28 44 40 52 34 C56 32 58 32 60 33" />
      <path d="M4 46 C12 40 20 52 28 46 C36 40 44 52 52 46 C56 44 58 44 60 45" />
    </g>
  </svg>`,
  "droplet": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 6 C40 22 48 32 48 42 A16 16 0 1 1 16 42 C16 32 24 22 32 6 Z" fill="#2c6a5b" />
  </svg>`,
  "fish": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 32 C18 18 39 17 50 30 C54 25 58 22 61 21 C60 28 60 36 61 43 C57 42 53 39 50 35 C38 48 18 46 8 32 Z" />
    </g>
  </svg>`,
  // Agriculture
  "orchard": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 11 C40 8 47 14 48 21 C56 25 56 36 49 40 C50 49 41 55 33 51 C25 56 16 50 16 41 C8 36 10 25 17 21 C18 13 26 9 32 11 Z" fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linejoin="round" />
    <circle cx="32" cy="32" r="3.5" fill="#2c6a5b" />
  </svg>`,
  "vineyard": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="2.5" stroke-linecap="round">
      <path d="M13 58 V6 M30 58 V6 M47 58 V6" />
      <path d="M13 17 L7 12 M13 27 L19 22 M13 40 L7 35 M13 50 L19 45 M30 17 L24 12 M30 27 L36 22 M30 40 L24 35 M30 50 L36 45 M47 17 L41 12 M47 27 L53 22 M47 40 L41 35 M47 50 L53 45" />
    </g>
  </svg>`,
  "crop-rows": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="2.5" stroke-linecap="round">
      <path d="M14 58 V6 M32 58 V6 M50 58 V6" />
    </g>
    <g fill="#2c6a5b">
      <circle cx="14" cy="16" r="3" /><circle cx="14" cy="32" r="3" /><circle cx="14" cy="48" r="3" />
      <circle cx="32" cy="16" r="3" /><circle cx="32" cy="32" r="3" /><circle cx="32" cy="48" r="3" />
      <circle cx="50" cy="16" r="3" /><circle cx="50" cy="32" r="3" /><circle cx="50" cy="48" r="3" />
    </g>
  </svg>`,
  "pasture": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3.5" stroke-linecap="round">
      <path d="M14 48 C14 40 14 33 15 26" />
      <path d="M13 48 C9 41 7 35 5 29" />
      <path d="M15 48 C19 42 22 36 25 31" />
      <path d="M49 48 C49 40 49 33 50 26" />
      <path d="M48 48 C44 41 42 35 40 29" />
      <path d="M50 48 C54 42 57 36 60 31" />
    </g>
  </svg>`,
  "grapes": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <circle cx="26" cy="31" r="7" /><circle cx="40" cy="31" r="7" />
      <circle cx="20" cy="44" r="7" /><circle cx="33" cy="44" r="7" /><circle cx="46" cy="44" r="7" />
      <circle cx="33" cy="57" r="7" />
    </g>
    <path d="M33 24 C32 17 30 12 25 9" fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round" />
  </svg>`,
  // Terrain
  "sand": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <circle cx="14" cy="18" r="2.5" /><circle cx="38" cy="12" r="2.5" />
      <circle cx="52" cy="34" r="2.5" /><circle cx="24" cy="42" r="2.5" />
      <circle cx="42" cy="55" r="2.5" />
    </g>
  </svg>`,
  "gravel": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <path d="M10 12 L19 9 L24 16 L20 23 L11 21 L7 16 Z" />
      <path d="M38 8 L47 11 L49 19 L42 23 L35 18 Z" />
      <path d="M23 31 L34 28 L40 36 L36 46 L25 47 L19 39 Z" />
      <path d="M46 43 L56 40 L60 48 L55 57 L46 55 L42 49 Z" />
      <path d="M7 45 L15 43 L19 50 L14 57 L6 54 Z" />
    </g>
  </svg>`,
  "rocks": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linejoin="round">
      <path d="M6 28 L14 13 L28 10 L35 22 L29 35 L13 37 Z" />
      <path d="M36 40 L44 25 L57 28 L61 43 L53 55 L39 52 Z" />
      <path d="M14 13 L19 24 L29 35 M44 25 L48 40 L61 43" />
    </g>
  </svg>`,
  "scree": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <path d="M12 10 L20 13 L17 20 L9 18 Z" /><path d="M35 7 L43 11 L39 18 L31 14 Z" />
      <path d="M49 21 L57 25 L53 32 L45 29 Z" /><path d="M20 28 L28 31 L24 39 L16 36 Z" />
      <path d="M37 37 L46 40 L42 48 L33 45 Z" /><path d="M14 47 L22 51 L18 58 L10 55 Z" />
      <path d="M50 49 L58 52 L54 59 L46 56 Z" />
    </g>
  </svg>`,
  "snow-ice": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round">
      <path d="M32 6 V58 M9 19 L55 45 M9 45 L55 19" />
      <path d="M32 14 L25 9 M32 14 L39 9 M32 50 L25 55 M32 50 L39 55" />
      <path d="M16 23 L15 15 M16 23 L8 25 M48 41 L49 49 M48 41 L56 39" />
      <path d="M16 41 L8 39 M16 41 L15 49 M48 23 L49 15 M48 23 L56 25" />
    </g>
  </svg>`,
  // Land use
  "cemetery": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 10 V54 M18 25 H46" fill="none" stroke="#2c6a5b" stroke-width="4" stroke-linecap="round" />
  </svg>`,
  "camping": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 52 L31 12 L57 52 Z M31 12 L31 52" />
    </g>
  </svg>`,
  "industrial": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 55 V30 L22 39 V27 L38 38 V21 L56 31 V55 Z" />
      <path d="M46 26 V8 H54 V30" />
    </g>
  </svg>`,
  "house": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="none" stroke="#2c6a5b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 31 L32 10 L57 31" />
      <path d="M13 27 V55 H51 V27" />
      <path d="M27 55 V39 H38 V55" />
    </g>
  </svg>`,
  // Shapes
  "triangle": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 8 L57 54 H7 Z" fill="#2c6a5b" />
  </svg>`,
  "hexagon": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 6 L54 19 L54 45 L32 58 L10 45 L10 19 Z" fill="#2c6a5b" />
  </svg>`,
  "confetti": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <g fill="#2c6a5b">
      <rect x="28" y="8" width="8" height="8" />
      <circle cx="16" cy="40" r="5" />
      <circle cx="48" cy="42" r="6" />
      <rect x="40" y="14" width="6" height="6" transform="rotate(20 43 17)" />
    </g>
  </svg>`,
  "circle": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="23" fill="#2c6a5b" />
  </svg>`,
  "diamond": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 6 L58 32 L32 58 L6 32 Z" fill="#2c6a5b" />
  </svg>`,
  "star": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M32 6 L39 23 L58 24 L43 36 L48 55 L32 45 L16 55 L21 36 L6 24 L25 23 Z" fill="#2c6a5b" />
  </svg>`,
};
const SVG_PATTERN_METRICS = {
  "broadleaf-outline": { opticalScale: 0.86, minReadableSize: 12 },
  "camping": { opticalScale: 0.83, minReadableSize: 12 },
  "cemetery": { opticalScale: 0.75, minReadableSize: 8 },
  "circle": { opticalScale: 0.82, minReadableSize: 9 },
  "confetti": { opticalScale: 0.67, minReadableSize: 8 },
  "conifer": { opticalScale: 0.84, minReadableSize: 12 },
  "conifer-outline": { opticalScale: 0.86, minReadableSize: 12 },
  "crop-rows": { opticalScale: 0.85, minReadableSize: 10 },
  "diamond": { opticalScale: 0.84, minReadableSize: 9 },
  "droplet": { opticalScale: 0.81, minReadableSize: 8 },
  "fern": { opticalScale: 0.8, minReadableSize: 12 },
  "fish": { opticalScale: 0.88, minReadableSize: 11 },
  "forest-mixed": { opticalScale: 0.9, minReadableSize: 12 },
  "grapes": { opticalScale: 0.95, minReadableSize: 14 },
  "grass-tuft": { opticalScale: 0.83, minReadableSize: 10 },
  "gravel": { opticalScale: 0.84, minReadableSize: 8 },
  "hexagon": { opticalScale: 0.87, minReadableSize: 8 },
  "heath": { opticalScale: 0.82, minReadableSize: 10 },
  "house": { opticalScale: 0.86, minReadableSize: 11 },
  "industrial": { opticalScale: 0.9, minReadableSize: 12 },
  "orchard": { opticalScale: 0.73, minReadableSize: 10 },
  "palm": { opticalScale: 0.97, minReadableSize: 14 },
  "pasture": { opticalScale: 0.81, minReadableSize: 8 },
  "reeds": { opticalScale: 0.89, minReadableSize: 10 },
  "rocks": { opticalScale: 0.91, minReadableSize: 10 },
  "round-canopy": { opticalScale: 0.81, minReadableSize: 10 },
  "sand": { opticalScale: 0.75, minReadableSize: 7 },
  "scree": { opticalScale: 0.81, minReadableSize: 8 },
  "small-bush": { opticalScale: 0.82, minReadableSize: 10 },
  "snow-ice": { opticalScale: 0.84, minReadableSize: 10 },
  "star": { opticalScale: 0.88, minReadableSize: 10 },
  "triangle": { opticalScale: 0.84, minReadableSize: 9 },
  "vineyard": { opticalScale: 0.85, minReadableSize: 12 },
  "wave-lines": { opticalScale: 0.92, minReadableSize: 8 },
};
