import { GameManager } from './GameManager.js';
import { NET_CONFIG, BinaryCoder, PacketType } from '../../../shared/src/index.js';
import { Player } from '../entities/Player.js';
import { InterestManager } from './InterestManager.js';

export class TickLoop {
    private gameManager: GameManager;
    private timer: NodeJS.Timeout | null = null;
    private interestManager: InterestManager;
    
    // Regen Takibi
    private lastRegenTime: number = 0;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
        this.interestManager = gameManager.getInterestManager();
    }

    public start() {
        if (this.timer) return;

        this.timer = setInterval(() => {
            this.update();
        }, NET_CONFIG.TICK_RATE_MS);
    }

    private update() {
        const now = Date.now();
        const serverTime = this.gameManager.getElapsedServerTime();
        const allPlayersMap = this.gameManager.getPlayersMap();
        const allEnemiesMap = this.gameManager.getEnemiesMap();
        const allPlayers = Array.from(allPlayersMap.values());
        const allEnemies = Array.from(allEnemiesMap.values());
        
        // Tüm varlıkları hızlı erişim için Map'e al
        const allEntitiesMap = new Map<string, any>();
        allPlayers.forEach(p => allEntitiesMap.set(p.id, p));
        allEnemies.forEach(e => allEntitiesMap.set(e.id, e));

        // --- REJENERASYON DÖNGÜSÜ (Her 1 saniyede bir) ---
        if (now - this.lastRegenTime >= 1000) {
            allPlayers.forEach(p => p.processRegen());
            allEnemies.forEach(e => e.processRegen());
            this.lastRegenTime = now;
        }

        // 1. Grid Güncellemesi: Tüm Canavarları Grid'e Ekle/Güncelle
        for (const enemy of allEnemies) {
            this.interestManager.updateVisibility(enemy, allEntitiesMap);
        }

        for (const player of allPlayers) {
            // 2. Görüş Alanı (AOI) Güncellemesi (PRO Grid System)
            const { newVisible, newHidden } = this.interestManager.updateVisibility(player, allEntitiesMap);

            // 2. Yeni Girenlere JOIN Paketleri
            if (newVisible.length > 0) {
                const joinPackets = BinaryCoder.encodePlayersList(PacketType.JOIN, newVisible.map(p => (p as any).toState()), undefined, serverTime);
                player.send(joinPackets);
            }

            // 3. Çıkanlara LEAVE Paketleri
            for (const hiddenId of newHidden) {
                const leavePacket = BinaryCoder.encodeLeave(hiddenId);
                player.send(leavePacket);
            }

            // 4. Sadece Görünür Oyuncuların Durumunu Gönder (STATE_UPDATE)
            const visibleEntities = this.interestManager.getVisibleEntities(player.id, allEntitiesMap);

            const statePacket = BinaryCoder.encodePlayersDynamicList(
                visibleEntities.map(e => e.toState()),
                player.toState(), // Kendi güncel verilerini de gönder
                serverTime,
                allPlayers.length
            );
            player.send(statePacket);
        }
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
