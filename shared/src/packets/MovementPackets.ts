import { PacketType, PlayerData, Vector3 } from '../index.js';
import { PacketBuilder } from './PacketBuilder.js';
import { PacketReader } from './PacketReader.js';
import { AuthPackets } from './AuthPackets.js';

/**
 * Hareket ve Dünya Durum Güncellemesi Paketleri (Modular Builder Architecture)
 */
export class MovementPackets {
    
    public static encodeMove(pos: Vector3): ArrayBuffer {
        return new PacketBuilder(13)
            .writeUint8(PacketType.MOVE)
            .writeFloat32(pos.x)
            .writeFloat32(pos.y)
            .writeFloat32(pos.z)
            .build();
    }

    public static encodeMoveQuantized(pos: {x: number, y: number, z: number}, r: number): ArrayBuffer {
        // PRO: Float32 ile Sınırsız Harita Desteği (Işınlanma hatası giderildi)
        const builder = new PacketBuilder(14); 
        builder.writeUint8(PacketType.MOVE);
        builder.writeFloat32(pos.x);
        builder.writeFloat32(pos.y);
        builder.writeFloat32(pos.z);
        // Rotasyon 1-byte sıkıştırma devam ediyor (Tasarruf)
        const compressedRot = Math.floor(((r % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2) * (255 / (Math.PI * 2)));
        builder.writeUint8(compressedRot);
        return builder.build();
    }

    public static encodeStateUpdate(players: PlayerData[]): ArrayBuffer {
        return AuthPackets.encodePlayersList(PacketType.STATE_UPDATE, players);
    }

    public static decodeMove(reader: PacketReader): any {
        if (reader.eof) return null;

        try {
            // Şimdilik sadece pozisyon okuyoruz (Client -> Server için)
            const x = reader.readFloat32();
            const y = reader.readFloat32();
            const z = reader.readFloat32();
            return { position: {x,y,z} };
        } catch(e) {
            return null;
        }
    }

    public static decodeMoveQuantized(reader: PacketReader): any {
        try {
            const x = reader.readFloat32();
            const y = reader.readFloat32();
            const z = reader.readFloat32();
            const r = reader.readUint8() * (Math.PI * 2 / 255);
            return { position: {x,y,z}, rotationY: r };
        } catch(e) {
            return null;
        }
    }
}
