export interface SkillLevelData {
    reqLevel: number;
    spCost: number;
    mpCost: number;
    cooldown: number; // saniye
    damageMultiplier: number;
    range: number; // metre
}

export const YANAN_DALGA_DATA: { [key: number]: SkillLevelData } = {
    1: { reqLevel: 1, spCost: 1, mpCost: 10, cooldown: 2, damageMultiplier: 1.2, range: 10 },
    2: { reqLevel: 10, spCost: 1, mpCost: 52, cooldown: 10, damageMultiplier: 1.35, range: 11 },
    3: { reqLevel: 15, spCost: 1, mpCost: 76, cooldown: 9, damageMultiplier: 1.5, range: 12 },
    4: { reqLevel: 20, spCost: 1, mpCost: 88, cooldown: 9, damageMultiplier: 1.7, range: 13 },
    5: { reqLevel: 30, spCost: 1, mpCost: 95, cooldown: 8, damageMultiplier: 1.9, range: 14 },
    6: { reqLevel: 40, spCost: 1, mpCost: 120, cooldown: 7, damageMultiplier: 2.2, range: 15 }
};
