import { Player } from '../entities/Player.js';
import { BaseEnemy } from '../entities/enemies/BaseEnemy.js';
import { Saman } from '../entities/enemies/Saman.js'; 
import { ServerNetwork } from '../network/WebSocketServer.js';
import { BinaryCoder, PacketType, isCurrentlyRainy } from '../../../shared/src/index.js';
import { InterestManager } from './InterestManager.js';
import { SPAWN_CONFIG } from './SpawnManager.js'; // Spawn noktaları eklendi

export class GameManager {
    private players: Map<string, Player> = new Map();
    private enemies: Map<string, BaseEnemy> = new Map();
    private network: ServerNetwork;
    private interestManager: InterestManager = new InterestManager();
    private startTime: number = Date.now();
    private nextNetId: number = 100; 
    
    private currentRainState: boolean = false;
    private lastScheduleState: boolean = false;
    private respawnQueue: { spawnPos: any, type: string, respawnAt: number }[] = [];
    public combatQueue: { executeAt: number, action: () => void }[] = [];

    constructor(network: ServerNetwork) {
        this.network = network;
        this.lastScheduleState = isCurrentlyRainy();
        this.currentRainState = this.lastScheduleState;
        this.initWeatherSync();

        // 1. DÜNYAYI DOLDUR: Spawn noktalarından canavarları oluştur
        this.spawnMonstersFromConfig();

        // 2. AI DÖNGÜSÜ
        this.startAILoop();
    }

    private spawnMonstersFromConfig() {
        SPAWN_CONFIG.forEach(spawn => {
            for (let i = 0; i < spawn.count; i++) {
                const id = `${spawn.type.toLowerCase()}_${this.nextNetId}`;
                const randomPos = {
                    x: spawn.position.x + (Math.random() - 0.5) * spawn.radius * 2,
                    y: spawn.position.y,
                    z: spawn.position.z + (Math.random() - 0.5) * spawn.radius * 2
                };

                if (spawn.type === "SAMAN") {
                    this.spawnSaman(id, randomPos);
                }
            }
        });
    }

    public enqueueCombatAction(delayMs: number, action: () => void) {
        this.combatQueue.push({ executeAt: Date.now() + delayMs, action });
    }

    private spawnSaman(id: string, position: {x: number, y: number, z: number}) {
        const saman = new Saman(id, position);
        saman.netId = this.nextNetId++;
        
        // HASAR TABLOSU VE AGRO YAYINI
        saman.onDamageReceived = (enemy) => {
            // 1. Hasarları topla ve sırala (Top 5)
            const sorted = Array.from(enemy.damageTable.entries())
                .map(([pId, amount]) => {
                    const p = this.players.get(pId);
                    return { username: p ? p.username : "Bilinmeyen", amount };
                })
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            // 2. YAYINLA: Tüm oyuncular bu canavara kimin ne kadar vurduğunu görsün
            const damagePacket = BinaryCoder.encodeDamageMeter(enemy.netId, sorted);
            this.network.broadcast(damagePacket);
        };

        // CANAVAR SALDIRI TETİKLEYİCİ (Delayed Damage System)
        saman.onAttack = (targetId) => {
            const player = this.players.get(targetId);
            if (!player) return;

            // 1. MESAFE VE GECİKMEYİ HESAPLA (Projectile hızı: 15u/s)
            const dx = player.position.x - saman.position.x;
            const dz = player.position.z - saman.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            // SYNC FIX: 850ms (Animasyon Lead) + (Mesafe / 14.0 hız)
            const delayMs = 850 + Math.floor((dist / 14) * 1000); 

            // 2. TÜM OYUNCULARA BİLDİR: Görsel Efekt (ANINDA)
            // Hasar miktarını ve HIT tipini pakete baştan koyuyoruz ama HP azalması gecikmeli olacak
            const damage = 10 + Math.floor(Math.random() * 5);
            const effectPacket = BinaryCoder.encodeSkillEffect(
                saman.netId, player.netId, 'saman_topu', saman.rotationY, damage, "HIT"
            );
            this.network.broadcast(effectPacket);

            // 3. HASAR VE STAT GÜNCELLEMESİ (GECİKMELİ - Pro standardı)
            this.enqueueCombatAction(delayMs, () => {
                const targetPlayer = this.players.get(targetId);
                if (!targetPlayer) return;

                const oldHp = targetPlayer.hp;
                targetPlayer.takeDamage(damage, saman.id, saman.username);

                // ÖLÜM BİLDİRİMİ (Notice)
                if (targetPlayer.hp <= 0 && oldHp > 0) {
                    const deathNotice = BinaryCoder.encodeNotice(`${targetPlayer.lastAttackerName} tarafından öldürüldün.`);
                    targetPlayer.send(deathNotice);
                }

                // STAT GÜNCELLEMESİ
                targetPlayer.send(BinaryCoder.encodeFullStats(targetPlayer.attributes, targetPlayer.derived, targetPlayer.hp, targetPlayer.mp));
                const statPacket = BinaryCoder.encodePlayersDynamicList([targetPlayer.toState()], null, this.getElapsedServerTime(), this.players.size);
                this.network.broadcast(statPacket);
            });
        };

        this.enemies.set(id, saman);
        console.log(`[GameManager] Saman Spawn Edildi: ${id} (NetID: ${saman.netId})`);
    }

