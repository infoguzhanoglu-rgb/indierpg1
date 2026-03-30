import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleIncomingPacket } from '../../src/handlers/PacketHandler.js';
import { PacketType, BinaryCoder } from '../../../shared/src/index.js';

describe('PacketHandler', () => {
    let mockWs: any;
    let mockGameManager: any;
    let mockGetPlayerId: any;
    let mockMapConnection: any;

    beforeEach(() => {
        mockWs = {
            send: vi.fn()
        };
        mockGameManager = {
            addPlayer: vi.fn(),
            movePlayer: vi.fn(),
            broadcastChat: vi.fn(),
            getPlayersMap: vi.fn(() => new Map()),
            broadcastWeather: vi.fn(),
            broadcastNotice: vi.fn(),
            getPlayerById: vi.fn(),
            getEntityByNetId: vi.fn(),
            getElapsedServerTime: vi.fn(() => 1000)
        };
        mockGetPlayerId = vi.fn();
        mockMapConnection = vi.fn();
    });

    it('should ignore invalid packets', () => {
        const invalidBuffer = new ArrayBuffer(0); // Too small
        handleIncomingPacket(mockWs, invalidBuffer, mockGameManager, mockGetPlayerId, mockMapConnection);
        expect(mockGameManager.addPlayer).not.toHaveBeenCalled();
    });

    it('should handle LOGIN_REQ', () => {
        const username = 'TestUser';
        const buffer = BinaryCoder.encodeLoginReq(username);

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockGameManager.addPlayer).toHaveBeenCalled();
        expect(mockMapConnection).toHaveBeenCalledWith(mockWs, expect.any(String));
    });

    it('should handle MOVE', () => {
        const pos = { x: 10, y: 0, z: 20 };
        const rot = Math.PI;
        const buffer = BinaryCoder.encodeMove(pos, rot);
        mockGetPlayerId.mockReturnValue('player123');

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockGetPlayerId).toHaveBeenCalledWith(mockWs);
        expect(mockGameManager.movePlayer).toHaveBeenCalledWith('player123', expect.any(Object), expect.any(Number));
    });

    it('should handle CHAT_MSG', () => {
        const buffer = BinaryCoder.encodeChat('TestUser', 'Hello World!');
        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockGameManager.broadcastChat).toHaveBeenCalledWith(buffer);
    });

    it('should handle PRIVATE_MSG', () => {
        const targetId = 'target-id';
        const buffer = BinaryCoder.encodePrivateMsg(targetId, 'SenderUser', 'Hello private!');

        const targetPlayer = { send: vi.fn() };
        const playersMap = new Map();
        playersMap.set(targetId, targetPlayer);
        mockGameManager.getPlayersMap.mockReturnValue(playersMap);

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(targetPlayer.send).toHaveBeenCalledWith(buffer);
    });

    it('should handle PRIVATE_MSG with missing target', () => {
        const targetId = 'target-id';
        const buffer = BinaryCoder.encodePrivateMsg(targetId, 'SenderUser', 'Hello private!');

        mockGameManager.getPlayersMap.mockReturnValue(new Map());

        expect(() => {
            handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);
        }).not.toThrow();
    });

    it('should handle WEATHER_UPDATE', () => {
        const buffer = BinaryCoder.encodeWeatherUpdate(true);
        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockGameManager.broadcastWeather).toHaveBeenCalledWith(true);
    });

    it('should handle NOTICE', () => {
        const buffer = BinaryCoder.encodeNotice('System Maintenance!');
        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockGameManager.broadcastNotice).toHaveBeenCalledWith('System Maintenance!');
    });

    it('should handle STAT_UPDATE successfully', () => {
        const attrName = 'str';
        const buffer = BinaryCoder.encodeStatUpdate(attrName);

        const mockPlayer = {
            id: 'player123',
            tryIncreaseAttribute: vi.fn().mockReturnValue(true),
            send: vi.fn(),
            toState: vi.fn().mockReturnValue({ id: 'player123', position: { x: 0, y: 0, z: 0 }, username: 'player' }),
            attributes: {}, derived: {}, hp: 100, mp: 50
        };

        mockGetPlayerId.mockReturnValue('player123');
        mockGameManager.getPlayerById.mockReturnValue(mockPlayer);

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockPlayer.tryIncreaseAttribute).toHaveBeenCalledWith(attrName);
        expect(mockPlayer.send).toHaveBeenCalled();
        expect(mockGameManager.broadcastChat).toHaveBeenCalled();
    });

    it('should handle STAT_UPDATE when tryIncreaseAttribute fails', () => {
        const attrName = 'str';
        const buffer = BinaryCoder.encodeStatUpdate(attrName);

        const mockPlayer = {
            id: 'player123',
            tryIncreaseAttribute: vi.fn().mockReturnValue(false),
            send: vi.fn(),
            toState: vi.fn().mockReturnValue({})
        };

        mockGetPlayerId.mockReturnValue('player123');
        mockGameManager.getPlayerById.mockReturnValue(mockPlayer);

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockPlayer.tryIncreaseAttribute).toHaveBeenCalledWith(attrName);
        expect(mockPlayer.send).not.toHaveBeenCalled();
        expect(mockGameManager.broadcastChat).not.toHaveBeenCalled();
    });

    it('should handle RESPAWN_REQUEST to city (type 0)', () => {
        const buffer = BinaryCoder.encodeRespawnRequest(0);

        const mockPlayer = {
            id: 'dead-player',
            username: 'DeadPlayer',
            hp: 0,
            position: { x: 100, y: 0, z: 100 },
            respawn: vi.fn(),
            send: vi.fn(),
            toState: vi.fn().mockReturnValue({ id: 'dead-player', position: { x: 0, y: 0, z: 0 }, username: 'DeadPlayer' }),
            attributes: {}, derived: {}, mp: 0
        };

        const playersMap = new Map();
        playersMap.set('dead-player', mockPlayer);
        mockGameManager.getPlayersMap.mockReturnValue(playersMap);
        mockGetPlayerId.mockReturnValue('dead-player');

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockPlayer.position).toEqual({ x: 0, y: 0, z: 0 }); // City
        expect(mockPlayer.respawn).toHaveBeenCalled();
        expect(mockGameManager.broadcastChat).toHaveBeenCalled();
        expect(mockPlayer.send).toHaveBeenCalled();
    });

    it('should handle RESPAWN_REQUEST to same spot (type 1)', () => {
        const buffer = BinaryCoder.encodeRespawnRequest(1);

        const mockPlayer = {
            id: 'dead-player',
            username: 'DeadPlayer',
            hp: 0,
            position: { x: 100, y: 0, z: 100 },
            respawn: vi.fn(),
            send: vi.fn(),
            toState: vi.fn().mockReturnValue({ id: 'dead-player', position: { x: 100, y: 0, z: 100 }, username: 'DeadPlayer' }),
            attributes: {}, derived: {}, mp: 0
        };

        const playersMap = new Map();
        playersMap.set('dead-player', mockPlayer);
        mockGameManager.getPlayersMap.mockReturnValue(playersMap);
        mockGetPlayerId.mockReturnValue('dead-player');

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockPlayer.position).toEqual({ x: 100, y: 0, z: 100 }); // Same place
        expect(mockPlayer.respawn).toHaveBeenCalled();
        expect(mockGameManager.broadcastChat).toHaveBeenCalled();
        expect(mockPlayer.send).toHaveBeenCalled();
    });

    it('should not handle RESPAWN_REQUEST if player is alive', () => {
        const buffer = BinaryCoder.encodeRespawnRequest(0);

        const mockPlayer = {
            id: 'alive-player',
            hp: 100,
            respawn: vi.fn()
        };

        const playersMap = new Map();
        playersMap.set('alive-player', mockPlayer);
        mockGameManager.getPlayersMap.mockReturnValue(playersMap);
        mockGetPlayerId.mockReturnValue('alive-player');

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockPlayer.respawn).not.toHaveBeenCalled();
    });

    it('should handle PING', () => {
        const buffer = BinaryCoder.encodePing();
        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(mockWs.send).toHaveBeenCalled();
    });

    describe('SKILL_CAST tests', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should handle SKILL_CAST successfully and apply delay', () => {
            const buffer = BinaryCoder.encodeSkillCast('yanan_dalga', 2);
            mockGetPlayerId.mockReturnValue('casterId');

            const mockCaster = {
                id: 'casterId',
                username: 'Caster',
                netId: 1,
                level: 1,
                hp: 100,
                mp: 100,
                position: { x: 0, y: 0, z: 0 },
                rotationY: 0,
                canCastSkill: vi.fn().mockReturnValue(true),
                useSkill: vi.fn(),
                send: vi.fn(),
                derived: { attack: 10, defense: 5 },
                attributes: {},
                toState: vi.fn().mockReturnValue({ id: 'casterId', position: { x: 0, y: 0, z: 0 }, username: 'Caster' })
            };

            const mockTarget = {
                id: 'targetId',
                netId: 2,
                hp: 100,
                position: { x: 12, y: 0, z: 0 }, // Distance 12m -> 1000ms travel + 650ms cast = 1650ms
                takeDamage: vi.fn(),
                derived: { attack: 5, defense: 5 },
                toState: vi.fn().mockReturnValue({ id: 'targetId', position: { x: 12, y: 0, z: 0 } })
            };

            mockGameManager.getPlayerById.mockReturnValue(mockCaster);
            mockGameManager.getEntityByNetId.mockReturnValue(mockTarget);

            handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

            expect(mockCaster.canCastSkill).toHaveBeenCalled();
            expect(mockCaster.useSkill).toHaveBeenCalled();
            expect(mockGameManager.broadcastChat).toHaveBeenCalled(); // broadcast skill effect

            // Wait for combat delay
            vi.advanceTimersByTime(1650);

            expect(mockTarget.takeDamage).toHaveBeenCalled();
            expect(mockCaster.send).toHaveBeenCalled(); // full stats updated
        });

        it('should handle SKILL_CAST when out of MP', () => {
            const buffer = BinaryCoder.encodeSkillCast('yanan_dalga', 2);
            mockGetPlayerId.mockReturnValue('casterId');

            const mockCaster = {
                id: 'casterId',
                username: 'Caster',
                netId: 1,
                level: 1,
                hp: 100,
                mp: 0,
                position: { x: 0, y: 0, z: 0 },
                rotationY: 0,
                canCastSkill: vi.fn().mockReturnValue(false),
                useSkill: vi.fn(),
                send: vi.fn(),
                derived: { attack: 10, defense: 5 },
                attributes: {},
                toState: vi.fn().mockReturnValue({ id: 'casterId', position: { x: 0, y: 0, z: 0 }, username: 'Caster' })
            };

            const mockTarget = {
                id: 'targetId',
                netId: 2,
                hp: 100,
                position: { x: 12, y: 0, z: 0 },
                takeDamage: vi.fn(),
                derived: { attack: 5, defense: 5 },
                toState: vi.fn().mockReturnValue({ id: 'targetId', position: { x: 12, y: 0, z: 0 } })
            };

            mockGameManager.getPlayerById.mockReturnValue(mockCaster);
            mockGameManager.getEntityByNetId.mockReturnValue(mockTarget);

            handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

            expect(mockCaster.canCastSkill).toHaveBeenCalled();
            expect(mockCaster.useSkill).not.toHaveBeenCalled();
            expect(mockTarget.takeDamage).not.toHaveBeenCalled();
            expect(mockCaster.send).toHaveBeenCalled(); // sends stats with failure
        });

        it('should ignore SKILL_CAST if target is dead or missing', () => {
            const buffer = BinaryCoder.encodeSkillCast('yanan_dalga', 2);
            mockGetPlayerId.mockReturnValue('casterId');

            const mockCaster = {
                id: 'casterId',
                username: 'Caster',
                netId: 1,
                hp: 100,
                canCastSkill: vi.fn()
            };

            mockGameManager.getPlayerById.mockReturnValue(mockCaster);
            mockGameManager.getEntityByNetId.mockReturnValue(null); // Missing target

            handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

            expect(mockCaster.canCastSkill).not.toHaveBeenCalled();
        });
    });

    it('should ignore unknown packet types', () => {
        // Construct a packet that explicitly decodes to a valid object but with an unknown type.
        // We can mock BinaryCoder.decode to return an object with an unknown type.
        const originalDecode = BinaryCoder.decode;
        BinaryCoder.decode = vi.fn().mockReturnValue({ type: 99 });

        const buffer = new ArrayBuffer(2);

        // Spy on console.warn
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(warnSpy).toHaveBeenCalledWith("[PacketHandler] Bilinmeyen paket tipi:", 99);
        warnSpy.mockRestore();

        // Restore the original decode method
        BinaryCoder.decode = originalDecode;
    });

    it('should handle decoding errors gracefully', () => {
        const originalDecode = BinaryCoder.decode;
        BinaryCoder.decode = vi.fn().mockImplementation(() => {
            throw new Error("Decode Error");
        });

        const buffer = new ArrayBuffer(2);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        handleIncomingPacket(mockWs, buffer, mockGameManager, mockGetPlayerId, mockMapConnection);

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();

        BinaryCoder.decode = originalDecode;
    });
});
