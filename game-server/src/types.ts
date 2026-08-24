export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type TileType = 'EMPTY' | 'BRICK' | 'STEEL' | 'BUSH' | 'WATER' | 'ICE' | 'BASE';

export type TankArchetype = 'STANDARD' | 'SCOUT' | 'HEAVY' | 'SNIPER';

export interface TankArchetypeConfig {
  name: string;
  nameTh: string;
  hp: number;
  speed: number; // pixels per second
  bulletSpeed: number;
  bulletDamage: number;
  maxAmmo: number;
  descriptionTh: string;
}

export const ARCHETYPE_CONFIGS: Record<TankArchetype, TankArchetypeConfig> = {
  STANDARD: {
    name: 'Standard',
    nameTh: 'รถถังมาตรฐาน',
    hp: 2,
    speed: 130,
    bulletSpeed: 280,
    bulletDamage: 1,
    maxAmmo: 6,
    descriptionTh: 'สมดุลทั้งความเร็วและพลังชีวิต'
  },
  SCOUT: {
    name: 'Scout Speed',
    nameTh: 'รถถังสายความเร็ว',
    hp: 1,
    speed: 180,
    bulletSpeed: 320,
    bulletDamage: 1,
    maxAmmo: 8,
    descriptionTh: 'เคลื่อนที่ไว หลบหลีกง่าย แต่เกราะบาง'
  },
  HEAVY: {
    name: 'Heavy Panzer',
    nameTh: 'รถถังเกราะหนัก',
    hp: 4,
    speed: 95,
    bulletSpeed: 250,
    bulletDamage: 2,
    maxAmmo: 5,
    descriptionTh: 'เกราะหนา ทนทาน ยิงรุนแรง แต่เคลื่อนที่ช้า'
  },
  SNIPER: {
    name: 'Long Sniper',
    nameTh: 'รถถังสไนเปอร์',
    hp: 1,
    speed: 120,
    bulletSpeed: 420,
    bulletDamage: 2,
    maxAmmo: 4,
    descriptionTh: 'กระสุนความเร็วสูง ยิงได้ไกลและแม่นยำ'
  }
};

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
  teamId?: string;
  isBot?: boolean;
  botDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  lastShootTime: number;
  answeringQuizId?: string;
}

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
}

export interface QuizQuestion {
  id: string;
  category: 'MATH' | 'SCIENCE' | 'ENGLISH' | 'GENERAL' | 'LOGIC';
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
}

export interface TeamQuizVoteUpdate {
  teamId: string;
  voteCounts: number[]; // [v0, v1, v2, v3]
  totalVotes: number;
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
}

export type GameMode = 'FFA' | 'SQUAD';
export type PlayerRole = 'DRIVER' | 'SUPPORT';
export type RoomState = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'GAME_OVER';

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
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  driverPlayerId?: string;
  supportPlayerIds: string[];
  tankId?: string;
  totalScore: number;
  quizStreak: number;
  isAlive: boolean;
}

export interface GameEvent {
  type: 'TANK_HIT' | 'TANK_DESTROYED' | 'CRATE_PICKUP' | 'QUIZ_SUCCESS' | 'QUIZ_FAIL' | 'AMMO_DELIVERED' | 'VICTORY' | 'SHIELD_UP';
  message: string;
  sound?: string;
  tankId?: string;
  teamId?: string;
  timestamp: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  mode: GameMode;
  maxTanks: number; // 4 to 6
  roundTimeSeconds: number;
  isPrivate: boolean;
  password?: string;
  mapTemplate?: string;
}