    private startAILoop() {
        // PRO: 25ms TICK (40Hz - Oyuncularla aynı akıcılıkta hareket için hızlandırıldı)
        setInterval(() => {
            const delta = 0.025; // 25ms = 0.025s
            const now = Date.now();
            const enemyStates = [];

            // 1. MEVCUT CANAVARLARI GÜNCELLE VE ÖLÜMLERİ TAKİP ET
            for (const [id, enemy] of this.enemies.entries()) {
                enemy.update(delta, this.players);
                
                // ÖLÜM KONTROLÜ
                if (enemy.hp <= 0) {
                    // Ölümden 5 saniye sonra haritadan sil ve respawn kuyruğuna al (Animasyonun bitmesi için zaman tanı)
                    if (!(enemy as any).deathStartTime) {
                        (enemy as any).deathStartTime = now;
                    } else if (now - (enemy as any).deathStartTime > 5000) {
                        // Respawn bilgilerini sakla
                        const respawnDelay = 15000 + Math.floor(Math.random() * 5000); // 15-20 saniye
                        this.respawnQueue.push({
                            spawnPos: enemy.spawnPos,
                            type: "SAMAN",
                            respawnAt: now + respawnDelay
                        });

                        // Haritadan sil (LEAVE gönder)
                        const leavePacket = BinaryCoder.encodeLeave(enemy.id);
                        this.network.broadcast(leavePacket);
                        this.enemies.delete(id);
                        continue; 
                    }
                }
                
                enemyStates.push(enemy.toState());
            }

            // 2. RESPAWN KUYRUĞUNU KONTROL ET
            for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
                const r = this.respawnQueue[i];
                if (now >= r.respawnAt) {
                    const id = `${r.type.toLowerCase()}_${this.nextNetId}`;
                    this.spawnSaman(id, r.spawnPos); // Yeniden canlandır
                    this.respawnQueue.splice(i, 1);
                }
            }

            // 3. STAT GÜNCELLEMELERİNİ GÖNDER
            if (enemyStates.length > 0) {
                const statePacket = BinaryCoder.encodePlayersDynamicList(
                    enemyStates, null, this.getElapsedServerTime(), this.players.size
                );
                this.network.broadcast(statePacket);
            }
            // 4. COMBAT QUEUE GÜNCELLEMESİ
            for (let i = this.combatQueue.length - 1; i >= 0; i--) {
                const item = this.combatQueue[i];
                if (now >= item.executeAt) {
                    item.action();
                    this.combatQueue.splice(i, 1);
                }
            }
        }, 25);
    }

    private initWeatherSync() {
        setInterval(() => {
            const scheduledRainy = isCurrentlyRainy();
            if (scheduledRainy !== this.lastScheduleState) {
                this.lastScheduleState = scheduledRainy;
                this.broadcastWeather(scheduledRainy);
            }
        }, 10000);
    }

    public broadcastWeather(isRainy: boolean) {
        this.currentRainState = isRainy;
        const packet = BinaryCoder.encodeWeatherUpdate(isRainy);
        this.network.broadcast(packet);
    }

    public broadcastNotice(message: string) {
        const packet = BinaryCoder.encodeNotice(message);
        this.network.broadcast(packet);
        console.log(`[Duyuru] ${message}`);
    }

    public getElapsedServerTime(): number { return Date.now(); }
    public getInterestManager() { return this.interestManager; }
    public getPlayersMap(): Map<string, Player> { return this.players; }
    public getEnemiesMap(): Map<string, BaseEnemy> { return this.enemies; }
    public getAllPlayersState() { return Array.from(this.players.values()).map(p => p.toState()); }
    public getPlayerById(id: string) { return this.players.get(id); }

    /**
     * PRO: NetID üzerinden Player veya Enemy bul
     */
    public getEntityByNetId(netId: number): any {
        // Önce oyunculara bak
        for (const p of this.players.values()) {
            if (p.netId === netId) return p;
        }
        // Sonra düşmanlara bak
        for (const e of this.enemies.values()) {
            if (e.netId === netId) return e;
        }
        return null;
    }

    public addPlayer(player: Player) {
        player.netId = this.nextNetId++; // PRO: Numeric ID atandı
        this.players.set(player.id, player);
        const serverTime = this.getElapsedServerTime();
        
        // İlk girişte mevcut düşmanları VE diğer oyuncuları gönder
        const enemiesState = Array.from(this.enemies.values()).map(e => e.toState());
        const otherPlayersState = Array.from(this.players.values())
            .filter(p => p.id !== player.id)
            .map(p => p.toState());
        
        const allOthers = [...enemiesState, ...otherPlayersState];
        
        const resPacket = BinaryCoder.encodePlayersList(PacketType.LOGIN_RES, allOthers, player.toState(), serverTime, this.players.size);
        player.send(resPacket);
        
        const weatherPacket = BinaryCoder.encodeWeatherUpdate(this.currentRainState);
        player.send(weatherPacket);

        // PRO: İlk girişte FULL STATS senkronizasyonu
        player.send(BinaryCoder.encodeFullStats(player.attributes, player.derived, player.hp, player.mp));
        
        // DİĞERLERİNE BİLDİR: Yeni oyuncu katıldı (NetID mapping için kritik)
        const joinPacket = BinaryCoder.encodePlayersList(PacketType.JOIN, [player.toState()], undefined, serverTime, this.players.size);
        this.network.broadcast(joinPacket);

        console.log(`[GameManager] Oyuncu Eklendi: ${player.username} (${player.id}) | Toplam Online: ${this.players.size}`);
    }

    public removePlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            this.players.delete(id);
            this.interestManager.removePlayer(id);
            const leavePacket = BinaryCoder.encodeLeave(id);
            this.network.broadcast(leavePacket);
            console.log(`[GameManager] Oyuncu Ayrıldı: ${player.username} (${id})`);
        }
    }

    public broadcastChat(packet: ArrayBuffer) { this.network.broadcast(packet); }
    public movePlayer(id: string, position: {x: number, y: number, z: number}, rotationY?: number) {
        const player = this.players.get(id);
        if (player) {
            player.position = position;
            if (rotationY !== undefined) player.rotationY = rotationY;
        }
    }
}
