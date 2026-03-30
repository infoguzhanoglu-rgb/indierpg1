import { MonsterState } from './MonsterConfigs.js';
import { 
    PlayerData, Vector3, 
    INITIAL_BASE_STATS, 
    REGEN_CONFIG
} from '../../../../shared/src/index.js';

export interface MonsterStats {
    level: number; hp: number; mp: number;
    physicalPower: number; mentalPower: number;
    physicalDefense: number; mentalDefense: number;
    dodge: number; crit: number;
    moveSpeed: number; runSpeed: number;
    attackRange: number; aggroRange: number; leashRange: number;
}

export class BaseEnemy {
    public id: string;
    public netId: number = 0; 
    public username: string;
    public position: Vector3;
    public rotationY: number;
    public entityType: number = 1; 

    public state: MonsterState = MonsterState.IDLE;
    public targetId: string | null = null;
    public spawnPos: Vector3;
    
    // AI & Attack Control
    protected nextActionTime: number = 0;
    protected roamPoint: Vector3 | null = null;
    protected lastAttackTime: number = 0;
    protected busyUntil: number = 0; // PRO: Animasyon bitene kadar kilitleme
    public onAttack?: (targetId: string) => void;
    public onDamageReceived?: (enemy: BaseEnemy) => void;
    public damageTable: Map<string, number> = new Map(); // PlayerID -> Toplam Hasar

    // Stat Verileri
    public level: number = 1;
    public derived = { ...INITIAL_BASE_STATS };
    public hp: number = 0;
    public mp: number = 0;
    public lastCombatTime: number = 0;
    public hpRegenMultiplier: number = 1.0;

    protected stats!: MonsterStats;

    constructor(id: string, username: string, position: Vector3, stats: MonsterStats) {
        this.id = id;
        this.username = username;
        this.position = { ...position };
        this.spawnPos = { ...position };
        this.rotationY = 0;
        this.stats = stats;
        
        this.level = stats.level;
        this.derived = { ...this.derived, ...stats } as any;
        this.hp = stats.hp;
        this.mp = stats.mp;
    }

    public update(delta: number, players: Map<string, any>) {
        if (this.hp <= 0) {
            this.state = MonsterState.DIE;
            return;
        }

        const now = Date.now();

        // 0. BUSY KONTROLÜ (Animasyon bitene kadar hiçbir şey yapma)
        if (now < this.busyUntil) {
            this.state = MonsterState.ATTACK;
            return;
        }

        // 1. HEDEF KONTROLÜ (AGRO & LEASH & DEATH)
        if (this.targetId) {
            const player = players.get(this.targetId);
            const distFromTarget = player ? this.getDistance(player.position) : 999;
            const distFromSpawn = this.getDistance(this.spawnPos);

            // ÖLÜ HEDEF VEYA MESAFE LİMİTİ: Takibi bırak ve geri dön (RUN ile)
            if (!player || player.hp <= 0 || distFromTarget > 25 || distFromSpawn > 50) {
                this.targetId = null;
                this.damageTable.clear(); // Kesin çözüm: Tabloyu anında sil
                this.state = MonsterState.RUN; // RUN ile hızlıca dön
                this.roamPoint = { ...this.spawnPos }; 
                this.nextActionTime = now + 8000; // Dönüş yolunda rahatsız edilmesin
            } else {
                this.handleChaseAndAttack(player, delta);
                return;
            }
        }

        // 2. PATROL
        if (now > this.nextActionTime && !this.targetId) {
            this.handlePatrol();
        }

        if ((this.state === MonsterState.WALK || this.state === MonsterState.RUN) && this.roamPoint && !this.targetId) {
            const speed = this.state === MonsterState.RUN ? this.stats.runSpeed : this.stats.moveSpeed;
            this.moveTowards(this.roamPoint, speed, delta);
        }
    }

    protected handleAggroScan(players: Map<string, any>) {
        let closestPlayer: any = null;
        let minDist = this.stats.aggroRange;

        for (const player of players.values()) {
            if (player.hp <= 0) continue;

            const dist = this.getDistance(player.position);
            
            // PRO: Eğer bu oyuncu bize daha önce vurduysa (damageTable), onu aggroRange'den biraz daha uzaktan (20m) bile olsa algıla
            const detectionRange = this.damageTable.has(player.id) ? 20.0 : minDist;

            if (dist < detectionRange) {
                minDist = dist;
                closestPlayer = player;
            }
        }

        if (closestPlayer) {
            this.targetId = closestPlayer.id;
            this.state = MonsterState.RUN;
            this.lastCombatTime = Date.now();
        }
    }

