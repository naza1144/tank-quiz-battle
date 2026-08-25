import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  RoomConfig, 
  Player, 
  Tank, 
  Bullet, 
  QuizCrate, 
  TileType, 
  QuizQuestion, 
  LeaderboardEntry,
  GameEvent,
  Direction,
  TankArchetype,
  PlayerRole,
  TeamQuizVoteUpdate,
  TeamQuizFinalResult
} from './types.js';
import { soundFx } from './audio/soundFx.js';
import { AuthModal } from './components/AuthModal.js';
import { RoomSelectView } from './components/RoomSelectView.js';
import { LobbyView } from './components/LobbyView.js';
import { RetroCanvas, GameStateSnapshot } from './components/RetroCanvas.js';
import { QuizModal } from './components/QuizModal.js';
import { SquadSupportView } from './components/SquadSupportView.js';
import { GameOverModal } from './components/GameOverModal.js';
import { TouchControls } from './components/TouchControls.js';
import { TeacherPortalView } from './components/TeacherPortalView.js';
import { 
  PixelClock, 
  PixelMusic, 
  PixelSpeaker, 
  PixelStar, 
  PixelAmmo 
} from './components/PixelIcons.js';
import { 
  Zap, 
  Heart, 
  Shield, 
  Clock, 
  Volume2, 
  VolumeX, 
  ArrowLeft,
  Swords,
  Users
} from 'lucide-react';

const SOCKET_SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000' 
  : window.location.origin;

