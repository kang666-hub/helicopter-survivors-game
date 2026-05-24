import React, { useEffect, useRef, useState } from 'react';
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
import { GameState, Player, Enemy, Bullet, FireTrail, BatteryItem, Particle, UpgradeOption, WeaponState, VehicleType } from './types';

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
  // Canvas and loop triggers
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // React UI States
  const [gameState, setGameState] = useState<GameState>('START');
  const gameStateRef = useRef<GameState>('START');

  const changeGameState = (state: GameState) => {
    gameStateRef.current = state;
    setGameState(state);
  };

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('AH64');
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

  const [hudHp, setHudHp] = useState<number>(100);
  const [hudMaxHp, setHudMaxHp] = useState<number>(100);
  const [hudLevel, setHudLevel] = useState<number>(1);
  const [hudXp, setHudXp] = useState<number>(0);
  const [hudMaxXp, setHudMaxXp] = useState<number>(10);
  const [hudKills, setHudKills] = useState<number>(0);
  const [gameTime, setGameTime] = useState<number>(0); // survived seconds
  const [weapons, setWeapons] = useState<WeaponState[]>([]);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0);
  const [bossActive, setBossActive] = useState<boolean>(false);
  const [bossHp, setBossHp] = useState<number>(0);
  const [bossMaxHp, setBossMaxHp] = useState<number>(1000);
  const [activeEvolutions, setActiveEvolutions] = useState<string[]>([]);
  
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
  const isPlayingRef = useRef<boolean>(false);
  const worldSize = 2500; // Game world boundaries (2500 x 2500)
  
  const playerRef = useRef<Player>({
    x: 1250,
    y: 1250,
    vx: 0,
    vy: 0,
    radius: 20,
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    maxXp: 10,
    angle: 0,
    rotorAngle: 0,
    weapons: [
      { type: 'machine_gun', level: 1, cooldownTimer: 0 }
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
  }, []);

  // Detect Touch / Mobile Devices and bind joystick touch controller events
  useEffect(() => {
    // Determine initially
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(hasTouch);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const getTouchPos = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      // Translate responsive overlay back to hardcoded design space (800 x 600)
      const x = ((touch.clientX - rect.left) / rect.width) * 800;
      const y = ((touch.clientY - rect.top) / rect.height) * 600;
      return { x, y };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;

      const joy = joystickRef.current;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const pos = getTouchPos(touch);
        
        // Dynamic detection threshold: let users touch anywhere near joystick base (120px leeway)
        const distToJoyBase = Math.hypot(pos.x - joy.baseX, pos.y - joy.baseY);
        if (distToJoyBase < 120) {
          joy.active = true;
          joy.startX = pos.x;
          joy.startY = pos.y;
          joy.curX = pos.x;
          joy.curY = pos.y;
          joy.vx = 0;
          joy.vy = 0;
          e.preventDefault();
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const joy = joystickRef.current;
      if (!joy.active) return;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const pos = getTouchPos(touch);

        const dx = pos.x - joy.startX;
        const dy = pos.y - joy.startY;
        const dist = Math.hypot(dx, dy);

        const limit = 60; // Max drag boundary for the thumb stick
        if (dist > limit) {
          joy.curX = joy.startX + (dx / dist) * limit;
          joy.curY = joy.startY + (dy / dist) * limit;
          joy.vx = dx / dist;
          joy.vy = dy / dist;
        } else {
          joy.curX = pos.x;
          joy.curY = pos.y;
          joy.vx = dx / limit;
          joy.vy = dy / limit;
        }
        e.preventDefault();
        break;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const joy = joystickRef.current;
      if (!joy.active) return;
      
      // Stop joystick movement
      joy.active = false;
      joy.vx = 0;
      joy.vy = 0;
      joy.curX = joy.baseX;
      joy.curY = joy.baseY;
    };

    // Use passive: false to enable preventDefault scrolling lockout on touch controls!
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gameState]);

  // Set initial game parameters and completely reset all state values (combat items, bullets, enemies)
  const resetGame = () => {
    // Reset mutable refs
    const p = playerRef.current;
    p.vehicleType = selectedVehicle;
    p.x = worldSize / 2;
    p.y = worldSize / 2;
    p.vx = 0;
    p.vy = 0;
    
    const preset = VEHICLE_PRESETS[selectedVehicle];
    const startingMaxHp = preset.maxHp;
    p.hp = startingMaxHp;
    p.maxHp = startingMaxHp;
    p.level = 1;
    p.xp = 0;
    p.maxXp = 10;
    p.kills = 0;
    p.timeElapsed = 0;
    p.angle = 0;
    p.rotorAngle = 0;
    
    // Auto preset initial weapons based on vehicle preset
    p.weapons = [
      { type: preset.initialWeapon, level: 1, cooldownTimer: 0 }
    ];

    enemiesRef.current = [];
    bulletsRef.current = [];
    trailsRef.current = [];
    batteriesRef.current = [];
    particlesRef.current = [];
    frameCountRef.current = 0;
    lastTimeRef.current = Date.now();
    playerInvincibleTicksRef.current = 0;
    droneAngleRef.current = 0;
    magnetFlashRef.current = 0;

    // Reset touch joystick if working
    const joy = joystickRef.current;
    joy.active = false;
    joy.vx = 0;
    joy.vy = 0;
    joy.curX = joy.baseX;
    joy.curY = joy.baseY;

    // Set react states matching ref values
    setHudHp(startingMaxHp);
    setHudMaxHp(startingMaxHp);
    setHudLevel(1);
    setHudXp(0);
    setHudMaxXp(10);
    setHudKills(0);
    setGameTime(0);
    setWeapons(p.weapons);
    setBossActive(false);
    setActiveEvolutions([]);

    playSound('power');
    isPlayingRef.current = true;
    changeGameState('PLAYING');
  };

  const initiateGame = () => {
    resetGame();
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
    const currentWeapons = p.weapons;
    const options: UpgradeOption[] = [];

    const mg = currentWeapons.find(w => w.type === 'machine_gun');
    const ms = currentWeapons.find(w => w.type === 'homing_missile');
    const fl = currentWeapons.find(w => w.type === 'flare');
    const ep = currentWeapons.find(w => w.type === 'evo_pierce');
    const ed = currentWeapons.find(w => w.type === 'evo_drones');

    // EVOLUTION CANDIDATE CHECKS
    // Evo 1: 【5等機槍】+【5等熱焰彈】=【🔥 燃燒穿甲彈】
    const qualifiesEvoPierce = mg && mg.level === 5 && fl && fl.level === 5 && !ep;

    // Evo 2: 【5等追蹤飛彈】+【5等（任意其他滿等武器）】=【🚀 浮游砲陣列】
    // Any other max-level means: (mg is level 5) OR (fl is level 5) OR (ep exists/is evolved) or (ed exists/is evolved)
    const otherWeaponMaxed = (mg && mg.level === 5) || (fl && fl.level === 5) || ep || ed;
    const qualifiesEvoDrones = ms && ms.level === 5 && otherWeaponMaxed && !ed;

    if (qualifiesEvoPierce) {
      options.push({
        id: 'evo_pierce',
        type: 'evo_pierce',
        title: '🔥 燃燒穿甲彈 (Incendiary Pierce)',
        description: '【超武進化】極限射速！子彈具無限穿透力，並在飛行軌跡留下點陣紅炎，造成持續範圍燒傷。',
        icon: '🔥',
        isEvolution: true,
        costDesc: '需要 5 等機槍與 5 等地空熱焰彈進行科技融合'
      });
    }

    if (qualifiesEvoDrones) {
      options.push({
        id: 'evo_drones',
        type: 'evo_drones',
        title: '🚀 浮游砲陣列 (Option Drone Array)',
        description: '【超武進化】解鎖兩架永不墜毀的點陣僚機環繞身側，全天候全自動編織追蹤飛彈彈幕。',
        icon: '🚀',
        isEvolution: true,
        costDesc: '需要 5 等追蹤飛彈與任意 5 等武器合力驅動'
      });
    }

    // BASE WEAPON UPGRADES or UNLOCKS
    // Machine Gun
    if (mg && mg.level < 5) {
      options.push({
        id: 'mg_up',
        type: 'machine_gun',
        title: `機槍增量 Lv.${mg.level} -> Lv.${mg.level + 1}`,
        description: mg.level === 4 
          ? '【極限提昇】機槍將雙管並射，火力極速全開。'
          : `傷害提昇並改良內部機構，冷卻時段縮短 15%。`,
        icon: '🔫',
        isEvolution: false
      });
    }

    // Homing Missile
    if (!ms) {
      options.push({
        id: 'ms_unlock',
        type: 'homing_missile',
        title: '研發追蹤飛彈 (Unlock Homing Missile)',
        description: '解鎖重型雷達防衛，每 3 秒自動鎖定場上血量最厚實的巨艦或精英發射高爆飛彈。',
        icon: '🎯',
        isEvolution: false
      });
    } else if (ms.level < 5) {
      options.push({
        id: 'ms_up',
        type: 'homing_missile',
        title: `追蹤飛彈 Lv.${ms.level} -> Lv.${ms.level + 1}`,
        description: ms.level === 4
          ? '【戰略覆蓋】冷卻時間更短，且一次同步發射 2 枚巨型飛彈。'
          : `彈藥炸藥填充升級，破甲半徑提昇、裝填耗時減少。`,
        icon: '🎯',
        isEvolution: false
      });
    }

    // Air Defense Flare
    if (!fl) {
      options.push({
        id: 'fl_unlock',
        type: 'flare',
        title: '加裝制空熱焰彈 (Unlock Heat Flare)',
        description: '安裝直升機側翼佈撒器，每 2.5 秒朝身體周圍八方播撒 8 枚制空攔截高溫熱焰彈。',
        icon: '☀️',
        isEvolution: false
      });
    } else if (fl.level < 5) {
      options.push({
        id: 'fl_up',
        type: 'flare',
        title: `制空熱焰彈 Lv.${fl.level} -> Lv.${fl.level + 1}`,
        description: fl.level === 4
          ? '【全天屏障】點陣高熱停留期間擴增一倍，熱焰阻絕網更巨大深邃。'
          : `點火續燃時間追加、殺傷半徑進一步增幅。`,
        icon: '☀️',
        isEvolution: false
      });
    }

    // Supplement support options so we always guarantee a nice pool
    options.push({
      id: 'heal',
      type: 'heal',
      title: '應急整修與油料 (Tactical Field Repair)',
      description: '空投救援箱，立即恢復高達 50 點機體耐久值(HP)。',
      icon: '🔧',
      isEvolution: false
    });

    options.push({
      id: 'max_hp',
      type: 'max_hp',
      title: '外掛反應裝甲 (Reactive Armor Plating)',
      description: '大幅強化戰鬥機體防禦力，上限 HP +20 點，並當場補滿所有受損裝甲。',
      icon: '🛡️',
      isEvolution: false
    });

    // Pick 3 options randomly
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    // Ensure if we have an evolution, it prioritizes showing up as high-tier gameplay satisfaction
    const pickedOptions: UpgradeOption[] = [];
    const evos = shuffled.filter(o => o.isEvolution);
    const standard = shuffled.filter(o => !o.isEvolution);

    // Grab evos first to make sure player notices them
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
    
    switch (opt.type) {
      case 'machine_gun': {
        const mg = p.weapons.find(w => w.type === 'machine_gun');
        if (mg) {
          mg.level += 1;
        } else {
          p.weapons.push({ type: 'machine_gun', level: 1, cooldownTimer: 0 });
        }
        break;
      }
      
      case 'homing_missile': {
        const ms = p.weapons.find(w => w.type === 'homing_missile');
        if (ms) {
          ms.level += 1;
        } else {
          p.weapons.push({ type: 'homing_missile', level: 1, cooldownTimer: 0 });
        }
        break;
      }

      case 'flare': {
        const fl = p.weapons.find(w => w.type === 'flare');
        if (fl) {
          fl.level += 1;
        } else {
          p.weapons.push({ type: 'flare', level: 1, cooldownTimer: 0 });
        }
        break;
      }

      case 'evo_pierce': {
        // Formula 1: Remove Machine Gun & Flare, replace with Evolved Pierce
        p.weapons = p.weapons.filter(w => w.type !== 'machine_gun' && w.type !== 'flare');
        p.weapons.push({ type: 'evo_pierce', level: 6, cooldownTimer: 0 }); // 6 acts as Evo
        setActiveEvolutions(prev => [...prev, '燃燒穿甲彈 🔥']);
        playSound('power');
        break;
      }

      case 'evo_drones': {
        // Formula 2: Remove Homing Missile, replace with Drone Array. Keep the other max-level weapon.
        p.weapons = p.weapons.filter(w => w.type !== 'homing_missile');
        p.weapons.push({ type: 'evo_drones', level: 6, cooldownTimer: 0 });
        setActiveEvolutions(prev => [...prev, '浮游砲陣列 🚀']);
        playSound('power');
        break;
      }

      case 'heal': {
        p.hp = Math.min(p.maxHp, p.hp + 50);
        break;
      }

      case 'max_hp': {
        p.maxHp += 20;
        p.hp = p.maxHp;
        break;
      }
    }

    // Sync state
    setWeapons([...p.weapons]);
    setHudHp(p.hp);
    setHudMaxHp(p.maxHp);

    // Return to main battle
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
        // Just keep request going or stall
        animId = requestAnimationFrame(gameLoop);
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
      const speedScale = p.vehicleType === 'F22' ? 1.4 : (p.vehicleType === 'AC130' ? 0.7 : 1.0);
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

      // 3. ENEMY SPAWNER OVERTIME GENERATOR
      // Based on survival time: base spawn interval decays every 30 seconds
      const elapsedSeconds = p.timeElapsed;
      const batchPeriod = Math.max(25, 65 - Math.floor(elapsedSeconds / 30) * 10); // Spawner generates enemies faster over time
      const maxEnemiesOnField = 250 + Math.floor(elapsedSeconds / 10) * 20;

      // Spawn normal and fast drones
      if (frameCountRef.current % batchPeriod === 0 && enemiesRef.current.length < maxEnemiesOnField) {
        // Spawn enemies just outside of camera viewport ring (approx 450px out)
        const spawnCount = 2 + Math.floor(elapsedSeconds / 35);
        for (let s = 0; s < spawnCount; s++) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = 420 + Math.random() * 120;
          const ex = p.x + Math.cos(spawnAngle) * spawnDist;
          const ey = p.y + Math.sin(spawnAngle) * spawnDist;

          // Don't spawn outside world size limits
          if (ex > 10 && ex < worldSize - 10 && ey > 10 && ey < worldSize - 10) {
            // Pick drone class
            const roll = Math.random();
            let etype: 'drone' | 'fast_drone' | 'shield_drone' = 'drone';
            let ehp = 12 + Math.floor(elapsedSeconds / 20) * 5;
            let espeed = 1.4 + Math.random() * 0.4;
            let ewidth = 16;
            let eheight = 16;
            let scoreVal = 10;

            if (roll > 0.85) {
              etype = 'shield_drone'; // Tanky but slower
              ehp = 40 + Math.floor(elapsedSeconds / 20) * 12;
              espeed = 0.85;
              ewidth = 22;
              eheight = 22;
              scoreVal = 30;
            } else if (roll > 0.65) {
              etype = 'fast_drone'; // Swift bug drones
              ehp = 6 + Math.floor(elapsedSeconds / 30) * 3;
              espeed = 2.5;
              ewidth = 12;
              eheight = 12;
              scoreVal = 20;
            }

            enemiesRef.current.push({
              id: `${Date.now()}-${Math.random()}`,
              x: ex,
              y: ey,
              vx: 0,
              vy: 0,
              width: ewidth,
              height: eheight,
              speed: espeed,
              hp: ehp,
              maxHp: ehp,
              type: etype,
              scoreValue: scoreVal,
              isHitFlash: 0
            });
          }
        }
      }

      // Check Boss Spawn at exactly 2 minutes (120 seconds) - spawning once
      if (Math.floor(elapsedSeconds) >= 120 && !bossActive && !enemiesRef.current.some(e => e.type === 'boss')) {
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
                
                // If Level 5, shoot 2 bullets simultaneously with slight angular split!
                if (weapon.level === 5) {
                  const splitAngle = 0.08;
                  const bTypes = [radians - splitAngle, radians + splitAngle];
                  bTypes.forEach(angle => {
                    bulletsRef.current.push({
                      id: `mg-${Date.now()}-${Math.random()}`,
                      x: p.x,
                      y: p.y,
                      vx: Math.cos(angle) * bulletSpd,
                      vy: Math.sin(angle) * bulletSpd,
                      radius: 3,
                      damage: mgDamage[curLvlIdx],
                      type: 'player_basic',
                      penetration: 1
                    });
                  });
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
                }
                
                playSound('shoot');
                weapon.cooldownTimer = mgCooldowns[curLvlIdx] * weaponCdMultiplier;
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
                chosenEnemies.push(sortedSorted[0]);
                if (weapon.level === 5 && sortedSorted.length > 1) {
                  chosenEnemies.push(sortedSorted[1]); // lvl 5 shoots 2 highest HP targets!
                }
              }

              if (chosenEnemies.length > 0) {
                chosenEnemies.forEach(ce => {
                  const radians = Math.atan2(ce.y - p.y, ce.x - p.x);
                  const missileSpeed = 6.2;
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

              for (let i = 0; i < numFlares; i++) {
                const angle = i * angleInc;
                bulletsRef.current.push({
                  id: `fl-${Date.now()}-${Math.random()}`,
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(angle) * flareSpeed,
                  vy: Math.sin(angle) * flareSpeed,
                  radius: (weapon.level >= 4) ? 9 : 6.5,
                  damage: flDamage[curLvlIdx],
                  type: 'player_flare',
                  penetration: 6, // flare passes through many enemies as defense
                  duration: flActiveDurations[curLvlIdx]
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

        // Check weapon hit collisions against enemies (distance circles or bounding rectangles)
        let hitSomething = false;
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

              // Identify all enemies in explosion radius (approx 75px radius)
              const areaRad = b.radius === 5 ? 75 : 60; // smaller for sub-missile drones
              enemies.forEach(otherE => {
                const aoeDist = Math.hypot(otherE.x - b.x, otherE.y - b.y);
                if (aoeDist < areaRad) {
                  otherE.hp -= b.damage * 0.75; // aoe dealing 75% splash damage
                  otherE.isHitFlash = 3;
                }
              });

              spawnExplosion(b.x, b.y, '#f97316', 15);
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

          // Check Boss Death to trigger Victory or ultimate drops
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
            // 5% chance of dropping a Magnet instead of regular batteries
            if (Math.random() < 0.05) {
              batteriesRef.current.push({
                id: `magnet-${Date.now()}-${Math.random()}`,
                x: e.x,
                y: e.y,
                xpValue: 0,
                type: 'magnet'
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

        if (dist > 1) {
          e.vx = (dx / dist) * e.speed;
          e.vy = (dy / dist) * e.speed;
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
            const finalDmg = Math.max(1, Math.round(baseDmg));
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

        // Within magnetism catch range (increased to 100px for easier pickups)
        const magnetRange = 100; 
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
            } else {
              p.xp += bat.xpValue;
              
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
        } else {
          // pulsing glow
          const glowPulse = Math.sin(frameCountRef.current * 0.15) * 2;
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 4;
          
          // Draw double square to simulate micro sci-fi engine energy cells
          ctx.fillRect(batX - 4, batY - 4, 8, 8);
          ctx.fillStyle = '#86efac';
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
          // Normal Red Drone: diamond matrix block
          ctx.fillStyle = '#27272a'; // dark zinc border casing
          ctx.fillRect(-hw, -hh, e.width, e.height);
          
          ctx.fillStyle = '#ef4444'; // glowing neon eye
          ctx.fillRect(-hw + 3, -hh + 3, e.width - 6, e.height - 6);

          // Top corner miniature radar lights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-hw + 1, -hh + 1, 2, 2);
          ctx.fillRect(hw - 3, hh - 3, 2, 2);
        } 
        else if (e.type === 'fast_drone') {
          // Fast Insect Drone: delta wing shape
          ctx.fillStyle = '#ea580c'; // burn orange body
          ctx.beginPath();
          ctx.moveTo(0, -hh); // top apex
          ctx.lineTo(hw, hh); // bottom right
          ctx.lineTo(-hw, hh); // bottom left
          ctx.closePath();
          ctx.fill();

          // Core pixel blue eye
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(-2, -1, 4, 3);
        } 
        else if (e.type === 'shield_drone') {
          // Shield heavy drone: Octagon heavy tank
          ctx.fillStyle = '#78716c'; // Stone gray shields
          ctx.beginPath();
          ctx.moveTo(-hw, -hh + 4);
          ctx.lineTo(-hw + 4, -hh);
          ctx.lineTo(hw - 4, -hh);
          ctx.lineTo(hw, -hh + 4);
          ctx.lineTo(hw, hh - 4);
          ctx.lineTo(hw - 4, hh);
          ctx.lineTo(-hw + 4, hh);
          ctx.lineTo(-hw, hh - 4);
          ctx.closePath();
          ctx.fill();

          // Dark core
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(-hw / 2, -hh / 2, hw, hh);

          // Emerald indicators
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-2, -2, 4, 4);
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

      // RENDER ROTATING OPTION DRONES (if evolved weapon unlocked)
      const hasEvoDrones = p.weapons.some(w => w.type === 'evo_drones');
      if (hasEvoDrones) {
        const orbitRadius = 45;
        
        // Drone Position 1
        const orb1_x = p.x + Math.cos(droneAngleRef.current) * orbitRadius - cameraX;
        const orb1_y = p.y + Math.sin(droneAngleRef.current) * orbitRadius - cameraY;
        // Drone Position 2
        const orb2_x = p.x + Math.cos(droneAngleRef.current + Math.PI) * orbitRadius - cameraX;
        const orb2_y = p.y + Math.sin(droneAngleRef.current + Math.PI) * orbitRadius - cameraY;

        const dronePositions = [
          { x: orb1_x, y: orb1_y, a: droneAngleRef.current },
          { x: orb2_x, y: orb2_y, a: droneAngleRef.current + Math.PI }
        ];

        dronePositions.forEach(dp => {
          ctx.save();
          ctx.translate(dp.x, dp.y);
          ctx.rotate(dp.a * 2); // fast drone self rotation

          // Simple cute metallic cube
          ctx.fillStyle = '#475569';
          ctx.fillRect(-6, -6, 12, 12);
          // Green sensor eye
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-2, -5, 4, 3);
          
          // Little tiny thruster flame particle representation
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-1, 5, 2, 2);

          ctx.restore();

          // Connective electricity tether
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - cameraX, p.y - cameraY);
          ctx.lineTo(dp.x, dp.y);
          ctx.stroke();
        });
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
          // Anti Air Defence Flares: expanding halo rings
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          
          const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius);
          grad.addColorStop(0, '#fef08a'); // central solar flare yellow
          grad.addColorStop(0.3, '#f97316'); // intense fire orange
          grad.addColorStop(0.8, 'rgba(239,68,68,0.2)');
          grad.addColorStop(1, 'rgba(239,68,68,0)');
          
          ctx.fillStyle = grad;
          ctx.fill();
        } 
        else if (b.type === 'player_evo_pierce') {
          // Evolved Incendiary Armor-Piercing core plasma bullet
          const ang = Math.atan2(b.vy, b.vx);
          ctx.rotate(ang);
          
          ctx.fillStyle = '#fef08a'; // hyper dense heat yellow fuel
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Pulse rings outwards
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-12, -4, 24, 8);
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

      ctx.restore(); // retrieve shake translation frames safely

      ctx.restore(); // restore global saves

      // Draw screen lightning blue flash if magnet was activated (absolute screen-space overlay)
      if (magnetFlashRef.current > 0) {
        ctx.fillStyle = `rgba(147, 197, 253, ${magnetFlashRef.current * 0.06})`;
        ctx.fillRect(0, 0, 800, 600);
        magnetFlashRef.current--;
      }

      // Draw virtual joystick controls if isMobile or active
      if (isMobile) {
        const joy = joystickRef.current;
        // Draw Outer Base Circle Ring (Cypher style)
        ctx.strokeStyle = joy.active ? 'rgba(34, 211, 238, 0.6)' : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(joy.baseX, joy.baseY, 60, 0, Math.PI * 2);
        ctx.stroke();

        // 8-directional coordinate helper dots for cyber feel
        ctx.fillStyle = joy.active ? 'rgba(34, 211, 238, 0.4)' : 'rgba(148, 163, 184, 0.2)';
        for (let a = 0; a < 8; a++) {
          const helperAngle = (a * Math.PI) / 4;
          const hOffset = 60;
          ctx.fillRect(
            joy.baseX + Math.cos(helperAngle) * hOffset - 2,
            joy.baseY + Math.sin(helperAngle) * hOffset - 2,
            4,
            4
          );
        }

        // Draw Inner Interactive Thumb Stick Nob
        ctx.fillStyle = joy.active ? '#22d3ee' : 'rgba(148, 163, 184, 0.5)';
        ctx.beginPath();
        ctx.arc(joy.curX, joy.curY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Glowing cyan dot accent on the center of thumb stick
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(joy.curX, joy.curY, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Connect trace line from base to center thumb
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(joy.baseX, joy.baseY);
        ctx.lineTo(joy.curX, joy.curY);
        ctx.stroke();
      }

      // Continue game execution frames
      animId = requestAnimationFrame(gameLoop);
    };

    // Begin looping
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, isMobile]);

  return (
    <div id="game_app_container" className="flex flex-col items-center justify-center min-h-screen px-4 py-8 select-none bg-slate-950 font-sans text-slate-100 overflow-x-hidden">
      {/* Absolute futuristic HUD command deck console casing */}
      <div className="w-full max-w-5xl flex flex-col gap-4">
        
        {/* UPPER NAVIGATION BAR STRIP WITH CHIPS */}
        <div id="command_deck_header" className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
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
        <div id="deck_grid_split_row" className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start w-full">
          
          {/* LEFT AVIONICS FLIGHT CONTROLLER PANEL */}
          <div id="left_panel_avionics" className="lg:col-span-1 flex flex-col gap-4 bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl shadow-lg backdrop-blur-sm self-stretch min-h-[500px]">
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
                          {w.type === 'machine_gun' ? '🔫' : w.type === 'homing_missile' ? '🎯' : w.type === 'flare' ? '☀️' : w.type === 'evo_pierce' ? '🔥' : '🚀'}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white leading-none">
                            {w.type === 'machine_gun' && '自動化重機槍'}
                            {w.type === 'homing_missile' && '雷達追蹤飛彈'}
                            {w.type === 'flare' && '側翼高熱熱焰彈'}
                            {w.type === 'evo_pierce' && '🔥 燃燒穿甲彈 [超武]'}
                            {w.type === 'evo_drones' && '🚀 浮游砲陣列 [超武]'}
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
          <div id="radar_canvas_central_core" className="lg:col-span-3 flex flex-col items-center bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl relative">
            
            {/* SCREEN CALIBRATION BEZEL TOP */}
            <div className="w-full bg-slate-900/90 text-slate-400 border-b border-slate-850 px-4 py-2 flex items-center justify-between text-xs font-mono">
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
            <div className="relative border-4 border-slate-800 bg-black shadow-inner flex items-center justify-center p-0 select-none cursor-crosshair">
              
              {/* HTML5 Canvas Element */}
              <canvas
                id="battlefield_canvas"
                ref={canvasRef}
                width={800}
                height={600}
                className="block max-w-full h-auto rounded outline-none selection:bg-transparent"
              />

              {/* GAMEPLAY OVERLAY HUD IN THE CANVAS FRAME */}
              {gameState === 'PLAYING' && (
                <div className="absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between select-none">
                  
                  {/* TOP-LEFT FLIGHT AVIONICS STATS COCPIT COUNTER (Levels, HP, XP) */}
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col gap-1.5 bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg backdrop-blur shadow-md w-72">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-black text-lg text-white">
                          LV. <span className="text-teal-400">{hudLevel}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                          {selectedVehicle === 'AH64' ? 'AH-64 COPTEL' : selectedVehicle === 'F22' ? 'F-22 RAPTOR' : 'AC-130H SPECTRE'}
                        </span>
                      </div>

                      {/* Green HP Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                          <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-emerald-400" /> 裝甲機體 (HP)</span>
                          <span className="text-white font-bold">{hudHp} / {hudMaxHp}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 border border-slate-800 rounded-sm overflow-hidden p-0.5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-sm"
                            initial={{ width: '100%' }}
                            animate={{ width: `${(hudHp / hudMaxHp) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                          />
                        </div>
                      </div>

                      {/* Blue XP Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-cyan-400 animate-pulse" /> 能量核心電池 (XP)</span>
                          <span className="text-white font-bold">{hudXp} / {hudMaxXp}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 border border-slate-800 rounded-sm overflow-hidden p-0.5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-sm"
                            animate={{ width: `${(hudXp / hudMaxXp) * 100}%` }}
                            transition={{ ease: 'easeOut', duration: 0.15 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* TOP-RIGHT HIGH RESOLUTION BATTLE STATISTICS (Survivors Elapsed Time, Total Kills) */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-lg backdrop-blur shadow">
                        <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                        <div className="font-mono text-right">
                          <div className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">ELAPSED TIME</div>
                          <div className="text-base font-black text-white leading-tight">
                            {Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3.5 py-2 rounded-lg backdrop-blur shadow">
                        <Skull className="h-4 w-4 text-rose-500 shrink-0 animate-bounce" />
                        <div className="font-mono text-right">
                          <div className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">CRASHED DRONES</div>
                          <div className="text-base font-black text-white leading-tight">{hudKills}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM WARNING ZONE ALERTS & BOSS HUD INDICATOR */}
                  <div className="w-full flex flex-col items-center gap-2.5">
                    
                    {/* BOSS DYNAMIC HP BANNER IN THE MIDDLE OF CRITICAL SITUATIONS */}
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

                    {/* DYNAMIC TIMELINE CHIPS */}
                    <div className="bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800/80 backdrop-blur text-[10.5px] font-mono tracking-widest uppercase text-slate-400 flex items-center gap-4">
                      <span>SEC_00-30: 偵察機湧入</span>
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                      <span>SEC_60: 鋼鐵重型機</span>
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                      <span className={gameTime >= 120 ? 'text-purple-400 font-bold' : ''}>SEC_120: 旗艦BOSS降臨</span>
                    </div>
                  </div>

                </div>
              )}

              {/* OVERLAYS SYSTEM - MENU SCREENS AND DIALOGS */}
              
              {/* START INITIAL MENU OVERLAY */}
              {gameState === 'START' && (
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
                            onClick={() => { setSelectedVehicle('AH64'); playSound('power'); }}
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
                            onClick={() => { setSelectedVehicle('F22'); playSound('power'); }}
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
                            onClick={() => { setSelectedVehicle('AC130'); playSound('power'); }}
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
                          onClick={initiateGame}
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

                    <button 
                      onClick={resetGame}
                      id="restart_mission_btn"
                      className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-display font-black text-lg py-3 px-6 rounded-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-rose-950/40 uppercase tracking-widest block"
                    >
                      重新啟動系統 / REDEPLOY
                    </button>
                  </motion.div>
                </div>
              )}

            </div>

            {/* SCREEN CALIBRATION BEZEL BOTTOM INFORMATION GRAPH */}
            <div className="w-full bg-slate-900/90 text-slate-500 border-t border-slate-850 px-4 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2 mt-auto">
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
