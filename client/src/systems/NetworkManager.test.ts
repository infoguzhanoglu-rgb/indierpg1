import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkManager } from './NetworkManager';
import { NET_CONFIG } from '../../../shared/src/index';

describe('NetworkManager initialization', () => {
    let originalWorker: typeof globalThis.Worker;
    let originalSetInterval: typeof globalThis.setInterval;

    beforeEach(() => {
        originalWorker = globalThis.Worker;
        originalSetInterval = globalThis.setInterval;
        vi.useFakeTimers();
    });

    afterEach(() => {
        globalThis.Worker = originalWorker;
        globalThis.setInterval = originalSetInterval;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should fallback to setInterval when Worker initialization throws an error', () => {
        // Mock Worker constructor to throw an error
        class MockWorkerError {
            constructor() {
                throw new Error('Worker not supported');
            }
        }
        globalThis.Worker = MockWorkerError as any;

        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

        const manager = new NetworkManager();

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), NET_CONFIG.CLIENT_SEND_INTERVAL);

        // Verify flushMove is called by the interval
        const flushMoveSpy = vi.spyOn(manager as any, 'flushMove').mockImplementation(() => {});
        vi.advanceTimersByTime(NET_CONFIG.CLIENT_SEND_INTERVAL);
        expect(flushMoveSpy).toHaveBeenCalledTimes(1);
    });

    it('should not use setInterval when Worker initialization succeeds', () => {
        const mockPostMessage = vi.fn();
        class MockWorkerSuccess {
            onmessage: any;
            postMessage = mockPostMessage;
            constructor() {}
        }
        globalThis.Worker = MockWorkerSuccess as any;

        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

        const manager = new NetworkManager();

        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({ action: 'start', interval: NET_CONFIG.CLIENT_SEND_INTERVAL });
    });
});
