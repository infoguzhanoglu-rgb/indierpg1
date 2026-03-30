import { BaseEnemy, MonsterStats } from './BaseEnemy.js';
import { Vector3 } from '../../../../shared/src/index.js';

export const SAMAN_STATS: MonsterStats = {
    level: 1,
    hp: 150,
    mp: 50,
    physicalPower: 12,
    mentalPower: 5,
    physicalDefense: 8,
    mentalDefense: 4,
    dodge: 5,
    crit: 3,
    moveSpeed: 1.125, // %25 Azaltıldı (1.5 -> 1.125)
    runSpeed: 3.375,  // %25 Azaltıldı (4.5 -> 3.375)
    attackRange: 11.25, // %25 Azaltıldı (15.0 -> 11.25)
    aggroRange: 10.0,
    leashRange: 25.0
};

export class Saman extends BaseEnemy {
    constructor(id: string, position: Vector3) {
        super(id, "Saman", position, SAMAN_STATS);
        this.hpRegenMultiplier = 2.0; // SADECE Saman için %100 regen artışı
    }
}
