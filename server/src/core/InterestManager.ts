import { Player } from '../entities/Player.js';
import { NET_CONFIG } from '../../../shared/src/index.js';

/**
 * MMORPG AOI Grid Yöneticisi (Silkroad/Metin2 Ölçeklenebilirliği)
 */
export class InterestManager {
    private readonly CELL_SIZE = 100; // PRO: Görüş alanı (80) hücredüzünden küçük olmamalı
    private readonly VIEW_DISTANCE_SQ = NET_CONFIG.AOI_DISTANCE * NET_CONFIG.AOI_DISTANCE;
    
    // Hücre tabanlı depolama: Map<"x,z", Set<playerId>>
    private grid: Map<string, Set<string>> = new Map();
    // Oyuncu -> Son bilinen hücre
    private playerToCell: Map<string, string> = new Map();
    // Görünürlük hafızası (Önceki tick ile kıyas için)
    private visibleToPlayer: Map<string, Set<string>> = new Map();

    private getCellKey(x: number, z: number): string {
        const cx = Math.floor(x / this.CELL_SIZE);
        const cz = Math.floor(z / this.CELL_SIZE);
        return `${cx},${cz}`;
    }

    public updateVisibility(entity: any, allEntitiesMap: Map<string, any>): {
        newVisible: any[], 
        newHidden: string[] 
    } {
        const playerId = entity.id;
        const currentVisible = this.visibleToPlayer.get(playerId) || new Set<string>();
        const nextVisible = new Set<string>();
        const newVisibleEntities: any[] = [];
        const newHiddenIds: string[] = [];

        // 1. Grid Güncelleme
        const newCellKey = this.getCellKey(entity.position.x, entity.position.z);
        const oldCellKey = this.playerToCell.get(playerId);
        
        if (oldCellKey !== newCellKey) {
            if (oldCellKey) this.grid.get(oldCellKey)?.delete(playerId);
            if (!this.grid.has(newCellKey)) this.grid.set(newCellKey, new Set());
            this.grid.get(newCellKey)!.add(playerId);
            this.playerToCell.set(playerId, newCellKey);
        }

        // 2. Komşu 9 hücreyi tara (Optimized Scanning)
        const cx = Math.floor(entity.position.x / this.CELL_SIZE);
        const cz = Math.floor(entity.position.z / this.CELL_SIZE);

        for (let ix = cx - 1; ix <= cx + 1; ix++) {
            for (let iz = cz - 1; iz <= cz + 1; iz++) {
                const key = `${ix},${iz}`;
                const cellEntities = this.grid.get(key);
                if (!cellEntities) continue;

                for (const otherId of cellEntities) {
                    if (otherId === playerId) continue;
                    const other = allEntitiesMap.get(otherId);
                    if (!other) continue;

                    const dx = entity.position.x - other.position.x;
                    const dz = entity.position.z - other.position.z;
                    if ((dx * dx + dz * dz) <= this.VIEW_DISTANCE_SQ) {
                        nextVisible.add(otherId);
                        if (!currentVisible.has(otherId)) newVisibleEntities.push(other);
                    }
                }
            }
        }

        // 3. Gizlenenleri bul
        for (const visibleId of currentVisible) {
            if (!nextVisible.has(visibleId)) newHiddenIds.push(visibleId);
        }

        this.visibleToPlayer.set(playerId, nextVisible);
        return { newVisible: newVisibleEntities, newHidden: newHiddenIds };
    }

    public removePlayer(playerId: string) {
        const cellKey = this.playerToCell.get(playerId);
        if (cellKey) this.grid.get(cellKey)?.delete(playerId);
        this.playerToCell.delete(playerId);
        this.visibleToPlayer.delete(playerId);
        
        for (const visibleSet of this.visibleToPlayer.values()) {
            visibleSet.delete(playerId);
        }
    }

    public getVisibleEntities(playerId: string, allEntitiesMap: Map<string, any>): any[] {
        const visibleIds = this.visibleToPlayer.get(playerId);
        if (!visibleIds) return [];
        const results = [];
        for (const id of visibleIds) {
            const entity = allEntitiesMap.get(id);
            if (entity) results.push(entity);
        }
        return results;
    }
}
