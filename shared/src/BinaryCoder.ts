import { PacketType, PlayerData, Vector3 } from './index.js';
import { AuthPackets } from './packets/AuthPackets.js';
import { MovementPackets } from './packets/MovementPackets.js';
import { ChatPackets } from './packets/ChatPackets.js';
import { PacketReader } from './packets/PacketReader.js';
import { PacketBuilder } from './packets/PacketBuilder.js';

export class BinaryCoder {
    public static encodeLoginReq(username: string) { return AuthPackets.encodeLoginReq(username); }
    public static encodeMove(pos: Vector3, rotationY: number) { 
        // PRO: Sınırsız Harita için Float32 doğrudan gönderimi (Quantization kaldırıldı)
        return MovementPackets.encodeMoveQuantized(pos, rotationY); 
    }
    public static encodeChat(username: string, message: string) { return ChatPackets.encodeChat(username, message); }
    public static encodePrivateMsg(targetId: string, fromUsername: string, message: string) { 
        return ChatPackets.encodePrivateMsg(targetId, fromUsername, message); 
    }
    public static encodeLeave(id: string) { return AuthPackets.encodeLeave(id); }
    public static encodePlayersList(type: PacketType, players: PlayerData[], myPlayer?: PlayerData, serverTime?: number, totalOnline?: number) { 
        return AuthPackets.encodePlayersList(type, players, myPlayer, serverTime, totalOnline); 
    }

    public static encodePlayersDynamicList(players: PlayerData[], myPlayer: PlayerData | null, serverTime: number, totalOnline: number) {
        return AuthPackets.encodePlayersDynamicList(players, myPlayer, serverTime, totalOnline);
    }

    public static encodePing(): ArrayBuffer {
        const builder = new PacketBuilder(1);
        builder.writeUint8(PacketType.PING);
        return builder.build();
    }

    public static encodeWeatherUpdate(isRainy: boolean): ArrayBuffer {
        const builder = new PacketBuilder(2);
        builder.writeUint8(PacketType.WEATHER_UPDATE);
        builder.writeUint8(isRainy ? 1 : 0);
        return builder.build();
    }

    public static encodeNotice(message: string): ArrayBuffer {
        const builder = new PacketBuilder(2 + message.length * 2);
        builder.writeUint8(PacketType.NOTICE);
        builder.writeString8(message);
        return builder.build();
    }

    public static encodeStatUpdate(attrName: string, value?: number): ArrayBuffer {
        const builder = new PacketBuilder(16);
        builder.writeUint8(PacketType.STAT_UPDATE);
        builder.writeString8(attrName);
        if (value !== undefined) builder.writeUint16(value);
        return builder.build();
    }

    public static encodeFullStats(attributes: any, derived: any, currentHp: number, currentMp: number): ArrayBuffer {
        const builder = new PacketBuilder(64);
        builder.writeUint8(PacketType.STAT_UPDATE);
        builder.writeString8("FULL_SYNC");
        builder.writeUint16(attributes.str);
        builder.writeUint16(attributes.int);
        builder.writeUint16(attributes.vit);
        builder.writeUint16(attributes.dex);
        builder.writeUint16(attributes.luk);
        builder.writeUint16(attributes.availablePoints);
        builder.writeFloat32(currentHp); // PRO: Current HP
        builder.writeFloat32(derived.hp); // MAX HP
        builder.writeFloat32(currentMp); // PRO: Current MP
        builder.writeFloat32(derived.mp); // MAX MP
        return builder.build();
    }

    public static encodeSkillCast(skillId: string, targetNetId: number): ArrayBuffer {
        const builder = new PacketBuilder(16);
        builder.writeUint8(PacketType.SKILL_CAST);
        builder.writeString8(skillId);
        builder.writeUint16(targetNetId); // PRO: Target NetID (Sayısal)
        return builder.build();
    }

