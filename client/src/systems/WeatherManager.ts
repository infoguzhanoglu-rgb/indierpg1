import * as THREE from 'three';
import { SoundManager } from './SoundManager';
import { Environment } from '../world/Environment';

export class WeatherManager {
    private scene: THREE.Scene;
    private environment: Environment;
    private rainParticles: THREE.Points | null = null;
    private rainGeometry: THREE.BufferGeometry | null = null;
    private rainCount: number = 2500;
    private isRaining: boolean = false;
    
    private transitionFactor: number = 0; 
    private transitionSpeed: number = 0.25;

    private lightningCountdown: number = 20;
    private isFlashActive: boolean = false;
    private flashTimer: number = 0;

    constructor(scene: THREE.Scene, environment: Environment) {
        this.scene = scene;
        this.environment = environment;
    }

    private createRainStreakTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 64; 
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const gradient = ctx.createLinearGradient(8, 0, 8, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(7, 0, 2, 64);
        return new THREE.CanvasTexture(canvas);
    }

    private initRain() {
        const vertices = [];
        for (let i = 0; i < this.rainCount; i++) {
            vertices.push(Math.random() * 60 - 30, Math.random() * 40, Math.random() * 60 - 30);
        }
        this.rainGeometry = new THREE.BufferGeometry();
        this.rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const rainMaterial = new THREE.PointsMaterial({
            color: 0xdfdfdf, size: 0.3, map: this.createRainStreakTexture(),
            transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
            depthWrite: false, sizeAttenuation: true 
        });
        this.rainParticles = new THREE.Points(this.rainGeometry, rainMaterial);
        this.scene.add(this.rainParticles);
    }

    public startRain() {
        if (this.isRaining) return;
        this.isRaining = true;
        this.lightningCountdown = 15 + Math.random() * 15;
        SoundManager.instance.playRain();
        if (!this.rainParticles) this.initRain();
    }

    public stopRain() {
        this.isRaining = false;
        SoundManager.instance.stopRain();
    }

    public update(playerPos: THREE.Vector3, delta: number) {
        if (this.isRaining) {
            this.transitionFactor = Math.min(1, this.transitionFactor + (this.transitionSpeed * delta));
        } else {
            this.transitionFactor = Math.max(0, this.transitionFactor - (this.transitionSpeed * delta));
        }

        // --- GÖRSEL GÜNCELLEME ---
        this.environment.skybox.setIntensity(1 - this.transitionFactor);
        
        // Işık Seviyeleri (Hafif kararma: Max %30 azalma)
        const flashBoost = this.isFlashActive ? 1.0 : 0;
        this.environment.ambientLight.intensity = (0.4 * (1 - this.transitionFactor * 0.3)) + flashBoost;
        this.environment.hemiLight.intensity = (0.6 * (1 - this.transitionFactor * 0.3)) + (flashBoost * 0.5);

        // --- YAĞMUR HAREKETİ ---
        if (this.rainParticles) {
            const mat = this.rainParticles.material as THREE.PointsMaterial;
            mat.opacity = this.transitionFactor * 0.4;

            if (this.transitionFactor > 0) {
                this.rainParticles.position.set(playerPos.x, 0, playerPos.z);
                const positions = this.rainGeometry!.attributes.position.array as Float32Array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] -= 1.0; 
                    if (positions[i + 1] < 0) positions[i + 1] = 40;
                }
                this.rainGeometry!.attributes.position.needsUpdate = true;
            } else if (!this.isRaining && this.transitionFactor === 0) {
                this.scene.remove(this.rainParticles);
                this.rainGeometry?.dispose();
                mat.map?.dispose();
                mat.dispose();
                this.rainParticles = null;
                this.rainGeometry = null;
            }
        }

        // --- ŞİMŞEK MANTIĞI ---
        if (this.transitionFactor > 0.9) {
            if (this.isFlashActive) {
                this.flashTimer -= delta;
                if (this.flashTimer <= 0) {
                    this.isFlashActive = false;
                    this.lightningCountdown = 20 + Math.random() * 40;
                }
            } else {
                this.lightningCountdown -= delta;
                if (this.lightningCountdown <= 0) {
                    this.isFlashActive = true;
                    this.flashTimer = 0.05 + Math.random() * 0.1;
                }
            }
        }
    }
}
