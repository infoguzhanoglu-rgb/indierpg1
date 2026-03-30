import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleIncomingPacket } from '../../src/handlers/PacketHandler.js';
import { BinaryCoder, PacketType } from '../../../shared/src/index.js';

describe('PacketHandler', () => {
    let mockWs: any;
    let mockGameManager: any;
    let mockGetPlayerId: any;
    let mockMapConnection: any;

    beforeEach(() => {
        mockWs = { send: vi.fn() };
        mockGameManager = {
            addPlayer: vi.fn(),
            movePlayer: vi.fn(),
            broadcastChat: vi.fn(),
            getPlayersMap: vi.fn().mockReturnValue(new Map()),
            broadcastWeather: vi.fn(),
            broadcastNotice: vi.fn(),
            getPlayerById: vi.fn(),
            getEntityByNetId: vi.fn(),
            getElapsedServerTime: vi.fn().mockReturnValue(1000)
        };
        mockGetPlayerId = vi.fn();
        mockMapConnection = vi.fn();

        // Mock console.error to avoid noise in test output
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should catch error when packet decoding fails', () => {
        // Arrange
        // Simulate error by passing malformed data. BinaryCoder.decode will throw if data is malformed
        const malformedData = new ArrayBuffer(0); // This should cause reader to throw Out of bounds

        // Make decode throw an error explicitly if reader doesn't
        vi.spyOn(BinaryCoder, 'decode').mockImplementation(() => {
            throw new Error('Malformed packet');
        });

        // Act & Assert
        expect(() => {
            handleIncomingPacket(
                mockWs as any,
                malformedData,
                mockGameManager as any,
                mockGetPlayerId,
                mockMapConnection
            );
        }).not.toThrow();

        // Verify console.error was called with expected message
        expect(console.error).toHaveBeenCalledWith(
            '[PacketHandler] Paket parse hatası',
            expect.any(Error)
        );
    });
});
