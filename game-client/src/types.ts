export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type TileType = 'EMPTY' | 'BRICK' | 'STEEL' | 'BUSH' | 'WATER' | 'ICE' | 'BASE';
export type TankArchetype = 'STANDARD' | 'SCOUT' | 'HEAVY' | 'SNIPER';
export type GameMode = 'FFA' | 'SQUAD';
export type PlayerRole = 'DRIVER' | 'SUPPORT' | 'GHOST';
export type RoomState = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'GAME_OVER';
export type SpecialAmmoKind = 'AP' | 'CRYO' | 'EXPLOSIVE' | 'RAPID' | 'HEAL';
export type AmmoKind = SpecialAmmoKind | 'STD' | 'DUD';

export interface ActiveSpecialAmmo {
  kind: SpecialAmmoKind;
  nameTh: string;
  expiresAt: number; // timestamp when it expires
  durationSeconds: number;
  shotsLeft: number;
  ownerName?: string;
}

export interface Shell {
  kind: AmmoKind;
  damage: number;
  ownerId?: string;
  ownerName?: string;
  questionId?: string;
}

export interface TacticalPing {
  id: string;
  teamId: string;
  x: number;
  y: number;
  senderName: string;
  timestamp: number;
}

export interface Tank {
  id: string;
  playerId: string;
  playerName: string;
  color: string;
  archetype: TankArchetype;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  isMoving: boolean;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  shells?: Shell[];
  specialAmmo?: ActiveSpecialAmmo | null;
  speed: number;
  bulletSpeed: number;
  bulletDamage: number;
  isDead: boolean;
  score: number;
  kills: number;
  deaths: number;
  correctAnswers: number;
  shieldEndTime: number;
  speedBoostEndTime: number;
  stunEndTime: number;
  jammedUntil?: number;
  teamId?: string;
  isBot?: boolean;
  synergyStreak?: number;
  isUltimateReady?: boolean;
  hasUsedRevival?: boolean;
}

export interface LaserBeamEffect {
  id: string;
  tankId: string;
  teamId?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  direction: Direction;
  width: number;
  color: string;
  createdAt: number;
  expiresAt: number;
}

export type AirdropSupplyType = 'SHIELD' | 'REPAIR' | 'AMMO';

export interface Bullet {
  id: string;
  tankId: string;
  teamId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  speed: number;
  radius: number;
  isDestroyed: boolean;
  shell?: Shell;
  specialKind?: SpecialAmmoKind;
  bouncesLeft?: number;
}

export interface QuizCrate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
  isActive: boolean;
  respawnTime: number;
  icon?: string;
  isGhostAirdrop?: boolean;
}

export interface QuizQuestion {
  id: string;
  category: 'MATH' | 'SCIENCE' | 'ENGLISH' | 'GENERAL' | 'LOGIC' | string;
  categoryTh: string;
  questionTh: string;
  questionEn?: string;
  options: string[];
  correctIndex: number;
  explanationTh: string;
  timeLimitSeconds: number;
  rewardAmmo: number;
  bonusPoints: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  subjectCode?: string;
}

export interface TeamQuizVoteUpdate {
  teamId: string;
  voteCounts: number[]; // [v0, v1, v2, v3]
  totalVotes: number;
  confidentVotes?: number;
}

export interface TeamQuizFinalResult {
  teamId: string;
  questionId: string;
  majorityChoice: number;
  correctIndex: number;
  voteCounts: number[];
  totalVotes: number;
  isCorrect: boolean;
  rewardAmmo: number;
  explanationTh: string;
  ammoKind?: AmmoKind;
  ownerName?: string;
  isJammed?: boolean;
  synergyStreak?: number;
  isUltimateReady?: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: PlayerRole;
  teamId: string;
  tankArchetype: TankArchetype;
  tankColor: string;
  isHost: boolean;
  isReady: boolean;
  tankId?: string;
  score?: number;
  kills?: number;
  correctAnswers?: number;
  hasUsedRevival?: boolean;
  ghostRevivalStreak?: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  mode: GameMode;
  maxTanks: number;
  roundTimeSeconds: number;
  isPrivate: boolean;
  selectedSubject?: string;
}

export interface GameEvent {
  type: 'TANK_HIT' | 'TANK_DESTROYED' | 'CRATE_PICKUP' | 'QUIZ_SUCCESS' | 'QUIZ_FAIL' | 'AMMO_DELIVERED' | 'VICTORY' | 'SHIELD_UP' | 'ULTIMATE_BEAM' | 'AIRDROP_SUPPLY' | 'GHOST_REVIVAL';
  message: string;
  sound?: string;
  tankId?: string;
  teamId?: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  name: string;
  kills: number;
  score: number;
  correctAnswers: number;
  isDead: boolean;
}
