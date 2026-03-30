import * as THREE from 'three';
import { BaseEntity } from './BaseEntity';
import { NameTag } from '../ui/NameTag';
import { AssetManager } from '../systems/AssetManager';
import { NET_CONFIG } from '../../../shared/src/index';

export class NetworkPlayer extends BaseEntity {
    public id: string;
    public netId: number = 0; // PRO: Sayısal ID
    public username: string;
    public entityType: number = 0;
    private targetPosition: THREE.Vector3;
    private camera: THREE.Camera;
    public nameTag: NameTag;
    public hitbox!: THREE.Mesh;
    private lastVelocity: THREE.Vector3 = new THREE.Vector3();
    private predictionLimit = 500; // ms

    // Stats
    public level: number = 1;
    private _hp: number = 100;
    public maxHp: number = 100;
    public mp: number = 50;
    public maxMp: number = 50;
    public animationState: number = 0; // PRO: AI Animasyon Durumu

    public get hp(): number { return this._hp; }
    public set hp(value: number) {
        const oldHp = this._hp;
        this._hp = value;
        if (value <= 0 && oldHp > 0) {
            this.triggerDeath();
        } else if (value > 0 && oldHp <= 0) {
            this.triggerRespawn();
        }
    }

    private triggerDeath() {
        if (this.isDead) return;
        this.isDead = true;
        this.isBusy = true;
        if (this.mixer) this.mixer.stopAllAction();
        if (this.normalModel) this.normalModel.visible = false;
        if (this.dieModel) this.dieModel.visible = true;
        
        // Düşman (Saman) ise die animasyonunu oynat
        if (this.entityType === 1) {
            this.playEnemyAnimation('die');
        }
    }

    private triggerRespawn() {
        if (!this.isDead) return;
        this.isDead = false;
        this.isBusy = false;
        if (this.normalModel) this.normalModel.visible = true;
        if (this.dieModel) this.dieModel.visible = false;
    }

    // Animasyon yönetimi
    private mixer: THREE.AnimationMixer | null = null;
    private currentAction: THREE.AnimationAction | null = null;
    private idleAction: THREE.AnimationAction | null = null;
    private runAction: THREE.AnimationAction | null = null;
    private skillActions: { [key: string]: THREE.AnimationAction } = {};
    public isBusy: boolean = false;
    public isDead: boolean = false;
    private normalModel: THREE.Group | null = null;
    private dieModel: THREE.Group | null = null;

    // Interpolation (Buffer)
    private snapshots: { t: number, p: THREE.Vector3, r: number }[] = [];
    private readonly interpolationDelay = 100; // PRO: 40Hz ile 100ms buffer 4 paket eder
    private getServerTime: () => number;
    private stationaryTicks: number = 0; // PRO: Animasyon titremesini önlemek için

    constructor(scene: THREE.Scene, camera: THREE.Camera, id: string, netId: number, username: string, initialPosition: {x: number, y: number, z: number}, serverTime: number, getServerTime: () => number, level: number = 1, hp: number = 100, maxHp: number = 100, mp: number = 50, maxMp: number = 50, entityType: number = 0) {
        super(scene);
        this.id = id;
        this.netId = netId;
        this.username = username;
        this.camera = camera;
        this.getServerTime = getServerTime;
        this.level = level;
        this._hp = hp;
        this.maxHp = maxHp;
        this.mp = mp;
        this.maxMp = maxMp;
        this.entityType = entityType;
        this.targetPosition = new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z);
        this.mesh.position.copy(this.targetPosition);
        this.mesh.userData.entity = this; 
        
        this.createVisuals();
        this.nameTag = new NameTag(username, this.mesh, camera, true);

