import { PacketType, PlayerData } from '../index.js';
import { PacketBuilder } from './PacketBuilder.js';
import { PacketReader } from './PacketReader.js';

/**
 * Kimlik Doğrulama ve Bağlantı Paketleri (Modular Builder Architecture)
 */
export class AuthPackets {
    
    public static encodeLoginReq(username: string): ArrayBuffer {
        return new PacketBuilder(1 + 1 + username.length * 2)
            .writeUint8(PacketType.LOGIN_REQ)
            .writeString8(username)
            .build();
    }

    public static encodeLoginRes(player: PlayerData, others: PlayerData[]): ArrayBuffer {
        return this.encodePlayersList(PacketType.LOGIN_RES, others, player);
    }

    public static encodeJoin(player: PlayerData): ArrayBuffer {
        return this.encodePlayersList(PacketType.JOIN, [player]);
    }

    public static encodeLeave(id: string): ArrayBuffer {
        return new PacketBuilder(10)
            .writeUint8(PacketType.LEAVE)
            .writeString8(id)
            .build();
    }

    /**
     * Ortak Oyuncu Listesi Paketleyici (Zaman Damgası Destekli)
     */
    public static encodePlayersList(type: PacketType, players: PlayerData[], myPlayer?: PlayerData, serverTime?: number, totalOnline?: number): ArrayBuffer {
        const builder = new PacketBuilder(128); // Dinamik büyüyecek
        builder.writeUint8(type);
        
        // Zaman Damgası (Interpolation için zorunlu 4 byte)
        builder.writeUint32(serverTime || 0);
        
        // Global Online Sayısı (2 byte)
        builder.writeUint16(totalOnline || players.length + (myPlayer ? 1 : 0));

        if (myPlayer) {
            this.writePlayerData(builder, myPlayer);
        }

        builder.writeUint16(players.length);
        players.forEach(p => this.writePlayerData(builder, p));

        return builder.build();
    }

    /**
     * Optimizasyon: Sadece değişen (dinamik) verileri paketler
     */
    public static encodePlayersDynamicList(players: PlayerData[], myPlayer: PlayerData | null, serverTime: number, totalOnline: number): ArrayBuffer {
        const builder = new PacketBuilder(128);
        builder.writeUint8(PacketType.STATE_UPDATE);
        builder.writeUint32(serverTime);
        builder.writeUint16(totalOnline);

        // Kendi dinamik verilerimiz (Halıhazırda null ise 0 yazarak geç- Reader null playerID beklemeli)
        if (myPlayer) {
            builder.writeUint8(1); // Self flag
            this.writePlayerDynamic(builder, myPlayer);
        } else {
            builder.writeUint8(0); // No Self flag
        }

        // Diğer oyuncuların dinamik verileri
        builder.writeUint16(players.length);
        players.forEach(p => this.writePlayerDynamic(builder, p));

        return builder.build();
    }

    public static writePlayerData(builder: PacketBuilder, p: PlayerData) {
        builder.writeUint16(p.netId || 0) // PRO: Sayısal ID eklendi
               .writeString8(p.id)
               .writeString8(p.username)
               .writeFloat32(p.position.x)
               .writeFloat32(p.position.y)
               .writeFloat32(p.position.z)
               .writeFloat32(p.rotationY)
               .writeUint16(p.level)
               .writeFloat32(p.hp)
               .writeFloat32(p.maxHp)
               .writeFloat32(p.mp)
               .writeFloat32(p.maxMp)
               .writeUint8(p.entityType || 0);
    }

    public static writePlayerDynamic(builder: PacketBuilder, p: PlayerData) {
        builder.writeUint16(p.netId || 0); 
        
        // PRO: Sınırsız Harita için Float32 (Overflow hatalarını engeller)
        builder.writeFloat32(p.position.x);
        builder.writeFloat32(p.position.y);
        builder.writeFloat32(p.position.z);
        
        // PRO: Compressed Rotation (1-byte)
        const compressedRot = Math.floor(((p.rotationY % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2) * (255 / (Math.PI * 2)));
        builder.writeUint8(compressedRot);
        
        builder.writeFloat32(p.hp)
               .writeFloat32(p.mp)
               .writeUint8(p.entityType || 0)
               .writeUint8(p.animationState || 0); // PRO: Animasyon durumu eklendi
    }

    public static readPlayerData(reader: PacketReader): PlayerData {
        return {
            netId: reader.readUint16(),
            id: reader.readString8(),
            username: reader.readString8(),
            position: { x: reader.readFloat32(), y: reader.readFloat32(), z: reader.readFloat32() },
            rotationY: reader.readFloat32(),
            level: reader.readUint16(),
            hp: reader.readFloat32(),
            maxHp: reader.readFloat32(),
            mp: reader.readFloat32(),
            maxMp: reader.readFloat32(),
            entityType: reader.readUint8()
        };
    }

    public static readPlayerDynamic(reader: PacketReader): Partial<PlayerData> {
        return {
            netId: reader.readUint16(),
            position: {
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                z: reader.readFloat32()
            },
            rotationY: reader.readUint8() * (Math.PI * 2 / 255),
            hp: reader.readFloat32(),
            mp: reader.readFloat32(),
            entityType: reader.readUint8(),
            animationState: reader.readUint8()
        };
    }
}
