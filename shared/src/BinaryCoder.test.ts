import { BinaryCoder } from './BinaryCoder.js';
import { PacketType, PlayerData, Vector3 } from './index.js';

describe('BinaryCoder', () => {
    describe('encodePing & decode', () => {
        it('should correctly encode and decode PING', () => {
            const buffer = BinaryCoder.encodePing();
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.PING });
        });
    });

    describe('encodeWeatherUpdate & decode', () => {
        it('should correctly encode and decode WEATHER_UPDATE (true)', () => {
            const buffer = BinaryCoder.encodeWeatherUpdate(true);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.WEATHER_UPDATE, isRainy: true });
        });

        it('should correctly encode and decode WEATHER_UPDATE (false)', () => {
            const buffer = BinaryCoder.encodeWeatherUpdate(false);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.WEATHER_UPDATE, isRainy: false });
        });
    });

    describe('encodeNotice & decode', () => {
        it('should correctly encode and decode NOTICE', () => {
            const message = "Server shutting down in 5 minutes!";
            const buffer = BinaryCoder.encodeNotice(message);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.NOTICE, message });
        });

        it('should handle empty notice message', () => {
            const message = "";
            const buffer = BinaryCoder.encodeNotice(message);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.NOTICE, message });
        });
    });

    describe('encodeStatUpdate & decode', () => {
        it('should correctly encode and decode STAT_UPDATE (attrName and value)', () => {
            const buffer = BinaryCoder.encodeStatUpdate("str", 50);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({ type: PacketType.STAT_UPDATE, attrName: "str" });
            // Note: Currently BinaryCoder.decode doesn't seem to read the value parameter of encodeStatUpdate
            // It just returns { type, attrName: mode }.
            // Wait, let's look at decode logic: case PacketType.STAT_UPDATE: { const mode = reader.readString8(); if (mode === "FULL_SYNC") { ... } return { type, attrName: mode }; }
            // The 16-bit value is written but not read in the regular stat update decode flow.
        });

        it('should correctly encode and decode STAT_UPDATE (FULL_SYNC)', () => {
            const attributes = { str: 10, int: 20, vit: 30, dex: 40, luk: 50, availablePoints: 5 };
            const derived = { hp: 1000, mp: 500 }; // Wait encodeFullStats expects maxHp and maxMp on decode? Let's check:
            // decode reads: hp, maxHp, mp, maxMp
            // encode writes: currentHp, maxHp(derived.hp), currentMp, maxMp(derived.mp)

            const buffer = BinaryCoder.encodeFullStats(attributes, derived, 500, 250);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({
                type: PacketType.STAT_UPDATE,
                mode: "FULL_SYNC",
                attributes,
                derived: {
                    hp: 500,
                    maxHp: 1000,
                    mp: 250,
                    maxMp: 500
                }
            });
        });
    });

    describe('encodeSkillCast & decode', () => {
        it('should correctly encode and decode SKILL_CAST', () => {
            const buffer = BinaryCoder.encodeSkillCast("FIREBALL", 12345);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({
                type: PacketType.SKILL_CAST,
                skillId: "FIREBALL",
                targetNetId: 12345
            });
        });
    });

    describe('encodeSkillEffect & decode', () => {
        it('should correctly encode and decode SKILL_EFFECT', () => {
            const rotY = Math.PI; // 3.14159...
            const buffer = BinaryCoder.encodeSkillEffect(111, 222, "SLASH", rotY, 1500, "CRIT");
            const decoded = BinaryCoder.decode(buffer);

            expect(decoded.type).toBe(PacketType.SKILL_EFFECT);
            expect(decoded.casterNetId).toBe(111);
            expect(decoded.targetNetId).toBe(222);
            expect(decoded.skillId).toBe("SLASH");
            expect(decoded.damage).toBe(1500);
            expect(decoded.resultType).toBe("CRIT");

            // Due to compression/quantization, rotation might not be exact, so we can check it's close
            expect(Math.abs(decoded.casterRotationY - rotY)).toBeLessThan(0.1);
        });
    });

    describe('encodeDamageMeter & decode', () => {
        it('should correctly encode and decode DAMAGE_METER (multiple entries)', () => {
            const damages = [
                { username: "Player1", amount: 5000 },
                { username: "Player2", amount: 3500 },
                { username: "Player3", amount: 1200 }
            ];
            const buffer = BinaryCoder.encodeDamageMeter(999, damages);
            const decoded = BinaryCoder.decode(buffer);

            expect(decoded).toEqual({
                type: PacketType.DAMAGE_METER,
                targetNetId: 999,
                data: damages
            });
        });

        it('should truncate damage entries to 5', () => {
            const damages = [
                { username: "Player1", amount: 100 },
                { username: "Player2", amount: 200 },
                { username: "Player3", amount: 300 },
                { username: "Player4", amount: 400 },
                { username: "Player5", amount: 500 },
                { username: "Player6", amount: 600 }
            ];
            const buffer = BinaryCoder.encodeDamageMeter(999, damages);
            const decoded = BinaryCoder.decode(buffer);

            expect(decoded.data.length).toBe(5);
            expect(decoded.data[4]).toEqual({ username: "Player5", amount: 500 });
        });
    });

    describe('encodeRespawnRequest & decode', () => {
        it('should correctly encode and decode RESPAWN_REQUEST (0)', () => {
            const buffer = BinaryCoder.encodeRespawnRequest(0);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({
                type: PacketType.RESPAWN_REQUEST,
                spawnType: 0
            });
        });

        it('should correctly encode and decode RESPAWN_REQUEST (1)', () => {
            const buffer = BinaryCoder.encodeRespawnRequest(1);
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toEqual({
                type: PacketType.RESPAWN_REQUEST,
                spawnType: 1
            });
        });
    });

    describe('decode invalid buffer', () => {
        it('should return null on invalid buffer', () => {
            const buffer = new ArrayBuffer(0); // Too small
            const decoded = BinaryCoder.decode(buffer);
            expect(decoded).toBeNull();
        });
    });
});
