import { CharacterBaseStats } from './BaseStats.js';

/**
 * Symge Online - PRO Combat Formulas
 * Fiziksel ve Zihinsel (Büyü) hasar hesaplama mantığı.
 */
export interface CombatResult {
    type: 'HIT' | 'CRIT' | 'MISS' | 'DODGE';
    damage: number;
    isCritical: boolean;
    isMissed: boolean;
}

export class CombatSystem {
    /**
     * Hasar Hesaplama Formülü (Ultra PRO standardı)
     * @param attacker Saldırganın tüm değerleri (BaseStats + Level + Equipment)
     * @param target Hedefin tüm değerleri
     * @param isMagical Zihinsel (Büyü) hasar mı?
     */
    public static calculateDamage(attacker: CharacterBaseStats, target: CharacterBaseStats, isMagical: boolean = false): CombatResult {
        // 1. ADIM: Kaçınma (Dodge) Kontrolü
        // % chance bazlı dodge kontrolü (DodgeRate 5 ise %5 ihtimal)
        const dodgeChance = target.dodgeRate / 100;
        if (Math.random() < dodgeChance) {
            return { type: 'DODGE', damage: 0, isCritical: false, isMissed: true };
        }

        // 2. ADIM: Kritik (Crit) Kontrolü
        const critChance = attacker.critRate / 100;
        const isCritical = Math.random() < critChance;
        let critMultiplier = isCritical ? (attacker.critMultiplier || 2.0) : 1.0;

        // 3. ADIM: Temel Hasar (Atk - Def)
        let baseDamage = 0;
        if (isMagical) {
            // Zihinsel Güç (Mental)
            baseDamage = attacker.mentalPower - target.mentalDefense;
        } else {
            // Fiziksel Güç (Physical)
            baseDamage = attacker.physicalPower - target.physicalDefense;
        }

        // 4. ADIM: %25 Sapma (Deviation) - Ağırlıklı Dağılım (Bell Curve / Normal Distribution)
        // Her değerin eşit gelmesi yerine ortalara (1.0 civarı) daha çok düşmesini sağlarız.
        // 3 adet random sayının ortalamasını almak (Central Limit Theorem) harika bir çan eğrisi oluşturur.
        const weightedRandom = (Math.random() + Math.random() + Math.random()) / 3;
        
        // Aralık: 0.75 ile 1.25 arası (+-%25 sapma)
        const deviationMultiplier = 0.75 + weightedRandom * 0.5; 
        
        let finalDamage = baseDamage * critMultiplier * deviationMultiplier;

        // 5. ADIM: Minimum Hasar Garantisi (PRO)
        // Hiçbir zaman 0 hasar olamaz, en az 1 vurulur.
        if (finalDamage < 1) finalDamage = 1;

        return {
            type: isCritical ? 'CRIT' : 'HIT',
            damage: Math.round(finalDamage),
            isCritical: isCritical,
            isMissed: false
        };
    }
}
