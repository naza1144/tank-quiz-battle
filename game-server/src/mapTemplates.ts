import { TileType } from './types.js';

export const MAP_GRID_SIZE = 20; // Compact, fast-paced 20x20 arena!
export const TILE_SIZE = 32;     // 32px per tile => 640x640 battlefield
export const MAP_WIDTH = MAP_GRID_SIZE * TILE_SIZE;  // 640
export const MAP_HEIGHT = MAP_GRID_SIZE * TILE_SIZE; // 640

// Helper to create empty grid with steel borders
function createEmptyGrid(): TileType[][] {
  const grid: TileType[][] = Array(MAP_GRID_SIZE).fill(null).map(() => 
    Array(MAP_GRID_SIZE).fill('EMPTY')
  );

  // Outer border
  for (let r = 0; r < MAP_GRID_SIZE; r++) {
    for (let c = 0; c < MAP_GRID_SIZE; c++) {
      if (r === 0 || r === MAP_GRID_SIZE - 1 || c === 0 || c === MAP_GRID_SIZE - 1) {
        grid[r][c] = 'STEEL';
      }
    }
  }
  return grid;
}

// Clear 3x3 zones around all 6 spawn positions
function clearSpawnZones(grid: TileType[][]) {
  const spawns = [
    { r: 2, c: 2 },
    { r: 2, c: MAP_GRID_SIZE - 3 },
    { r: MAP_GRID_SIZE - 3, c: 2 },
    { r: MAP_GRID_SIZE - 3, c: MAP_GRID_SIZE - 3 },
    { r: Math.floor(MAP_GRID_SIZE / 2), c: 2 },
    { r: Math.floor(MAP_GRID_SIZE / 2), c: MAP_GRID_SIZE - 3 }
  ];

  spawns.forEach(({ r, c }) => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < MAP_GRID_SIZE - 1 && nc > 0 && nc < MAP_GRID_SIZE - 1) {
          grid[nr][nc] = 'EMPTY';
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 1: CLASSIC CITADEL (ป้อมปราการคลาสสิก 20x20)
// ══════════════════════════════════════════════════════════════════════════════
export function generateClassicCitadelMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Brick Patterns
  const brickPatterns = [
    { r1: 2, r2: 6, c1: 4, c2: 5 },
    { r1: 2, r2: 6, c1: 14, c2: 15 },
    { r1: 13, r2: 17, c1: 4, c2: 5 },
    { r1: 13, r2: 17, c1: 14, c2: 15 },
    { r1: 5, r2: 6, c1: 7, c2: 12 },
    { r1: 13, r2: 14, c1: 7, c2: 12 },
    { r1: 8, r2: 11, c1: 7, c2: 7 },
    { r1: 8, r2: 11, c1: 12, c2: 12 }
  ];

  brickPatterns.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel Pillars
  const steel = [
    [4, 9], [4, 10],
    [15, 9], [15, 10],
    [9, 4], [10, 4],
    [9, 15], [10, 15],
    [9, 9], [10, 10]
  ];
  steel.forEach(([r, c]) => { grid[r][c] = 'STEEL'; });

  // Bushes for stealth
  for (let r = 8; r <= 11; r++) {
    grid[r][2] = 'BUSH';
    grid[r][17] = 'BUSH';
  }

  // Center water pond
  grid[9][9] = 'WATER'; grid[9][10] = 'WATER';
  grid[10][9] = 'WATER'; grid[10][10] = 'WATER';

  // Ice paths
  grid[7][9] = 'ICE'; grid[7][10] = 'ICE';
  grid[12][9] = 'ICE'; grid[12][10] = 'ICE';

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 2: JUNGLE OUTPOST (ป่าดงดิบซุ่มยิง 20x20)
// ══════════════════════════════════════════════════════════════════════════════
export function generateJungleOutpostMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Bush Clusters
  const bushAreas = [
    { r1: 3, r2: 6, c1: 6, c2: 8 },
    { r1: 3, r2: 6, c1: 11, c2: 13 },
    { r1: 13, r2: 16, c1: 6, c2: 8 },
    { r1: 13, r2: 16, c1: 11, c2: 13 },
    { r1: 8, r2: 11, c1: 8, c2: 11 }
  ];
  bushAreas.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BUSH';
      }
    }
  });

  // Brick maze walls
  const brickWalls = [
    { r1: 2, r2: 7, c1: 4, c2: 4 },
    { r1: 2, r2: 7, c1: 15, c2: 15 },
    { r1: 12, r2: 17, c1: 4, c2: 4 },
    { r1: 12, r2: 17, c1: 15, c2: 15 },
    { r1: 7, r2: 8, c1: 6, c2: 13 },
    { r1: 11, r2: 12, c1: 6, c2: 13 }
  ];
  brickWalls.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel bunkers
  [[4, 4], [4, 15], [15, 4], [15, 15], [9, 6], [10, 13]].forEach(([r, c]) => {
    grid[r][c] = 'STEEL';
  });

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 3: FROZEN RIVER CROSSING (สมรภูมิแม่น้ำน้ำแข็ง 20x20)
// ══════════════════════════════════════════════════════════════════════════════
export function generateFrozenRiverMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Dual horizontal river channels
  for (let c = 2; c < MAP_GRID_SIZE - 2; c++) {
    grid[7][c] = 'WATER';
    grid[12][c] = 'WATER';
  }

  // Ice bridges across the rivers
  const bridges = [4, 5, 9, 10, 14, 15];
  bridges.forEach(c => {
    grid[7][c] = 'ICE';
    grid[12][c] = 'ICE';
    grid[8][c] = 'ICE';
    grid[11][c] = 'ICE';
  });

  // Central island base
  for (let c = 7; c <= 12; c++) {
    grid[9][c] = 'BRICK';
    grid[10][c] = 'BRICK';
  }
  grid[9][9] = 'STEEL'; grid[9][10] = 'STEEL';
  grid[10][9] = 'STEEL'; grid[10][10] = 'STEEL';

  // Corner brick networks
  [
    { r1: 2, r2: 5, c1: 4, c2: 6 },
    { r1: 2, r2: 5, c1: 13, c2: 15 },
    { r1: 14, r2: 17, c1: 4, c2: 6 },
    { r1: 14, r2: 17, c1: 13, c2: 15 }
  ].forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      grid[r][c1] = 'BRICK';
      grid[r][c2] = 'BRICK';
    }
  });

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 4: DESERT LABYRINTH (เขาวงกตทะเลทราย 20x20)
// ══════════════════════════════════════════════════════════════════════════════
export function generateDesertLabyrinthMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Grid maze columns
  for (let r = 2; r < MAP_GRID_SIZE - 2; r += 3) {
    for (let c = 2; c < MAP_GRID_SIZE - 2; c += 3) {
      grid[r][c] = 'STEEL';
      if (r + 1 < MAP_GRID_SIZE - 2) grid[r + 1][c] = 'BRICK';
      if (c + 1 < MAP_GRID_SIZE - 2) grid[r][c + 1] = 'BRICK';
    }
  }

  // Open center diamond
  for (let r = 8; r <= 11; r++) {
    for (let c = 8; c <= 11; c++) {
      grid[r][c] = 'EMPTY';
    }
  }

  grid[9][9] = 'BUSH'; grid[9][10] = 'BUSH';
  grid[10][9] = 'BUSH'; grid[10][10] = 'BUSH';

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 5: PROCEDURAL SYMMETRIC WARZONE (สมรภูมิสุ่มเชิงกลยุทธ์ 20x20)
// ══════════════════════════════════════════════════════════════════════════════
export function generateProceduralSymmetricMap(): TileType[][] {
  const grid = createEmptyGrid();
  const half = Math.floor(MAP_GRID_SIZE / 2);

  // Randomly generate quadrant and 4-way mirror it for competitive balance
  for (let r = 2; r < half; r++) {
    for (let c = 2; c < half; c++) {
      const rand = Math.random();
      let tile: TileType = 'EMPTY';

      if (rand < 0.22) {
        tile = 'BRICK';
      } else if (rand < 0.28) {
        tile = 'STEEL';
      } else if (rand < 0.36) {
        tile = 'BUSH';
      } else if (rand < 0.42) {
        tile = 'ICE';
      } else if (rand < 0.46 && r > 3 && c > 3) {
        tile = 'WATER';
      }

      // 4-Way Mirror
      grid[r][c] = tile;
      grid[r][MAP_GRID_SIZE - 1 - c] = tile;
      grid[MAP_GRID_SIZE - 1 - r][c] = tile;
      grid[MAP_GRID_SIZE - 1 - r][MAP_GRID_SIZE - 1 - c] = tile;
    }
  }

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER RANDOM MAP GENERATOR (สุ่มแมพทุกรอบการเล่น)
// ══════════════════════════════════════════════════════════════════════════════
export function generateClassicMap(): TileType[][] {
  const mapGenerators = [
    generateClassicCitadelMap,
    generateJungleOutpostMap,
    generateFrozenRiverMap,
    generateDesertLabyrinthMap,
    generateProceduralSymmetricMap
  ];

  const chosenGenerator = mapGenerators[Math.floor(Math.random() * mapGenerators.length)];
  return chosenGenerator();
}

// 6 spawn positions spaced across the 20x20 arena for 4-6 players
export const TANK_SPAWN_POINTS = [
  { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE, direction: 'DOWN' as const },
  { x: (MAP_GRID_SIZE - 3) * TILE_SIZE, y: 2 * TILE_SIZE, direction: 'DOWN' as const },
  { x: 2 * TILE_SIZE, y: (MAP_GRID_SIZE - 3) * TILE_SIZE, direction: 'UP' as const },
  { x: (MAP_GRID_SIZE - 3) * TILE_SIZE, y: (MAP_GRID_SIZE - 3) * TILE_SIZE, direction: 'UP' as const },
  { x: 2 * TILE_SIZE, y: Math.floor(MAP_GRID_SIZE / 2) * TILE_SIZE, direction: 'RIGHT' as const },
  { x: (MAP_GRID_SIZE - 3) * TILE_SIZE, y: Math.floor(MAP_GRID_SIZE / 2) * TILE_SIZE, direction: 'LEFT' as const }
];

// Locations where Quiz Crates can spawn
export const CRATE_SPAWN_LOCATIONS = [
  { x: 5 * TILE_SIZE, y: 4 * TILE_SIZE, category: 'MATH' },
  { x: 14 * TILE_SIZE, y: 4 * TILE_SIZE, category: 'SCIENCE' },
  { x: 5 * TILE_SIZE, y: 15 * TILE_SIZE, category: 'ENGLISH' },
  { x: 14 * TILE_SIZE, y: 15 * TILE_SIZE, category: 'LOGIC' },
  { x: 10 * TILE_SIZE, y: 7 * TILE_SIZE, category: 'GENERAL' },
  { x: 10 * TILE_SIZE, y: 12 * TILE_SIZE, category: 'MATH' },
  { x: 3 * TILE_SIZE, y: 10 * TILE_SIZE, category: 'SCIENCE' },
  { x: 16 * TILE_SIZE, y: 10 * TILE_SIZE, category: 'LOGIC' }
];
