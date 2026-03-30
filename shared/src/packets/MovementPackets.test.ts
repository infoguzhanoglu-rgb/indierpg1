import { describe, it, expect } from 'vitest';
import { MovementPackets } from './MovementPackets';
import { PacketReader } from './PacketReader';
import { PacketBuilder } from './PacketBuilder';
import { PacketType } from '../index';

describe('MovementPackets', () => {
    describe('encodeMove & decodeMove', () => {
        it('should correctly encode and decode a full position', () => {
            const pos = { x: 12.34, y: 56.78, z: 90.12 };
            const buffer = MovementPackets.encodeMove(pos);
            const reader = new PacketReader(buffer);

            // Read the packet type
            const packetType = reader.readUint8();
            expect(packetType).toBe(PacketType.MOVE);

            const decoded = MovementPackets.decodeMove(reader);
            expect(decoded).not.toBeNull();

            // Checking near matching due to float precision
            expect(decoded.position.x).toBeCloseTo(pos.x);
            expect(decoded.position.y).toBeCloseTo(pos.y);
            expect(decoded.position.z).toBeCloseTo(pos.z);
        });

        it('decodeMove should return null if reader has no remaining data', () => {
            const emptyBuffer = new ArrayBuffer(0);
            const reader = new PacketReader(emptyBuffer);

            const decoded = MovementPackets.decodeMove(reader);
            expect(decoded).toBeNull();
        });

        it('decodeMove should return null on incomplete data (read error)', () => {
            // Buffer that only contains enough data for 1 float instead of 3
            const builder = new PacketBuilder(4);
            builder.writeFloat32(12.34);

            const reader = new PacketReader(builder.build());

            const decoded = MovementPackets.decodeMove(reader);
            expect(decoded).toBeNull();
        });
    });

    describe('encodeMoveQuantized & decodeMoveQuantized', () => {
        it('should correctly encode and decode a quantized movement packet', () => {
            const pos = { x: -10.5, y: 20.0, z: -30.5 };
            const r = Math.PI; // 180 degrees

            const buffer = MovementPackets.encodeMoveQuantized(pos, r);
            const reader = new PacketReader(buffer);

            // Read the packet type
            const packetType = reader.readUint8();
            expect(packetType).toBe(PacketType.MOVE);

            const decoded = MovementPackets.decodeMoveQuantized(reader);
            expect(decoded).not.toBeNull();

            // Checking near matching due to float precision
            expect(decoded.position.x).toBeCloseTo(pos.x);
            expect(decoded.position.y).toBeCloseTo(pos.y);
            expect(decoded.position.z).toBeCloseTo(pos.z);

            // Rotation is compressed to 1 byte, so we check for close match (with low precision)
            expect(decoded.rotationY).toBeCloseTo(r, 1);
        });

        it('decodeMoveQuantized should return null if reader is empty', () => {
            const emptyBuffer = new ArrayBuffer(0);
            const reader = new PacketReader(emptyBuffer);

            const decoded = MovementPackets.decodeMoveQuantized(reader);
            // Since it checks try-catch it should be null
            expect(decoded).toBeNull();
        });

        it('decodeMoveQuantized should return null on incomplete data (read error)', () => {
            // Provide 3 floats, but missing the 1 byte for rotation
            const builder = new PacketBuilder(12);
            builder.writeFloat32(1.0);
            builder.writeFloat32(2.0);
            builder.writeFloat32(3.0);

            const reader = new PacketReader(builder.build());

            const decoded = MovementPackets.decodeMoveQuantized(reader);
            expect(decoded).toBeNull();
        });
    });
});
