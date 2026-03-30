export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export enum PacketType {
    LOGIN_REQ = 0,      
    LOGIN_RES = 1,      
    JOIN = 2,           
    LEAVE = 3,          
    MOVE = 4,           
    STATE_UPDATE = 5,   
    CHAT_MSG = 6,       
    PING = 7,           
    PRIVATE_MSG = 8,
    WEATHER_UPDATE = 9,
    NOTICE = 10,
    STAT_UPDATE = 11, // Yeni: Güvenli Stat İşlemleri
    SKILL_CAST = 12,
    SKILL_EFFECT = 13,
    DAMAGE_METER = 14,
    RESPAWN_REQUEST = 15 // Yeni: Oyuncu Yeniden Doğma Talebi
}

export interface PlayerData {
    id: string;
    netId?: number; // PRO: 2-byte Numeric ID
    username: string;
    position: Vector3;
    rotationY: number;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    entityType?: number; // 0: Player, 1: Enemy (Target Cube)
    // Güvenlik için stat verileri de buraya eklenebilir
    attributes?: any; 
    animationState?: number; // 0:Idle, 1:Walk, 2:Run, 3:Attack, 4:Die
}

/**
 * Networking & Performance Constants
 */
export const NET_CONFIG = {
    TICK_RATE: 40, // PRO: 20Hz -> 40Hz (Double the performance and smoothness)
    TICK_RATE_MS: 1000 / 40,
    CLIENT_SEND_INTERVAL: 1000 / 40, 
    
    AOI_DISTANCE: 80,
    FOG_START: 40,
    FOG_END: 100,
    CAMERA_FAR: 120
};

export * from './BinaryCoder.js';
export * from './WeatherSchedule.js';
export * from './BaseStats.js';
export * from './StartingStats.js';
export * from './StatBonuses.js';
export * from './LevelScaling.js';
