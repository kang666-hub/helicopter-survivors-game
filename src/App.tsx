import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Shield, 
  Target, 
  Cpu, 
  Flame, 
  Zap, 
  Skull, 
  Clock, 
  RotateCcw, 
  Play, 
  VolumeX, 
  Volume2, 
  AlertTriangle,
  Award,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, Player, Enemy, Bullet, FireTrail, BatteryItem, Particle, UpgradeOption, WeaponState, VehicleType, PassiveState } from './types';

const pixelCache: {
  hellfire: HTMLCanvasElement | null;
  drone: HTMLCanvasElement | null;
} = {
  hellfire: null,
  drone: null,
};

function initPixelRenderCache() {
  if (typeof document === 'undefined') return;

  // Hellfire Cache (24 x 12)
  const hc = document.createElement('canvas');
  hc.width = 24;
  hc.height = 12;
  const hctx = hc.getContext('2d');
  if (hctx) {
    hctx.fillStyle = '#1e293b'; 
    hctx.fillRect(4, 3, 12, 6);
    hctx.fillStyle = '#475569'; 
    hctx.fillRect(4, 3, 12, 2);
    hctx.fillStyle = '#991b1b'; 
    hctx.fillRect(16, 4, 6, 4);
    hctx.fillStyle = '#f87171'; 
    hctx.fillRect(22, 5, 2, 2);
    hctx.fillStyle = '#64748b'; 
    hctx.fillRect(2, 2, 4, 2);
    hctx.fillRect(2, 8, 4, 2);
    hctx.fillStyle = '#0f172a'; 
    hctx.fillRect(2, 4, 2, 4);
  }
  pixelCache.hellfire = hc;

  // Drone Cache (16 x 16)
  const dc = document.createElement('canvas');
  dc.width = 16;
  dc.height = 16;
  const dctx = dc.getContext('2d');
  if (dctx) {
    dctx.fillStyle = '#111827';
    dctx.fillRect(6, 6, 4, 4);
    dctx.fillStyle = '#374151';
    dctx.beginPath(); dctx.moveTo(6, 6); dctx.lineTo(2, 2); dctx.lineTo(4, 2); dctx.lineTo(8, 6); dctx.fill();
    dctx.beginPath(); dctx.moveTo(10, 6); dctx.lineTo(14, 2); dctx.lineTo(12, 2); dctx.lineTo(8, 6); dctx.fill();
    dctx.beginPath(); dctx.moveTo(6, 10); dctx.lineTo(2, 14); dctx.lineTo(4, 14); dctx.lineTo(8, 10); dctx.fill();
    dctx.beginPath(); dctx.moveTo(10, 10); dctx.lineTo(14, 14); dctx.lineTo(12, 14); dctx.lineTo(8, 10); dctx.fill();
    dctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
    dctx.beginPath(); dctx.arc(3, 3, 3, 0, Math.PI * 2); dctx.fill();
    dctx.beginPath(); dctx.arc(13, 3, 3, 0, Math.PI * 2); dctx.fill();
    dctx.beginPath(); dctx.arc(3, 13, 3, 0, Math.PI * 2); dctx.fill();
    dctx.beginPath(); dctx.arc(13, 13, 3, 0, Math.PI * 2); dctx.fill();
  }
  pixelCache.drone = dc;
}
initPixelRenderCache();

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'survive_3min',
    title: '🏆 無盡生存大師',
    description: '成功在直升機槍林彈雨中生存滿 3 分鐘！',
    icon: '⏳'
  },
  {
    id: 'kill_500',
    title: '💀 空中點陣霸主',
    description: '累計擊殺 500 架敵方無人機，制霸點陣天空！',
    icon: '🔥'
  }
];

export interface VehicleConfig {
  name: string;
  displayName: string;
  description: string;
  talent: string;
  speed: number;
  armor: number;
  maxHp: number;
  initialWeapon: 'machine_gun' | 'homing_missile';
}

export const VEHICLE_PRESETS: Record<VehicleType, VehicleConfig> = {
  AH64: {
    name: 'AH-64 COPTEL',
    displayName: 'AH-64 COPTEL (阿帕契武裝直升機)',
    description: '防禦型重裝空甲。自帶額外血量與防禦屏障抵抗傷害。',
    talent: '最大生命值（HP）高出 30%，且自帶 20% 減傷固定護甲。',
    speed: 60,
    armor: 80,
    maxHp: 130,
    initialWeapon: 'machine_gun'
  },
  F22: {
    name: 'F-22 RAPTOR',
    displayName: 'F-22 RAPTOR (猛禽戰鬥機)',
    description: '速度型超音速戰機。具備極限閃避推進器與量子隱形光罩。',
    talent: '極速機動型。每過 10 秒會自動觸發 2 秒「隱形狀態」（機體閃爍），免疫無視所有碰撞與子彈傷害。',
    speed: 90,
    armor: 40,
    maxHp: 100,
    initialWeapon: 'machine_gun'
  },
  AC130: {
    name: 'AC-130H SPECTRE',
    displayName: 'AC-130H SPECTRE (空中砲艇)',
    description: '火力型重型死亡天使。攜帶強大的追蹤航空飛彈，CD 固定大幅減少。',
    talent: '開局解鎖「追蹤飛彈」代替機槍，且全武器的攻擊冷卻時間（CD）固定減少 20%。',
    speed: 40,
    armor: 60,
    maxHp: 100,
    initialWeapon: 'homing_missile'
  }
};

export default function App() {
  const [gameKey, setGameKey] = useState(0);

  const handleRestart = useCallback(() => {
    setGameKey(k => k + 1);
  }, []);

  return (
    <div className="w-full h-[100dvh] bg-black overflow-hidden font-sans relative">
      <HelicopterGame
        key={gameKey}
        onHardReset={handleRestart}
        initialGameState={gameKey === 0 ? 'START_MENU' : 'VEHICLE_SELECTION'}
        initialVehicle="AH64"
      />
    </div>
  );
}

