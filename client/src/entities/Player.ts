import * as THREE from 'three';
import { BaseEntity } from './BaseEntity';
import { NameTag } from '../ui/NameTag';
import { AssetManager } from '../systems/AssetManager';

export class Player extends BaseEntity {
    public id: string;
    public netId: number = 0; // PRO: Sayısal ID
    public username: string;
    private targetPosition: THREE.Vector3;
    private speed: number = 4.0;
    public nameTag: NameTag;
    public hitbox!: THREE.Mesh;

    // Stats
    public level: number = 1;
    private _hp: number = 100;
    public maxHp: number = 100;
    public mp: number = 50;
    public maxMp: number = 50;

    public get hp(): number { return this._hp; }
    public set hp(value: number) {
        const oldHp = this._hp;
        this._hp = value;
        
        // ÖLÜM ANINDA TETİKLENME (Delay 0 - Instant)
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
        this.stopMove(true);
        if (this.mixer) this.mixer.stopAllAction();
        if (this.normalModel) this.normalModel.visible = false;
        if (this.dieModel) {
            this.dieModel.visible = true;
            if (this.dieAction) this.dieAction.reset().play();
        }
    }

    private triggerRespawn() {
        if (!this.isDead) return;
        this.isDead = false;
        this.isBusy = false;
        if (this.normalModel) this._hp > 0 ? (this.normalModel.visible = true) : null;
        if (this.dieModel) this.dieModel.visible = false;
    }

    // Animasyon yönetimi
    private mixer: THREE.AnimationMixer | null = null;
    private currentAction: THREE.AnimationAction | null = null;
    private idleAction: THREE.AnimationAction | null = null;
    private runAction: THREE.AnimationAction | null = null;
    private skillActions: { [key: string]: THREE.AnimationAction } = {};
    public priority: number = 0;
    public isBusy: boolean = false;
    public isDead: boolean = false;
    private normalModel: THREE.Group | null = null;
    private dieModel: THREE.Group | null = null;
    private dieMixer: THREE.AnimationMixer | null = null;
    private dieAction: THREE.AnimationAction | null = null;

    // Olay Dinleyicileri (Sistemler arası iletişim için)
    public onMove?: () => void;

    constructor(scene: THREE.Scene, camera: THREE.Camera, id: string, netId: number, username: string, level: number = 1, hp: number = 100, mp: number = 50) {
        super(scene);
        this.id = id;
        this.netId = netId;
        this.username = username;
        this.level = level;
        this._hp = hp;
        this.maxHp = hp;
        this.mp = mp;
        this.maxMp = mp;
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.mesh.userData.entity = this; 
        
        this.createVisuals();
        this.nameTag = new NameTag(username, this.mesh, camera);
    }

    private createVisuals() {
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

                // Ölüm animasyonunu da dieModel için ayarla
                const dieClip = AssetManager.instance.characterAnimations['die'];
                if (dieClip) {
                    this.dieMixer = new THREE.AnimationMixer(dieModel);
                    this.dieAction = this.dieMixer.clipAction(dieClip);
                    this.dieAction.setLoop(THREE.LoopOnce, 1);
                    this.dieAction.clampWhenFinished = true;
                }
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
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.y = 0.5;
            this.mesh.add(cube);
        }

        const hitboxGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.2, 8);
        const hitboxMat = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            opacity: 0,
            depthWrite: false
        });
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.position.y = 1.1;
        hitbox.name = "SelectionHitbox";
        hitbox.userData.parentEntity = this.mesh;
        hitbox.userData.entity = this;
        this.mesh.add(hitbox);
        this.hitbox = hitbox;
    }

    public playAnimation(name: string) {
        if (this.isDead) return; // Ölü karakter animasyon değiştirmez
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
            this.currentAction.fadeOut(0.1); // PRO: 0.1sn ile daha keskin geçiş
        }
        
        action.reset().fadeIn(0.1).play(); // PRO: 0.1sn ile daha keskin giriş
        this.currentAction = action;
    }

    public moveTo(position: THREE.Vector3) {
        if (this.isBusy || this.isDead) return; // PRO: Yetenek kullanırken veya ölüyken yürüme komutlarını yoksay
        this.targetPosition.copy(position);
        if (this.onMove) this.onMove();
    }

    public stopMove(silent: boolean = false) {
        this.targetPosition.copy(this.mesh.position);
        // Eğer sessiz (silent) değilse ve meşgul değilsek idle'a geç
        if (!silent && !this.isBusy && !this.isDead) this.playAnimation('idle');
    }

    public setTargetPosition(position: THREE.Vector3) {
        if (this.isDead) return;
        this.targetPosition.copy(position);
    }

    public update(delta: number) {
        // Ölen karakter update almasın (animasyon hariç)
        if (this.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                if (this.normalModel) this.normalModel.visible = false;
                if (this.dieModel) this.dieModel.visible = true;
                if (this.dieAction) this.dieAction.reset().play();
                this.isBusy = true; // Hareket etmesin
            }
            if (this.dieMixer) this.dieMixer.update(delta);
            return;
        } else if (this.isDead) {
            // Respawn olmuş!
            this.isDead = false;
            if (this.normalModel) this.normalModel.visible = true;
            if (this.dieModel) this.dieModel.visible = false;
            this.isBusy = false;
        }

        if (this.mixer) this.mixer.update(delta);

        const distance = this.mesh.position.distanceTo(this.targetPosition);
        
        // Rotasyonu her zaman güncelle (Yetenek atarken bile hareket yönüne dönsün veya yetenek biter bitmez doğru yöne baksın)
        if (distance > 0.05) {
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position).normalize();
            const targetRotationY = Math.atan2(direction.x, direction.z);
            let diff = targetRotationY - this.mesh.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const rotationLerp = 1 - Math.exp(-15 * delta); 
            this.mesh.rotation.y += diff * rotationLerp;

            // Hareket işlemini sadece meşgul değilse yap
            if (!this.isBusy) {
                this.playAnimation('run');
                const moveStep = this.speed * delta;
                if(distance < moveStep) {
                    this.mesh.position.copy(this.targetPosition);
                } else {
                    this.mesh.position.addScaledVector(direction, moveStep);
                }
            }
        } else if (!this.isBusy) {
            this.playAnimation('idle');
            if (distance > 0 && distance < 0.1) {
                this.mesh.position.copy(this.targetPosition);
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
}
