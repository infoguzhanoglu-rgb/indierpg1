import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the three dependencies before importing AssetManager
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
    return {
        GLTFLoader: class {
            loadAsync = vi.fn()
        }
    };
});

import { AssetManager } from '../../src/systems/AssetManager';

describe('AssetManager', () => {
    let assetManager: AssetManager;

    beforeEach(() => {
        // Reset singleton instance or create a new one
        AssetManager.instance = new AssetManager();
        assetManager = AssetManager.instance;
        vi.clearAllMocks();
    });

    it('should successfully initialize models even if some skill models are missing', async () => {
        const mockLoader = (assetManager as any).loader;

        // Setup mock return values for core models
        mockLoader.loadAsync.mockImplementation(async (url: string) => {
            if (url === '/models/idle.glb' || url === '/models/run.glb' || url === '/models/die.glb') {
                return {
                    scene: {
                        scale: { set: vi.fn() },
                        position: { set: vi.fn() },
                        traverse: vi.fn()
                    },
                    animations: [{ name: 'mockAnim' }]
                };
            }

            if (url.includes('saman')) {
                return {
                    scene: {
                        traverse: vi.fn()
                    },
                    animations: [{ name: 'samanMockAnim' }]
                };
            }

            // This is for skill animations: throw an error for one, succeed for another
            if (url === '/models/yanan_dalga.glb') {
                throw new Error("Failed to load yanan_dalga");
            }

            if (url === '/models/seri_adimlar.glb') {
                return {
                    animations: [{ name: 'seriAdimlarAnim' }]
                };
            }

            return { scene: {}, animations: [] };
        });

        // Suppress console warnings/errors for clean test output
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await assetManager.initialize();

        // Verify that the fallback loading mechanism worked correctly

        // 1. We should have tried to load the failed skill model
        expect(mockLoader.loadAsync).toHaveBeenCalledWith('/models/yanan_dalga.glb');
        expect(warnSpy).toHaveBeenCalledWith('yanan_dalga.glb (animasyon) bulunamadı.');

        // 2. We should have loaded the successful skill model
        expect(mockLoader.loadAsync).toHaveBeenCalledWith('/models/seri_adimlar.glb');
        expect(assetManager.characterAnimations['seri_adimlar']).toBeDefined();
        expect(assetManager.characterAnimations['seri_adimlar'].name).toBe('seriAdimlarAnim');

        // 3. The manager should still be marked as loaded
        expect(assetManager.isLoaded).toBe(true);

        warnSpy.mockRestore();
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });
});
