import * as THREE from 'three';

export class SoundManager {
    public static instance = new SoundManager();

    private listener: THREE.AudioListener | null = null;
    private backgroundMusic: THREE.Audio | null = null;
    private rainSound: THREE.Audio | null = null;
    private audioLoader = new THREE.AudioLoader();
    private isInitialized = false;
    private rainBufferLoaded = false;
    private shouldPlayRain = false;
    private currentFadeId: number | null = null;

    public initialize(camera: THREE.Camera) {
        if (this.isInitialized) return;
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.backgroundMusic = new THREE.Audio(this.listener);
        this.audioLoader.load('/sound/main.mp3', (buffer) => {
            if (this.backgroundMusic) {
                this.backgroundMusic.setBuffer(buffer);
                this.backgroundMusic.setLoop(true);
                this.backgroundMusic.setVolume(0.18);
                this.backgroundMusic.play();
            }
        });

        this.rainSound = new THREE.Audio(this.listener);
        this.audioLoader.load('/sound/rain.mp3', (buffer) => {
            if (this.rainSound) {
                this.rainSound.setBuffer(buffer);
                this.rainSound.setLoop(true);
                this.rainSound.setVolume(0);
                this.rainBufferLoaded = true;
                
                // Eğer buffer yüklenene kadar playRain çağrıldıysa şimdi başlat
                if (this.shouldPlayRain) {
                    this.playRain();
                }
            }
        }, undefined, (err) => {
            console.error("Yağmur sesi yüklenemedi:", err);
        });
        
        this.isInitialized = true;
    }

    public playRain() {
        this.shouldPlayRain = true;
        if (!this.rainBufferLoaded || !this.rainSound) return;

        if (!this.rainSound.isPlaying) {
            this.rainSound.play();
        }
        this.fadeRainVolume(0.4, 2000);
    }

    public stopRain() {
        this.shouldPlayRain = false;
        if (!this.rainSound || !this.rainSound.isPlaying) return;

        this.fadeRainVolume(0, 2000, () => {
            if (this.rainSound && !this.shouldPlayRain) {
                this.rainSound.stop();
            }
        });
    }

    private fadeRainVolume(target: number, duration: number, onComplete?: () => void) {
        if (!this.rainSound) return;
        
        if (this.currentFadeId !== null) {
            cancelAnimationFrame(this.currentFadeId);
        }

        const startVolume = this.rainSound.getVolume();
        const startTime = performance.now();

        const update = () => {
            const now = performance.now();
            const progress = Math.min(1, (now - startTime) / duration);
            const currentVolume = startVolume + (target - startVolume) * progress;
            
            if (this.rainSound) {
                this.rainSound.setVolume(currentVolume);
            }

            if (progress < 1) {
                this.currentFadeId = requestAnimationFrame(update);
            } else {
                this.currentFadeId = null;
                if (onComplete) onComplete();
            }
        };
        this.currentFadeId = requestAnimationFrame(update);
    }

    public setVolume(value: number) {
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(value);
        }
    }

    public stopMusic() {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
        }
    }
}
