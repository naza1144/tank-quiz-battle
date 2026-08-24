import { TileType } from './types.js';

export const MAP_GRID_SIZE = 28; // Expanded to 28x28 grid!
export const TILE_SIZE = 32;     // 32px per tile => 896x896 battlefield
export const MAP_WIDTH = MAP_GRID_SIZE * TILE_SIZE;  // 896
export const MAP_HEIGHT = MAP_GRID_SIZE * TILE_SIZE; // 896

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
// MAP 1: CLASSIC CITADEL (ป้อมปราการคลาสสิก)
// ══════════════════════════════════════════════════════════════════════════════
export function generateClassicCitadelMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Brick Patterns
  const brickPatterns = [
    { r1: 3, r2: 9, c1: 4, c2: 5 },
    { r1: 3, r2: 9, c1: 22, c2: 23 },
    { r1: 18, r2: 24, c1: 4, c2: 5 },
    { r1: 18, r2: 24, c1: 22, c2: 23 },
    { r1: 7, r2: 8, c1: 8, c2: 19 },
    { r1: 19, r2: 20, c1: 8, c2: 19 },
    { r1: 11, r2: 16, c1: 9, c2: 10 },
    { r1: 11, r2: 16, c1: 17, c2: 18 }
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
    [5, 13], [5, 14],
    [22, 13], [22, 14],
    [13, 5], [14, 5],
    [13, 22], [14, 22],
    [13, 13], [14, 14]
  ];
  steel.forEach(([r, c]) => { grid[r][c] = 'STEEL'; });

  // Bushes for stealth
  for (let r = 11; r <= 16; r++) {
    grid[r][2] = 'BUSH';
    grid[r][3] = 'BUSH';
    grid[r][24] = 'BUSH';
    grid[r][25] = 'BUSH';
  }

  // Water moat in middle
  for (let c = 12; c <= 15; c++) {
    grid[13][c] = 'WATER';
    grid[14][c] = 'WATER';
  }

  // Ice paths
  grid[9][13] = 'ICE'; grid[9][14] = 'ICE';
  grid[18][13] = 'ICE'; grid[18][14] = 'ICE';

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 2: JUNGLE OUTPOST (ป่าดงดิบซุ่มยิง)
// ══════════════════════════════════════════════════════════════════════════════
export function generateJungleOutpostMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Large Bush Clusters
  const bushAreas = [
    { r1: 4, r2: 8, c1: 7, c2: 11 },
    { r1: 4, r2: 8, c1: 16, c2: 20 },
    { r1: 19, r2: 23, c1: 7, c2: 11 },
    { r1: 19, r2: 23, c1: 16, c2: 20 },
    { r1: 11, r2: 16, c1: 12, c2: 15 }
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
    { r1: 3, r2: 10, c1: 4, c2: 5 },
    { r1: 3, r2: 10, c1: 22, c2: 23 },
    { r1: 17, r2: 24, c1: 4, c2: 5 },
    { r1: 17, r2: 24, c1: 22, c2: 23 },
    { r1: 10, r2: 11, c1: 8, c2: 19 },
    { r1: 16, r2: 17, c1: 8, c2: 19 }
  ];
  brickWalls.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel bunkers
  [[6, 6], [6, 21], [21, 6], [21, 21], [13, 8], [14, 19]].forEach(([r, c]) => {
    grid[r][c] = 'STEEL';
  });

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 3: FROZEN RIVER CROSSING (สมรภูมิแม่น้ำน้ำแข็ง)
// ══════════════════════════════════════════════════════════════════════════════
export function generateFrozenRiverMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Dual horizontal river channels
  for (let c = 3; c < MAP_GRID_SIZE - 3; c++) {
    grid[10][c] = 'WATER';
    grid[17][c] = 'WATER';
  }

  // Ice bridges across the rivers
  const bridges = [6, 7, 13, 14, 20, 21];
  bridges.forEach(c => {
    grid[10][c] = 'ICE';
    grid[17][c] = 'ICE';
    grid[11][c] = 'ICE';
    grid[16][c] = 'ICE';
  });

  // Central fortress on the island between the two rivers
  for (let c = 9; c <= 18; c++) {
    grid[13][c] = 'BRICK';
    grid[14][c] = 'BRICK';
  }
  grid[13][13] = 'STEEL'; grid[13][14] = 'STEEL';
  grid[14][13] = 'STEEL'; grid[14][14] = 'STEEL';

  // Corner brick networks
  [
    { r1: 3, r2: 7, c1: 4, c2: 8 },
    { r1: 3, r2: 7, c1: 19, c2: 23 },
    { r1: 20, r2: 24, c1: 4, c2: 8 },
    { r1: 20, r2: 24, c1: 19, c2: 23 }
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
// MAP 4: DESERT LABYRINTH (เขาวงกตทะเลทราย)
// ══════════════════════════════════════════════════════════════════════════════
export function generateDesertLabyrinthMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Grid maze corridors
  for (let r = 3; r < MAP_GRID_SIZE - 3; r += 3) {
    for (let c = 3; c < MAP_GRID_SIZE - 3; c += 3) {
      grid[r][c] = 'STEEL';
      grid[r + 1][c] = 'BRICK';
      grid[r][c + 1] = 'BRICK';
    }
  }

  // Cross center arena
  for (let r = 11; r <= 16; r++) {
    for (let c = 11; c <= 16; c++) {
      grid[r][c] = 'EMPTY';
    }
  }

  // Center treasure island surrounded by bushes
  grid[13][13] = 'BUSH'; grid[13][14] = 'BUSH';
  grid[14][13] = 'BUSH'; grid[14][14] = 'BUSH';

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 5: PROCEDURAL SYMMETRIC WARZONE (สมรภูมิสุ่มเชิงกลยุทธ์)
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
      } else if (rand < 0.27) {
        tile = 'STEEL';
      } else if (rand < 0.35) {
        tile = 'BUSH';
      } else if (rand < 0.40) {
        tile = 'ICE';
      } else if (rand < 0.44 && r > 4 && c > 4) {
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

// 6 spawn positions spaced across the 28x28 arena for 4-6 players
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
  { x: 7 * TILE_SIZE, y: 5 * TILE_SIZE, category: 'MATH' },
  { x: 20 * TILE_SIZE, y: 5 * TILE_SIZE, category: 'SCIENCE' },
  { x: 7 * TILE_SIZE, y: 22 * TILE_SIZE, category: 'ENGLISH' },
  { x: 20 * TILE_SIZE, y: 22 * TILE_SIZE, category: 'LOGIC' },
  { x: 14 * TILE_SIZE, y: 10 * TILE_SIZE, category: 'GENERAL' },
  { x: 14 * TILE_SIZE, y: 17 * TILE_SIZE, category: 'MATH' },
  { x: 3 * TILE_SIZE, y: 14 * TILE_SIZE, category: 'SCIENCE' },
  { x: 24 * TILE_SIZE, y: 14 * TILE_SIZE, category: 'LOGIC' }
];
