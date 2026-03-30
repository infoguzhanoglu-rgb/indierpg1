import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkManager } from '../../src/systems/NetworkManager';
import { PacketType, BinaryCoder } from '../../../shared/src/index';

class MockWebSocket {
    public send = vi.fn();
    public close = vi.fn();
    public readyState = 1;
    public binaryType = 'blob';
    public onopen: (() => void) | null = null;
    public onmessage: ((event: any) => void) | null = null;
}

class MockWorker {
    public postMessage = vi.fn();
    public onmessage: ((event: any) => void) | null = null;
    public terminate = vi.fn();
}

describe('NetworkManager', () => {
    let networkManager: NetworkManager;
    let mockWebSocket: MockWebSocket;
    let mockWorker: MockWorker;

    beforeEach(() => {
        mockWebSocket = new MockWebSocket();
        (global as any).WebSocket = function() { return mockWebSocket; };
        vi.spyOn(global as any, 'WebSocket');

        mockWorker = new MockWorker();
        (global as any).Worker = function() { return mockWorker; };
        vi.spyOn(global as any, 'Worker');

        vi.spyOn(global.Date, 'now').mockImplementation(() => 1000);

        networkManager = new NetworkManager();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize worker on creation', () => {
        expect(global.Worker).toHaveBeenCalledWith('/networkWorker.js');
        expect(mockWorker.postMessage).toHaveBeenCalledWith({ action: 'start', interval: expect.any(Number) });
    });

    describe('Connection', () => {
        it('should connect to websocket', () => {
            networkManager.connect();
            expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
            expect(mockWebSocket.binaryType).toBe('arraybuffer');
        });

        it('should call onConnected when websocket opens', () => {
            const onConnectedSpy = vi.fn();
            networkManager.onConnected = onConnectedSpy;

            networkManager.connect();
            if (mockWebSocket.onopen) {
                mockWebSocket.onopen();
            }

            expect(onConnectedSpy).toHaveBeenCalled();
        });
    });

    describe('Sending data', () => {
        beforeEach(() => {
            networkManager.connect();
            mockWebSocket.readyState = 1; // Open (mocked value is not recognized natively by vitest because it compares readyState vs WebSocket.OPEN which equals 1)
            // Need to set WebSocket.OPEN mock implementation, or mock the getter
            Object.defineProperty(global, 'WebSocket', {
                value: Object.assign(global.WebSocket, { OPEN: 1 })
            });
        });

        it('should send login request', () => {
            vi.spyOn(BinaryCoder, 'encodeLoginReq').mockReturnValue(new ArrayBuffer(1));
            networkManager.login('testUser');

            expect(BinaryCoder.encodeLoginReq).toHaveBeenCalledWith('testUser');
            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        it('should queue pending move', () => {
            networkManager.sendMove({ x: 1, y: 2, z: 3 }, 0.5);
            expect((networkManager as any).pendingMove).toEqual({ x: 1, y: 2, z: 3, rotationY: 0.5 });
            expect(mockWebSocket.send).not.toHaveBeenCalled(); // Move is queued for worker flush
        });

        it('should send queued move on worker tick', () => {
            vi.spyOn(BinaryCoder, 'encodeMove').mockReturnValue(new ArrayBuffer(1));

            networkManager.sendMove({ x: 1, y: 2, z: 3 }, 0.5);

            // Trigger worker tick
            if (mockWorker.onmessage) {
                mockWorker.onmessage({ data: 'tick' } as any);
            }

            expect(BinaryCoder.encodeMove).toHaveBeenCalledWith({ x: 1, y: 2, z: 3, rotationY: 0.5 }, 0.5);
            expect(mockWebSocket.send).toHaveBeenCalled();
        });

        it('should send chat message', () => {
            vi.spyOn(BinaryCoder, 'encodeChat').mockReturnValue(new ArrayBuffer(1));
            networkManager.sendChat('hello');

            expect(BinaryCoder.encodeChat).toHaveBeenCalledWith('', 'hello');
            expect(mockWebSocket.send).toHaveBeenCalled();
        });
    });

    describe('Receiving data', () => {
        beforeEach(() => {
            networkManager.connect();
        });

        it('should handle LOGIN_RES packet', () => {
            const mockData = {
                type: PacketType.LOGIN_RES,
                player: { id: 'player1', netId: 100 },
                others: [{ id: 'player2', netId: 101 }],
                serverTime: 2000,
                totalOnline: 2
            };

            vi.spyOn(BinaryCoder, 'decode').mockReturnValue(mockData);

            const onLoginSuccessSpy = vi.fn();
            networkManager.onLoginSuccess = onLoginSuccessSpy;

            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({ data: new ArrayBuffer(1) } as any);
            }

            expect(networkManager.myPlayerId).toBe('player1');
            expect((networkManager as any).serverTimeOffset).toBe(2000 - 1000); // serverTime - Date.now()
            expect(onLoginSuccessSpy).toHaveBeenCalledWith(mockData.player, mockData.others, 2000, 2);
        });

        it('should handle STATE_UPDATE packet', () => {
            const mockData = {
                type: PacketType.STATE_UPDATE,
                self: { id: 'player1', netId: 100, hp: 100 },
                players: [
                    { id: 'player2', netId: 101, position: { x: 1, y: 0, z: 2 }, hp: 50, rotationY: 1.5 }
                ],
                serverTime: 2000,
                totalOnline: 2
            };

            vi.spyOn(BinaryCoder, 'decode').mockReturnValue(mockData);

            const onLocalPlayerUpdateSpy = vi.fn();
            const onPlayerMoveSpy = vi.fn();

            networkManager.onLocalPlayerUpdate = onLocalPlayerUpdateSpy;
            networkManager.onPlayerMove = onPlayerMoveSpy;

            networkManager.myPlayerId = 'player1';
            (networkManager as any).netIdToId.set(100, 'player1');
            (networkManager as any).netIdToId.set(101, 'player2');

            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({ data: new ArrayBuffer(1) } as any);
            }

            expect(onLocalPlayerUpdateSpy).toHaveBeenCalledWith(mockData.self);
            expect(onPlayerMoveSpy).toHaveBeenCalledWith(
                'player2',
                { x: 1, y: 0, z: 2 },
                2000,
                2,
                50,
                undefined,
                undefined,
                undefined,
                1.5,
                undefined
            );
        });

        it('should handle PING packet', () => {
            const mockData = { type: PacketType.PING };
            vi.spyOn(BinaryCoder, 'decode').mockReturnValue(mockData);

            (networkManager as any).lastPingTime = 900;

            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage({ data: new ArrayBuffer(1) } as any);
            }

            expect(networkManager.ping).toBe(100);
            expect((networkManager as any).pingHistory).toEqual([100]);
            expect((networkManager as any).averagePing).toBe(100);
        });
    });

    describe('getServerTime', () => {
        it('should calculate server time correctly', () => {
            (networkManager as any).serverTimeOffset = 500;
            (networkManager as any).averagePing = 100;

            const serverTime = networkManager.getServerTime();

            // Date.now() is mocked to 1000
            // 1000 + 500 - (100 / 2)
            expect(serverTime).toBe(1450);
        });
    });
});