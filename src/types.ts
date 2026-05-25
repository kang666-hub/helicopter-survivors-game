// Game Types and Interfaces

export type GameState = 'START_MENU' | 'VEHICLE_SELECTION' | 'PLAYING' | 'UPGRADE' | 'GAMEOVER' | 'VICTORY' | 'SLOT_MACHINE';

export interface WeaponState {
  type: 'machine_gun' | 'homing_missile' | 'flare' | 'fpv_drone' | 'hellfire' | 'evo_pierce' | 'evo_drones' | 'evo_doomsday' | 'evo_laser_web';
  level: number; // 1-5; 6 is Evolved
  cooldownTimer: number; // in seconds
}

export type VehicleType = 'AH64' | 'F22' | 'AC130';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  level: number;
  xp: number;
  maxXp: number;
  angle: number; // rotation for rotor blades and tilt
  rotorAngle: number; // rotor rotation angle
  weapons: WeaponState[];
  kills: number;
  timeElapsed: number; // in seconds
  vehicleType?: VehicleType;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'fast_drone' | 'shield_drone' | 'boss' | 'sniper_drone' | 'mini_boss';
  scoreValue: number;
  isHitFlash: number; // timer in ticks for flash effect
  shootCooldown?: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  type: 'player_basic' | 'player_laser' | 'player_missile' | 'player_hellfire' | 'player_flare' | 'player_evo_pierce' | 'enemy_bullet';
  penetration: number; // how many enemies it can pass through
  duration?: number; // remaining life time in seconds (for flares, etc)
  angle?: number; // rotational angle or direction
  trailTimer?: number; // to spawn trail fire
  isHellfireLvl5?: boolean;
}

export interface FireTrail {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number; // life in seconds
  maxDuration: number;
}

export interface DroneOrbiter {
  angle: number; // current orbit angle
  radius: number; // distance from player
  shootCooldownSec: number;
}

export interface BatteryItem {
  id: string;
  x: number;
  y: number;
  xpValue: number;
  vying?: boolean; // magnet state active
  type?: 'xp' | 'magnet' | 'heal' | 'chest' | 'shield'; // drop type
  speed?: number; // magnet speed factor
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
}

export interface UpgradeOption {
  id: string;
  type: 'machine_gun' | 'homing_missile' | 'flare' | 'fpv_drone' | 'hellfire' | 'evo_pierce' | 'evo_drones' | 'evo_doomsday' | 'evo_laser_web' | 'heal' | 'max_hp';
  title: string;
  description: string;
  icon: string;
  isEvolution: boolean;
  costDesc?: string;
}