    protected handlePatrol() {
        const now = Date.now();
        if (this.state === MonsterState.IDLE) {
            this.state = MonsterState.WALK;
            this.roamPoint = {
                x: this.spawnPos.x + (Math.random() - 0.5) * 10,
                y: this.spawnPos.y,
                z: this.spawnPos.z + (Math.random() - 0.5) * 10
            };
            this.nextActionTime = now + (2000 + Math.random() * 3000); 
        } else {
            this.state = MonsterState.IDLE;
            this.roamPoint = null;
            this.nextActionTime = now + (3000 + Math.random() * 5000);
        }
    }

    protected handleChaseAndAttack(player: any, delta: number) {
        const dist = this.getDistance(player.position);
        const now = Date.now();

        if (dist <= this.stats.attackRange) {
            // SALDIRI KONTROLÜ (Animasyon 1.8sn + Bekleme 1.5sn = Toplam 3.3sn döngü)
            if (now - this.lastAttackTime > 3300) { 
                this.state = MonsterState.ATTACK;
                this.lookAt(player.position);
                this.lastAttackTime = now;
                this.busyUntil = now + 1800; // Animasyon bitene kadar kilitle
                if (this.onAttack) this.onAttack(player.id);
            } else if (now >= this.busyUntil) {
                // Animasyon bitti ama cooldown sürüyor: IDLE kal ve bekle
                this.state = MonsterState.IDLE;
                this.lookAt(player.position);
            }
        } else if (now >= this.busyUntil) {
            this.state = MonsterState.RUN;
            this.moveTowards(player.position, this.stats.runSpeed, delta);
        }
    }

    protected moveTowards(target: Vector3, speed: number, delta: number) {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.5) {
            const vx = (dx / dist) * speed * delta;
            const vz = (dz / dist) * speed * delta;
            this.position.x += vx;
            this.position.z += vz;
            this.rotationY = Math.atan2(dx, dz);
        } else if (this.state === MonsterState.WALK) {
            this.state = MonsterState.IDLE;
        }
    }

    protected lookAt(target: Vector3) {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        this.rotationY = Math.atan2(dx, dz);
    }

    protected getDistance(target: Vector3): number {
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    public processRegen() {
        if (this.hp <= 0) return; // PRO: Ölü canavar regen yapamaz
        const now = Date.now();
        if (now - this.lastCombatTime < REGEN_CONFIG.OUT_OF_COMBAT_DELAY) return;
        const totalRegenPercent = REGEN_CONFIG.HP_BASE_PERCENT * this.hpRegenMultiplier;
        const hpRegen = this.derived.hp * (totalRegenPercent / 100);
        this.hp = Math.min(this.derived.hp, this.hp + hpRegen);
    }

    public takeDamage(damage: number, attackerId?: string) {
        if (this.hp <= 0) return; // Ölü canavar hasar almaz

        this.hp = Math.max(0, this.hp - damage);
        this.lastCombatTime = Date.now(); 
        
        // 1. Hasar Kaydı
        if (attackerId) {
            const current = this.damageTable.get(attackerId) || 0;
            this.damageTable.set(attackerId, current + damage);
        }

        // 2. AGRO (En çok vuranı bul)
        let maxDmg = -1;
        let newTarget = this.targetId;
        for (const [pId, dmg] of this.damageTable.entries()) {
            if (dmg > maxDmg) {
                maxDmg = dmg;
                newTarget = pId;
            }
        }

        if (newTarget !== this.targetId) {
            this.targetId = newTarget;
            this.state = MonsterState.RUN;
        }

        if (this.onDamageReceived) this.onDamageReceived(this);
    }

    public toState(): PlayerData {
        return {
            id: this.id, netId: this.netId, username: this.username, 
            position: this.position, rotationY: this.rotationY, 
            level: this.level, hp: this.hp, maxHp: this.derived.hp,
            mp: this.mp, maxMp: this.derived.mp,
            entityType: this.entityType, animationState: this.state
        };
    }
}
