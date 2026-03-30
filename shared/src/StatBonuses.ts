/**
 * Symge Online - Stat Puanı Karşılık Tablosu (Stat Scaling)
 */

export const STAT_BONUSES = {
    // STR: Fiziksel Güç ve Fiziksel Savunma verir
    STR: {
        physicalPower: 2,
        physicalDefense: 1
    },
    
    // INT: Zihinsel Güç ve MP artışı sağlar
    INT: {
        mentalPower: 3,
        mp: 12
    },
    
    // VIT: HP ve her iki savunma türünü de güçlendirir
    VIT: {
        hp: 20,
        physicalDefense: 2,
        mentalDefense: 1
    },
    
    // AGI: Çeviklik tabanlı hız ve kaçınma bonusları
    AGI: {
        dodgeRate: 0.01,    // % bazında
        attackSpeed: 0.01,  // saniye başına vuruş artışı
        moveSpeed: 0.01     // % bazında
    },
    
    // LUK: Kritik vuruş şansı ve hasar çarpanı
    LUK: {
        critRate: 0.01,       // % bazında
        critMultiplier: 0.0005 // Kat sayı artışı
    }
};
