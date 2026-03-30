import { PacketType } from '../index.js';
import { PacketBuilder } from './PacketBuilder.js';
import { PacketReader } from './PacketReader.js';

/**
 * Sohbet ve İletişim Sistemleri (Modular Builder Architecture)
 */
export class ChatPackets {
    
    public static encodeChat(username: string, message: string): ArrayBuffer {
        return new PacketBuilder(1 + 32 + message.length * 2)
            .writeUint8(PacketType.CHAT_MSG)
            .writeString8(username)
            .writeString16(message)
            .build();
    }

    public static decodeChat(reader: PacketReader): any {
        return {
            username: reader.readString8(),
            message: reader.readString16()
        };
    }

    public static encodePrivateMsg(targetId: string, fromUsername: string, message: string): ArrayBuffer {
        return new PacketBuilder(1 + targetId.length + 1 + fromUsername.length + 1 + message.length * 2)
            .writeUint8(PacketType.PRIVATE_MSG)
            .writeString8(targetId)
            .writeString8(fromUsername)
            .writeString16(message)
            .build();
    }

    public static decodePrivateMsg(reader: PacketReader): any {
        return {
            targetId: reader.readString8(),
            fromUsername: reader.readString8(),
            message: reader.readString16()
        };
    }
}
