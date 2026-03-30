import { WebSocket } from 'ws';
import { 
    PlayerData, Vector3, 
    INITIAL_BASE_STATS, INITIAL_STARTING_ATTRIBUTES, 
    STAT_BONUSES, MAX_ATTRIBUTE_POINT, LEVEL_UP_SCALING,
    REGEN_CONFIG
} from '../../../shared/src/index.js';

export class Player {
    public id: string;
    public netId: number = 0; // PRO: Numeric ID
    public username: string;
    public position: Vector3;
    public rotationY: number;
    public socket: WebSocket;
    public entityType: number = 0; // 0: Player

    // Stat Verileri
    public level: number = 1;
    public attributes = { ...INITIAL_STARTING_ATTRIBUTES };
    public derived = { ...INITIAL_BASE_STATS };
    
    // Anlık Durum
    public hp: number = 0;
    public mp: number = 0;
    public lastCombatTime: number = 0;
    public deathTime: number = 0;
    public lastAttackerName: string = "Bilinmeyen";
    private skillCooldowns: Map<string, number> = new Map();

    constructor(id: string, username: string, socket: WebSocket) {
        this.id = id;
        this.username = username;
        this.socket = socket;
        this.position = { x: 0, y: 0, z: 0 };
        this.rotationY = 0;
        
        this.calculateDerived();
        this.hp = this.derived.hp;
        this.mp = this.derived.mp;
    }


    public calculateDerived() {
        const base = INITIAL_BASE_STATS;
        const attr = this.attributes;
        const bonus = STAT_BONUSES;
        const scaling = LEVEL_UP_SCALING;
        const lvGains = this.level - 1;

        this.derived.physicalPower = base.physicalPower + (lvGains * scaling.physicalPower) + (attr.str * bonus.STR.physicalPower);
        this.derived.physicalDefense = base.physicalDefense + (lvGains * scaling.physicalDefense) + (attr.str * bonus.STR.physicalDefense) + (attr.vit * bonus.VIT.physicalDefense);
        this.derived.mentalPower = base.mentalPower + (lvGains * scaling.mentalPower) + (attr.int * bonus.INT.mentalPower);
        this.derived.mentalDefense = base.mentalDefense + (lvGains * scaling.mentalDefense) + (attr.vit * bonus.VIT.mentalDefense);
        this.derived.hp = base.hp + (lvGains * scaling.hp) + (attr.vit * bonus.VIT.hp);
        this.derived.mp = base.mp + (lvGains * scaling.mp) + (attr.int * bonus.INT.mp);
        
        this.derived.critRate = base.critRate + (attr.luk * bonus.LUK.critRate);
        this.derived.dodgeRate = base.dodgeRate + (attr.dex * bonus.AGI.dodgeRate);
        this.derived.moveSpeed = base.moveSpeed + (attr.dex * bonus.AGI.moveSpeed);
        
        if (this.hp > this.derived.hp) this.hp = this.derived.hp;
        if (this.mp > this.derived.mp) this.mp = this.derived.mp;
    }

    public canCastSkill(skillId: string, mpCost: number, cooldownMs: number): boolean {
        if (this.hp <= 0) return false;
        const now = Date.now();
        const lastCast = this.skillCooldowns.get(skillId) || 0;
        
        if (now - lastCast < cooldownMs) return false;
        if (this.mp < mpCost) return false;

        return true;
    }

    public useSkill(skillId: string, mpCost: number) {
        this.mp -= mpCost;
        this.skillCooldowns.set(skillId, Date.now());
        this.lastCombatTime = Date.now();
    }

    public takeDamage(damage: number, attackerId?: string, attackerName: string = "Bilinmeyen") {
        if (this.hp <= 0) return; // Ölü oyuncu hasar almaz
        this.hp = Math.max(0, this.hp - damage);
        this.lastCombatTime = Date.now(); 
        this.lastAttackerName = attackerName;
        
        if (this.hp <= 0) {
            this.deathTime = Date.now();
        }
    }

    public respawn(resetPos: boolean = false) {
        if (resetPos) {
            this.position = { x: 0, y: 0, z: 0 };
        }
        this.hp = Math.floor(this.derived.hp * 0.5); // %50 HP
        this.mp = Math.floor(this.derived.mp * 0.5); // %50 MP
        this.deathTime = 0;
        this.lastCombatTime = Date.now(); 
    }

    public processRegen() {
        if (this.hp <= 0) return; // PRO: Ölü iken regen tetiklenemez
        const now = Date.now();
        if (now - this.lastCombatTime < REGEN_CONFIG.OUT_OF_COMBAT_DELAY) return;

        const lvGains = this.level - 1;
        const config = REGEN_CONFIG;

        const hpRegenPercent = config.HP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (this.attributes.vit * config.VIT_BONUS_PERCENT);
        const hpRegenAmount = this.derived.hp * (hpRegenPercent / 100);
        this.hp = Math.min(this.derived.hp, this.hp + hpRegenAmount);

        const mpRegenPercent = config.MP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (this.attributes.int * config.INT_BONUS_PERCENT);
        const mpRegenAmount = this.derived.mp * (mpRegenPercent / 100);
        this.mp = Math.min(this.derived.mp, this.mp + mpRegenAmount);
    }

    public tryIncreaseAttribute(attrName: string): boolean {
        const key = attrName as keyof typeof this.attributes;
        if (!this.attributes.hasOwnProperty(key)) return false;
        if (this.attributes.availablePoints <= 0) return false;
        if (this.attributes[key] >= MAX_ATTRIBUTE_POINT) return false;

        (this.attributes as any)[key]++;
        this.attributes.availablePoints--;
        this.calculateDerived();
        return true;
    }

    public toState(): PlayerData {
        return {
            id: this.id, 
            netId: this.netId, // PRO
            username: this.username, 
            position: this.position,
            rotationY: this.rotationY, 
            level: this.level,
            hp: this.hp, 
            maxHp: this.derived.hp, // PRO: Correct field
            mp: this.mp, 
            maxMp: this.derived.mp, // PRO: Correct field
            entityType: this.entityType
        };
    }

    public send(data: any) {
        if (this.socket.readyState === WebSocket.OPEN) {
            const payload = (data instanceof ArrayBuffer || data instanceof Buffer) ? data : JSON.stringify(data);
            this.socket.send(payload);
        }
    }
}