        this.snapshots.push({
            t: serverTime,
            p: this.targetPosition.clone(),
            r: 0
        });
    }

    public moveTo(position: {x: number, y: number, z: number}, serverTime: number, rotationY?: number) {
        const targetPos = new THREE.Vector3(position.x, position.y, position.z);
        const rotY = rotationY !== undefined ? rotationY : (this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].r : this.mesh.rotation.y);
        
        // PRO: Duplicate Position Filtering (Sunucu senkronizasyon hatalarını maskeler)
        if (this.snapshots.length > 0) {
            const lastS = this.snapshots[this.snapshots.length - 1];
            // Eğer aynı koordinat çok kısa sürede geldiyse, bu büyük ihtimalle sunucunun 'stale' (bayat) paketidir.
            if (lastS.p.distanceTo(targetPos) < 0.001 && (serverTime - lastS.t) < 50) {
                return; // Gereksiz paketi yoksay, akışı bozma
            }
        }

        // PRO: Buffer Overflow Koruması (Arka planda tab birikmesini önlemek için)
        if (this.snapshots.length > 50) { 
            this.snapshots.splice(0, this.snapshots.length - 20); // Son 20 paketi tut, gerisini sil
        }

        this.snapshots.push({ t: serverTime, p: targetPos, r: rotY });
        
        // Zaman sırasına göre diz
        this.snapshots.sort((a, b) => a.t - b.t);

        // PRO: Auto-Catch-up (Tab uzun süre arka planda kaldıysa ışınla)
        // Eğer en yeni paket sunucu zamanından 2 saniye eskiyse interpolation'ı atla
        const now = this.getServerTime();
        if (serverTime < now - 2000) {
            this.mesh.position.copy(targetPos);
            this.mesh.rotation.y = rotY;
            this.snapshots = [{ t: serverTime, p: targetPos, r: rotY }]; // Buffer'ı temizle ve son konumu koy
        }
    }

    public update(delta: number) {
        // Ölen karakter update almasın (Görsel swap hariç)
        if (this.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                if (this.normalModel) this.normalModel.visible = false;
                if (this.dieModel) this.dieModel.visible = true;
                this.isBusy = true;
                if (this.entityType === 1) this.playEnemyAnimation('die');
            }
            if (this.entityType === 1 && this.mixer) this.mixer.update(delta);
            return;
        } else if (this.isDead) {
            this.isDead = false;
            if (this.normalModel) this.normalModel.visible = true;
            if (this.dieModel) this.dieModel.visible = false;
            this.isBusy = false;
        }

        const distanceToCamera = this.mesh.position.distanceTo(this.camera.position);
        if (distanceToCamera > NET_CONFIG.AOI_DISTANCE * 1.5) {
            this.mesh.visible = false;
            return; 
        }
        this.mesh.visible = true;

        if (this.mixer) this.mixer.update(delta);

        // 1. CANAVAR ANİMASYON SENKRONİZASYONU (PRO: Sunucu Taraflı)
        if (this.entityType === 1 && this.mixer) {
            this.syncEnemyAnimation();
        }

        const renderTime = this.getServerTime() - this.interpolationDelay;
        // ... (Interpolation logic remains)

        if (this.snapshots.length >= 2) {
            let s0 = this.snapshots[0];
            let s1 = this.snapshots[this.snapshots.length - 1];

            let found = false;
            for (let i = 0; i < this.snapshots.length - 1; i++) {
                if (renderTime >= this.snapshots[i].t && renderTime <= this.snapshots[i + 1].t) {
                    s0 = this.snapshots[i];
                    s1 = this.snapshots[i + 1];
                    found = true;
                    break;
                }
            }

            if (found) {
                const timeDiff = s1.t - s0.t;
                const t = timeDiff > 0 ? (renderTime - s0.t) / timeDiff : 1;
                this.mesh.position.lerpVectors(s0.p, s1.p, t);
                
                // Rotasyon Interpolation (En kısa yönden dönme)
                let r0 = s0.r;
                let r1 = s1.r;
                let diff = r1 - r0;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.mesh.rotation.y = r0 + diff * t;

                // Animasyon Durumu (PRO: Hysteresis Control)
                if (!this.isBusy && !this.isDead) {
                    const moveDist = s0.p.distanceTo(s1.p);
                    if (moveDist > 0.01 && this.entityType === 0) {
                        this.stationaryTicks = 0;
                        this.playAnimation('run');
                    } else if (this.entityType === 0) {
                        this.stationaryTicks++;
                        // Sadece gerçekten (3 tick boyunca) durduysa idle'a geç
                        if (this.stationaryTicks > 3) {
                            this.playAnimation('idle');
                        }
                    }
                }
            } 
            else if (renderTime > this.snapshots[this.snapshots.length - 1].t) {
                const now = renderTime;
                const lastIdx = this.snapshots.length - 1;
                const sLast = this.snapshots[lastIdx];
                const sPrev = this.snapshots[lastIdx - 1] || sLast;
                
                // PRO: Dead Reckoning (Tahmin)
                const timeDiff = sLast.t - sPrev.t;
                if (timeDiff > 0) {
                    this.lastVelocity.subVectors(sLast.p, sPrev.p).divideScalar(timeDiff);
                }
                
                const timeSinceLast = now - sLast.t;
                // PRO: Daha güçlü Tahmin (Prediction)
                if (timeSinceLast < this.predictionLimit) {
                    const predictedPos = sLast.p.clone().add(this.lastVelocity.clone().multiplyScalar(timeSinceLast));
                    // Tahmin edilen noktaya daha hızlı ama pürüzsüz yerleş (Durdurma yapma)
                    const lerpFactor = 1 - Math.exp(-40 * delta); 
                    this.mesh.position.lerp(predictedPos, lerpFactor);
                } else {
                    this.mesh.position.copy(sLast.p);
                }

                if (!this.isBusy && this.entityType === 0) {
                    // Tahmin yaparken hızlanmaya (run animasyonu) devam et
                    if (this.lastVelocity.lengthSq() > 0.0001) this.playAnimation('run');
                    else this.playAnimation('idle');
                }
            }
        } 
        else if (this.snapshots.length === 1) {
            this.mesh.position.copy(this.snapshots[0].p);
            if (!this.isBusy && this.entityType === 0) {
                this.playAnimation('idle');
            }
        }
    }

    public lateUpdate(_delta: number) {
        this.nameTag.update();
    }

    public destroy() {
        super.destroy();
        this.nameTag.destroy();
    }

    private createVisuals() {
        if (this.entityType === 1) {
            // PRO: Saman Enemy Modeli Yükle
            const enemyModel = AssetManager.instance.cloneSaman();
            if (enemyModel) {
                enemyModel.scale.set(0.834, 0.834, 0.834); // %15 Daha Büyütüldü
                this.mesh.add(enemyModel);
                this.mixer = new THREE.AnimationMixer(enemyModel);
                
                // Animasyonları bağla (Idle, Walk, Run, Attack, Die)
                Object.keys(AssetManager.instance.samanAnimations).forEach(key => {
                    const action = this.mixer!.clipAction(AssetManager.instance.samanAnimations[key]);
                    if (key === 'die') {
                        action.setLoop(THREE.LoopOnce, 1);
                        action.clampWhenFinished = true;
                    }
                    this.skillActions[key] = action;
                });

                this.playEnemyAnimation('idle');
            } else {
                // Fallback Cube
                const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
                const cube = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
                cube.position.y = 0.9;
                this.mesh.add(cube);
            }
        } else {
            const characterModel = AssetManager.instance.cloneCharacter() as THREE.Group;
            if (characterModel) {
                characterModel.traverse((child) => {
                    if ((child as any).isMesh) {
                        child.raycast = () => {};
                    }
                });
                this.mesh.add(characterModel);
                this.normalModel = characterModel;

                // Ölüm modelini de yükle (ama gizli tut)
                const dieModel = AssetManager.instance.cloneDieCharacter() as THREE.Group;
                if (dieModel) {
                    dieModel.visible = false;
                    this.mesh.add(dieModel);
                    this.dieModel = dieModel;
                }

                this.mixer = new THREE.AnimationMixer(characterModel);
                
                const idleClip = AssetManager.instance.characterAnimations['idle'];
                const runClip = AssetManager.instance.characterAnimations['run'];

                if (idleClip) this.idleAction = this.mixer.clipAction(idleClip);
                if (runClip) this.runAction = this.mixer.clipAction(runClip);
                
                // Tüm yetenek animasyonlarını mixer'a bağla
                Object.keys(AssetManager.instance.characterAnimations).forEach(key => {
                    if (key !== 'idle' && key !== 'run') {
                        const action = this.mixer!.clipAction(AssetManager.instance.characterAnimations[key]);
                        action.setLoop(THREE.LoopOnce, 1);
                        action.clampWhenFinished = true;
                        this.skillActions[key] = action;
                    }
                });

                this.playAnimation('idle');
            } else {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshStandardMaterial({ color: 0xff4422 });
                const cube = new THREE.Mesh(geometry, material);
                cube.position.y = 0.5;
                this.mesh.add(cube);
            }
        }

        const hitboxHeight = this.entityType === 1 ? 1.4 : 2.2; // Canavar için hitbox boyutu
        const hitboxRadius = this.entityType === 1 ? 0.6 : 0.4; // Canavar daha 'tıklanabilir' olsun
        const hitboxGeo = new THREE.CylinderGeometry(hitboxRadius, hitboxRadius, hitboxHeight, 8);
        const hitboxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.position.y = hitboxHeight / 2;
        hitbox.name = "SelectionHitbox";
        hitbox.userData.parentEntity = this.mesh;
        hitbox.userData.entity = this;
        this.mesh.add(hitbox);
        this.hitbox = hitbox;
    }

    public playAnimation(name: string) {
        if (this.entityType !== 0) return;
        let action: THREE.AnimationAction | null = null;
        if (name === 'idle') action = this.idleAction;
        else if (name === 'run') action = this.runAction;
        else if (this.skillActions[name]) action = this.skillActions[name];

        if (!action) return;

        // Eğer bir yetenek oynatılıyorsa (run/idle değilse) her zaman baştan oynat
        const isSkill = name !== 'idle' && name !== 'run';

        if (isSkill) {
            action.reset();
        } else if (this.currentAction === action) {
            return;
        }

        if (this.currentAction && this.currentAction !== action) {
            this.currentAction.fadeOut(0.1);
        }
        
        action.reset().fadeIn(0.1).play();
        this.currentAction = action;
    }

    private syncEnemyAnimation() {
        if (this.animationState === undefined) return;
        
        switch(this.animationState) {
            case 0: this.playEnemyAnimation('idle'); break;
            case 1: this.playEnemyAnimation('walk'); break;
            case 2: this.playEnemyAnimation('run'); break;
            case 3: this.playEnemyAnimation('attack'); break;
            case 4: this.playEnemyAnimation('die'); break;
        }
    }

    private playEnemyAnimation(name: string) {
        const action = this.skillActions[name];
        if (!action || this.currentAction === action) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(0.1);
        }
        
        action.reset().fadeIn(0.1).play();
        this.currentAction = action;
    }
}