export const App: React.FC = () => {
  // Dedicated Teacher & Admin Route State (/admin, /teacher)
  const isTeacherOrAdminPath = () => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    const s = window.location.search.toLowerCase();
    return p.startsWith('/admin') || p.startsWith('/teacher') ||
           h.includes('/admin') || h.includes('/teacher') ||
           s.includes('route=admin') || s.includes('route=teacher');
  };

  const [isTeacherRoute, setIsTeacherRoute] = useState<boolean>(() => isTeacherOrAdminPath());

  useEffect(() => {
    const handlePopState = () => {
      setIsTeacherRoute(isTeacherOrAdminPath());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Auth state
  const [token, setToken] = useState<string | null>(() => {
    // Check URL fragment or query params or localStorage
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash || window.location.search);
    const urlToken = params.get('access_token') || params.get('token');
    if (urlToken) {
      localStorage.setItem('tank_auth_token', urlToken);
      window.history.replaceState(null, '', window.location.pathname);
      return urlToken;
    }
    return localStorage.getItem('tank_auth_token');
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('tank_user_name') || 'Tanker';
  });

  // Navigation / Game state
  const [view, setView] = useState<'AUTH' | 'ROOMS' | 'LOBBY' | 'GAME'>('AUTH');
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoomConfig, setCurrentRoomConfig] = useState<RoomConfig | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // In-Game state
  const [gameMap, setGameMap] = useState<TileType[][]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [crates, setCrates] = useState<QuizCrate[]>([]);
  const [roundTimer, setRoundTimer] = useState<number>(240);
  const [activeQuiz, setActiveQuiz] = useState<{
    tankId: string;
    crateId: string;
    question: QuizQuestion;
  } | null>(null);

  const [squadQuiz, setSquadQuiz] = useState<QuizQuestion | null>(null);
  const [squadQuizSession, setSquadQuizSession] = useState<{
    timeLimitSeconds: number;
    startTime: number;
    endTime: number;
  } | null>(null);
  const [squadVoteUpdate, setSquadVoteUpdate] = useState<TeamQuizVoteUpdate | null>(null);
  const [squadFinalResult, setSquadFinalResult] = useState<TeamQuizFinalResult | null>(null);

  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [gameOverData, setGameOverData] = useState<{
    winnerName?: string;
    leaderboard: LeaderboardEntry[];
  } | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(soundFx.getIsMuted());

  const [myTankHud, setMyTankHud] = useState<{ hp: number; maxHp: number; ammo: number }>({ hp: 3, maxHp: 3, ammo: 0 });
  const [hasTouch, setHasTouch] = useState<boolean>(false);

  useEffect(() => {
    const checkTouch = () => {
      const isTouch = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      setHasTouch(isTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Global Audio Unlock Listener (Browsers require user gesture to play Web Audio BGM)
  useEffect(() => {
    const unlockAudio = () => {
      soundFx.startBgm();
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const [teamTankState, setTeamTankState] = useState<Tank | null>(null);
  const playersRef = useRef<Player[]>([]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const socketRef = useRef<Socket | null>(null);
  const myPlayerIdRef = useRef<string>('');

  const gameStateRef = useRef<GameStateSnapshot>({
    map: [],
    tanks: [],
    bullets: [],
    crates: [],
    myTankId: ''
  });

  // 1. Initialize Socket Connection
  useEffect(() => {
    if (!token) {
      setView('AUTH');
      return;
    }

    const socket = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      myPlayerIdRef.current = socket.id || '';
      setView('ROOMS');
    });

    socket.on('room_list', (list: any[]) => {
      setRooms(list);
    });

    socket.on('room_state', (data: { config: RoomConfig; state: string; players: Player[] }) => {
      setCurrentRoomConfig(data.config);
      setPlayers(data.players);
      playersRef.current = data.players;
      if (data.state === 'LOBBY') {
        // Only set lobby if not actively playing or viewing game over
        setView((prev) => (prev === 'GAME' ? prev : 'LOBBY'));
      }
    });

    socket.on('game_start', (data: { mode: string; map: TileType[][]; initialState: any }) => {
      gameStateRef.current = {
        map: data.map || [],
        tanks: data.initialState.tanks || [],
        bullets: data.initialState.bullets || [],
        crates: data.initialState.crates || [],
        myTankId: socketRef.current?.id || ''
      };
      setTanks(data.initialState.tanks || []);
      const myT = data.initialState.tanks?.find((t: Tank) => t.id === socketRef.current?.id);
      if (myT) {
        setMyTankHud({ hp: myT.hp, maxHp: myT.maxHp, ammo: myT.ammo });
      }

      const myPlayer = playersRef.current.find(p => p.socketId === socketRef.current?.id || p.id === myPlayerIdRef.current);
      if (myPlayer?.teamId) {
        const teamT = data.initialState.tanks?.find((t: Tank) => t.teamId === myPlayer.teamId);
        if (teamT) setTeamTankState(teamT);
      }

      setRoundTimer(data.initialState.roundTimeRemaining || 240);
      setView('GAME');
      setGameOverData(null);
      soundFx.startBgm();
    });

    socket.on('game_tick', (snapshot: any) => {
      gameStateRef.current = {
        map: snapshot.map || gameStateRef.current.map,
        tanks: snapshot.tanks || [],
        bullets: snapshot.bullets || [],
        crates: snapshot.crates || [],
        myTankId: socketRef.current?.id || ''
      };

      const myT = snapshot.tanks?.find((t: Tank) => t.id === socketRef.current?.id);
      if (myT) {
        setMyTankHud((prev) => {
          if (prev.hp !== myT.hp || prev.ammo !== myT.ammo || prev.maxHp !== myT.maxHp) {
            return { hp: myT.hp, maxHp: myT.maxHp, ammo: myT.ammo };
          }
          return prev;
        });
      }

      // Synchronize Squad Team Tank in Real-Time for Support & Ghost players
      const myPlayer = playersRef.current.find(p => p.socketId === socketRef.current?.id || p.id === myPlayerIdRef.current);
      if (myPlayer?.teamId) {
        const teamT = snapshot.tanks?.find((t: Tank) => t.teamId === myPlayer.teamId);
        if (teamT) {
          setTeamTankState((prev) => {
            if (
              !prev ||
              prev.hp !== teamT.hp ||
              prev.ammo !== teamT.ammo ||
              prev.maxHp !== teamT.maxHp ||
              prev.score !== teamT.score ||
              prev.jammedUntil !== teamT.jammedUntil ||
              prev.shieldEndTime !== teamT.shieldEndTime ||
              (prev.shells?.length || 0) !== (teamT.shells?.length || 0)
            ) {
              return teamT;
            }
            return prev;
          });
        }
      }

      const newTimer = snapshot.roundTimeRemaining || 0;
      setRoundTimer((prev) => (prev !== newTimer ? newTimer : prev));

      // Adaptive Dynamic 8-Bit BGM Modulation (Normal -> Critical HP -> Panic Mode)
      const activeTank = myT || (myPlayer?.teamId ? snapshot.tanks?.find((t: Tank) => t.teamId === myPlayer.teamId) : null);
      const curHp = activeTank?.hp ?? 2;
      const maxHp = activeTank?.maxHp ?? 2;
      soundFx.updateGameStateAudio(curHp, maxHp, newTimer);
    });

    socket.on('quiz_popup', (data: { tankId: string; crateId: string; question: QuizQuestion }) => {
      setActiveQuiz(data);
    });

    socket.on('team_quiz_popup', (data: { teamId: string; question: QuizQuestion; timeLimitSeconds: number; startTime: number; endTime: number }) => {
      setSquadQuiz(data.question);
      setSquadQuizSession({
        timeLimitSeconds: data.timeLimitSeconds,
        startTime: data.startTime,
        endTime: data.endTime
      });
      setSquadVoteUpdate(null);
      setSquadFinalResult(null);
    });

    socket.on('team_quiz_vote_update', (data: TeamQuizVoteUpdate) => {
      setSquadVoteUpdate(data);
    });

    socket.on('team_quiz_final_result', (data: TeamQuizFinalResult) => {
      setSquadFinalResult(data);
      if (data.isCorrect) soundFx.playQuizCorrect();
      else soundFx.playQuizWrong();
    });

    socket.on('team_quiz_closed', () => {
      setSquadQuiz(null);
      setSquadQuizSession(null);
      setSquadVoteUpdate(null);
      setSquadFinalResult(null);
    });

    socket.on('tactical_ping', (ping: any) => {
      if (!gameStateRef.current.pings) gameStateRef.current.pings = [];
      gameStateRef.current.pings.push(ping);
      soundFx.playSelect();
    });

    socket.on('quiz_result', () => {
      setTimeout(() => setActiveQuiz(null), 1800);
    });

    socket.on('game_event', (event: GameEvent) => {
      setGameEvents((prev) => [event, ...prev].slice(0, 5));

      if (event.sound === 'SHOOT') soundFx.playShoot();
      else if (event.sound === 'TANK_HIT') soundFx.playHit(false);
      else if (event.sound === 'STEEL_HIT') soundFx.playHit(true);
      else if (event.sound === 'EXPLOSION') soundFx.playExplosion();
      else if (event.sound === 'NO_AMMO') soundFx.playNoAmmo();
      else if (event.sound === 'QUIZ_CORRECT') soundFx.playQuizCorrect();
      else if (event.sound === 'QUIZ_WRONG') soundFx.playQuizWrong();
    });

    socket.on('game_over', (data: { winnerName?: string; leaderboard: LeaderboardEntry[] }) => {
      setGameOverData(data);
      setActiveQuiz(null);
      setSquadQuiz(null);
      setSquadQuizSession(null);
      soundFx.stopBgm();
      soundFx.playVictory();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // 2. Keyboard Controls for Driving Tank
  useEffect(() => {
    if (view !== 'GAME') return;

    const myPlayer = players.find(p => p.socketId === socketRef.current?.id || p.id === myPlayerIdRef.current);
    if (myPlayer && myPlayer.role === 'SUPPORT' && currentRoomConfig?.mode === 'SQUAD') {
      return; // Supporters use Quiz console, not tank driving keys
    }

    let currentDir: Direction | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.repeat) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        currentDir = 'UP';
        socketRef.current?.emit('tank_input', { direction: 'UP', isMoving: true });
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        currentDir = 'DOWN';
        socketRef.current?.emit('tank_input', { direction: 'DOWN', isMoving: true });
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        currentDir = 'LEFT';
        socketRef.current?.emit('tank_input', { direction: 'LEFT', isMoving: true });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        currentDir = 'RIGHT';
        socketRef.current?.emit('tank_input', { direction: 'RIGHT', isMoving: true });
      } else if (e.key === ' ' || e.key === 'Enter') {
        socketRef.current?.emit('tank_shoot');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentDir === 'UP' ||
        (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && currentDir === 'DOWN' ||
        (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && currentDir === 'LEFT' ||
        (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && currentDir === 'RIGHT'
      ) {
        currentDir = null;
        socketRef.current?.emit('tank_input', { direction: null, isMoving: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [view, players, currentRoomConfig]);

  // Auth actions
  const handleLogin = (userToken: string, name: string) => {
    localStorage.setItem('tank_auth_token', userToken);
    localStorage.setItem('tank_user_name', name);
    setUserName(name);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('tank_auth_token');
    localStorage.removeItem('tank_user_name');
    setToken(null);
    setView('AUTH');
  };

  // Lobby actions
  const handleJoinRoom = (roomId: string) => {
    socketRef.current?.emit('join_room', { roomId });
    setView('LOBBY');
  };

  const handleCreateRoom = (config: Partial<RoomConfig>) => {
    fetch(`${SOCKET_SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(res => res.json())
      .then(data => {
        if (data.roomId) {
          handleJoinRoom(data.roomId);
        }
      });
  };

  const handleSelectTank = (archetype: TankArchetype, color: string, role: PlayerRole, teamId?: string) => {
    socketRef.current?.emit('select_tank', { archetype, color, role, teamId });
  };

  const handleSetReady = (isReady: boolean) => {
    socketRef.current?.emit('set_ready', isReady);
  };

  const handleStartGame = () => {
    socketRef.current?.emit('start_game');
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit('leave_room');
    setView('ROOMS');
  };

  // Quiz actions
  const handleAnswerQuiz = (selectedIndex: number, confident?: boolean) => {
    if (!activeQuiz) return;
    socketRef.current?.emit('answer_quiz', {
      tankId: activeQuiz.tankId,
      crateId: activeQuiz.crateId,
      questionId: activeQuiz.question.id,
      selectedIndex,
      confident
    });
  };

  const handleSquadAnswerQuiz = (questionId: string, selectedIndex: number, confident?: boolean) => {
    socketRef.current?.emit('team_support_answer', {
      questionId,
      selectedIndex,
      confident
    });
  };

  const handleSquadVote = (choiceIndex: number, confident?: boolean) => {
    socketRef.current?.emit('vote_team_quiz', { choiceIndex, confident });
  };

  const handleTacticalPing = (x: number, y: number) => {
    socketRef.current?.emit('tactical_ping', { x, y });
  };

  const handleAutoBalanceTeams = () => {
    socketRef.current?.emit('auto_balance_teams');
  };

  // Sound toggle
  const handleToggleSound = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  const myPlayer = players.find(p => socketRef.current?.id && p.socketId === socketRef.current.id);
  const isHost = myPlayer?.isHost || false;
  const isSquadSupport = (myPlayer?.role === 'SUPPORT' || myPlayer?.role === 'GHOST') && currentRoomConfig?.mode === 'SQUAD';
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(!soundFx.isBgmActive());

  const handleTankMove = React.useCallback((dir: Direction | null, isMoving: boolean) => {
    socketRef.current?.emit('tank_input', { direction: dir, isMoving });
  }, []);

  const handleTankShoot = React.useCallback(() => {
    socketRef.current?.emit('tank_shoot');
  }, []);

  const handleToggleBgm = () => {
    const active = soundFx.toggleBgm();
    setIsBgmMuted(!active);
  };

  // Format round timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // If navigating to /teacher: Render PIN-protected Teacher Portal
  if (isTeacherRoute) {
    return (
      <TeacherPortalView
        onBackToGame={() => {
          window.history.pushState(null, '', '/');
          window.location.hash = '';
          setIsTeacherRoute(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      
      {/* 1. Auth View */}
      {view === 'AUTH' && (
        <AuthModal onLogin={handleLogin} />
      )}

      {/* 2. Room Select View */}
      {view === 'ROOMS' && (
        <RoomSelectView
          rooms={rooms}
          userName={userName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLogout={handleLogout}
          onOpenTeacherRoute={() => {
            window.history.pushState(null, '', '/#teacher');
            setIsTeacherRoute(true);
          }}
        />
      )}

      {/* 3. Lobby View */}
      {view === 'LOBBY' && (
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
          <LobbyView
            roomConfig={currentRoomConfig}
            players={players}
            myPlayerId={socketRef.current?.id || ''}
            isHost={isHost}
            onSelectTank={handleSelectTank}
            onSetReady={handleSetReady}
            onAutoBalanceTeams={handleAutoBalanceTeams}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
      )}

      {/* 4. Active In-Game View */}
      {view === 'GAME' && (
        <div className="flex-1 flex flex-col p-1.5 sm:p-4 max-w-6xl mx-auto w-full font-thai">
          
          {/* Top 8-Bit Arcade HUD Bar */}
          <div className="pixel-box bg-[#121624] p-2 sm:p-3 mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundFx.playSelect();
                  handleLeaveRoom();
                }}
                className="p-1.5 sm:p-2 arcade-btn arcade-btn-slate text-xs"
                title="ออกจากการแข่งขัน"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div>
                <div className="font-arcade text-[8px] sm:text-[9px] text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <span>★</span> {currentRoomConfig?.name || 'TANK BATTLE'}
                </div>
                <div className="font-arcade text-[10px] sm:text-xs text-white">
                  1P: <span className="text-amber-300">{userName}</span>
                </div>
              </div>
            </div>

            {/* Middle Stats (HP & Ammo for Driver) */}
            {!isSquadSupport && myTankHud && (
              <div className="flex items-center gap-2 sm:gap-3 bg-black border-2 border-slate-700 px-2 sm:px-3 py-1 font-arcade text-[9px] sm:text-[10px]">
                <div className="flex items-center gap-1 text-rose-400 font-extrabold">
                  <span>HP:</span>
                  <span>{'■'.repeat(Math.max(0, myTankHud.hp))}{'□'.repeat(Math.max(0, myTankHud.maxHp - myTankHud.hp))}</span>
                </div>
                <div className="h-3 w-0.5 bg-slate-700" />
                <div className="flex items-center gap-1 font-extrabold text-amber-300">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  <span>AMMO: {myTankHud.ammo}</span>
                </div>
              </div>
            )}

            {/* Right: Round Timer & Audio Controls */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-black border-2 border-amber-500 text-amber-300 font-arcade text-[10px] sm:text-xs">
                <PixelClock size={10} color="#fbbf24" />
                <span>{formatTimer(roundTimer)}</span>
              </div>
              
              <button
                onClick={handleToggleBgm}
                className={`p-1.5 sm:p-2 arcade-btn ${isBgmMuted ? 'arcade-btn-slate' : 'arcade-btn-cyan'}`}
                title="เปิด/ปิดเพลงประกอบ BGM"
              >
                <PixelMusic size={14} color={isBgmMuted ? '#94a3b8' : '#000000'} />
              </button>

              <button
                onClick={handleToggleSound}
                className={`p-1.5 sm:p-2 arcade-btn ${isMuted ? 'arcade-btn-rose' : 'arcade-btn-emerald'}`}
                title="เปิด/ปิดเสียงเอฟเฟกต์ SFX"
              >
                <PixelSpeaker size={14} color={isMuted ? '#ffffff' : '#000000'} isMuted={isMuted} />
              </button>
            </div>

          </div>

          {/* Main Battlefield or Squad Console */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            
            {isSquadSupport ? (
              // Squad Support Console View
              <SquadSupportView
                teamId={myPlayer?.teamId || ''}
                myTeamId={myPlayer?.teamId || ''}
                teamTank={teamTankState || tanks.find(t => t.teamId === myPlayer?.teamId)}
                currentQuestion={squadQuiz}
                quizSession={squadQuizSession}
                voteUpdate={squadVoteUpdate}
                finalResult={squadFinalResult}
                isGhost={myPlayer?.role === 'GHOST'}
                onVote={handleSquadVote}
              />
            ) : (
              // 2D Battle City Canvas
              <div className="w-full flex flex-col items-center">
                <RetroCanvas stateRef={gameStateRef} />

                {/* Touch Controls (Tablets & Mobile) */}
                <div className={`w-full max-w-xl mt-1.5 ${hasTouch ? 'block' : 'lg:hidden'}`}>
                  <TouchControls
                    onMove={handleTankMove}
                    onShoot={handleTankShoot}
                  />
                </div>
              </div>
            )}

            {/* Live Combat Event Ticker */}
            <div className="fixed bottom-4 left-4 z-20 space-y-1 pointer-events-none max-w-xs hidden sm:block">
              {gameEvents.map((evt, idx) => (
                <div
                  key={evt.timestamp + idx}
                  className="px-2.5 py-1 pixel-box bg-black/90 text-[10px] font-arcade text-amber-300 shadow-md"
                >
                  {evt.message}
                </div>
              ))}
            </div>

          </div>

          {/* Solo Quiz Modal Popup */}
          {activeQuiz && (
            <QuizModal
              question={activeQuiz.question}
              tankId={activeQuiz.tankId}
              crateId={activeQuiz.crateId}
              onAnswer={handleAnswerQuiz}
              onClose={() => setActiveQuiz(null)}
            />
          )}

        </div>
      )}

      {/* Global Game Over Podium Modal */}
      {gameOverData && (
        <GameOverModal
          winnerName={gameOverData.winnerName}
          leaderboard={gameOverData.leaderboard}
          onPlayAgain={() => {
            soundFx.playStart();
            setView('LOBBY');
            setGameOverData(null);
          }}
        />
      )}

      {/* Retro Arcade Footer */}
      <footer className="py-2 text-center font-arcade text-[8px] text-slate-600 border-t-2 border-slate-900 bg-black/80">
        ★ TANK QUIZ BATTLE 1990 • STANDALONE RETRO ARCADE ★
      </footer>

    </div>
  );
};
