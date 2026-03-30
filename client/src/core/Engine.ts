import * as THREE from 'three';
import { NET_CONFIG } from '../../../shared/src/index';

export interface Updatable {
    update(delta: number): void;
    lateUpdate?(delta: number): void;
    priority?: number; // 1 = Yüksek Öncelik (Kamera), undefined/0 = Normal
}

export class Engine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private updatables: Updatable[] = [];
    private lastTime: number = 0;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, NET_CONFIG.CAMERA_FAR);
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        
        document.getElementById('app')?.appendChild(this.renderer.domElement);
        this.lastTime = performance.now();

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public register(obj: Updatable) {
        this.updatables.push(obj);
    }

    public unregister(obj: Updatable) {
        const index = this.updatables.indexOf(obj);
        if (index !== -1) {
            this.updatables.splice(index, 1);
        }
    }

    public start() {
        this.renderer.setAnimationLoop(() => {
            const now = performance.now();
            const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
            this.lastTime = now;

            for (let i = 0; i < this.updatables.length; i++) {
                this.updatables[i].update(deltaTime);
            }

            // Önce Yüksek Öncelikli (Kamera vb.) lateUpdate'ler
            for (let i = 0; i < this.updatables.length; i++) {
                const obj = this.updatables[i];
                if (obj.priority === 1 && obj.lateUpdate) {
                    obj.lateUpdate(deltaTime);
                }
            }

            this.camera.updateMatrixWorld(true);

            // Sonra Diğer lateUpdate'ler (İsim etiketleri vb.)
            for (let i = 0; i < this.updatables.length; i++) {
                const obj = this.updatables[i];
                if (obj.priority !== 1 && obj.lateUpdate) {
                    obj.lateUpdate(deltaTime);
                }
            }
            
            this.renderer.render(this.scene, this.camera);
        });
    }
}
