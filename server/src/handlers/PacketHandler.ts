import { WebSocket } from 'ws';
import { PacketType, BinaryCoder } from '../../../shared/src/index.js';
import { GameManager } from '../core/GameManager.js';
import { Player } from '../entities/Player.js';
import { YANAN_DALGA_DATA } from '../../../shared/src/skills/SkillConfigs.js';
import { CombatSystem } from '../../../shared/src/CombatSystem.js';

export function handleIncomingPacket(
    ws: WebSocket, 
    message: ArrayBuffer, 
    gameManager: GameManager,
    getPlayerId: (socket: WebSocket) => string | undefined,
    mapConnection: (socket: WebSocket, id: string) => void
) {
    try {
        const data = BinaryCoder.decode(message);
        if (!data) return;


        switch (data.type) {
            case PacketType.LOGIN_REQ:
                const player = new Player(Math.random().toString(36).substr(2, 9), data.username, ws);
                gameManager.addPlayer(player);
                // ÖNEMLİ: Socket-ID eşleşmesini kaydet (Online sayısının doğru düşmesi için)
                mapConnection(ws, player.id);
                break;

            case PacketType.MOVE:
                const id = getPlayerId(ws);
                if (id) gameManager.movePlayer(id, data.position, data.rotationY);
                break;

            case PacketType.CHAT_MSG:
                gameManager.broadcastChat(message);
                break;

            case PacketType.PRIVATE_MSG:
                const players = gameManager.getPlayersMap();
                const target = players.get(data.targetId);
                if (target) target.send(message);
                break;

            case PacketType.WEATHER_UPDATE:
                gameManager.broadcastWeather(data.isRainy);
                break;

            case PacketType.NOTICE:
                gameManager.broadcastNotice(data.message);
                break;

            case PacketType.STAT_UPDATE:
                const pId = getPlayerId(ws);
                if (pId) {
                    const p = gameManager.getPlayerById(pId);
                    const allowedAttributes = ['str', 'int', 'dex', 'vit', 'luk'];
                    if (p && allowedAttributes.includes(data.attrName) && p.tryIncreaseAttribute(data.attrName)) {
                        p.send(BinaryCoder.encodeFullStats(p.attributes, p.derived, p.hp, p.mp));
                        const updatePacket = BinaryCoder.encodePlayersList(PacketType.JOIN, [p.toState()]);
                        gameManager.broadcastChat(updatePacket);
                    }
                }
                break;

            case PacketType.SKILL_CAST:
                const casterId = getPlayerId(ws);
                if (casterId) {
                    const caster = gameManager.getPlayerById(casterId);
                    const target = gameManager.getEntityByNetId(data.targetNetId);

                    if (caster && target && target.hp > 0) {
                        const skillData = YANAN_DALGA_DATA[caster.level] || YANAN_DALGA_DATA[1];
                        const mpCost = skillData.mpCost;
                        const cooldown = skillData.cooldown * 1000;

                        if (caster.canCastSkill(data.skillId, mpCost, cooldown)) {
                            caster.useSkill(data.skillId, mpCost);
                            
                            const combatResult = CombatSystem.calculateDamage(caster.derived, target.derived, true);
                            const finalDamage = Math.round(combatResult.damage * skillData.damageMultiplier);
                            
                            // Görsel efekti ve hasar bilgisini tüm çevresine DUYUR (Anında)
                            const effectPacket = BinaryCoder.encodeSkillEffect(
                                caster.netId, 
                                target.netId, 
                                data.skillId, 
                                caster.rotationY,
                                finalDamage, 
                                combatResult.type
                            );
                            gameManager.broadcastChat(effectPacket);

                            // Mesafe bazlı vuruş gecikmesi hesapla (Sabit Hız: 12 birim/s)
                            const dx = caster.position.x - target.position.x;
                            const dy = caster.position.y - target.position.y;
                            const dz = caster.position.z - target.position.z;
                            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                            const travelDelay = (distance / 12.0) * 1000; // ms

                            // Hasarı dinamik süre sonra UYGULA (Cast Gecikmesi 650ms + Yol Süresi)
                            const totalDelay = 650 + travelDelay;

                            setTimeout(() => {
                                target.takeDamage(finalDamage, caster.id, caster.username);
                                console.log(`[Combat-Delay] Hasar uygulandı (${Math.round(distance)}m): ${finalDamage}`);

                                const targetState = BinaryCoder.encodePlayersDynamicList(
                                    [target.toState()], 
                                    caster.toState(), 
                                    gameManager.getElapsedServerTime(), 
                                    gameManager.getPlayersMap().size
                                );
                                gameManager.broadcastChat(targetState);
                            }, totalDelay);

                            caster.send(BinaryCoder.encodeFullStats(caster.attributes, caster.derived, caster.hp, caster.mp));
                        } else {
                            console.warn(`[Combat] ${caster.username} yetenek atamadı. MP: ${caster.mp}/${skillData.mpCost}`);
                            caster.send(BinaryCoder.encodeFullStats(caster.attributes, caster.derived, caster.hp, caster.mp));
                        }

                    } else {
                        console.warn(`[Combat] Caster veya Target bulunamadı! Caster: ${caster?.username}, TargetID: ${data.targetNetId}`);
                    }
                }
                break;

            case PacketType.RESPAWN_REQUEST:
                const respawnPId = getPlayerId(ws);
                const playerToRespawn = respawnPId ? gameManager.getPlayersMap().get(respawnPId) : null;
                if (playerToRespawn && playerToRespawn.hp <= 0) {
                    if (data.spawnType === 0) {
                        playerToRespawn.position = { x: 0, y: 0, z: 0 }; // Şehir merkezi
                    }
                    playerToRespawn.respawn();
                    
                    // Güncel durumu herkese bildir
                    const respawnPacket = BinaryCoder.encodePlayersDynamicList(
                        [playerToRespawn.toState()], null, gameManager.getElapsedServerTime(), gameManager.getPlayersMap().size
                    );
                    gameManager.broadcastChat(respawnPacket);
                    playerToRespawn.send(BinaryCoder.encodeFullStats(playerToRespawn.attributes, playerToRespawn.derived, playerToRespawn.hp, playerToRespawn.mp));
                    console.log(`[Respawn] ${playerToRespawn.username} canlandı. Tip: ${data.spawnType}`);
                }
                break;

            case PacketType.PING:
                ws.send(BinaryCoder.encodePing());
                break;

            default:
                console.warn("[PacketHandler] Bilinmeyen paket tipi:", data.type);
                break;
        }
    } catch (e) {
        console.error("[PacketHandler] Paket parse hatası", e);
    }
}