    public static encodeSkillEffect(senderNetId: number, targetNetId: number, skillId: string, casterRotationY: number, damage: number, resultType: string): ArrayBuffer {
        const builder = new PacketBuilder(32);
        builder.writeUint8(PacketType.SKILL_EFFECT);
        builder.writeUint16(senderNetId);
        builder.writeUint16(targetNetId);
        builder.writeString8(skillId);
        
        const compressedRot = Math.floor(((casterRotationY % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2) * (255 / (Math.PI * 2)));
        builder.writeUint8(compressedRot);
        
        builder.writeUint32(damage);
        builder.writeString8(resultType); // HIT, CRIT, MISS, DODGE
        return builder.build();
    }

    public static encodeDamageMeter(targetNetId: number, damages: {username: string, amount: number}[]): ArrayBuffer {
        const builder = new PacketBuilder(5 + damages.length * 32);
        builder.writeUint8(PacketType.DAMAGE_METER);
        builder.writeUint16(targetNetId);
        builder.writeUint8(Math.min(5, damages.length)); // Max 5 kişi
        
        for (let i = 0; i < Math.min(5, damages.length); i++) {
            builder.writeString8(damages[i].username);
            builder.writeUint32(damages[i].amount);
        }
        return builder.build();
    }

    public static encodeRespawnRequest(spawnType: number): ArrayBuffer {
        const builder = new PacketBuilder(2);
        builder.writeUint8(PacketType.RESPAWN_REQUEST);
        builder.writeUint8(spawnType); // 0: Şehir, 1: Olduğu Yer
        return builder.build();
    }

    public static decode(message: any): any {
        try {
            const reader = new PacketReader(message);
            const type = reader.readUint8();
            switch (type) {
                case PacketType.LOGIN_REQ: return { type, username: reader.readString8() };
                case PacketType.LOGIN_RES: {
                    const serverTime = reader.readUint32();
                    const totalOnline = reader.readUint16();
                    const me = AuthPackets.readPlayerData(reader);
                    const count = reader.readUint16();
                    const others = [];
                    for(let i=0; i<count; i++) { others.push(AuthPackets.readPlayerData(reader)); }
                    return { type, player: me, others, serverTime, totalOnline };
                }
                case PacketType.MOVE: {
                    const decoded = MovementPackets.decodeMoveQuantized(reader);
                    if (decoded) {
                        return { type, ...decoded };
                    }
                    return null;
                }
                case PacketType.STATE_UPDATE: {
                    const serverTime = reader.readUint32();
                    const totalOnline = reader.readUint16();
                    
                    // PRO: Self Flag Kontrolü (1: Kendim varım, 0: Sadece diğerleri var)
                    const hasSelf = reader.readUint8() === 1;
                    const self = hasSelf ? AuthPackets.readPlayerDynamic(reader) : null;
                    
                    const count = reader.readUint16();
                    const players = [];
                    for(let i=0; i<count; i++) { players.push(AuthPackets.readPlayerDynamic(reader)); }
                    return { type, self, players, serverTime, totalOnline };
                }
                case PacketType.CHAT_MSG: return { type, ...ChatPackets.decodeChat(reader) };
                case PacketType.PRIVATE_MSG: return { type, ...ChatPackets.decodePrivateMsg(reader) };
                case PacketType.JOIN: {
                    const serverTime = reader.readUint32();
                    const totalOnline = reader.readUint16();
                    const count = reader.readUint16();
                    if (count > 0) return { type, player: AuthPackets.readPlayerData(reader), serverTime, totalOnline };
                    return { type, serverTime, totalOnline };
                }
                case PacketType.LEAVE: return { type, id: reader.readString8() };
                case PacketType.PING: return { type };
                case PacketType.WEATHER_UPDATE: return { type, isRainy: reader.readUint8() === 1 };
                case PacketType.NOTICE: return { type, message: reader.readString8() };
                case PacketType.STAT_UPDATE: {
                    const mode = reader.readString8();
                    if (mode === "FULL_SYNC") {
                        return {
                            type, mode,
                            attributes: { str: reader.readUint16(), int: reader.readUint16(), vit: reader.readUint16(), dex: reader.readUint16(), luk: reader.readUint16(), availablePoints: reader.readUint16() },
                            derived: { hp: reader.readFloat32(), maxHp: reader.readFloat32(), mp: reader.readFloat32(), maxMp: reader.readFloat32() }
                        };
                    }
                    return { type, attrName: mode };
                }
                case PacketType.SKILL_CAST: return { type, skillId: reader.readString8(), targetNetId: reader.readUint16() };
                case PacketType.SKILL_EFFECT: {
                    const casterNetId = reader.readUint16();
                    const targetNetId = reader.readUint16();
                    const skillId = reader.readString8();
                    const casterRot = reader.readUint8() * (Math.PI * 2 / 255);
                    const damage = reader.readUint32();
                    const resultType = reader.readString8();
                    return { type, casterNetId, targetNetId, skillId, casterRotationY: casterRot, damage, resultType };
                }
                case PacketType.DAMAGE_METER: {
                    const targetNetId = reader.readUint16();
                    const count = reader.readUint8();
                    const data = [];
                    for(let i=0; i<count; i++) {
                        data.push({ username: reader.readString8(), amount: reader.readUint32() });
                    }
                    return { type, targetNetId, data };
                }
                case PacketType.RESPAWN_REQUEST: return { type, spawnType: reader.readUint8() };
            }
        } catch (err) { return null; }
        return null;
    }
}
