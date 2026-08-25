import { TileType } from './types.js';

export const MAP_GRID_SIZE = 28; // Spacious 28x28 tactical arena (896x896 px)
export const TILE_SIZE = 32;     // 32px per tile
export const MAP_WIDTH = MAP_GRID_SIZE * TILE_SIZE;  // 896
export const MAP_HEIGHT = MAP_GRID_SIZE * TILE_SIZE; // 896

// Helper to create empty grid with indestructible steel borders
function createEmptyGrid(): TileType[][] {
  const grid: TileType[][] = Array(MAP_GRID_SIZE).fill(null).map(() => 
    Array(MAP_GRID_SIZE).fill('EMPTY')
  );

  // Outer border - 100% INDESTRUCTIBLE STEEL
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
// MAP 1: GRAND CITADEL (ป้อมปราการ 28x28 ทางวิ่งกว้าง 3-4 ช่อง)
// ══════════════════════════════════════════════════════════════════════════════
export function generateClassicCitadelMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Brick Fortresses (spacious corridors)
  const brickPatterns = [
    { r1: 3, r2: 8, c1: 5, c2: 6 },
    { r1: 3, r2: 8, c1: 21, c2: 22 },
    { r1: 19, r2: 24, c1: 5, c2: 6 },
    { r1: 19, r2: 24, c1: 21, c2: 22 },
    { r1: 6, r2: 7, c1: 10, c2: 17 },
    { r1: 20, r2: 21, c1: 10, c2: 17 },
    { r1: 11, r2: 16, c1: 9, c2: 9 },
    { r1: 11, r2: 16, c1: 18, c2: 18 }
  ];

  brickPatterns.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel Pillars (Indestructible Ricochet points)
  const steel = [
    [5, 13], [5, 14],
    [22, 13], [22, 14],
    [13, 5], [14, 5],
    [13, 22], [14, 22],
    [11, 11], [11, 16],
    [16, 11], [16, 16]
  ];
  steel.forEach(([r, c]) => { grid[r][c] = 'STEEL'; });

  // Bushes for ambush
  for (let r = 10; r <= 17; r++) {
    grid[r][3] = 'BUSH';
    grid[r][24] = 'BUSH';
  }

  // Center water pond
  for (let r = 13; r <= 14; r++) {
    for (let c = 13; c <= 14; c++) {
      grid[r][c] = 'WATER';
    }
  }

  // Ice sprint tracks
  for (let c = 11; c <= 16; c++) {
    grid[9][c] = 'ICE';
    grid[18][c] = 'ICE';
  }

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 2: JUNGLE OUTPOST (ป่าดงดิบซุ่มยิง 28x28)
// ══════════════════════════════════════════════════════════════════════════════
export function generateJungleOutpostMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Bush Clusters
  const bushAreas = [
    { r1: 4, r2: 8, c1: 8, c2: 11 },
    { r1: 4, r2: 8, c1: 16, c2: 19 },
    { r1: 19, r2: 23, c1: 8, c2: 11 },
    { r1: 19, r2: 23, c1: 16, c2: 19 },
    { r1: 11, r2: 16, c1: 11, c2: 16 }
  ];
  bushAreas.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BUSH';
      }
    }
  });

  // Brick barricades
  const bricks = [
    { r1: 5, r2: 6, c1: 3, c2: 6 },
    { r1: 5, r2: 6, c1: 21, c2: 24 },
    { r1: 21, r2: 22, c1: 3, c2: 6 },
    { r1: 21, r2: 22, c1: 21, c2: 24 },
    { r1: 12, r2: 15, c1: 6, c2: 7 },
    { r1: 12, r2: 15, c1: 20, c2: 21 }
  ];
  bricks.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel Pillars
  const steel = [
    [10, 10], [10, 17],
    [17, 10], [17, 17],
    [7, 13], [7, 14],
    [20, 13], [20, 14]
  ];
  steel.forEach(([r, c]) => { grid[r][c] = 'STEEL'; });

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 3: FROZEN RIVER (แม่น้ำน้ำแข็งข้ามแดน 28x28)
// ══════════════════════════════════════════════════════════════════════════════
export function generateFrozenRiverMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Vertical river with 3 bridge crossings
  for (let r = 1; r < MAP_GRID_SIZE - 1; r++) {
    // Leave 3 wide bridges
    const isBridge1 = r >= 5 && r <= 7;
    const isBridge2 = r >= 13 && r <= 15;
    const isBridge3 = r >= 20 && r <= 22;

    if (!isBridge1 && !isBridge2 && !isBridge3) {
      grid[r][13] = 'WATER';
      grid[r][14] = 'WATER';
    } else {
      grid[r][13] = 'ICE';
      grid[r][14] = 'ICE';
    }
  }

  // Steel bunkers near bridges
  const steel = [
    [4, 11], [8, 11], [4, 16], [8, 16],
    [12, 11], [16, 11], [12, 16], [16, 16],
    [19, 11], [23, 11], [19, 16], [23, 16]
  ];
  steel.forEach(([r, c]) => { grid[r][c] = 'STEEL'; });

  // Flanking brick cover
  for (let r = 4; r <= 9; r++) {
    grid[r][6] = 'BRICK';
    grid[r][21] = 'BRICK';
  }
  for (let r = 18; r <= 23; r++) {
    grid[r][6] = 'BRICK';
    grid[r][21] = 'BRICK';
  }

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAP 4: PROCEDURAL SYMMETRIC WARZONE (สมรภูมิสมมาตรโปร่งโล่ง 28x28)
// ══════════════════════════════════════════════════════════════════════════════
export function generateProceduralSymmetricMap(): TileType[][] {
  const grid = createEmptyGrid();
  const half = Math.floor(MAP_GRID_SIZE / 2);

  // Generate quadrant with lower density for spacious gameplay
  for (let r = 3; r < half; r += 2) {
    for (let c = 3; c < half; c += 2) {
      const rand = Math.random();
      let tile: TileType = 'EMPTY';

      if (rand < 0.20) {
        tile = 'BRICK';
      } else if (rand < 0.26) {
        tile = 'STEEL';
      } else if (rand < 0.35) {
        tile = 'BUSH';
      } else if (rand < 0.40) {
        tile = 'ICE';
      }

      // 4-Way Mirror for perfect competitive balance
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
// MAP 4: DESERT LABYRINTH (เขาวงกตทะเลทรายโปร่ง 28x28)
// ══════════════════════════════════════════════════════════════════════════════
export function generateDesertLabyrinthMap(): TileType[][] {
  const grid = createEmptyGrid();

  // Grid maze columns with wide 3-block paths
  for (let r = 3; r < MAP_GRID_SIZE - 3; r += 4) {
    for (let c = 3; c < MAP_GRID_SIZE - 3; c += 4) {
      grid[r][c] = 'STEEL';
      if (r + 1 < MAP_GRID_SIZE - 3) grid[r + 1][c] = 'BRICK';
      if (c + 1 < MAP_GRID_SIZE - 3) grid[r][c + 1] = 'BRICK';
    }
  }

  // Open center diamond
  for (let r = 11; r <= 16; r++) {
    for (let c = 11; c <= 16; c++) {
      grid[r][c] = 'EMPTY';
    }
  }

  grid[13][13] = 'BUSH'; grid[13][14] = 'BUSH';
  grid[14][13] = 'BUSH'; grid[14][14] = 'BUSH';

  clearSpawnZones(grid);
  return grid;
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER RANDOM MAP GENERATOR
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
