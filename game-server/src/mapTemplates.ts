import { TileType } from './types.js';

export const MAP_GRID_SIZE = 24; // 24x24 grid
export const TILE_SIZE = 32;     // 32px per tile => 768x768 battlefield
export const MAP_WIDTH = MAP_GRID_SIZE * TILE_SIZE;  // 768
export const MAP_HEIGHT = MAP_GRID_SIZE * TILE_SIZE; // 768

// Template 1: Classic Battle City with central fortress, brick mazes, bushes, water
export function generateClassicMap(): TileType[][] {
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

  // Symmetric Brick & Steel structures
  const brickPatterns = [
    // Column bricks
    { r1: 3, r2: 8, c1: 3, c2: 4 },
    { r1: 3, r2: 8, c1: 19, c2: 20 },
    { r1: 15, r2: 20, c1: 3, c2: 4 },
    { r1: 15, r2: 20, c1: 19, c2: 20 },

    // Middle horizontal bricks
    { r1: 6, r2: 7, c1: 7, c2: 16 },
    { r1: 16, r2: 17, c1: 7, c2: 16 },

    // Inner columns
    { r1: 9, r2: 14, c1: 8, c2: 9 },
    { r1: 9, r2: 14, c1: 14, c2: 15 },
  ];

  brickPatterns.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BRICK';
      }
    }
  });

  // Steel blocks for tactical cover
  const steelBlocks = [
    [5, 11], [5, 12],
    [18, 11], [18, 12],
    [11, 4], [12, 4],
    [11, 19], [12, 19]
  ];
  steelBlocks.forEach(([r, c]) => {
    grid[r][c] = 'STEEL';
  });

  // Bushes for stealth camouflage
  const bushes = [
    { r1: 9, r2: 14, c1: 2, c2: 3 },
    { r1: 9, r2: 14, c1: 20, c2: 21 },
    { r1: 2, r2: 3, c1: 9, c2: 14 },
    { r1: 20, r2: 21, c1: 9, c2: 14 }
  ];
  bushes.forEach(({ r1, r2, c1, c2 }) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        grid[r][c] = 'BUSH';
      }
    }
  });

  // Central Water canal (crossable by bullets only)
  for (let c = 10; c <= 13; c++) {
    grid[11][c] = 'WATER';
    grid[12][c] = 'WATER';
  }

  // Ice paths
  grid[8][11] = 'ICE';
  grid[8][12] = 'ICE';
  grid[15][11] = 'ICE';
  grid[15][12] = 'ICE';

  return grid;
}

// 6 spawn positions spaced across the arena for 4-6 players
export const TANK_SPAWN_POINTS = [
  { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE, direction: 'DOWN' as const },
  { x: (MAP_GRID_SIZE - 3) * TILE_SIZE, y: 2 * TILE_SIZE, direction: 'DOWN' as const },
  { x: 2 * TILE_SIZE, y: (MAP_GRID_SIZE - 3) * TILE_SIZE, direction: 'UP' as const },
  { x: (MAP_GRID_SIZE - 3) * TILE_SIZE, y: (MAP_GRID_SIZE - 3) * TILE_SIZE, direction: 'UP' as const },
  { x: Math.floor(MAP_GRID_SIZE / 2 - 1) * TILE_SIZE, y: 2 * TILE_SIZE, direction: 'DOWN' as const },
  { x: Math.floor(MAP_GRID_SIZE / 2 - 1) * TILE_SIZE, y: (MAP_GRID_SIZE - 3) * TILE_SIZE, direction: 'UP' as const }
];

// Locations where Quiz Crates can spawn
export const CRATE_SPAWN_LOCATIONS = [
  { x: 6 * TILE_SIZE, y: 4 * TILE_SIZE, category: 'MATH' },
  { x: 17 * TILE_SIZE, y: 4 * TILE_SIZE, category: 'SCIENCE' },
  { x: 6 * TILE_SIZE, y: 19 * TILE_SIZE, category: 'ENGLISH' },
  { x: 17 * TILE_SIZE, y: 19 * TILE_SIZE, category: 'LOGIC' },
  { x: 11 * TILE_SIZE, y: 9 * TILE_SIZE, category: 'GENERAL' },
  { x: 12 * TILE_SIZE, y: 14 * TILE_SIZE, category: 'MATH' },
  { x: 2 * TILE_SIZE, y: 11 * TILE_SIZE, category: 'SCIENCE' },
  { x: 21 * TILE_SIZE, y: 11 * TILE_SIZE, category: 'LOGIC' }
];