function HelicopterGame({ 
  onHardReset, 
  initialGameState, 
  initialVehicle 
}: { 
  key?: React.Key;
  onHardReset: () => void;
  initialGameState: GameState;
  initialVehicle: VehicleType;
}) {
  // Canvas and loop triggers
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // React UI States
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const gameStateRef = useRef<GameState>(initialGameState);

  const changeGameState = (state: GameState) => {
    gameStateRef.current = state;
    setGameState(state);
  };

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(initialVehicle);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Mobile touch joystick state ref
  const joystickRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
    baseX: 110,
    baseY: 480,
    vx: 0,
    vy: 0,
  });

  const initialPreset = VEHICLE_PRESETS[initialVehicle];

  const [hudHp, setHudHp] = useState<number>(initialPreset.maxHp);
  const [hudMaxHp, setHudMaxHp] = useState<number>(initialPreset.maxHp);
  const [hudLevel, setHudLevel] = useState<number>(1);
  const [hudXp, setHudXp] = useState<number>(0);
  const [hudMaxXp, setHudMaxXp] = useState<number>(10);
  const [hudKills, setHudKills] = useState<number>(0);
  const [gameTime, setGameTime] = useState<number>(0); // survived seconds
  const [weapons, setWeapons] = useState<WeaponState[]>([{ type: initialPreset.initialWeapon, level: 1, cooldownTimer: 0 }]);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0);
  const [bossActive, setBossActive] = useState<boolean>(false);
  const [bossHp, setBossHp] = useState<number>(0);
  const [bossMaxHp, setBossMaxHp] = useState<number>(1000);
  const [activeEvolutions, setActiveEvolutions] = useState<string[]>([]);
  
  // Slot Machine states
  const [slotRolling, setSlotRolling] = useState<boolean>(false);
  const [slotCurrentIcon, setSlotCurrentIcon] = useState<string>('🎁');
  const [slotCurrentName, setSlotCurrentName] = useState<string>('寶箱密碼鎖解密中...');
  const [slotResultWeapon, setSlotResultWeapon] = useState<WeaponState | null>(null);
  
  // Achievement States
  const [toasts, setToasts] = useState<(Achievement & { keyId: string })[]>([]);
  const unlockedRef = useRef<{ [key: string]: boolean }>({
    survive_3min: false,
    kill_500: false,
  });

  // Load unlocked state from localStorage
  useEffect(() => {
    try {
      unlockedRef.current.survive_3min = localStorage.getItem('ach_survive_3min') === 'true';
      unlockedRef.current.kill_500 = localStorage.getItem('ach_kill_500') === 'true';
    } catch (e) {
      console.warn("Storage load failed: ", e);
    }
  }, []);

  const unlockAchievement = (id: string) => {
    try {
      const saved = localStorage.getItem(`ach_${id}`);
      if (saved === 'true') return;
      localStorage.setItem(`ach_${id}`, 'true');
    } catch (e) {
      console.warn("Storage save failed: ", e);
    }

    const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
    if (ach) {
      const keyId = `${id}-${Date.now()}`;
      setToasts(prev => [...prev, { ...ach, keyId }]);
      playSound('power'); // Cool sci-fi buzz noise to draw player focus

      // Setup removal timers
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.keyId !== keyId));
      }, 5000);
    }
  };
  
  // Controls reference
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Highscore persistence in localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('helicopter_high_score') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Game Engine Mutable References (to prevent React re-render lag)
  const isPlayingRef = useRef<boolean>(initialGameState === 'PLAYING');
  const worldSize = 2500; // Game world boundaries (2500 x 2500)
  
  const playerRef = useRef<Player>({
    vehicleType: initialVehicle,
    x: 1250,
    y: 1250,
    vx: 0,
    vy: 0,
    radius: 20,
    hp: initialPreset.maxHp,
    maxHp: initialPreset.maxHp,
    level: 1,
    xp: 0,
    maxXp: 10,
    angle: 0,
    rotorAngle: 0,
    weapons: [
      { type: initialPreset.initialWeapon, level: 1, cooldownTimer: 0 }
    ],
    kills: 0,
    timeElapsed: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const trailsRef = useRef<FireTrail[]>([]);
  const batteriesRef = useRef<BatteryItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const playerInvincibleTicksRef = useRef<number>(0);
  const droneAngleRef = useRef<number>(0);
  const magnetFlashRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const spawnedMiniBossesRef = useRef<number[]>([]);

  // Sound generator helpers using Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'shoot' | 'explosion' | 'missile' | 'flare' | 'level_up' | 'power' | 'hit' | 'boss_spawn') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      switch (type) {
        case 'shoot': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        case 'missile': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }
        case 'flare': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case 'hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.setValueAtTime(60, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'explosion': {
          // Low freq explosion sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
        case 'boss_spawn': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.linearRampToValueAtTime(40, now + 1.2);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.2);
          break;
        }
        case 'level_up': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(260, now);
          osc1.frequency.setValueAtTime(390, now + 0.1);
          osc1.frequency.setValueAtTime(520, now + 0.2);
          osc2.frequency.setValueAtTime(130, now);
          osc2.frequency.setValueAtTime(260, now + 0.15);
          osc2.frequency.setValueAtTime(390, now + 0.3);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.45);
          osc2.stop(now + 0.45);
          break;
        }
        case 'power': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
      }
    } catch (e) {
      console.warn("Audio Context Error: ", e);
    }
  };

  // Keyboard Event Management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      // Global or GAMEOVER state space check to redeploy/restart game
      if ((e.key === ' ' || e.code === 'Space') && gameStateRef.current === 'GAMEOVER') {
        e.preventDefault();
        onHardReset();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onHardReset]);

  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  // Detect Touch / Mobile Devices
  useEffect(() => {
    // Determine initially
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(hasTouch);
  }, []);

  const resetGame = () => {
    playSound('power');
    onHardReset();
  };
  
  const initiateGame = () => {
    playSound('power');

    // 1. 確保正確讀取全域常數 VEHICLE_PRESETS
    const preset = VEHICLE_PRESETS[selectedVehicle];

    // 2. 完整初始化玩家核心數據，絕不可遺漏 timeElapsed 等屬性
    playerRef.current = {
      vehicleType: selectedVehicle,
      x: 1250,
      y: 1250,
      vx: 0,
      vy: 0,
      radius: 20,
      hp: preset.maxHp,
      maxHp: preset.maxHp,
      shield: 0,
      level: 1,
      xp: 0,
      maxXp: 10,
      angle: 0,
      rotorAngle: 0,
      weapons: [
        { type: preset.initialWeapon, level: 1, cooldownTimer: 0 }
      ],
      passives: [],
      kills: 0,
      timeElapsed: 0, // 修復 NaN:NaN 的絕對關鍵
    };
    
    // 3. 強制同步所有 React UI 狀態面板
    setHudHp(preset.maxHp);
    setHudMaxHp(preset.maxHp);
    setHudLevel(1);
    setHudXp(0);
    setHudKills(0);
    setGameTime(0);
    setWeapons([...playerRef.current.weapons]);
    
    // 4. 重啟遊戲馬達與時間軸
    lastTimeRef.current = Date.now();
    isPlayingRef.current = true;
    changeGameState('PLAYING');
  };

  // Explosion Particle Spawning Utility
  const spawnExplosion = (x: number, y: number, color: string = '#ef4444', count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 3 + Math.random() * 4,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  };

  // Evolution System logic check and draft candidates
  const triggerLevelUp = (currentLvl: number) => {
    isPlayingRef.current = false;
    playSound('level_up');
    
    // Check eligible paths
    const p = playerRef.current;
    if (!p.passives) p.passives = []; // safety
    
    const wLevels: Record<string, number> = {};
    p.weapons.forEach(w => { wLevels[w.type] = w.level; });
    const pLevels: Record<string, number> = {};
    p.passives.forEach(ps => { pLevels[ps.type] = ps.level; });
    
    const totalSlots = p.weapons.length + p.passives.length;
    const maxSlotsReached = totalSlots >= 6;

    const options: UpgradeOption[] = [];

    const EVOLUTION_RECIPES = [
      { w1: 'machine_gun', w2: 'flare', result: 'evo_pierce', name: '🔥 燃燒穿甲彈 (Incendiary Pierce)', desc: '【超武進化】貫穿彈道附帶擴散紅炎，造成路徑持續範圍燒傷。', icon: '🔥' },
      { w1: 'homing_missile', w2: 'fpv_drone', result: 'evo_drones', name: '🚀 浮游砲陣列 (Option Drone Array)', desc: '【超武進化】無間斷全自動編織微型追蹤導彈陣列！', icon: '🚀' },
      { w1: 'hellfire', w2: 'flare', result: 'evo_doomsday', name: '☢️ 末日審判 (Doomsday Artillery)', desc: '【超武進化】全畫面隨機降下火砲轟炸，燒盡一切生命！', icon: '☢️' },
      { w1: 'machine_gun', w2: 'fpv_drone', result: 'evo_laser_web', name: '⚡ 磁爆切割網 (Laser Web)', desc: '【超武進化】軌道大幅擴張，朝外射出致命貫穿雷射！', icon: '⚡' }
    ];

    EVOLUTION_RECIPES.forEach(recipe => {
      if (wLevels[recipe.w1] === 5 && wLevels[recipe.w2] === 5 && !wLevels[recipe.result]) {
        options.push({
          id: recipe.result,
          type: recipe.result as any,
          title: recipe.name,
          description: recipe.desc,
          icon: recipe.icon,
          isEvolution: true,
          costDesc: `需求: ${recipe.w1} + ${recipe.w2} 雙滿等`
        });
      }
    });

    const hasEvolvedBase = (baseType: string) => {
       return EVOLUTION_RECIPES.some(r => (r.w1 === baseType || r.w2 === baseType) && wLevels[r.result]);
    };

    const BASE_WEAPONS = [
      { type: 'machine_gun', name: '機槍', icon: '🔫', descBase: '前向高速連發機槍。', descLvlUp: '射速與傷害提昇。', descLvl5: '【紅色雷射】極快連射光束！' },
      { type: 'homing_missile', name: '追蹤飛彈', icon: '🎯', descBase: '解鎖重型雷達防衛，鎖定畫面最高血量目標。', descLvlUp: '威力提昇、冷卻縮短。', descLvl5: '【蜂群飛彈】4 枚飛彈拖著長白煙鎖定！' },
      { type: 'flare', name: '熱焰彈', icon: '☀️', descBase: '周遭擴散撒下防禦干擾彈點燃敵人。', descLvlUp: '殺傷力與半徑提昇。', descLvl5: '【高溫藍火】半徑加倍，並滯留 4 秒高溫燃燒！' },
      { type: 'fpv_drone', name: '環繞護衛機', icon: '🛸', descBase: '部署 2 架微型無人機，於周圍快速盤旋造成接觸傷害。', descLvlUp: '傷害增強、轉速加快。', descLvl5: '【磁爆陣線】增為 4 架，產生藍色電流絞殺網！' },
      { type: 'hellfire', name: '地獄火飛彈', icon: '🌋', descBase: '單發極慢但威力毀滅的巨大飛彈，直接鎖定大型目標。', descLvlUp: '冷卻縮減、傷害極大化。', descLvl5: '【熔岩焦土】核爆後在原地留下 3 秒的岩漿池！' }
    ];

    BASE_WEAPONS.forEach(bw => {
      const curlvl = wLevels[bw.type] || 0;
      if (hasEvolvedBase(bw.type)) return; 
      
      if (curlvl === 0 && !maxSlotsReached) {
        options.push({
          id: `${bw.type}_unlock`, type: bw.type as any, title: `解鎖 ${bw.name}`, description: bw.descBase, icon: bw.icon, isEvolution: false
        });
      } else if (curlvl > 0 && curlvl < 5) {
        options.push({
          id: `${bw.type}_up`, type: bw.type as any, title: `${bw.name} Lv.${curlvl} -> Lv.${curlvl + 1}`, description: curlvl === 4 ? bw.descLvl5 : bw.descLvlUp, icon: bw.icon, isEvolution: false
        });
      }
    });

    const PASSIVE_ITEMS = [
      { type: 'armor', name: '奈米複合裝甲', icon: '🛡️', descBase: '獲得固定減傷防護。', descLvlUp: 'HP上限提升20，傷害減免提升5%。' },
      { type: 'engine', name: '超載推進引擎', icon: '🚀', descBase: '極限提升機體機動力。', descLvlUp: '移動速度提升 8%。' },
      { type: 'magnet', name: '引力經驗模組', icon: '🧲', descBase: '擴大能量電池吸取範圍並提升倍率。', descLvlUp: '吸取半徑 +30px，獲得 XP 增加 10%。' }
    ];

    PASSIVE_ITEMS.forEach(ps => {
      const curlvl = pLevels[ps.type] || 0;
      if (curlvl === 0 && !maxSlotsReached) {
        options.push({ id: `${ps.type}_unlock`, type: ps.type as any, title: `裝備 ${ps.name}`, description: ps.descBase, icon: ps.icon, isEvolution: false});
      } else if (curlvl > 0 && curlvl < 5) {
        options.push({ id: `${ps.type}_up`, type: ps.type as any, title: `${ps.name} Lv.${curlvl} -> Lv.${curlvl + 1}`, description: ps.descLvlUp, icon: ps.icon, isEvolution: false});
      }
    });

    options.push({ id: 'heal', type: 'heal', title: '應急整修與油料 (Tactical Field Repair)', description: '空投救援箱，立即恢復高達 50 點耐久(HP)。', icon: '🔧', isEvolution: false });

    // Pick 3 options randomly
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    const pickedOptions: UpgradeOption[] = [];
    const evos = shuffled.filter(o => o.isEvolution);
    const standard = shuffled.filter(o => !o.isEvolution);

    pickedOptions.push(...evos);
    while (pickedOptions.length < 3 && standard.length > 0) {
      const nextOpt = standard.shift();
      if (nextOpt) pickedOptions.push(nextOpt);
    }

    setUpgradeOptions(pickedOptions.slice(0, 3));
    changeGameState('UPGRADE');
  };

  // Perform specific Upgrade / Evolution choice from menu selection
  const selectUpgrade = (opt: UpgradeOption) => {
    const p = playerRef.current;
    
    // EVOLUTION_RECIPES
    const recipes: Record<string, {w1: string, w2: string, titleName: string}> = {
      'evo_pierce': { w1: 'machine_gun', w2: 'flare', titleName: '燃燒穿甲彈 🔥' },
      'evo_drones': { w1: 'homing_missile', w2: 'fpv_drone', titleName: '浮游砲陣列 🚀' },
      'evo_doomsday': { w1: 'hellfire', w2: 'flare', titleName: '末日審判 ☢️' },
      'evo_laser_web': { w1: 'machine_gun', w2: 'fpv_drone', titleName: '磁爆切割網 ⚡' },
    };

    if (recipes[opt.type]) {
      const rec = recipes[opt.type];
      p.weapons = p.weapons.filter(w => w.type !== rec.w1 && w.type !== rec.w2);
      p.weapons.push({ type: opt.type as any, level: 6, cooldownTimer: 0 }); // 6 acts as Evo
      setActiveEvolutions(prev => [...prev, rec.titleName]);
      playSound('power');
    } else if (opt.type === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + 50);
    } else if (['armor', 'engine', 'magnet'].includes(opt.type)) {
      const ps = p.passives.find(ps => ps.type === opt.type);
      if (ps) {
        ps.level += 1;
      } else {
        p.passives.push({ type: opt.type as any, level: 1 });
      }
      if (opt.type === 'armor') {
        p.maxHp += 20;
        p.hp += 20; 
      }
    } else {
      // Base Weapon Add or Upgrade
      const w = p.weapons.find(w => w.type === opt.type);
      if (w) {
        w.level += 1;
      } else {
        p.weapons.push({ type: opt.type as any, level: 1, cooldownTimer: 0 });
      }
    }

    // Sync state
    setWeapons([...p.weapons]);
    setHudHp(Math.floor(p.hp));
    setHudMaxHp(p.maxHp);

    // Return to main battle
    changeGameState('PLAYING');
    lastTimeRef.current = Date.now();
    isPlayingRef.current = true;
  };

  const triggerSlotMachine = () => {
    // 1. Pause game
    isPlayingRef.current = false;
    changeGameState('SLOT_MACHINE');
    
    // 2. Identify rolling candidates from current weapons and passives that are level < 5.
    const p = playerRef.current;
    if (!p.passives) p.passives = [];
    
    // Combine upgradeable items
    const weaponCandidates = p.weapons.filter(w => w.level < 5 && w.level > 0).map(w => ({ ...w, _ref: w, isPass: false }));
    const passiveCandidates = p.passives.filter(ps => ps.level < 5 && ps.level > 0).map(ps => ({ ...ps, _ref: ps, isPass: true }));
    
    const candidates = [...weaponCandidates, ...passiveCandidates];
    
    setSlotRolling(true);
    setSlotResultWeapon(null);
    
    // Weapon descriptions list for UI
    const iconsMap: Record<string, string> = {
      machine_gun: '🔫', homing_missile: '🎯', flare: '☀️', fpv_drone: '🛸', hellfire: '🌋',
      armor: '🛡️', engine: '🚀', magnet: '🧲'
    };
    const namesMap: Record<string, string> = {
      machine_gun: '自動化重機槍', homing_missile: '追蹤飛彈', flare: '熱焰彈', fpv_drone: '環繞護衛機', hellfire: '地獄火飛彈',
      armor: '奈米複合裝甲', engine: '超載推進引擎', magnet: '引力經驗模組'
    };

    if (candidates.length === 0) {
      // Emergency: no upgradable items
      setSlotCurrentIcon('🔧');
      setSlotCurrentName('戰地緊急維修 / EMERGENCY REPAIR');
      setSlotRolling(false);
      p.hp = Math.min(p.maxHp, p.hp + 50);
      setHudHp(Math.floor(p.hp));
      return;
    }

    // 3. Start a rolling animation container interval that fires for 2 seconds
    let rollTicks = 0;
    const maxTicks = 15;
    const intervalId = setInterval(() => {
      rollTicks++;
      const randWIndex = Math.floor(Math.random() * candidates.length);
      const tempI = candidates[randWIndex];
      setSlotCurrentIcon(iconsMap[tempI.type] || '✨');
      setSlotCurrentName(namesMap[tempI.type] || tempI.type.toUpperCase());
      
      playSound('shoot');

      if (rollTicks >= maxTicks) {
        clearInterval(intervalId);
        
        // Finalized Selection!
        const finalI = candidates[Math.floor(Math.random() * candidates.length)];
        setSlotCurrentIcon(iconsMap[finalI.type] || '✨');
        setSlotCurrentName(namesMap[finalI.type] || finalI.type.toUpperCase());
        setSlotRolling(false);
        // We typecast or bypass for visual rendering in Slot_Machine
        setSlotResultWeapon(finalI.isPass ? { type: finalI.type as any, level: finalI.level, cooldownTimer: 0 } : finalI._ref as WeaponState);
        
        // Upgrade level safely
        if (finalI.isPass) {
          const psRef = finalI._ref as PassiveState;
          psRef.level += 1;
          if (psRef.type === 'armor') {
            p.maxHp += 20;
            p.hp += 20;
            setHudMaxHp(p.maxHp);
          }
        } else {
          const wRef = finalI._ref as WeaponState;
          wRef.level += 1;
          setWeapons([...p.weapons]);
        }
        
        setHudHp(Math.floor(p.hp));
        playSound('power');
      }
    }, 120);
  };

  const resumeFromSlotMachine = () => {
    changeGameState('PLAYING');
    lastTimeRef.current = Date.now();
    isPlayingRef.current = true;
  };

  // Main Canvas Rendering & Physics Update ticks (continuous)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      if (gameStateRef.current !== 'PLAYING' || !isPlayingRef.current) {
        // Continuously refresh timestamp baseline during idle/paused phases to prevent deltaTime bursts!
        lastTimeRef.current = Date.now();
        animId = requestAnimationFrame(gameLoop);
        animationFrameIdRef.current = animId;
        return;
      }

      const p = playerRef.current;
      const keys = keysRef.current;

      // 1. Time management & frame counting
      const currentTime = Date.now();
      const deltaTime = Math.min(0.1, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      frameCountRef.current += 1;
      p.timeElapsed += deltaTime;
      setGameTime(Math.floor(p.timeElapsed));

      // Dynamic achievement unlock check
      if (!unlockedRef.current.survive_3min && p.timeElapsed >= 180) {
        unlockedRef.current.survive_3min = true;
        unlockAchievement('survive_3min');
      }
      if (!unlockedRef.current.kill_500 && p.kills >= 500) {
        unlockedRef.current.kill_500 = true;
        unlockAchievement('kill_500');
      }

      if (playerInvincibleTicksRef.current > 0) {
        playerInvincibleTicksRef.current -= 1;
      }

      // Rotate rotor blade (continuous rate)
      p.rotorAngle += 0.45;
      droneAngleRef.current += 0.035; // orbit speed for potential option drones

      // Screen shake decay 
      let shake = 0;
      setShakeIntensity(prev => {
        if (prev > 0.1) {
          shake = prev;
          return prev * 0.88;
        }
        return 0;
      });

      // 2. HELICOPTER MOVEMENT WITH INERTIA / DIRECT DRIFTING SLIDE
      let speedScale = p.vehicleType === 'F22' ? 1.4 : (p.vehicleType === 'AC130' ? 0.7 : 1.0);
      const engineOpt = p.passives?.find(ps => ps.type === 'engine');
      if (engineOpt) {
        speedScale *= (1 + 0.08 * engineOpt.level);
      }
      const acc = 1.1; // Thrust force
      const friction = 0.90; // Drift weight (drag coefficient)
      let ax = 0;
      let ay = 0;

      const joy = joystickRef.current;
      if (joy.active) {
        ax += joy.vx * acc * speedScale;
        ay += joy.vy * acc * speedScale;
      } else {
        if (keys['w'] || keys['arrowup']) ay -= acc * speedScale;
        if (keys['s'] || keys['arrowdown']) ay += acc * speedScale;
        if (keys['a'] || keys['arrowleft']) ax -= acc * speedScale;
        if (keys['d'] || keys['arrowright']) ax += acc * speedScale;
      }

      // Apply acceleration to velocity vector
      p.vx += ax;
      p.vy += ay;

      // Apply drift friction
      p.vx *= friction;
      p.vy *= friction;

      // Clamp velocities to max speed limit
      const maxSpeed = 5.2 * speedScale;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // Modify x & y coordinates
      p.x += p.vx;
      p.y += p.vy;

      // Constrain player into boundless zone ring
      if (p.x < p.radius) { p.x = p.radius; p.vx = 0; }
      if (p.x > worldSize - p.radius) { p.x = worldSize - p.radius; p.vx = 0; }
      if (p.y < p.radius) { p.y = p.radius; p.vy = 0; }
      if (p.y > worldSize - p.radius) { p.y = worldSize - p.radius; p.vy = 0; }

      // Adjust visual helicopter fuselage tilt angle slightly based on left/right steering velocity
      if (Math.abs(p.vx) > 0.2) {
        p.angle = p.vx * 0.035; // flight banking tilt
      } else {
        p.angle *= 0.80; // ease back to straight
      }

      // Jet exhaust trailing sparks
      if (frameCountRef.current % 3 === 0 && (Math.abs(p.vx) > 0.8 || Math.abs(p.vy) > 0.8)) {
        const backAngle = Math.atan2(p.vy, p.vx) + Math.PI;
        particlesRef.current.push({
          x: p.x - Math.cos(backAngle) * 8,
          y: p.y - Math.sin(backAngle) * 8,
          vx: Math.cos(backAngle + (Math.random() - 0.5) * 0.4) * (2 + Math.random() * 2) - p.vx * 0.1,
          vy: Math.sin(backAngle + (Math.random() - 0.5) * 0.4) * (2 + Math.random() * 2) - p.vy * 0.1,
          color: Math.random() > 0.4 ? '#f97316' : '#eab308', // orange / amber pixel fire spark
          size: 2.5 + Math.random() * 3,
          life: 0.9,
          decay: 0.06
        });
      }

      // 3. ENEMY SPAWNER OVERTIME GENERATOR with Dynamic Time Scaling difficulty curve
      const elapsedSeconds = p.timeElapsed;

      // Time Scaling Multiplier system (increases difficulty slightly linearly every 30 seconds)
      const timeFactor = Math.floor(elapsedSeconds / 30);
      const enemySpeedScale = 0.6 + timeFactor * 0.15; // Starting with a 40% reduction (0.6) at the initial stage, increasing linearly
      const hpScale = 1.0 + timeFactor * 0.20;    // Linear HP scaling of 20% every 30s
      
      // Spawner frequency (interval in frames): Linear decrement from 130 frames down to 22 frames
      // Ensuring opening seconds have very sparse spawning behavior
      const batchPeriod = Math.max(22, Math.floor(130 - elapsedSeconds * 1.5));
      const maxEnemiesOnField = 250 + Math.floor(elapsedSeconds / 10) * 20;

      // Spawn normal and fast drones
      if (frameCountRef.current % batchPeriod === 0 && enemiesRef.current.length < maxEnemiesOnField) {
        // Spawn count starts very low (1-2) before 30 sec, then linearly increases
        const spawnCount = elapsedSeconds < 30 
          ? (elapsedSeconds < 15 ? 1 : 2) 
          : Math.min(8, 2 + Math.floor((elapsedSeconds - 30) / 12));

        for (let s = 0; s < spawnCount; s++) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = 420 + Math.random() * 120;
          const ex = p.x + Math.cos(spawnAngle) * spawnDist;
          const ey = p.y + Math.sin(spawnAngle) * spawnDist;

          // Don't spawn outside world size limits
          if (ex > 10 && ex < worldSize - 10 && ey > 10 && ey < worldSize - 10) {
            const roll = Math.random();
            let etype: 'drone' | 'fast_drone' | 'shield_drone' | 'sniper_drone' | 'mini_boss' = 'drone';
            let ehp = 10;
            let espeed = 1.0; // Base speed: 20 * 0.05 = 1.0
            let ewidth = 14;
            let eheight = 14;
            let scoreVal = 10;

            // Conditional Spawn for Type D (Sniper Drone): starts appearing after 60 seconds
            const sniperAvailable = elapsedSeconds >= 60;

            if (sniperAvailable && roll < 0.15) {
              // Type D: 遠程狙擊機 (Purple, Medium size) - 15% spawn chance if unlocked after 60s
              etype = 'sniper_drone';
              ehp = 20; // HP 20 base
              espeed = 1.5; // Speed 30 * 0.05 = 1.5
              ewidth = 18;
              eheight = 18;
              scoreVal = 40;
            } else {
              // Roll among Type A, B, and C based on early-game rebalancing
              const subRoll = Math.random();
              
              let typeAProb = 0.60;
              let typeBProb = 0.85; // This means 60%~85% is Type B (25%)
              
              if (elapsedSeconds < 60) {
                typeAProb = 0.80;
                if (elapsedSeconds < 45) {
                  // Before 45s, no shield_drone allowed (Type C), so Type B takes the remaining 20%
                  typeBProb = 1.0;
                } else {
                  // 45s ~ 60s: Type B 10%, Type C 10%
                  typeBProb = 0.90;
                }
              }

              if (subRoll < typeAProb) {
                // Type A: 偵察無人機 (Green, Small) - 基礎血量調降至 1 (一發即爆)
                etype = 'drone';
                ehp = 1;
                espeed = 1.0; // Speed 20 * 0.05 = 1.0
                ewidth = 14;
                eheight = 14;
                scoreVal = 10;
              } else if (subRoll < typeBProb) {
                // Type B: 自殺突擊機 (Yellow, Small)
                etype = 'fast_drone';
                ehp = 5;
                espeed = 3.5; // Speed 70 * 0.05 = 3.5
                ewidth = 11;
                eheight = 11;
                scoreVal = 15;
              } else {
                // Type C: 重型裝甲機 (Dark Red, Large) - 初次現身 45 秒後
                etype = 'shield_drone';
                ehp = 50;
                espeed = 1.5; // Speed 30 * 0.05 = 1.5
                ewidth = 26;
                eheight = 26;
                scoreVal = 30;
              }
            }

            // Apply calculated Dynamic Time Scaling (difficulty curve multipliers)
            // But ensure Type A hp starts strictly at 1. Since hpScale starts at 1.0, 1 * 1.0 = 1.
            const finalHp = Math.max(1, Math.round(ehp * hpScale));
            const finalSpeed = espeed * enemySpeedScale;

            enemiesRef.current.push({
              id: `${Date.now()}-${Math.random()}`,
              x: ex,
              y: ey,
              vx: 0,
              vy: 0,
              width: ewidth,
              height: eheight,
              speed: finalSpeed,
              hp: finalHp,
              maxHp: finalHp,
              type: etype,
              scoreValue: scoreVal,
              isHitFlash: 0
            });
          }
        }
      }

      // Check Mini-Boss Spawn (at 5x heavy drone specs) at 60, 120, 180, 240 seconds respectively
      const currentSpawningSec = Math.floor(elapsedSeconds);
      if ([60, 120, 180, 240].includes(currentSpawningSec) && !spawnedMiniBossesRef.current.includes(currentSpawningSec)) {
        spawnedMiniBossesRef.current.push(currentSpawningSec);
        playSound('boss_spawn');
        
        // 5 times shield drone specifications: hp is 250, width/height is 52x52
        const miniBossBaseHp = 250;
        const finalMiniBossHp = Math.max(250, Math.round(miniBossBaseHp * hpScale));
        
        enemiesRef.current.push({
          id: `mini-boss-${currentSpawningSec}-${Date.now()}`,
          x: p.x + (Math.random() - 0.5) * 160,
          y: p.y - 280,
          vx: 0,
          vy: 0,
          width: 52,
          height: 52,
          speed: 0.8,
          hp: finalMiniBossHp,
          maxHp: finalMiniBossHp,
          type: 'mini_boss',
          scoreValue: 300,
          isHitFlash: 0
        });
      }

      // Check Boss Spawn at exactly 300 seconds (5 minutes)
      if (Math.floor(elapsedSeconds) >= 300 && !bossActive && !enemiesRef.current.some(e => e.type === 'boss') && !spawnedMiniBossesRef.current.includes(300)) {
        spawnedMiniBossesRef.current.push(300); // Record to prevent immediate infinite respawns if we want only once
        setBossActive(true);
        playSound('boss_spawn');
        // Spawn Bomber Boss directly in center ring, slightly above player
        const bHp = 1350;
        enemiesRef.current.push({
          id: 'bomber-supreme-boss',
          x: p.x,
          y: p.y - 300,
          vx: 0,
          vy: 0,
          width: 90,
          height: 52,
          speed: 0.7,
          hp: bHp,
          maxHp: bHp,
          type: 'boss',
          scoreValue: 1000,
          isHitFlash: 0
        });
        setBossHp(bHp);
        setBossMaxHp(bHp);
      }

      // 4. WEAPONS FIRING TICK SYSTEMS
      const weaponCdMultiplier = p.vehicleType === 'AC130' ? 0.8 : 1.0;
      p.weapons.forEach(weapon => {
        weapon.cooldownTimer -= deltaTime;
        if (weapon.cooldownTimer <= 0) {
          // Identify trigger targets
          const enemies = enemiesRef.current;
          if (enemies.length === 0) return; // wait till prey arrives

          switch (weapon.type) {
            case 'machine_gun': {
              const mgCooldowns = [0.5, 0.45, 0.4, 0.35, 0.3];
              const mgDamage = [10, 15, 20, 25, 30];
              const curLvlIdx = Math.min(mgCooldowns.length - 1, weapon.level - 1);
              
              // Find closest enemy
              let closestEnemy: Enemy | null = null;
              let minDist = Infinity;
              enemies.forEach(e => {
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < minDist) {
                  minDist = dist;
                  closestEnemy = e;
                }
              });

              if (closestEnemy && minDist < 450) {
                // Shoot nearest target
                const ce: Enemy = closestEnemy;
                const radians = Math.atan2(ce.y - p.y, ce.x - p.x);
                
                // Bullet spawning details
                const bulletSpd = 9;
                
                // If Level 5, shoot Red Laser extremely fast!
                if (weapon.level === 5) {
                  bulletsRef.current.push({
                    id: `mg-${Date.now()}-${Math.random()}`,
                    x: p.x,
                    y: p.y,
                    vx: Math.cos(radians) * 20, // super fast
                    vy: Math.sin(radians) * 20,
                    radius: 2, // thin line
                    damage: mgDamage[curLvlIdx] * 0.8, // slight damage reduction but much faster rate
                    type: 'player_laser',
                    penetration: 3 // lasers pierce a few targets
                  });
                  playSound('shoot');
                  weapon.cooldownTimer = 0.08 * weaponCdMultiplier; // super fast 0.08s
                } else {
                  // Standard single shot
                  bulletsRef.current.push({
                    id: `mg-${Date.now()}-${Math.random()}`,
                    x: p.x,
                    y: p.y,
                    vx: Math.cos(radians) * bulletSpd,
                    vy: Math.sin(radians) * bulletSpd,
                    radius: 3.5,
                    damage: mgDamage[curLvlIdx],
                    type: 'player_basic',
                    penetration: 1
                  });
                  playSound('shoot');
                  weapon.cooldownTimer = mgCooldowns[curLvlIdx] * weaponCdMultiplier;
                }
              }
              break;
            }

            case 'homing_missile': {
              const msCooldowns = [3.0, 2.7, 2.4, 2.1, 1.8];
              const msDamage = [35, 35, 50, 50, 65];
              const curLvlIdx = Math.min(msCooldowns.length - 1, weapon.level - 1);

              // Find target with highest HP
              let chosenEnemies: Enemy[] = [];
              const sortedSorted = [...enemies].sort((a, b) => b.hp - a.hp);
              
              if (sortedSorted.length > 0) {
                if (weapon.level === 5) {
                  // lvl 5 shoots 4 targets (swarm mode)
                  for (let k = 0; k < 4; k++) {
                    chosenEnemies.push(sortedSorted[k % sortedSorted.length]); // loops around if less than 4 enemies exist
                  }
                } else {
                  chosenEnemies.push(sortedSorted[0]);
                }
              }

              if (chosenEnemies.length > 0) {
                // To spread them out slightly at spawn for swarm look
                chosenEnemies.forEach((ce, i) => {
                  let offsetRads = 0;
                  if (weapon.level === 5) {
                    offsetRads = (i - 1.5) * 0.2; // slight fan layout
                  }
                  const radians = Math.atan2(ce.y - p.y, ce.x - p.x) + offsetRads;
                  const missileSpeed = 6.2 + (weapon.level === 5 ? 1.5 : 0); // slightly faster at lv 5
                  bulletsRef.current.push({
                    id: `ms-${Date.now()}-${Math.random()}`,
                    x: p.x,
                    y: p.y,
                    vx: Math.cos(radians) * missileSpeed,
                    vy: Math.sin(radians) * missileSpeed,
                    radius: 5,
                    damage: msDamage[curLvlIdx],
                    type: 'player_missile',
                    penetration: 1,
                    angle: radians
                  });
                });

                playSound('missile');
                weapon.cooldownTimer = msCooldowns[curLvlIdx] * weaponCdMultiplier;
              }
              break;
            }

            case 'flare': {
              const flCooldowns = [2.5, 2.5, 2.3, 2.3, 2.0];
              const flActiveDurations = [1.0, 1.5, 1.5, 2.0, 3.2]; // seconds
              const flDamage = [12, 18, 22, 30, 42];
              const curLvlIdx = Math.min(flCooldowns.length - 1, weapon.level - 1);

              // Fire 8 or 10 flares outward evenly
              const numFlares = (weapon.level >= 3) ? 10 : 8;
              const angleInc = (Math.PI * 2) / numFlares;
              const flareSpeed = 3.5;

              const isBlueFire = weapon.level === 5;
              const actualRadius = isBlueFire ? 15 : ((weapon.level >= 4) ? 9 : 6.5);
              const actualDuration = isBlueFire ? 4.0 : flActiveDurations[curLvlIdx];

              for (let i = 0; i < numFlares; i++) {
                const angle = i * angleInc;
                bulletsRef.current.push({
                  id: `fl-${Date.now()}-${Math.random()}`,
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(angle) * flareSpeed,
                  vy: Math.sin(angle) * flareSpeed,
                  radius: actualRadius,
                  damage: flDamage[curLvlIdx] * (isBlueFire ? 1.5 : 1), // blue fire burns hotter
                  type: 'player_flare',
                  penetration: isBlueFire ? 15 : 6, // passing through more
                  duration: actualDuration,
                  isHellfireLvl5: isBlueFire // Hack to pass blue flare info visually
                });
              }

              playSound('flare');
              weapon.cooldownTimer = flCooldowns[curLvlIdx] * weaponCdMultiplier;
              break;
            }

            case 'evo_pierce': {
              // Ultra-fast armor-piercing burning bullets
              // Cooldown is extremely low (0.1s)
              let closestEnemy: Enemy | null = null;
              let minDist = Infinity;
              enemies.forEach(e => {
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < minDist) {
                  minDist = dist;
                  closestEnemy = e;
                }
              });

              if (closestEnemy && minDist < 500) {
                const ce: Enemy = closestEnemy;
                // Add a micro random offset to bullets to simulate rapid-fire scatter
                const randomOffset = (Math.random() - 0.5) * 0.18;
                const radians = Math.atan2(ce.y - p.y, ce.x - p.x) + randomOffset;
                const bulletSpd = 12;

                bulletsRef.current.push({
                  id: `ep-${Date.now()}-${Math.random()}`,
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(radians) * bulletSpd,
                  vy: Math.sin(radians) * bulletSpd,
                  radius: 5,
                  damage: 32, // high DPS
                  type: 'player_evo_pierce',
                  penetration: 999, // Infinite pierce!
                  trailTimer: 0.05 // spawn track trails on interval
                });

                playSound('shoot');
                weapon.cooldownTimer = 0.11 * weaponCdMultiplier; // 0.11s firing interval!
              }
              break;
            }

            case 'evo_drones': {
              // Option Drone array shoot action
              // Drones shoot automated miniature homing missiles every 1.0 second.
              // Find 2 enemies to lock on
              const sortedSorted = [...enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));

              if (sortedSorted.length > 0) {
                // Orbit drone positions
                const dist = 45;
                const o1_x = p.x + Math.cos(droneAngleRef.current) * dist;
                const o1_y = p.y + Math.sin(droneAngleRef.current) * dist;
                const o2_x = p.x + Math.cos(droneAngleRef.current + Math.PI) * dist;
                const o2_y = p.y + Math.sin(droneAngleRef.current + Math.PI) * dist;

                const droneSources = [
                  { x: o1_x, y: o1_y, target: sortedSorted[0] },
                  { x: o2_x, y: o2_y, target: sortedSorted[1] || sortedSorted[0] }
                ];

                droneSources.forEach(ds => {
                  const rads = Math.atan2(ds.target.y - ds.y, ds.target.x - ds.x);
                  bulletsRef.current.push({
                    id: `evo-mini-ms-${Date.now()}-${Math.random()}`,
                    x: ds.x,
                    y: ds.y,
                    vx: Math.cos(rads) * 7.5,
                    vy: Math.sin(rads) * 7.5,
                    radius: 3.5,
                    damage: 25,
                    type: 'player_missile', // re-uses homing missile trigger visual
                    penetration: 1,
                    angle: rads
                  });
                });

                playSound('missile');
                weapon.cooldownTimer = 1.0 * weaponCdMultiplier; // Shoot every 1 sec
              }
              break;
            }
            case 'hellfire': {
              const hfCooldowns = [5.5, 5.0, 4.5, 4.0, 3.8];
              const hfDamage = [200, 250, 300, 400, 500]; // Massive damage
              const curLvlIdx = Math.min(hfCooldowns.length - 1, weapon.level - 1);

              // Target highest HP
              const sorted = [...enemies].sort((a, b) => b.hp - a.hp);
              if (sorted.length > 0) {
                const ce = sorted[0];
                const radians = Math.atan2(ce.y - p.y, ce.x - p.x);
                bulletsRef.current.push({
                  id: `hf-${Date.now()}-${Math.random()}`,
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(radians) * 4.5, // Slow
                  vy: Math.sin(radians) * 4.5,
                  radius: 8,
                  damage: hfDamage[curLvlIdx],
                  type: 'player_hellfire',
                  penetration: 1,
                  angle: radians,
                  isHellfireLvl5: weapon.level === 5
                });
                playSound('missile');
                weapon.cooldownTimer = hfCooldowns[curLvlIdx] * weaponCdMultiplier;
              }
              break;
            }

            case 'evo_doomsday': {
              // 全畫面隨機降下火砲轟炸 (Bombardment everywhere)
              if (enemies.length > 0) {
                // Randomly pick 3-4 enemies and drop bombs from sky
                for (let k = 0; k < 4; k++) {
                  const target = enemies[Math.floor(Math.random() * enemies.length)];
                  // Drop a hellfire missile straight down or directly on their head
                  bulletsRef.current.push({
                    id: `dd-${Date.now()}-${Math.random()}`,
                    x: target.x + (Math.random() - 0.5) * 50, // Slight offset
                    y: target.y - 400, // spawn way above
                    vx: 0,
                    vy: 12, // fast fall
                    radius: 10,
                    damage: 600,
                    type: 'player_hellfire',
                    penetration: 1,
                    angle: Math.PI / 2,
                    isHellfireLvl5: true // Always leave scorched earth
                  });
                }
                playSound('missile');
                weapon.cooldownTimer = 2.0 * weaponCdMultiplier; // Bombard every 2 seconds
              }
              break;
            }
          }
        }
      });

      // 5. PROCESS BULLETS AND COLLISION VERIFICATIONS
      const bullets = bulletsRef.current;
      const enemies = enemiesRef.current;

      for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = bullets[bIdx];

        // Flare duration decay
        if (b.type === 'player_flare' && b.duration !== undefined) {
          b.duration -= deltaTime;
          
          // Flares decelerate and shrink
          b.vx *= 0.94;
          b.vy *= 0.94;
          
          // Add small sparks trailing
          if (frameCountRef.current % 4 === 0) {
            particlesRef.current.push({
              x: b.x + (Math.random() - 0.5) * 6,
              y: b.y + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: '#f97316',
              size: 1.5 + Math.random() * 3,
              life: 0.8,
              decay: 0.08
            });
          }

          if (b.duration <= 0) {
            bullets.splice(bIdx, 1);
            continue;
          }
        }

        // Evo Pierce Fire Trail spawning
        if (b.type === 'player_evo_pierce' && b.trailTimer !== undefined) {
          b.trailTimer -= deltaTime;
          if (b.trailTimer <= 0) {
            b.trailTimer = 0.08; // spawn again shortly
            // Add a static fire patch in world coordinates
            trailsRef.current.push({
              id: `${Date.now()}-${Math.random()}`,
              x: b.x,
              y: b.y,
              radius: 18,
              damage: 6, // burns enemies continuously on overlap
              duration: 2.2, // burns for 2.2 seconds
              maxDuration: 2.2
            });
          }
        }

        // Propagate missile velocities
        b.x += b.vx;
        b.y += b.vy;

        // Verify bounds deletion
        const distFromPlayer = Math.hypot(b.x - p.x, b.y - p.y);
        // Despawn bullets that drift too far from the camera viewport (approx 700px radius)
        if (distFromPlayer > 750) {
          bullets.splice(bIdx, 1);
          continue;
        }

        // Check weapon hit collisions against enemies or player depending on weapon source
        let hitSomething = false;

        if (b.type === 'enemy_bullet') {
          // Verify hitting the player instead of enemies
          const distToPlayer = Math.hypot(b.x - p.x, b.y - p.y);
          const hitRadius = p.radius + b.radius; // player radius + bullet radius

          if (distToPlayer < hitRadius) {
            // Apply damage to player!
            // First check if player has active F-22 stealth or invincibility ticks
            let isF22Stealth = false;
            if (p.vehicleType === 'F22') {
              const stealthCycle = p.timeElapsed % 12;
              isF22Stealth = stealthCycle >= 10;
            }

            if (playerInvincibleTicksRef.current <= 0 && !isF22Stealth) {
              let baseDmg = 8; // standard damage from red sniper bullet
              if (p.vehicleType === 'AH64') baseDmg *= 0.8;
              const armorOpt = p.passives?.find(ps => ps.type === 'armor');
              if (armorOpt) baseDmg *= (1 - 0.05 * armorOpt.level);
              
              let dmg = Math.max(1, Math.round(baseDmg));

              if (p.shield > 0) {
                if (p.shield >= dmg) {
                  p.shield -= dmg;
                  dmg = 0;
                } else {
                  dmg -= p.shield;
                  p.shield = 0;
                  playSound('explosion'); // shield break
                  spawnExplosion(p.x, p.y, '#0ea5e9', 15);
                }
              }
              p.hp = Math.max(0, p.hp - dmg);
              playerInvincibleTicksRef.current = 20; // brief recovery
              setHudHp(p.hp);
              playSound('hit');
              spawnExplosion(p.x, p.y, '#ef4444', 10);
              
              if (p.hp <= 0) {
                isPlayingRef.current = false;
                changeGameState('GAMEOVER');
              }
            }

            hitSomething = true;
            bullets.splice(bIdx, 1);
            continue; // Go to next bullet
          }
        } else {
          // Standard player bullet path: check collision against all active enemies on field
          for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const e = enemies[eIdx];
            const collisionDist = Math.hypot(b.x - e.x, b.y - e.y);
            const hitRadius = Math.max(e.width, e.height) / 1.5 + b.radius;

            if (collisionDist < hitRadius) {
              // Apply damage!
              e.hp -= b.damage;
              e.isHitFlash = 3; // flash enemy body brief ticks
              playSound('hit');

              // Spawn bright strike spark particles
              particlesRef.current.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                color: '#fef08a',
                size: 2.5,
                life: 0.5,
                decay: 0.1
              });

              // Special Homing Missile Aoe Area Splinter Explode on strike
              if (b.type === 'player_missile') {
                // Add strong screen vibration
                setShakeIntensity(prev => Math.min(10, prev + 5.0));
                playSound('explosion');

                // Base explosion radius scaled to 80px
                const areaRad = 80;
                enemies.forEach(otherE => {
                  const aoeDist = Math.hypot(otherE.x - b.x, otherE.y - b.y);
                  if (aoeDist < areaRad) {
                    otherE.hp -= b.damage; // deal damage to all enemies in area
                    otherE.isHitFlash = 3;
                  }
                });

                spawnExplosion(b.x, b.y, '#f97316', 12);

                // Concentric expanding dot-matrix pixelated shockwave animation
                for (let r = 1; r <= 3; r++) {
                  const numDots = r * 10;
                  const ringRadius = r * 16;
                  for (let j = 0; j < numDots; j++) {
                    const ang = (j / numDots) * Math.PI * 2;
                    const cosVal = Math.cos(ang);
                    const sinVal = Math.sin(ang);
                    particlesRef.current.push({
                      x: b.x + cosVal * ringRadius,
                      y: b.y + sinVal * ringRadius,
                      vx: cosVal * (1.5 + r * 1.8),
                      vy: sinVal * (1.5 + r * 1.8),
                      color: r === 1 ? '#f43f5e' : r === 2 ? '#f97316' : '#eab308',
                      size: r === 1 ? 4.5 : r === 2 ? 3.5 : 2.5,
                      life: 1.0,
                      decay: 0.04 + Math.random() * 0.02
                    });
                  }
                }

                hitSomething = true;
              }

              // Hellfire huge explosion
              if (b.type === 'player_hellfire') {
                setShakeIntensity(prev => Math.min(15, prev + 10.0));
                playSound('explosion');

                const areaRad = 150;
                enemies.forEach(otherE => {
                  const aoeDist = Math.hypot(otherE.x - b.x, otherE.y - b.y);
                  if (aoeDist < areaRad) {
                    otherE.hp -= b.damage; 
                    otherE.isHitFlash = 5;
                  }
                });

                spawnExplosion(b.x, b.y, '#dc2626', 30); // massive red explosion

                if (b.isHellfireLvl5) {
                  // Leave molten ground
                  trailsRef.current.push({
                    id: `hf-molten-${Date.now()}-${Math.random()}`,
                    x: b.x,
                    y: b.y,
                    radius: 120,
                    damage: 25,
                    duration: 3.0,
                    maxDuration: 3.0
                  });
                }
                
                // Shockwave rings
                for (let r = 1; r <= 4; r++) {
                  const numDots = r * 15;
                  const ringRadius = r * 25;
                  for (let j = 0; j < numDots; j++) {
                    const ang = (j / numDots) * Math.PI * 2;
                    const cosVal = Math.cos(ang);
                    const sinVal = Math.sin(ang);
                    particlesRef.current.push({
                      x: b.x + cosVal * ringRadius,
                      y: b.y + sinVal * ringRadius,
                      vx: cosVal * (2.0 + r * 2.0),
                      vy: sinVal * (2.0 + r * 2.0),
                      color: r <= 2 ? '#b91c1c' : '#dc2626',
                      size: 4,
                      life: 1.0,
                      decay: 0.03
                    });
                  }
                }
                hitSomething = true;
              }

              // Reduce Bullet Penetration count or destroy it
              b.penetration -= 1;
              if (b.penetration <= 0) {
                hitSomething = true;
                bullets.splice(bIdx, 1);
                break; // bullet dissolved, exit enemy loop
              }
            }
          }
        }
      }

      // 6. PROCESS STATIC COGNITIVE BURNING FLAME TRAILS (Evo Pierce trails)
      const trails = trailsRef.current;
      for (let tIdx = trails.length - 1; tIdx >= 0; tIdx--) {
        const tr = trails[tIdx];
        tr.duration -= deltaTime;
        
        // Tick intervals to burn overlapping enemies
        if (frameCountRef.current % 10 === 0) {
          enemies.forEach(e => {
            if (Math.hypot(e.x - tr.x, e.y - tr.y) < tr.radius + e.width / 2) {
              e.hp -= tr.damage;
              e.isHitFlash = 2;
            }
          });
        }

        if (tr.duration <= 0) {
          trails.splice(tIdx, 1);
        }
      }

      // 6.5 PROCESS ORBITING DRONES DAMAGE (fpv_drone, evo_drones, evo_laser_web)
      {
        const fpvWeapon = p.weapons.find(w => w.type === 'fpv_drone');
        const evoDrones = p.weapons.find(w => w.type === 'evo_drones');
        const evoLaserWeb = p.weapons.find(w => w.type === 'evo_laser_web');
        
        if (fpvWeapon || evoDrones || evoLaserWeb) {
          let orbitRadius = 45;
          let numDrones = 2;
          let dmgPerTick = 0;
          let laserDmgTick = 0;
          
          if (fpvWeapon) {
            dmgPerTick = 15; // roughly DPS, but applied multiple times so scale it down
          }
          if (fpvWeapon && fpvWeapon.level >= 5) {
            numDrones = 4;
            orbitRadius = 55;
            dmgPerTick = 30; // base + electric tether
          }
          if (evoDrones) {
            numDrones = 2; // Keep 2 here. The evo shoots bullets! But drones also do contact damage? Or not.
            orbitRadius = 45;
            dmgPerTick = 40; 
          }
          if (evoLaserWeb) {
            numDrones = 4;
            orbitRadius = 80;
            dmgPerTick = 50; 
            laserDmgTick = 40; // laser does extra dmg
          }
          
          // Scale DPS back to tick damage (assuming 60 FPS, check roughly 4 times a second = modulo 15)
          if (frameCountRef.current % 15 === 0) {
            const actualDmg = dmgPerTick; 
            const actualLaserDmg = laserDmgTick;
            
            for (let i = 0; i < numDrones; i++) {
              const a = droneAngleRef.current + (Math.PI * 2 / numDrones) * i;
              const dx = p.x + Math.cos(a) * orbitRadius;
              const dy = p.y + Math.sin(a) * orbitRadius;
              
              enemies.forEach(e => {
                // Drone contact damage
                if (Math.hypot(e.x - dx, e.y - dy) < 20 + e.width / 2) {
                  e.hp -= actualDmg;
                  e.isHitFlash = 2;
                }
                // Laser web damage (long outward beam)
                if (evoLaserWeb && actualLaserDmg > 0) {
                  // Line from drone outward
                  const ex = dx + Math.cos(a) * 400;
                  const ey = dy + Math.sin(a) * 400;
                  // Basic point-line distance or segment bounding check roughly
                  // Use dot product for fast distance to segment
                  const l2 = 400 * 400; 
                  let t = ((e.x - dx) * (ex - dx) + (e.y - dy) * (ey - dy)) / l2;
                  t = Math.max(0, Math.min(1, t));
                  const projX = dx + t * (ex - dx);
                  const projY = dy + t * (ey - dy);
                  if (Math.hypot(e.x - projX, e.y - projY) < e.width / 2 + 10) {
                    e.hp -= actualLaserDmg;
                    e.isHitFlash = 2;
                  }
                }
              });
            }
          }
        }
      }

      // 7. PROCESS ENEMIES DESTRUCTION, AI MOVEMENTS, AND ATTACK CHECKS
      for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = enemies[eIdx];

        // Enemy dies!
        if (e.hp <= 0) {
          p.kills += 1;
          setHudKills(p.kills);

          // Update Highscore live
          if (p.kills > highScore) {
            setHighScore(p.kills);
            try {
              localStorage.setItem('helicopter_high_score', p.kills.toString());
            } catch {}
          }

          // Trigger neat pixel art explosion
          const explodeColor = e.type === 'boss' ? '#a855f7' : (e.type === 'shield_drone' ? '#78716c' : '#ef4444');
          spawnExplosion(e.x, e.y, explodeColor, e.type === 'boss' ? 45 : 8);
          playSound('explosion');

          setShakeIntensity(prev => Math.min(12, prev + (e.type === 'boss' ? 12 : 1.8)));

          // Check Boss or Mini-Boss Death to trigger ultimate drops or Chest drops
          if (e.type === 'boss' || e.type === 'mini_boss') {
            if (e.type === 'boss') {
              setBossActive(false);
              // Drop a giant battery worth immense multiplier XP
              batteriesRef.current.push({
                id: `bat-large-${Date.now()}`,
                x: e.x,
                y: e.y,
                xpValue: 40
              });
              // Explode field around
              for (let k = 0; k < 5; k++) {
                spawnExplosion(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80, '#f59e0b', 12);
              }
            } else {
              // Mini Boss death explosions
              for (let k = 0; k < 3; k++) {
                spawnExplosion(e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 40, '#f97316', 10);
              }
            }

            // BOTH Boss and Mini-Boss drop a glowing chest box entity!
            batteriesRef.current.push({
              id: `chest-${Date.now()}-${Math.random()}`,
              x: e.x,
              y: e.y,
              xpValue: 0,
              type: 'chest'
            });
          } else {
            // Check for HP Drop: 3% probability of dropping healing "維修扳手" / "醫療包"
            if (Math.random() < 0.03) {
              batteriesRef.current.push({
                id: `heal-${Date.now()}-${Math.random()}`,
                x: e.x,
                y: e.y,
                xpValue: 0,
                type: 'heal'
              });
            } else if (Math.random() < 0.05) {
              // 5% chance of dropping a Magnet instead of regular batteries
              batteriesRef.current.push({
                id: `magnet-${Date.now()}-${Math.random()}`,
                x: e.x,
                y: e.y,
                xpValue: 0,
                type: 'magnet'
              });
            } else if (Math.random() < 0.02) {
              // 2% chance of dropping an Energy Shield
              batteriesRef.current.push({
                id: `shield-${Date.now()}-${Math.random()}`,
                x: e.x,
                y: e.y,
                xpValue: 0,
                type: 'shield'
              });
            } else {
              // Standard green energy batteries (XP cubes) with remaining 95%
              // Roll 90% chance to drop battery over crashes (meaning Math.random() > 0.1)
              if (Math.random() > 0.1) {
                batteriesRef.current.push({
                  id: `bat-${Date.now()}-${Math.random()}`,
                  x: e.x,
                  y: e.y,
                  xpValue: e.type === 'shield_drone' ? 3 : 1,
                  type: 'xp'
                });
              }
            }
          }

          enemies.splice(eIdx, 1);
          continue;
        }

        // Enemy flashes hit decay
        if (e.isHitFlash > 0) {
          e.isHitFlash -= 1;
        }

        // AI steering tracking toward player
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy);

        // Sniper Drone behavioral mechanics: maintains 250px distance & handles periodic shooting
        if (e.type === 'sniper_drone') {
          // Initialize shooting cooldown on first update ticks
          if (e.shootCooldown === undefined) {
            e.shootCooldown = Math.random() * 2.5;
          }

          // Shoot timer decay
          e.shootCooldown -= deltaTime;
          if (e.shootCooldown <= 0) {
            e.shootCooldown = 2.5; // fire every 2.5 seconds precisely

            if (dist > 1) {
              const fireAngle = Math.atan2(dy, dx);
              const bSpeed = 3.8; // beautiful clean visible speed
              bulletsRef.current.push({
                id: `sniper-bullet-${Date.now()}-${Math.random()}`,
                x: e.x,
                y: e.y,
                vx: Math.cos(fireAngle) * bSpeed,
                vy: Math.sin(fireAngle) * bSpeed,
                radius: 4.5,
                damage: 8, // deals 8 structural damage
                type: 'enemy_bullet',
                penetration: 1
              });
              playSound('shoot'); // subtle shooting acoustic
            }
          }

          // Maintain 250px distance positioning steering
          const targetDist = 250;
          const deadzone = 30; // 220~280 range hover zone

          if (dist > targetDist + deadzone) {
            // too far, fly closer towards player
            e.vx = (dx / dist) * e.speed;
            e.vy = (dy / dist) * e.speed;
          } else if (dist < targetDist - deadzone) {
            // too close, retreat backwards!
            e.vx = -(dx / dist) * e.speed;
            e.vy = -(dy / dist) * e.speed;
          } else {
            // hover and slowly orbit around the player
            // Perpendicular tangent vectors
            e.vx = (-dy / dist) * e.speed * 0.5;
            e.vy = (dx / dist) * e.speed * 0.5;
          }
        } else {
          // Standard enemy types AI: head toward player
          if (dist > 1) {
            e.vx = (dx / dist) * e.speed;
            e.vy = (dy / dist) * e.speed;
          }
        }

        // Apply physical coordinates
        e.x += e.vx;
        e.y += e.vy;

        // Dynamic engine trail particles for Boss and Escorts when moving
        const speedSquared = e.vx * e.vx + e.vy * e.vy;
        if (speedSquared > 0.01) {
          if (e.type === 'boss') {
            const hw = e.width / 2;
            const hh = e.height / 2;
            // Spawn smoke at left & right reactor locations
            // Left nozzle: x: -8, y: hh - 6
            // Right nozzle: x: 8, y: hh - 6
            const leftNozzleX = e.x - 8;
            const leftNozzleY = e.y + hh - 6;
            const rightNozzleX = e.x + 8;
            const rightNozzleY = e.y + hh - 6;

            const purpleColors = ['#4c1d95', '#5b21b6', '#6d28d9', '#701a75', '#86198f', '#3b0764'];
            
            // Loop for both nozzles
            [ {x: leftNozzleX, y: leftNozzleY}, {x: rightNozzleX, y: rightNozzleY} ].forEach(nozzle => {
              if (Math.random() < 0.8) {
                particlesRef.current.push({
                  x: nozzle.x + (Math.random() - 0.5) * 4,
                  y: nozzle.y + (Math.random() - 0.5) * 4,
                  // Slow drift opposite to movement plus slight upward flow
                  vx: -e.vx * 0.35 + (Math.random() - 0.5) * 0.8,
                  vy: -e.vy * 0.35 - 0.5 + (Math.random() - 0.5) * 0.8,
                  color: purpleColors[Math.floor(Math.random() * purpleColors.length)],
                  size: 2.5 + Math.random() * 3.5,
                  life: 0.8 + Math.random() * 0.4,
                  decay: 0.015 + Math.random() * 0.015
                });
              }
            });
          }
          else if (e.type === 'fast_drone') {
            // Fast escorts get bright neon/orange thruster micro trail
            if (Math.random() < 0.4) {
              const hw = e.width / 2;
              const hh = e.height / 2;
              const orangeColors = ['#fb923c', '#ea580c', '#f97316', '#ffedd5'];
              particlesRef.current.push({
                x: e.x - (e.vx / e.speed) * hw + (Math.random() - 0.5) * 2,
                y: e.y - (e.vy / e.speed) * hh + (Math.random() - 0.5) * 2,
                vx: -e.vx * 0.4 + (Math.random() - 0.5) * 0.5,
                vy: -e.vy * 0.4 + (Math.random() - 0.5) * 0.5,
                color: orangeColors[Math.floor(Math.random() * orangeColors.length)],
                size: 1.5 + Math.random() * 2.0,
                life: 0.5 + Math.random() * 0.3,
                decay: 0.02 + Math.random() * 0.02
              });
            }
          }
          else if (e.type === 'shield_drone') {
            // Shield escorts (stone gray heavy shield) get green emerald/gray smoke trail
            if (Math.random() < 0.4) {
              const hw = e.width / 2;
              const hh = e.height / 2;
              const shieldColors = ['#44403c', '#22c55e', '#15803d', '#a8a29e'];
              particlesRef.current.push({
                x: e.x - (e.vx / e.speed) * hw + (Math.random() - 0.5) * 4,
                y: e.y - (e.vy / e.speed) * hh + (Math.random() - 0.5) * 4,
                vx: -e.vx * 0.2 + (Math.random() - 0.5) * 0.4,
                vy: -e.vy * 0.2 + (Math.random() - 0.5) * 0.4,
                color: shieldColors[Math.floor(Math.random() * shieldColors.length)],
                size: 2.0 + Math.random() * 2.5,
                life: 0.6 + Math.random() * 0.3,
                decay: 0.02 + Math.random() * 0.02
              });
            }
          }
        }

        // Update Boss HUD HP indicator
        if (e.type === 'boss') {
          setBossHp(Math.max(0, e.hp));
        }

        // Boss Special Action Spawns and Launcher rockets
        if (e.type === 'boss' && frameCountRef.current % 120 === 0) {
          // Boss launches custom target missiles or spawns fighter escort
          const escortAngle = Math.random() * Math.PI * 2;
          const escX = e.x + Math.cos(escortAngle) * 60;
          const escY = e.y + Math.sin(escortAngle) * 60;
          
          enemies.push({
            id: `boss-guard-${Date.now()}-${Math.random()}`,
            x: escX,
            y: escY,
            vx: 0,
            vy: 0,
            width: 14,
            height: 14,
            speed: 2.1,
            hp: 20,
            maxHp: 20,
            type: 'fast_drone',
            scoreValue: 15,
            isHitFlash: 0
          });

          // Add heavy flash visual particles from boss body
          spawnExplosion(e.x, e.y, '#e879f9', 5);
        }

        // ENEMY TO PLAYER DAMAGING COLLISION CHECK
        const pCollideDist = Math.hypot(e.x - p.x, e.y - p.y);
        const touchRadius = p.radius + Math.max(e.width, e.height) / 2.2;

        if (pCollideDist < touchRadius) {
          // If player has invincibility ticks left, avoid damage
          // Or if F-22 has active 2s stealth window (from % 12s, 10-12s range is stealth)
          let isF22Stealth = false;
          if (p.vehicleType === 'F22') {
            const stealthCycle = p.timeElapsed % 12;
            isF22Stealth = stealthCycle >= 10;
          }

          if (playerInvincibleTicksRef.current <= 0 && !isF22Stealth) {
            let baseDmg = e.type === 'boss' ? 25 : (e.type === 'shield_drone' ? 15 : 8);
            if (p.vehicleType === 'AH64') {
              baseDmg *= 0.8; // Ah64 Armored passive (20% passive reduction)
            }
            const armorOpt = p.passives?.find(ps => ps.type === 'armor');
            if (armorOpt) baseDmg *= (1 - 0.05 * armorOpt.level);
            
            let finalDmg = Math.max(1, Math.round(baseDmg));
            
            if (p.shield > 0) {
              if (p.shield >= finalDmg) {
                p.shield -= finalDmg;
                finalDmg = 0;
              } else {
                finalDmg -= p.shield;
                p.shield = 0;
                playSound('explosion'); // shield break
                spawnExplosion(p.x, p.y, '#0ea5e9', 20);
              }
            }

            p.hp = Math.max(0, p.hp - finalDmg);
            playerInvincibleTicksRef.current = 30; // 0.5s of invincibility
            playSound('hit');
            setShakeIntensity(prev => Math.min(10, prev + 6.0));

            // Sync HP bar right away
            setHudHp(p.hp);

            // Red screen border flashing or explosion particles around fuselage
            spawnExplosion(p.x, p.y, '#ef4444', 10);

            // Handle player death
            if (p.hp <= 0) {
              isPlayingRef.current = false;
              changeGameState('GAMEOVER');
              playSound('explosion');
              return;
            }
          }
        }
      }

      // 8. PROCESS COLLECTIBLE BATTERIES (XP MAGNETIC SPEEDUP MOVEMENT)
      const batteries = batteriesRef.current;
      for (let bIdx = batteries.length - 1; bIdx >= 0; bIdx--) {
        const bat = batteries[bIdx];
        const distToPlayer = Math.hypot(p.x - bat.x, p.y - bat.y);

        let magnetRange = 150; 
        const magnetOpt = p.passives?.find(ps => ps.type === 'magnet');
        if (magnetOpt) magnetRange += 30 * magnetOpt.level;
        
        if (distToPlayer < magnetRange || bat.vying) {
          bat.vying = true; // lock tracking state

          // Smooth acceleration: item flies progressively faster
          if (bat.speed === undefined) {
            bat.speed = 2.0;
          } else {
            bat.speed = Math.min(22.0, bat.speed + 0.6);
          }
          const speedFactor = bat.speed;
          
          const mdx = p.x - bat.x;
          const mdy = p.y - bat.y;
          const pullAngle = Math.atan2(mdy, mdx);
          
          bat.x += Math.cos(pullAngle) * speedFactor;
          bat.y += Math.sin(pullAngle) * speedFactor;

          // Absorb Battery completely on cockpit overlay
          if (distToPlayer < 14) {
            if (bat.type === 'magnet') {
              // Trigger full screen Magnet powerup effect!
              playSound('power');
              
              // Full screen lightning overlay flash & camera shake
              magnetFlashRef.current = 15;
              setShakeIntensity(prev => Math.min(15, prev + 8.0));
              
              // High impact blue shockwave particle animation around player
              for (let i = 0; i < 40; i++) {
                const ang = (i / 40) * Math.PI * 2;
                particlesRef.current.push({
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(ang) * (4 + Math.random() * 6),
                  vy: Math.sin(ang) * (4 + Math.random() * 6),
                  color: '#3b82f6', // electric blue
                  size: 2.5 + Math.random() * 3,
                  life: 1.0,
                  decay: 0.02 + Math.random() * 0.02
                });
              }
              
              // Instantly drag all OTHER items currently on screen
              batteries.forEach(otherBat => {
                if (otherBat.id !== bat.id) {
                  otherBat.vying = true;
                  if (otherBat.speed === undefined) {
                    otherBat.speed = 5.5; // faster initial velocity
                  }
                }
              });
            } else if (bat.type === 'heal') {
              // Restore 20 HP, capped at Max HP
              playSound('power');
              p.hp = Math.min(p.maxHp, p.hp + 20);
              setHudHp(p.hp);
              // Float up some red cross particles
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: p.x + (Math.random() - 0.5) * 32,
                  y: p.y + (Math.random() - 0.5) * 32,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -1.0 - Math.random() * 1.5, // Float up!
                  color: '#ef4444',
                  size: 2.2,
                  life: 1.0,
                  decay: 0.03 + Math.random() * 0.02
                });
              }
            } else if (bat.type === 'shield') {
              playSound('power');
              p.shield = Math.min(100, (p.shield || 0) + 50);
              // Float up some blue particles
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: p.x + (Math.random() - 0.5) * 32,
                  y: p.y + (Math.random() - 0.5) * 32,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -1.0 - Math.random() * 1.5,
                  color: '#0ea5e9',
                  size: 2.5,
                  life: 1.0,
                  decay: 0.03 + Math.random() * 0.02
                });
              }
            } else if (bat.type === 'chest') {
              playSound('power');
              triggerSlotMachine();
            } else {
              let xpGain = bat.xpValue;
              const magnetOpt = p.passives?.find(ps => ps.type === 'magnet');
              if (magnetOpt) xpGain *= (1 + 0.10 * magnetOpt.level);
              p.xp += Math.floor(xpGain);
              
              // Gain score/battery absorption audio
              playSound('shoot');

              // Quick micro flash
              particlesRef.current.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                color: '#22c55e',
                size: 2.0,
                life: 0.5,
                decay: 0.1
              });

              // Handle levelling up events
              if (p.xp >= p.maxXp) {
                p.level += 1;
                p.xp -= p.maxXp; // transfer excess xp
                
                // Dynamic exponential/linear XP curve: 10 + (lvl * 5) + Math.pow(lvl, 1.5) * 2; lvl 1 is exactly 10
                p.maxXp = p.level === 1 ? 10 : Math.floor(10 + (p.level * 5) + Math.pow(p.level, 1.5) * 2);

                // Update synced states
                setHudLevel(p.level);
                setHudXp(p.xp);
                setHudMaxXp(p.maxXp);

                triggerLevelUp(p.level);
              } else {
                setHudXp(p.xp);
              }
            }

            batteries.splice(bIdx, 1);
            continue;
          }
        }
      }

      // 9. UPDATE AND DECAY DUST EXPLOSION PARTICLES
      const particles = particlesRef.current;
      for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
        const pt = particles[pIdx];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= pt.decay;

        if (pt.life <= 0) {
          particles.splice(pIdx, 1);
        }
      }

      // 10. DYNAMIC GAME CANVAS DRAW RENDERS
      // Setup dynamic virtual camera center tracking with slight trailing smoothing
      const lagFactor = 0.12;
      const targetCamX = p.x - 400;
      const targetCamY = p.y - 300;
      
      const cameraX = targetCamX;
      const cameraY = targetCamY;

      ctx.clearRect(0, 0, 800, 600);

      // Apply screen shake matrix translations
      ctx.save();
      if (shake > 0.1) {
        const shakeX = (Math.random() - 0.5) * shake;
        const shakeY = (Math.random() - 0.5) * shake;
        ctx.translate(shakeX, shakeY);
      }

      // BACKGROUND RENDER (Dark grid)
      ctx.fillStyle = '#0f1319';
      ctx.fillRect(0, 0, 800, 600);

      // Render grid grid-net lines based on scrolling viewport camera
      ctx.strokeStyle = '#232d3d';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const startX = Math.floor(cameraX / gridSize) * gridSize;
      const startY = Math.floor(cameraY / gridSize) * gridSize;

      for (let x = startX - gridSize; x < startX + 800 + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - cameraX, 0);
        ctx.lineTo(x - cameraX, 600);
        ctx.stroke();
      }
      for (let y = startY - gridSize; y < startY + 600 + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - cameraY);
        ctx.lineTo(800, y - cameraY);
        ctx.stroke();
      }

      // Draw safe World Border limits warning indicators
      const borderPadding = 0;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.strokeRect(-cameraX, -cameraY, worldSize, worldSize);

      // Draw faint tactical radar circles centered at spawn to heighten military feel
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(worldSize / 2 - cameraX, worldSize / 2 - cameraY, 700, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(worldSize / 2 - cameraX, worldSize / 2 - cameraY, 1100, 0, Math.PI * 2);
      ctx.stroke();

      // RENDER TRAIL FLAME EMISSION TILE SETS
      ctx.save();
      trailsRef.current.forEach(tr => {
        const trViewX = tr.x - cameraX;
        const trViewY = tr.y - cameraY;

        // Pulsing pixel circle fire
        const ratio = tr.duration / tr.maxDuration;
        ctx.beginPath();
        ctx.arc(trViewX, trViewY, tr.radius * (0.8 + Math.random() * 0.4), 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(trViewX, trViewY, 2, trViewX, trViewY, tr.radius);
        gradient.addColorStop(0, 'rgba(254, 240, 138, 0.95)'); // bright yellow core
        gradient.addColorStop(0.4, 'rgba(249, 115, 22, 0.8)'); // fiery orange
        gradient.addColorStop(0.9, 'rgba(239, 68, 68, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw multiple pixel cubes in trail
        ctx.fillStyle = Math.random() > 0.5 ? '#f97316' : '#ef4444';
        const numP = 4;
        for (let idx = 0; idx < numP; idx++) {
          const px = trViewX + (Math.random() - 0.5) * tr.radius;
          const py = trViewY + (Math.random() - 0.5) * tr.radius;
          const sz = 1.5 + Math.random() * 3.5;
          ctx.fillRect(px - sz/2, py - sz/2, sz, sz);
        }
      });
      ctx.restore();

      // RENDER DROP BATTERIES (GREEN GLOW CUBES OR BLUE LIGHTNING MAGNET)
      batteriesRef.current.forEach(bat => {
        const batX = bat.x - cameraX;
        const batY = bat.y - cameraY;
        
        if (bat.type === 'magnet') {
          // High quality glowing blue electric lightning icon
          const glowPulse = Math.sin(frameCountRef.current * 0.2) * 3;
          ctx.fillStyle = '#1e40af'; // dark blue base
          ctx.beginPath();
          ctx.arc(batX, batY, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3b82f6'; // vibrant neon blue
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 6 + glowPulse;
          ctx.beginPath();
          ctx.arc(batX, batY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw lightning bolt
          ctx.fillStyle = '#e0f2fe'; // sky-blue white
          ctx.beginPath();
          ctx.moveTo(batX + 1, batY - 4);
          ctx.lineTo(batX - 2, batY + 0);
          ctx.lineTo(batX - 0.5, batY + 0);
          ctx.lineTo(batX - 1.5, batY + 4);
          ctx.lineTo(batX + 2, batY - 0);
          ctx.lineTo(batX + 0.5, batY - 0);
          ctx.closePath();
          ctx.fill();

          ctx.shadowBlur = 0;
        } else if (bat.type === 'heal') {
          // Glowing red cross / medical pack
          const glowPulse = Math.sin(frameCountRef.current * 0.15) * 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 4 + glowPulse;
          
          // Outer border
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(batX - 7, batY - 7, 14, 14);
          
          // Drawing a Red Cross
          ctx.fillStyle = '#ef4444';
          // Horizontal rect
          ctx.fillRect(batX - 5, batY - 1.5, 10, 3);
          // Vertical rect
          ctx.fillRect(batX - 1.5, batY - 5, 3, 10);
          
          // Highlight inner cross (white/pink)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(batX - 3.5, batY - 0.5, 7, 1);
          ctx.fillRect(batX - 0.5, batY - 3.5, 1, 7);
          
          ctx.shadowBlur = 0;
        } else if (bat.type === 'chest') {
          // Chest item (glowing golden box)
          const glowPulse = Math.sin(frameCountRef.current * 0.25) * 4;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 6 + glowPulse;
          
          // Draw chest box body
          ctx.fillStyle = '#78350f'; // brown border
          ctx.fillRect(batX - 8, batY - 6, 16, 12);
          
          ctx.fillStyle = '#d97706'; // gold color
          ctx.fillRect(batX - 6, batY - 4, 12, 8);
          
          // Steel/iron lock/band in center
          ctx.fillStyle = '#1e293b'; 
          ctx.fillRect(batX - 2, batY - 4, 4, 8);
          ctx.fillStyle = '#fbbf24'; // tiny gold padlock
          ctx.fillRect(batX - 1, batY - 1, 2, 2);
          
          ctx.shadowBlur = 0;
        } else if (bat.type === 'shield') {
          // Blue hexagon shield item
          const glowPulse = Math.sin(frameCountRef.current * 0.2) * 4;
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 6 + glowPulse;
          ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = batX + 8 * Math.cos(angle);
            const hy = batY + 8 * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.fillRect(batX - 1.5, batY - 1.5, 3, 3);
          ctx.shadowBlur = 0;
        } else {
          // XP drops -> High-contrast cyan/blue
          const glowPulse = Math.sin(frameCountRef.current * 0.15) * 2;
          ctx.fillStyle = '#06b6d4'; // bright cyan
          ctx.shadowColor = '#ffffff'; // white glow
          ctx.shadowBlur = 5 + glowPulse;
          
          ctx.fillRect(batX - 4, batY - 4, 8, 8);
          ctx.fillStyle = '#cffafe'; // very light cyan center
          ctx.fillRect(batX - 2, batY - 2, 4, 4);
          
          ctx.shadowBlur = 0; // reset shadow right away
        }
      });

      // RENDER ENEMIES (Drones and Boss visual structure)
      enemiesRef.current.forEach(e => {
        const ex = e.x - cameraX;
        const ey = e.y - cameraY;
        const hw = e.width / 2;
        const hh = e.height / 2;

        // Blink white when hit flash frame active
        if (e.isHitFlash > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ex - hw, ey - hh, e.width, e.height);
          return;
        }

        ctx.save();
        ctx.translate(ex, ey);

        if (e.type === 'drone') {
          // Type A: Green scouting drone
          ctx.fillStyle = '#14532d'; // dark forest green casing
          ctx.fillRect(-hw, -hh, e.width, e.height);
          
          ctx.fillStyle = '#22c55e'; // glowing neon emerald eye
          ctx.fillRect(-hw + 2, -hh + 2, e.width - 4, e.height - 4);

          // Top corner light specs
          ctx.fillStyle = '#a7f3d0';
          ctx.fillRect(-hw + 1, -hh + 1, 2, 2);
          ctx.fillRect(hw - 3, hh - 3, 2, 2);
        } 
        else if (e.type === 'fast_drone') {
          // Type B: Yellow suicide assault drone (delta wing flying fast)
          ctx.fillStyle = '#ca8a04'; // dark gold border
          ctx.beginPath();
          ctx.moveTo(0, -hh); // top leading apex
          ctx.lineTo(hw, hh);
          ctx.lineTo(-hw, hh);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#fef08a'; // hyper yellow inner wing core
          ctx.beginPath();
          ctx.moveTo(0, -hh + 3);
          ctx.lineTo(hw - 2, hh - 1);
          ctx.lineTo(-hw + 2, hh - 1);
          ctx.closePath();
          ctx.fill();

          // Core pixel blue thruster guide
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1.5, -0.5, 3, 2);
        } 
        else if (e.type === 'shield_drone') {
          // Type C: Dark Red Heavy Armored Tank Drone
          ctx.fillStyle = '#7f1d1d'; // dark maroon heavy shielding
          ctx.beginPath();
          ctx.moveTo(-hw, -hh + 5);
          ctx.lineTo(-hw + 5, -hh);
          ctx.lineTo(hw - 5, -hh);
          ctx.lineTo(hw, -hh + 5);
          ctx.lineTo(hw, hh - 5);
          ctx.lineTo(hw - 5, hh);
          ctx.lineTo(-hw + 5, hh);
          ctx.lineTo(-hw, hh - 5);
          ctx.closePath();
          ctx.fill();

          // Dark reactor core
          ctx.fillStyle = '#3f0c0a';
          ctx.fillRect(-hw / 2, -hh / 2, hw, hh);

          // Glowing plasma reactor light
          ctx.fillStyle = '#ef4444'; // glowing red core eye
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = '#fca5a5';
          ctx.fillRect(-1, -1, 2, 2);
        } 
        else if (e.type === 'sniper_drone') {
          // Type D: Purple Sniper drone (Medium sleek violet diamond fighter)
          ctx.fillStyle = '#581c87'; // dark purple casing
          ctx.beginPath();
          ctx.moveTo(0, -hh);    // pointed laser rail
          ctx.lineTo(hw, 0);     // right wing expander
          ctx.lineTo(0, hh);     // rear thruster nozzle
          ctx.lineTo(-hw, 0);    // left wing
          ctx.closePath();
          ctx.fill();

          // Inner sleek shield plate
          ctx.fillStyle = '#a855f7'; // neon violet reactor eye
          ctx.beginPath();
          ctx.moveTo(0, -hh + 4);
          ctx.lineTo(hw - 3, 0);
          ctx.lineTo(0, hh - 4);
          ctx.lineTo(-hw + 3, 0);
          ctx.closePath();
          ctx.fill();

          // Charge lens (laser point at front apex)
          ctx.fillStyle = '#fae8ff';
          ctx.fillRect(-1.5, -hh + 1, 3, 3);
        } 
        else if (e.type === 'mini_boss') {
          // Type Mini-Boss: Massive dark grey and glowing orange assault carrier (52x52)
          const pulse = Math.sin(frameCountRef.current * 0.15) * 4;
          
          // Outer bulky wings/shields
          ctx.fillStyle = '#374151'; // dark grey steel
          ctx.beginPath();
          ctx.arc(0, 0, hw, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer golden reactor ring
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, hw - 3, 0, Math.PI * 2);
          ctx.stroke();
          
          // Glowing hazard stripes / power plates
          ctx.fillStyle = '#f97316'; // orange glowing energy channels
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 4 + pulse;
          ctx.beginPath();
          ctx.arc(0, 0, hw - 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Center core armor
          ctx.fillStyle = '#111827'; // deep dark metal
          ctx.fillRect(-hw + 14, -hh + 14, e.width - 28, e.height - 28);
          
          // Triple core lasers
          ctx.fillStyle = '#fdba74'; // glowing light peach
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (e.type === 'boss') {
          // RENDER BOSS: GIANT BOMBER V-shape Flying Wing (90x52)
          // Sleek dark tech paint
          ctx.fillStyle = '#1e293b'; // slate dark metal fuselage
          ctx.beginPath();
          // Drawing symmetrical stealth bomber polygon offset specs
          ctx.moveTo(0, -hh); // front central nose
          ctx.lineTo(hw, -hh + 14); // right wing tip offset
          ctx.lineTo(hw - 8, -hh + 20);
          ctx.lineTo(15, hh); // inner engine wedge node
          ctx.lineTo(0, hh - 12); // tail hollow gap
          ctx.lineTo(-15, hh);
          ctx.lineTo(-hw + 8, -hh + 20);
          ctx.lineTo(-hw, -hh + 14);
          ctx.closePath();
          ctx.fill();

          // Overlay wing armor plates highlights
          ctx.fillStyle = '#475569';
          ctx.fillRect(-hw + 14, -hh + 10, 18, 4);
          ctx.fillRect(hw - 32, -hh + 10, 18, 4);

          // Neon glowing reactor engines
          const pulseReactor = Math.sin(frameCountRef.current * 0.3) > 0;
          ctx.fillStyle = pulseReactor ? '#a855f7' : '#d946ef'; // dark purple purple thrust exhausts
          ctx.fillRect(-12, hh - 8, 8, 4);
          ctx.fillRect(4, hh - 8, 8, 4);

          // Neon pink laser arrays cockpit window bar
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(-15, -hh + 6, 30, 4);
        }

        ctx.restore();
      });

      // RENDER ROTATING OPTION DRONES (if unlocked)
      {
        const fpvWeapon = p.weapons.find(w => w.type === 'fpv_drone');
        const evoDrones = p.weapons.find(w => w.type === 'evo_drones');
        const evoLaserWeb = p.weapons.find(w => w.type === 'evo_laser_web');
        
        if (fpvWeapon || evoDrones || evoLaserWeb) {
          let orbitRadius = 45;
          let numDrones = 2;
          let drawElectricWeb = false;
          
          if (fpvWeapon && fpvWeapon.level >= 5) {
            numDrones = 4;
            drawElectricWeb = true;
            orbitRadius = 55;
          }
          if (evoDrones) {
            numDrones = 2;
            orbitRadius = 45;
          }
          if (evoLaserWeb) {
            numDrones = 4;
            drawElectricWeb = true;
            orbitRadius = 80;
          }

          const dronePositions: {x: number, y: number, a: number}[] = [];
          for (let i = 0; i < numDrones; i++) {
            const a = droneAngleRef.current + (Math.PI * 2 / numDrones) * i;
            dronePositions.push({
              x: p.x + Math.cos(a) * orbitRadius - cameraX,
              y: p.y + Math.sin(a) * orbitRadius - cameraY,
              a: a
            });
          }

          // Draw electrical connections between drones
          if (drawElectricWeb) {
            ctx.beginPath();
            for (let i = 0; i < dronePositions.length; i++) {
              const dp = dronePositions[i];
              if (i === 0) ctx.moveTo(dp.x, dp.y);
              else ctx.lineTo(dp.x, dp.y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.random() * 0.4})`;
            ctx.lineWidth = Math.random() > 0.5 ? 2 : 1;
            ctx.stroke();
          }

          dronePositions.forEach(dp => {
            ctx.save();
            ctx.translate(dp.x, dp.y);
            ctx.rotate(dp.a * 2); // fast drone self rotation

            if (pixelCache.drone) {
              ctx.drawImage(pixelCache.drone, -8, -8);
            } else {
              // Fallback Simple cute metallic cube
              ctx.fillStyle = '#475569';
              ctx.fillRect(-6, -6, 12, 12);
              // Green sensor eye (Cyan for evo web)
              ctx.fillStyle = evoLaserWeb ? '#22d3ee' : '#22c55e';
              ctx.fillRect(-2, -5, 4, 3);
            }
            
            // Little tiny thruster flame particle representation
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-1, 5, 2, 2);

            // Render outward lasers for evo_laser_web
            if (evoLaserWeb) {
              ctx.rotate(-dp.a * 2); // unrotate to align with outward vector
              ctx.rotate(dp.a); // point outward
              ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
              ctx.fillRect(8, -1.5, 400, 3); // Long piercing beam
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(8, -0.5, 400, 1);
            }

            ctx.restore();

            if (!drawElectricWeb) {
              // Standard connective electricity tether to player
              ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x - cameraX, p.y - cameraY);
              ctx.lineTo(dp.x, dp.y);
              ctx.stroke();
            }
          });
        }
      }

      // RENDER PROJECTILES / AMMUNITON BULLETS
      bulletsRef.current.forEach(b => {
        const bx = b.x - cameraX;
        const by = b.y - cameraY;

        ctx.save();
        ctx.translate(bx, by);

        if (b.type === 'player_basic') {
          // Machine Gun bullet: small yellow bar inclined with its vector
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-6, -2, 12, 4);
          
          ctx.fillStyle = '#ffffff'; // bullet tip core glow
          ctx.fillRect(2, -1, 4, 2);
        } 
        else if (b.type === 'player_missile') {
          // Rocket Missile: larger white rocket, red tip nose conic with smoke tail sparks
          const ang = b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          
          // Missile body
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-10, -3.5, 14, 7);
          
          // Warhead cone (red dot)
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(4, -3.5);
          ctx.lineTo(10, 0);
          ctx.lineTo(4, 3.5);
          ctx.closePath();
          ctx.fill();

          // Rear stabilizing wings (metal dark anchors)
          ctx.fillStyle = '#475569';
          ctx.fillRect(-12, -5.5, 3, 2);
          ctx.fillRect(-12, 3.5, 3, 2);
        } 
        else if (b.type === 'player_flare') {
          // Anti Air Defence Flares: expanding halo rings -> Tech Hexagon Burst
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = Math.cos(angle) * b.radius;
            const py = Math.sin(angle) * b.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          
          const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius);
          if (b.isHellfireLvl5) {
            grad.addColorStop(0, '#bae6fd'); // bright blue core
            grad.addColorStop(0.3, '#0ea5e9'); // intense cyan
            grad.addColorStop(0.8, 'rgba(2,132,199,0.2)');
            grad.addColorStop(1, 'rgba(2,132,199,0)');
          } else {
            grad.addColorStop(0, '#fef08a'); // central solar flare yellow
            grad.addColorStop(0.3, '#f97316'); // intense fire orange
            grad.addColorStop(0.8, 'rgba(239,68,68,0.2)');
            grad.addColorStop(1, 'rgba(239,68,68,0)');
          }
          
          ctx.fillStyle = grad;
          ctx.fill();
        } 
        else if (b.type === 'player_laser') {
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          ctx.fillStyle = '#fca5a5';
          ctx.fillRect(-15, -1.5, 30, 3);
          ctx.fillStyle = '#fff';
          ctx.fillRect(-12, -0.5, 24, 1);
        }
        else if (b.type === 'player_hellfire') {
          const ang = b.angle !== undefined ? b.angle : Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          
          if (pixelCache.hellfire) {
             ctx.drawImage(pixelCache.hellfire, -20, -6);
          } else {
            // Massive missile body fallback
            ctx.fillStyle = '#475569';
            ctx.fillRect(-14, -6, 20, 12);
            
            // Warhead cone 
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(6, -6);
            ctx.lineTo(16, 0);
            ctx.lineTo(6, 6);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#dc2626'; // red hazard tip
            ctx.beginPath();
            ctx.moveTo(12, -2.4);
            ctx.lineTo(16, 0);
            ctx.lineTo(12, 2.4);
            ctx.closePath();
            ctx.fill();
          }

          // Rear thruster exhaust (dynamic spark)
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-22, -2, 4, 4);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-24, -1, 2, 2);
        }
        else if (b.type === 'player_evo_pierce') {
          // Evolved Incendiary Armor-Piercing core plasma bullet
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          
          ctx.fillStyle = '#fef08a'; // hyper dense heat yellow fuel
          ctx.beginPath();
          ctx.moveTo(b.radius, 0);
          ctx.lineTo(-b.radius, -b.radius / 1.5);
          ctx.lineTo(-b.radius/2, 0);
          ctx.lineTo(-b.radius, b.radius / 1.5);
          ctx.closePath();
          ctx.fill();

          // Pulse rings outwards
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-b.radius * 1.5, -4, b.radius * 3, 8);
        }
        else if (b.type === 'enemy_bullet') {
          // Enemy sniper red bullet: high contrast glowing crimson orb
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius);
          grad.addColorStop(0, '#ffffff'); // pure bright core
          grad.addColorStop(0.3, '#f43f5e'); // neon rose/red middle
          grad.addColorStop(1, 'rgba(225, 29, 72, 0)'); // fade out edge
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();
      });

      // RENDER ACTIVE DUST PARTICLES (Explosions bursts)
      particlesRef.current.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.fillRect(pt.x - cameraX - pt.size / 2, pt.y - cameraY - pt.size / 2, pt.size, pt.size);
      });
      ctx.globalAlpha = 1.0; // reset transparency

      // RENDER THE COMBAT HELICOPTER (PLAYER APPARATUS)
      ctx.save();
      const pxView = p.x - cameraX;
      const pyView = p.y - cameraY;
      ctx.translate(pxView, pyView);
      ctx.rotate(p.angle); // banking side-climb banking tilt

      // Flash player screen red briefly if hit invincibility timers are counting or F-22 is in stealth
      let isF22Stealth = false;
      if (p.vehicleType === 'F22') {
        const stealthCycle = p.timeElapsed % 12;
        isF22Stealth = stealthCycle >= 10;
      }
      const isDamagedBlink = playerInvincibleTicksRef.current > 0;
      const renderHelicopterNormal = (!isDamagedBlink && !isF22Stealth) || (Math.floor(frameCountRef.current / 4) % 2 === 0);

      if (renderHelicopterNormal) {
        if (p.vehicleType === 'F22') {
          // --- DRAW F-22 RAPTOR (Supersonic Metallic Silver Jets) ---
          // Main geometric triangular fuselage (朝右，所以 x 軸向右)
          ctx.fillStyle = '#64748b'; // Sleek slate armor plating
          ctx.beginPath();
          ctx.moveTo(22, 0);       // Nose
          ctx.lineTo(-20, -15);    // Left main wing base tail
          ctx.lineTo(-11, -4);     // Inside wedge
          ctx.lineTo(-14, 0);      // Center engine root
          ctx.lineTo(-11, 4);      // Inside wedge
          ctx.lineTo(-20, 15);     // Right main wing base tail
          ctx.closePath();
          ctx.fill();

          // Highlight dorsal ridge core
          ctx.fillStyle = '#475569'; // Darker mechanical plates
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.lineTo(-10, -8);
          ctx.lineTo(-6, 0);
          ctx.lineTo(-10, 8);
          ctx.closePath();
          ctx.fill();

          // Cyber Electroluminescent cockpit windshield glass (Electric blue glow)
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(8, -3);
          ctx.lineTo(15, 0);
          ctx.lineTo(8, 3);
          ctx.lineTo(4, 0);
          ctx.closePath();
          ctx.fill();

          // Spark gleam inside canopy
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(8, -1, 3, 2);

          // Twin-vector exhaust thrusters glowing flame output
          ctx.fillStyle = (frameCountRef.current % 2 === 0) ? '#f97316' : '#ef4444'; // pulsing heat
          ctx.fillRect(-18, -6, 5, 3);
          ctx.fillRect(-18, 3, 5, 3);

          ctx.fillStyle = '#fef08a'; // yellow inner core
          ctx.fillRect(-16, -5, 2, 1);
          ctx.fillRect(-16, 4, 2, 1);

        } else if (p.vehicleType === 'AC130') {
          // --- DRAW AC-130H SPECTRE (Heavy Iron Flying Fortress) ---
          // Heavy wide center fuselage box structure
          ctx.fillStyle = '#1e293b'; // Super dark charcoal hull
          ctx.fillRect(-22, -12, 44, 24);
          ctx.fillStyle = '#0f172a'; // Bottom shading plate
          ctx.fillRect(-22, 6, 44, 4);

          // Rounded front radar dome
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(22, 0, 8, -Math.PI/2, Math.PI/2);
          ctx.fill();

          // High-aspect long wings spanning vertically (across the y-axis)
          ctx.fillStyle = '#334155'; // Dark blue steel main wing slab
          ctx.fillRect(-6, -35, 12, 70); // Huge wingspan bounds

          // Right & Left wingtips navigational strobe lights (Flash red/white)
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-3, -37, 6, 2);
          ctx.fillRect(-3, 35, 6, 2);

          // Portside active artillery gun cannons pointing outward (downward relative to flight)
          ctx.fillStyle = '#78716c';
          ctx.fillRect(-10, 10, 4, 16);  // Major howitzer gun barrels
          ctx.fillRect(-2, 10, 3, 12);   // Secondary minigun pods

          // Dual mechanical turboprop engine nacelles housed on left & right wings
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-10, -22, 12, 7);  // Left engine body
          ctx.fillRect(-10, 15, 12, 7);   // Right engine body

          // Active rotating triple-propeller blade spinners
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          const pAngle = p.rotorAngle * 1.5;
          
          // Left Propeller lines
          ctx.beginPath();
          ctx.moveTo(-2, -18);
          ctx.lineTo(-2 + Math.cos(pAngle) * 11, -18 + Math.sin(pAngle) * 11);
          ctx.moveTo(-2, -18);
          ctx.lineTo(-2 - Math.cos(pAngle) * 11, -18 - Math.sin(pAngle) * 11);
          // Right Propeller lines
          ctx.moveTo(-2, 19);
          ctx.lineTo(-2 + Math.cos(pAngle + Math.PI/2) * 11, 19 + Math.sin(pAngle + Math.PI/2) * 11);
          ctx.moveTo(-2, 19);
          ctx.lineTo(-2 - Math.cos(pAngle + Math.PI/2) * 11, 19 - Math.sin(pAngle + Math.PI/2) * 11);
          ctx.stroke();

        } else {
          // --- DRAW AH-64 COPTEL (Original Armed Heavy Helicopter) ---
          ctx.fillStyle = '#1e3f20'; // deep military olive green
          ctx.fillRect(-18, -10, 36, 18);
          ctx.fillStyle = '#14532d'; // darker accents shadow
          ctx.fillRect(-18, 2, 36, 6);

          // Cockpit window (Blue electric tech armor glass)
          ctx.fillStyle = '#06b6d4'; // bright glowing cyan plate
          ctx.beginPath();
          ctx.moveTo(4, -8);
          ctx.lineTo(16, -8);
          ctx.lineTo(18, 2);
          ctx.lineTo(4, 2);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#22d3ee'; // gleam flash light
          ctx.fillRect(8, -6, 6, 3);

          // Tail boom assembly line
          ctx.fillStyle = '#1e3f20';
          ctx.fillRect(-34, -5, 18, 6);
          ctx.fillStyle = '#14532d';
          ctx.fillRect(-34, 1, 18, 2);

          // Vertical Stabilizer fins
          ctx.fillStyle = '#0f766e';
          ctx.beginPath();
          ctx.moveTo(-34, -12);
          ctx.lineTo(-28, -5);
          ctx.lineTo(-34, -5);
          ctx.closePath();
          ctx.fill();

          // Tail counter-weight blade rotor assembly
          ctx.fillStyle = '#78716c';
          ctx.fillRect(-38, -8, 2, 12);
          
          // Mini rotate tail rotor line representation
          const trAng = p.rotorAngle * 0.7;
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-37, -2);
          ctx.lineTo(-37 + Math.cos(trAng) * 6, -2 + Math.sin(trAng) * 6);
          ctx.moveTo(-37, -2);
          ctx.lineTo(-37 + Math.cos(trAng + Math.PI) * 6, -2 + Math.sin(trAng + Math.PI) * 6);
          ctx.stroke();

          // Under-fuselage Landing Gear runners skids
          ctx.fillStyle = '#374151'; // dark iron steel bounds
          ctx.fillRect(-14, 10, 26, 3); // Skid tube horizontal
          ctx.fillRect(-10, 8, 3, 3); // struts support
          ctx.fillRect(6, 8, 3, 3);

          // Armament Weapon Launcher carriage side wing pods
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(-8, -13, 16, 4); // launcher rack
          
          // Spinning Main Top Helicopter Rotor Blades Assembly
          ctx.fillStyle = '#475569';
          ctx.fillRect(-3, -15, 6, 6); // Rotor shaft spindle mounting

          ctx.strokeStyle = '#94a3b8'; // Rotor blades color metallic plate
          ctx.lineWidth = 2.5;

          // 3 rotor blade structures rotated by dynamic rotorAngle accumulator
          const angles = [p.rotorAngle, p.rotorAngle + (Math.PI * 2) / 3, p.rotorAngle + (Math.PI * 4) / 3];
          const bladeSpansAllowed = 44; // pixel drag size

          angles.forEach(ang => {
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(Math.cos(ang) * bladeSpansAllowed, -12 + Math.sin(ang) * 4); // slight slant drop illusion
            ctx.stroke();

            // Tiny yellow safety signal pixel at the tip of blade
            ctx.fillStyle = '#eab308';
            ctx.fillRect(Math.cos(ang) * bladeSpansAllowed - 1, -13 + Math.sin(ang) * 4, 3, 3);
          });
        }
      } else {
        // Red state blinking when taking bullet or collision damage
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-18, -10, 36, 18);
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(-34, -5, 18, 6);
      }

      // Draw Hexagonal Shield
      if (p.shield > 0) {
        ctx.beginPath();
        const hexSize = p.radius + 18;
        for (let i = 0; i < 6; i++) {
          const angle_deg = 60 * i - 30; // rotated
          const angle_rad = Math.PI / 180 * angle_deg;
          const px = Math.cos(angle_rad) * hexSize;
          const py = Math.sin(angle_rad) * hexSize;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(14, 165, 233, 0.1)'; // Flat transparent tech fill instead of circular gradient
        ctx.fill();

        // Pulsing intense border when shield active or low
        const pulse = 0.5 + Math.sin(Date.now() / 150) * 0.5;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.6})`;
        ctx.lineWidth = 2 + pulse * 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore(); // retrieve shake translation frames safely

      ctx.restore(); // restore global saves

      // Draw screen lightning blue flash if magnet was activated (absolute screen-space overlay)
      if (magnetFlashRef.current > 0) {
        ctx.fillStyle = `rgba(147, 197, 253, ${magnetFlashRef.current * 0.06})`;
        ctx.fillRect(0, 0, 800, 600);
        magnetFlashRef.current--;
      }

       // Joystick has been extracted to a DOM overlay module

      // Continue game execution frames
      animId = requestAnimationFrame(gameLoop);
      animationFrameIdRef.current = animId;
    };

    // Begin looping
    animId = requestAnimationFrame(gameLoop);
    animationFrameIdRef.current = animId;

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [gameState, isMobile]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if (gameStateRef.current !== 'PLAYING') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const joy = joystickRef.current;
    
    // We treat pointer events relative to the local controls container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    joy.active = true;
    joy.startX = x;
    joy.startY = y;
    joy.baseX = x;
    joy.baseY = y;
    joy.curX = x;
    joy.curY = y;
    joy.vx = 0;
    joy.vy = 0;

    if (joystickBaseRef.current) {
      joystickBaseRef.current.style.display = 'block';
      joystickBaseRef.current.style.left = `${x}px`;
      joystickBaseRef.current.style.top = `${y}px`;
    }
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if (gameStateRef.current !== 'PLAYING') return;
    const joy = joystickRef.current;
    if (!joy.active) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const tx = e.clientX - rect.left;
    const ty = e.clientY - rect.top;
    
    const dx = tx - joy.baseX;
    const dy = ty - joy.baseY;
    const limit = 50; 
    let curX = tx;
    let curY = ty;
    
    const dist = Math.hypot(dx, dy);
    
    if (dist > limit) {
      joy.vx = dx / dist;
      joy.vy = dy / dist;
      curX = joy.baseX + joy.vx * limit;
      curY = joy.baseY + joy.vy * limit;
    } else {
      joy.vx = dx / limit;
      joy.vy = dy / limit;
    }
    
    joy.curX = curX;
    joy.curY = curY;

    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(-50%, -50%) translate(${curX - joy.baseX}px, ${curY - joy.baseY}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const joy = joystickRef.current;
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
    if (joystickBaseRef.current) {
      joystickBaseRef.current.style.display = 'none';
    }
  };

  const CockpitHUD = ({ mobileMode }: { mobileMode: boolean }) => {
    if (gameState !== 'PLAYING') return null;

    const p = playerRef.current;
    if (!p) return null;

    const iconsMap: Record<string, string> = {
      machine_gun: '🔫', homing_missile: '🎯', flare: '☀️', fpv_drone: '🛸', hellfire: '🌋',
      evo_pierce: '🔥', evo_drones: '🚀', evo_doomsday: '☢️', evo_laser_web: '⚡',
      armor: '🛡️', engine: '🚀', magnet: '🧲'
    };

    const combinedItems = [
      ...(p.weapons || []).map(w => ({ type: w.type, level: w.level, isEvo: w.level >= 6 })),
      ...(p.passives || []).map(ps => ({ type: ps.type, level: ps.level, isEvo: false }))
    ];

    if (!mobileMode) {
      const sliceItems = combinedItems.slice(0, 6);
      while (sliceItems.length < 6) {
        sliceItems.push({ type: 'empty', level: 0, isEvo: false });
      }
      combinedItems.length = 0;
      combinedItems.push(...sliceItems);
    }

    const isHpLow = (hudMaxHp > 0) && (hudHp / hudMaxHp) <= 0.3;

    return (
      <div className={`${mobileMode ? 'flex flex-col gap-1 w-full bg-slate-950 p-2 z-10 shadow-md' : 'absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between'} select-none`}>
        <div className={`flex ${mobileMode ? 'flex-col gap-2' : 'flex-row items-start justify-between w-full'}`}>
          <div className={`flex ${mobileMode ? 'items-center justify-between gap-2' : 'w-full justify-between'}`}>
            <div className={`flex flex-col gap-1.5 ${mobileMode ? 'flex-1' : 'bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg backdrop-blur shadow-md w-72'}`}>
              {!mobileMode && (
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-lg text-white">
                    LV. <span className="text-teal-400">{hudLevel}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                    {selectedVehicle === 'AH64' ? 'AH-64 COPTEL' : selectedVehicle === 'F22' ? 'F-22 RAPTOR' : 'AC-130H SPECTRE'}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <div className={`flex items-center justify-between font-mono text-slate-300 ${mobileMode ? 'text-[9px]' : 'text-[11px]'}`}>
                  <span className="flex items-center gap-1"><Shield className="h-2 w-2 text-emerald-400" /> HP</span>
                  <span className="text-white font-bold">{hudHp}/{hudMaxHp}</span>
                </div>
                <div className={`w-full bg-slate-900 border rounded-sm overflow-hidden p-0.5 ${mobileMode ? 'h-4' : 'h-5'} ${isHpLow ? 'border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse' : 'border-slate-800'}`}>
                  <div 
                    className={`h-full rounded-sm transition-all duration-300 ${isHpLow ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                    style={{ width: `${Math.max(0, Math.min(100, (hudHp / (hudMaxHp || 1)) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className={`flex items-center justify-between font-mono text-slate-300 ${mobileMode ? 'text-[9px]' : 'text-[11px]'}`}>
                  <span className="flex items-center gap-1"><Zap className="h-2 w-2 text-cyan-400" /> LV.{hudLevel} XP</span>
                  <span className="text-white font-bold">{hudXp}/{hudMaxXp}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 border border-slate-800 rounded-sm overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-sm transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, (hudXp / (hudMaxXp || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className={`flex items-center ${mobileMode ? 'gap-1' : 'gap-2.5'}`}>
              <div className={`flex items-center ${mobileMode ? 'gap-1 bg-slate-900 px-1.5 py-1 rounded border border-slate-800' : 'gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-lg backdrop-blur shadow'}`}>
                <Clock className={`${mobileMode ? 'h-3 w-3' : 'h-4 w-4'} text-amber-400 shrink-0`} />
                <div className="font-mono text-right">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest leading-none">TIME</div>
                  <div className={`${mobileMode ? 'text-[10px]' : 'text-base font-black'} text-white leading-tight`}>
                    {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
              <div className={`flex items-center ${mobileMode ? 'gap-1 bg-slate-900 px-1.5 py-1 rounded border border-slate-800' : 'gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-lg backdrop-blur shadow'}`}>
                <Skull className={`${mobileMode ? 'h-3 w-3' : 'h-4 w-4'} text-rose-500 shrink-0 animate-bounce`} />
                <div className="font-mono text-right">
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest leading-none">KILLS</div>
                  <div className={`${mobileMode ? 'text-[10px]' : 'text-base font-black'} text-white leading-tight`}>{hudKills}</div>
                </div>
              </div>
            </div>
          </div>

          {/* INVENTORY SLOTS */}
          <div className={`${mobileMode ? 'w-full overflow-x-auto flex gap-1.5 pb-1' : 'absolute top-[120px] left-3.5 w-72 bg-slate-950/80 border border-slate-800/80 rounded-lg p-1.5 backdrop-blur flex justify-between gap-1'}`}>
            {combinedItems.map((item, idx) => (
              <div key={idx} className={`${mobileMode ? 'shrink-0 h-10 w-10 flex items-center justify-center' : 'flex-1 aspect-square flex items-center justify-center'} bg-slate-900 border border-slate-800 rounded relative shadow-inner`}>
                {item.type !== 'empty' && (
                  <>
                    <span className="text-sm">{iconsMap[item.type] || '❓'}</span>
                    <span className={`absolute -bottom-1 -right-0.5 text-[7px] font-black font-mono px-0.5 rounded ${item.isEvo ? 'bg-purple-600 text-white' : item.level === 5 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                      {item.isEvo ? 'EVO' : item.level === 5 ? 'MAX' : `L${item.level}`}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

        </div>

        {!mobileMode && (
          <div className="w-full flex flex-col items-center gap-2.5">
            <AnimatePresence>
              {bossActive && (
                <motion.div 
                  className="w-full max-w-md bg-slate-950/90 border-2 border-purple-900/80 p-2.5 rounded-lg shadow-2xl backdrop-blur relative overflow-hidden"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5 text-purple-400 font-extrabold uppercase animate-pulse">
                      <AlertTriangle className="h-4 w-4 text-purple-400 inline-block animate-ping" /> 敵方旗艦：巨型戰略轟炸機
                    </span>
                    <span className="text-white bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">{bossHp} / {bossMaxHp} HP</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded transition-all duration-75"
                      style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800/80 backdrop-blur text-[10.5px] font-mono tracking-widest uppercase text-slate-400 flex items-center gap-4">
              <span>SEC_00-30: 偵察機湧入</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>SEC_60: 鋼鐵重型機</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className={gameTime >= 120 ? 'text-purple-400 font-bold' : ''}>SEC_120: 旗艦BOSS降臨</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
      <div 
        id="game_app_container" 
        className="arcade-wrapper w-full h-[100dvh] lg:min-h-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden lg:overflow-x-hidden lg:flex lg:flex-col lg:items-center lg:justify-center grid grid-rows-[auto_1fr_auto] lg:block lg:px-4 lg:py-8 touch-none relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Floating Joystick Visuals (Global Fullscreen) */}
        <div 
          ref={joystickBaseRef} 
          className="absolute w-24 h-24 rounded-full border-2 border-cyan-500/50 bg-cyan-900/20 shadow-[0_0_15px_rgba(34,211,238,0.2)] pointer-events-none z-[100]" 
          style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
        >
          {/* Inner Knob */}
          <div 
            ref={joystickKnobRef}
            className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] border-2 border-white/50 pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
          />
        </div>

        {/* MOBILE HEADER */}
        <div className="lg:hidden w-full z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <CockpitHUD mobileMode={true} />
          </div>
        </div>

      {/* Absolute futuristic HUD command deck console casing */}
      <div className="w-full max-w-5xl flex flex-col gap-4 flex-1 lg:flex-none">
        
        {/* UPPER NAVIGATION BAR STRIP WITH CHIPS */}
        <div id="command_deck_header" className="hidden lg:flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <span className="font-display font-black text-xl tracking-tighter">AH</span>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white font-display uppercase">戰鬥直升機：無盡突圍</h1>
              <p className="text-xs text-teal-400 font-mono tracking-widest uppercase">AVIONICS TACTICAL COMMAND SCREEN</p>
            </div>
          </div>

          {/* HIGH SCORE AND SOUND CONTROL BUTTONS */}
          <div className="flex items-center gap-3 font-mono text-sm">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md text-amber-400 flex items-center gap-1.5 shadow-inner">
              <Award className="h-4 w-4 shrink-0" />
              <span>最高突圍數:</span>
              <span className="font-bold text-base text-yellow-300">{highScore}</span>
            </div>
            
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                playSound('power');
              }}
              id="mute_switch_btn"
              className={`p-2.5 rounded-md border text-slate-400 transition-all ${isMuted ? 'bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-950/60' : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white'}`}
              title={isMuted ? "解除靜音" : "靜音控制"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* COCKPIT DUAL-COLUMN INSTRUMENT SPLIT INTERFACES */}
        <div id="deck_grid_split_row" className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 items-start w-full">
          
          {/* LEFT AVIONICS FLIGHT CONTROLLER PANEL */}
          <div id="left_panel_avionics" className="hidden lg:flex flex-col gap-4 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl shadow-lg backdrop-blur-sm self-stretch min-h-[500px]">
            <h2 className="text-sm font-bold text-teal-400 font-mono tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5 uppercase">
              <Cpu className="h-4 w-4 shrink-0 animate-pulse text-teal-500" /> Weapon Systems
            </h2>

            {/* LIVE SYSTEM STATE CHIPS BAR */}
            <div className="space-y-3.5 flex-1 py-1.5">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block">Active Armaments</span>
                <div className="grid grid-cols-1 gap-2">
                  {weapons.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 border border-slate-800/80 px-2.5 py-2 rounded-lg relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-indigo-500" />
                      <div className="flex items-center gap-2 pl-1.5">
                        <span className="text-lg">
                          {(() => {
                            const icons: Record<string, string> = { machine_gun: '🔫', homing_missile: '🎯', flare: '☀️', fpv_drone: '🛸', hellfire: '🌋', evo_pierce: '🔥', evo_drones: '🚀', evo_doomsday: '☢️', evo_laser_web: '⚡' };
                            return icons[w.type] || '❓';
                          })()}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white leading-none">
                            {(() => {
                              const names: Record<string, string> = {
                                machine_gun: '自動化重機槍', homing_missile: '雷達追蹤飛彈', flare: '側翼高熱熱焰彈', fpv_drone: '環繞護衛機', hellfire: '地獄火飛彈',
                                evo_pierce: '🔥 燃燒穿甲彈 [超武]', evo_drones: '🚀 浮游砲陣列 [超武]', evo_doomsday: '☢️ 末日審判 [超武]', evo_laser_web: '⚡ 磁爆切割網 [超武]'
                              };
                              return names[w.type] || w.type;
                            })()}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {w.level === 6 ? 'LEVEL MAX (EVO)' : `LV.${w.level} / 5`}
                          </span>
                        </div>
                      </div>
                      
                      {w.level < 5 && w.level > 0 && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, st) => (
                            <div 
                              key={st} 
                              className={`h-2.5 w-1.5 rounded-sm ${st < w.level ? 'bg-teal-400' : 'bg-slate-800'}`} 
                            />
                          ))}
                        </div>
                      )}
                      
                      {w.level === 5 && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-mono border border-yellow-500/20 uppercase font-black tracking-tighter">MAX</span>
                      ) }

                      {w.level === 6 && (
                        <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded font-mono border border-fuchsia-500/20 uppercase font-black animate-pulse tracking-tighter">EVO</span>
                      ) }
                    </div>
                  ))}
                  {weapons.length === 0 && (
                    <div className="text-xs text-slate-500 font-mono text-center py-4 bg-slate-950/40 border border-dashed border-slate-800 rounded">
                      No weapons active
                    </div>
                  )}
                </div>
              </div>

              {/* TACTICAL EVOLUTIONS COMBINATION GUIDE */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg space-y-2">
                <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest block flex items-center gap-1">
                  <Sparkles className="h-3 w-3 shrink-0 text-yellow-400" /> Evolution Recipe Guide
                </span>
                <div className="space-y-2 font-mono text-[10.5px] text-slate-400">
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/40">
                    <p className="text-yellow-400 font-bold">🔥 燃燒穿甲彈 (ULTIMATE PIERCE)</p>
                    <p className="mt-0.5">機槍 [Lv.5] + 熱焰彈 [Lv.5]</p>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/40">
                    <p className="text-purple-400 font-bold">🚀 浮游砲陣列 (DRONE ARRAY)</p>
                    <p className="mt-0.5">追蹤飛彈 [Lv.5] + 任何 [Lv.5] 武器</p>
                  </div>
                </div>
              </div>
            </div>

            {/* KEYBOARD CONTROLS DECK GRAPHIC */}
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2 font-black">鍵盤操作指引</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded border border-slate-800/50">
                  <span className="bg-slate-800 border-2 border-slate-700 px-1.5 py-0.5 rounded font-black text-white text-[11px] shadow">W</span>
                  <span className="text-slate-400">向上爬升</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded border border-slate-800/50">
                  <span className="bg-slate-800 border-2 border-slate-700 px-1.5 py-0.5 rounded font-black text-white text-[11px] shadow">S</span>
                  <span className="text-slate-400">防守降落</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded border border-slate-800/50">
                  <span className="bg-slate-800 border-2 border-slate-700 px-1.5 py-0.5 rounded font-black text-white text-[11px] shadow">A</span>
                  <span className="text-slate-400">向左偏航</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded border border-slate-800/50">
                  <span className="bg-slate-800 border-2 border-slate-700 px-1.5 py-0.5 rounded font-black text-white text-[11px] shadow">D</span>
                  <span className="text-slate-400">向右側傾</span>
                </div>
              </div>
              <p className="text-[10px] text-teal-400 font-mono tracking-tighter mt-2 text-center">
                * 系統配備自動戰鬥儀，子彈會自動鎖定射擊
              </p>
            </div>
          </div>

          {/* MAIN RADAR CANVAS GAME CONSOLE viewport */}
          <div id="radar_canvas_central_core" className="h-full lg:h-auto order-1 lg:order-2 lg:col-span-3 flex flex-col items-center bg-transparent lg:bg-slate-900/40 border-0 lg:border lg:border-slate-800/60 lg:rounded-xl overflow-hidden lg:shadow-2xl relative">
            
            {/* SCREEN CALIBRATION BEZEL TOP */}
            <div className="hidden lg:flex w-full bg-slate-900/90 text-slate-400 border-b border-slate-850 px-4 py-2 items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span className="uppercase text-emerald-400 tracking-wider">RADAR SCANNER FEED FEED [ONLINE]</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                <span>SCALE: 100M</span>
                <span>ZONE: SEC-049</span>
                <span>WID: 2500px</span>
              </div>
            </div>

            {/* RENDER CANVAS CONTAINER */}
            <div className="w-full flex-1 relative lg:border-4 border-y-2 border-slate-800 bg-black shadow-inner flex items-center justify-center p-0 select-none cursor-crosshair overflow-hidden">
              
              {/* HTML5 Canvas Element */}
              <canvas
                id="battlefield_canvas"
                ref={canvasRef}
                width={800}
                height={600}
                className="block w-full h-full object-cover lg:max-w-full lg:h-auto lg:object-contain rounded-none lg:rounded outline-none selection:bg-transparent"
              />

              {/* WARNING OVERLAY */}
              {gameState === 'PLAYING' && [60, 120, 180, 240, 300].some(s => s > gameTime && s - gameTime <= 5) && (
                <div className="absolute top-1/4 left-0 right-0 w-full text-center z-40 pointer-events-none">
                  <h2 className="text-4xl md:text-5xl font-black text-red-500 tracking-[0.2em] font-display animate-pulse text-shadow-[0_0_30px_rgba(239,68,68,1)] uppercase">
                    WARNING: ELITE UNIT APPROACHING
                  </h2>
                </div>
              )}

              {/* GAMEPLAY OVERLAY HUD IN THE CANVAS FRAME (Desktop Only) */}
              <div className="hidden lg:block">
                <CockpitHUD mobileMode={false} />
              </div>

              {/* OVERLAYS SYSTEM - MENU SCREENS AND DIALOGS */}
              
              {/* START INITIAL MENU OVERLAY */}
              {gameState === 'START_MENU' && (
                <div id="start_screen_overlay" className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center p-4 text-center z-30 backdrop-blur">
                  <h2 className="game-title text-4xl md:text-6xl font-black text-white tracking-widest leading-none mb-10 text-shadow-lg">
                    戰機武裝：<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-yellow-300">無盡突圍</span>
                  </h2>
                  <button 
                    onClick={() => { console.log('START_BTN_CLICKED'); playSound('power'); changeGameState('VEHICLE_SELECTION'); }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl md:text-2xl py-4 px-12 md:px-16 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                  >
                    啟動直升機推進器 / START ENGINE
                  </button>
                </div>
              )}

              {/* CHARACTER SELECTION OVERLAY */}
              {gameState === 'VEHICLE_SELECTION' && (
                <div id="start_screen_overlay" className="absolute inset-x-0 inset-y-0 bg-slate-950/98 flex flex-col items-center justify-center p-4 text-center z-20 backdrop-blur overflow-y-auto">
                  
                  {/* Outer Main Heading Header */}
                  <div className="text-center space-y-1 mb-3">
                    <span className="text-[10px] text-teal-400 font-mono tracking-widest bg-teal-950/80 border border-teal-900/60 px-3 py-0.5 rounded-full uppercase font-bold inline-block">
                      ROUGELIKE MILITARY FLIGHT SURVIVAL
                    </span>
                    <h2 className="game-title text-3xl font-black text-white tracking-widest leading-none">
                      戰機武裝：<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-yellow-300">無盡突圍</span>
                    </h2>
                  </div>

                  {/* Two Column Command Center Split */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full max-w-2xl px-2">
                    
                    {/* LEFT PANEL: CYBER TECH PROJECT NOTES (2 column span) */}
                    <div className="md:col-span-2 border border-emerald-500/30 bg-emerald-950/10 p-3 rounded-lg flex flex-col text-left">
                      <div className="flex items-center gap-1.5 border-b border-emerald-500/20 pb-1.5 mb-2 font-mono">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">INITIALIZATION LOG & NOTES</span>
                      </div>
                      <div className="font-mono text-[10px] text-emerald-400 leading-relaxed whitespace-pre-wrap select-text h-full">{"1. PROJECT INITIALIZED: VITE + TYPESCRIPT ARCHITECTURE CONFIRMED.\n2. DEPLOYMENT TARGET: GITHUB PAGES VIA GITHUB ACTIONS.\n3. NEW FEATURE: CHARACTER SELECTION INTERFACE ADDED FOR MULTIPLE DEPLOYABLE UNITS (AH-64, F-22, AC-130).\n4. STEAM VERSION PREPARATION: FUTURE EXTENSIONS WILL INCLUDE 10+ EVO-WEAPONS AND FULL CHARACTER UNLOCKS."}</div>
                      
                      {/* Sub footer */}
                      <div className="mt-4 pt-1.5 border-t border-emerald-500/20 text-[9px] font-mono text-emerald-500/70">
                        OFFICIAL ALPHA COMMAND BUILD v1.28
                      </div>
                    </div>

                    {/* RIGHT PANEL: CHARACTER SELECT (3 column span) */}
                    <div className="md:col-span-3 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase font-bold block mb-1.5">★ 請選擇您要部署的出擊機體</span>
                        
                        <div className="space-y-2">
                          {/* AH-64 CARDS */}
                          <button
                            onClick={() => { console.log('VEHICLE_SELECTED'); setSelectedVehicle('AH64'); playSound('power'); }}
                            className={`w-full text-left p-2 rounded-lg border flex items-center gap-2.5 transition-all ${selectedVehicle === 'AH64' ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}`}
                          >
                            <span className="text-xl">🟢</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center leading-none">
                                <span className={`text-[11px] font-bold ${selectedVehicle === 'AH64' ? 'text-emerald-400' : 'text-white'}`}>AH-64 COPTEL 阿帕契</span>
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded uppercase font-mono border border-emerald-500/20">防禦型</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                                護甲天賦：HP 高出 30%，自帶 20% 減傷護甲。
                              </p>
                            </div>
                          </button>

                          {/* F-22 RAPTOR CARD */}
                          <button
                            onClick={() => { console.log('VEHICLE_SELECTED'); setSelectedVehicle('F22'); playSound('power'); }}
                            className={`w-full text-left p-2 rounded-lg border flex items-center gap-2.5 transition-all ${selectedVehicle === 'F22' ? 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}`}
                          >
                            <span className="text-xl">🔵</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center leading-none">
                                <span className={`text-[11px] font-bold ${selectedVehicle === 'F22' ? 'text-cyan-400' : 'text-white'}`}>F-22 RAPTOR 猛禽</span>
                                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 rounded uppercase font-mono border border-cyan-500/20">速度型</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                                機動閃避：每過 10 秒自動獲得 2 秒隱形，免疫一切傷害！
                              </p>
                            </div>
                          </button>

                          {/* AC-130 CARD */}
                          <button
                            onClick={() => { console.log('VEHICLE_SELECTED'); setSelectedVehicle('AC130'); playSound('power'); }}
                            className={`w-full text-left p-2 rounded-lg border flex items-center gap-2.5 transition-all ${selectedVehicle === 'AC130' ? 'bg-fuchsia-950/30 border-fuchsia-500 shadow-md shadow-fuchsia-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}`}
                          >
                            <span className="text-xl">🟣</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center leading-none">
                                <span className={`text-[11px] font-bold ${selectedVehicle === 'AC130' ? 'text-fuchsia-400' : 'text-white'}`}>AC-130H SPECTRE 砲艇</span>
                                <span className="text-[8px] bg-fuchsia-500/10 text-fuchsia-400 px-1 rounded uppercase font-mono border border-fuchsia-500/20">火力型</span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                                雷霆火力：初始自帶飛彈而非機槍，全武器攻擊 CD 縮短 20%！
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mt-1">
                        <button
                          onClick={() => { console.log('INITIATE_GAME'); initiateGame(); }}
                          id="commence_mission_btn"
                          className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-display font-black text-[13px] py-2.5 px-4 rounded-md hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-teal-500/20 uppercase tracking-widest block text-center font-bold"
                        >
                          派遣部隊出擊 / COMMENCE DEPLOYMENT
                        </button>
                        
                        <div className="hidden sm:block text-slate-500 font-mono text-[8.5px] leading-tight text-center">
                          * 戰機支援鍵盤 WASD 操作，若為行動裝置則自動啟用觸控虛擬搖桿
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* LEVEL UP RANDOM GRADE MENU SELECTION DROPDOWN */}
              {gameState === 'UPGRADE' && (
                <div id="upgrade_screen_overlay" className="absolute inset-0 bg-slate-900/85 backdrop-blur flex flex-col items-center justify-center p-6 z-20">
                  <motion.div 
                    className="max-w-lg w-full bg-slate-950 border-4 border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                  >
                    {/* Glowing background highlights when ultra upgrade combinations exist */}
                    <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl saturate-150" />
                    <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

                    <div className="text-center relative pb-3.5 mb-3 border-b-2 border-slate-800">
                      <span className="text-[10px] text-teal-400 font-mono tracking-widest uppercase font-bold">MILITARY FLIGHT DECK REPORT</span>
                      <h3 className="game-title text-2xl font-black text-white flex items-center justify-center gap-2 mt-1">
                        <Sparkles className="h-6 w-6 text-yellow-400 shrink-0 fill-yellow-400 animate-spin" /> 機體科技升級
                      </h3>
                      <p className="text-slate-400 font-mono text-xs mt-0.5">
                        能量核心已蓄滿！請點選加裝一項戰略武器或附屬補給
                      </p>
                    </div>

                    <div className="space-y-3 relative z-10">
                      {upgradeOptions.map((opt, oIdx) => (
                        <motion.button
                          key={opt.id}
                          onClick={() => selectUpgrade(opt)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3.5 relative overflow-hidden group ${
                            opt.isEvolution 
                              ? 'bg-purple-950/40 border-purple-600 hover:border-purple-400 hover:bg-purple-950/60 shadow-lg shadow-purple-500/10' 
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-855'
                          }`}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: oIdx * 0.08 }}
                        >
                          {/* Left icon wrapper */}
                          <div className={`h-11 w-11 rounded-lg flex items-center justify-center text-2xl shrink-0 border relative ${
                            opt.isEvolution 
                              ? 'bg-purple-900/30 border-purple-500 text-purple-300' 
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}>
                            {opt.icon}
                            {opt.isEvolution && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm font-bold truncate leading-tight ${opt.isEvolution ? 'text-purple-300' : 'text-white'}`}>
                                {opt.title}
                              </h4>
                              {opt.isEvolution && (
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/45 px-2 py-0.5 rounded-full uppercase font-mono font-bold animate-pulse">
                                  合體超武
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs font-mono mt-1 leading-relaxed">
                              {opt.description}
                            </p>
                            {opt.costDesc && (
                              <p className="text-purple-400 text-[10px] font-mono mt-1 font-bold">
                                {opt.costDesc}
                              </p>
                            )}
                          </div>
                          
                          <div className="self-center opacity-0 group-hover:opacity-100 transition-all text-slate-400 shrink-0 select-none">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* SLOT MACHINE TREASURE CHEST OVERLAY */}
              {gameState === 'SLOT_MACHINE' && (
                <div id="slot_machine_overlay" className="absolute inset-0 bg-slate-950/92 flex flex-col items-center justify-center p-4 text-center z-25 backdrop-blur-md">
                  <motion.div 
                    className="max-w-md w-full bg-slate-900 border-4 border-amber-500/80 p-6 rounded-2xl shadow-2xl shadow-amber-500/10 space-y-5 text-center relative overflow-hidden"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                  >
                    {/* Glowing yellow beams behind */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                    
                    <div>
                      <span className="text-[10px] text-amber-400 font-mono tracking-widest bg-amber-950/70 border border-amber-900/60 px-3 py-1 rounded-full uppercase font-bold inline-block">
                        🎁 CORE LOGISTICS DROP DETECTED
                      </span>
                      <h2 className="game-title text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-200 mt-2">
                        戰地核心「補給保險箱」
                      </h2>
                      <p className="text-slate-400 text-xs font-mono mt-1">
                        偵測到敵方高階信號。點擊密碼解鎖，將為您隨機升級一項現有武器！
                      </p>
                    </div>

                    {/* Slot Machine Roll Tumbler Visual Container */}
                    <div className="bg-slate-950 border-2 border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden min-h-[140px] shadow-inner">
                      {/* Industrial brackets */}
                      <div className="absolute top-1 left-1 font-mono text-[9px] text-slate-600">DECRYPT-SYS v8.2</div>
                      <div className="absolute bottom-1 right-1 font-mono text-[9px] text-slate-600">STATE: {slotRolling ? 'DECRYPTING' : 'READY'}</div>
                      
                      {/* Sliding Tumbler Window */}
                      <motion.div 
                        key={slotCurrentIcon} 
                        initial={{ y: -25, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.1 }}
                        className="flex flex-col items-center justify-center space-y-2 mt-2"
                      >
                        <span className={`text-6xl filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] ${slotRolling ? 'animate-bounce' : ''}`}>
                          {slotCurrentIcon}
                        </span>
                        
                        <div className="text-white text-xs font-semibold tracking-wider font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-md">
                          {slotCurrentName}
                        </div>
                      </motion.div>
                    </div>

                    {/* Feedback & Actions */}
                    <div className="space-y-2">
                      {slotRolling ? (
                        <div className="text-amber-400 font-mono text-xs font-bold animate-pulse">
                          密碼解碼中，伺服器核心旋轉中... PLEASE STAND BY
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-teal-950/20 border border-teal-500/30 rounded-lg text-left">
                            <p className="text-[11px] text-teal-400 font-bold leading-normal font-mono mb-1">
                              ✓ 武器升級解鎖成功！
                            </p>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
                              您的 {slotResultWeapon ? (slotResultWeapon.type === 'machine_gun' ? '自動化重機槍' : slotResultWeapon.type === 'homing_missile' ? '雷達追蹤飛彈' : '側翼高熱熱焰彈') : '戰地維修'} 等級已提升 1 級。
                            </p>
                          </div>
                          
                          <motion.button
                            onClick={resumeFromSlotMachine}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 text-xs font-black py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:from-yellow-300 hover:to-amber-400"
                          >
                            重返天空 / EXECUTE COMBAT
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* GAME OVER DEAD STATE SCREEN POPUP */}
              {gameState === 'GAMEOVER' && (
                <div id="gameover_screen_overlay" className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur">
                  <motion.div 
                    className="max-w-md w-full space-y-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 22 }}
                  >
                    <div className="space-y-2 relative">
                      <div className="absolute inset-0 bg-rose-500/10 blur-2xl" />
                      <div className="h-16 w-16 mx-auto rounded-full bg-rose-950 flex items-center justify-center border border-rose-500/30 text-rose-500">
                        <AlertTriangle className="h-8 w-8 animate-ping" />
                      </div>
                      <span className="text-xs text-rose-400 font-mono tracking-widest bg-rose-950/60 border border-rose-900/60 px-3 py-1 rounded-full uppercase font-bold inline-block">
                        MISSION TERMINATED UNEXPECTEDLY
                      </span>
                      <h2 className="text-3xl font-black text-rose-500 font-display uppercase tracking-wider">
                        任務失敗，直升機已被擊墜
                      </h2>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto font-mono">
                        無人快艇與雷達反擊摧毀了裝甲。請重組科技編隊，再次派遣支援！
                      </p>
                    </div>

                    {/* Survived details readouts statistics list */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3 divide-y divide-slate-800 font-mono text-xs text-left text-slate-300">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-slate-400 uppercase">Surviving Time (飛行秒數):</span>
                        <span className="font-bold text-white text-sm">
                          {Math.floor(gameTime / 60)}分 {gameTime % 60}秒
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-400 uppercase">Drones Crash Count (墜毀數):</span>
                        <span className="font-bold text-teal-400 text-sm">{hudKills}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-400 uppercase">Maximum Altitude Level (等級):</span>
                        <span className="font-bold text-amber-400 text-sm">{hudLevel}級</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 flex-col gap-1.5 align-top">
                        <span className="text-slate-400 uppercase">Achieved Evolutions (解鎖超武):</span>
                        <span className="font-bold text-fuchsia-400 self-start text-xs flex gap-1.5 flex-wrap">
                          {activeEvolutions.length > 0 ? (
                            activeEvolutions.map((ev, eIdx) => (
                              <span key={eIdx} className="bg-fuchsia-950/60 border border-fuchsia-900/60 text-fuchsia-300 px-2.5 py-0.5 rounded-full">
                                {ev}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">無 (尚未合體成功)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4">
                      <button 
                        onClick={resetGame}
                        id="restart_mission_btn"
                        className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-display font-black text-lg py-3 px-6 rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-rose-950/40 uppercase tracking-widest block"
                      >
                        重新啟動系統 / REDEPLOY
                      </button>
                      <button 
                        onClick={() => { playSound('power'); onHardReset(); }}
                        id="return_hangar_btn"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 font-display font-bold text-sm py-2 px-6 rounded-md transition-all tracking-wider block"
                      >
                        返回機庫 / RETURN TO HANGAR
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

            </div>

            {/* SCREEN CALIBRATION BEZEL BOTTOM INFORMATION GRAPH */}
            <div className="hidden lg:flex w-full bg-slate-900/90 text-slate-500 border-t border-slate-850 px-4 py-2.5 flex-wrap items-center justify-between text-[11px] font-mono gap-2 mt-auto">
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>[WASD] 移動  |  武器全自動開火，自動尋找周圍最近/HP最高威脅</span>
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <span className="uppercase text-yellow-500 font-extrabold font-display">🔥 燃燒穿甲彈 ＆ 🚀 浮游砲陣列</span>
                <span>是終極武器構築</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 簡易成就彈出式提醒 */}
      <div id="achievement_toasts_container" className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.keyId}
              className="pointer-events-auto flex items-start gap-4 bg-slate-950/95 border border-yellow-500/50 p-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] backdrop-blur-md w-80 relative overflow-hidden text-left"
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
              layout
            >
              {/* Top border glowing highlight bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
              
              <div className="h-11 w-11 shrink-0 bg-yellow-500/15 border border-yellow-500/30 rounded-lg flex items-center justify-center text-2xl font-black shadow-inner">
                {toast.icon}
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-yellow-500 font-mono font-bold tracking-widest uppercase flex items-center gap-1">
                  ✨ 成就解鎖 / ACHIEVEMENT ✨
                </span>
                <h4 className="text-sm font-black text-white leading-tight mt-1">{toast.title}</h4>
                <p className="text-xs text-slate-400 font-mono mt-1.5 leading-relaxed">{toast.description}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
