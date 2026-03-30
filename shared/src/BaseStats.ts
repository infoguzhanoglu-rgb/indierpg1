/**
 * Symge Online - Kesinleştirilmiş Temel İstatistikler (Base Stats)
 */

export interface CharacterBaseStats {
    physicalPower: number;
    mentalPower: number;
    physicalDefense: number;
    mentalDefense: number;
    hp: number;
    mp: number;
    moveSpeed: number;
    attackSpeed: number;
    critRate: number;
    dodgeRate: number;
    critMultiplier: number;
}

export const INITIAL_BASE_STATS: CharacterBaseStats = {
    physicalPower: 10,
    mentalPower: 10,
    physicalDefense: 8,
    mentalDefense: 8,
    hp: 200,
    mp: 200,
    moveSpeed: 100,
    attackSpeed: 1.0,
    critRate: 5,
    dodgeRate: 5,
    critMultiplier: 1.5
};

// --- YENİ: REJENERASYON SABİTLERİ ---
export const REGEN_CONFIG = {
    HP_BASE_PERCENT: 0.5,      // %0.5 / saniye (Genel)
    MP_BASE_PERCENT: 0.5,      // %0.5 / saniye
    LEVEL_BONUS_PERCENT: 0.01, // +0.01% / level
    VIT_BONUS_PERCENT: 0.05,   // +0.05% / 1 VIT
    INT_BONUS_PERCENT: 0.05,   // +0.05% / 1 INT
    OUT_OF_COMBAT_DELAY: 10000 // 10 saniye (milisaniye)
};
