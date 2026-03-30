import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export class AssetManager {
    public static instance = new AssetManager();
    
    private loader = new GLTFLoader();
    
    private baseCharacterScene: THREE.Group | null = null;
    private baseDieScene: THREE.Group | null = null;
    private baseSamanScene: THREE.Group | null = null;
    private skillModels: { [key: string]: THREE.Group } = {};
    public characterAnimations: { [key: string]: THREE.AnimationClip } = {};
    public samanAnimations: { [key: string]: THREE.AnimationClip } = {};
    
    public isLoaded = false;

    public async initialize() {
        if (this.isLoaded) return;
        
        console.log("Modeller yükleniyor (idle + run + skills)...");
        
        try {
            // Karakter Modelleri
            const idleData = await this.loader.loadAsync('/models/idle.glb');
            this.baseCharacterScene = idleData.scene;
            if (idleData.animations.length > 0) this.characterAnimations['idle'] = idleData.animations[0];

            const runData = await this.loader.loadAsync('/models/run.glb');
            if (runData.animations.length > 0) this.characterAnimations['run'] = runData.animations[0];

            try {
                const dieData = await this.loader.loadAsync('/models/die.glb');
                this.baseDieScene = dieData.scene;
                this.baseDieScene.scale.set(1, 1, 1);
                this.baseDieScene.position.set(0, -0.05, 0);
                if (dieData.animations.length > 0) {
                    this.characterAnimations['die'] = dieData.animations[0];
                    console.log("[AssetManager] Ölüm (die) animasyonu yüklendi.");
                }
            } catch(e) { console.warn("die.glb bulunamadı."); }

            // Yetenek Animasyonları (Her yetenek kendi .glb dosyasından yüklenir)
            const skillIds = ['yanan_dalga', 'seri_adimlar']; 
            
            for (const id of skillIds) {
                try {
                    const data = await this.loader.loadAsync(`/models/${id}.glb`);
                    if (data.animations.length > 0) {
                        this.characterAnimations[id] = data.animations[0];
                        console.log(`[AssetManager] ${id} animasyonu yüklendi.`);
                    }
                } catch(e) { 
                    console.warn(`${id}.glb (animasyon) bulunamadı.`); 
                }
            }

            this.baseCharacterScene.scale.set(1, 1, 1); 
            this.baseCharacterScene.position.set(0, -0.05, 0); 
            
            this.baseCharacterScene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.isLoaded = true;
            console.log("Tüm oyuncu modelleri ve animasyonları başarıyla yüklendi.");
            
            // --- Saman Enemy Modelleri ---
            console.log("Saman Enemy modelleri yükleniyor...");
            try {
                const samanIdleData = await this.loader.loadAsync('/models/enemies/saman_enemy_lvl1/Saman_Idle.glb');
                this.baseSamanScene = samanIdleData.scene;
                if (samanIdleData.animations.length > 0) this.samanAnimations['idle'] = samanIdleData.animations[0];
                
                const animFiles = ['Walk', 'Run', 'Attack', 'Die'];
                for (const anim of animFiles) {
                    try {
                        const data = await this.loader.loadAsync(`/models/enemies/saman_enemy_lvl1/Saman_${anim}.glb`);
                        if (data.animations.length > 0) {
                            this.samanAnimations[anim.toLowerCase()] = data.animations[0];
                            console.log(`[AssetManager] Saman ${anim} animasyonu yüklendi.`);
                        }
                    } catch(e) { console.warn(`Saman_${anim}.glb bulunamadı.`); }
                }
                
                this.baseSamanScene.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            } catch (e) {
                console.error("Saman modelleri yüklenirken hata:", e);
            }
            
            console.log("Tüm assteler (Oyuncu + Saman) başarıyla yüklendi.");
        } catch (e) {
            console.error("Model yüklenirken hata oluştu:", e);
        }
    }

    public cloneCharacter() {
        if (!this.baseCharacterScene) return null;
        return SkeletonUtils.clone(this.baseCharacterScene);
    }

    public cloneSaman() {
        if (!this.baseSamanScene) return null;
        return SkeletonUtils.clone(this.baseSamanScene);
    }

    public cloneDieCharacter() {
        if (!this.baseDieScene) return null;
        return SkeletonUtils.clone(this.baseDieScene);
    }

    public getSkillModel(id: string): THREE.Group | null {
        const model = this.skillModels[id];
        if (!model) return null;
        return model.clone();
    }
}
