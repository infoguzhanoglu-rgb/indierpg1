import * as THREE from 'three';
import { Updatable } from '../../core/Engine';

interface ActiveAnimation {
    casterId: string;
    projectile: THREE.Group;
    startPos: THREE.Vector3;
    target: THREE.Object3D;
    targetId: string;
    progress: number;
    speed: number;
    damage?: number;
    resultType?: string;
    onHit?: (pos: THREE.Vector3, dmg: number, type: string, tid: string) => void;
}

/**
 * Yanan Dalga yeteneğinin görsel efektlerini yöneten sınıf.
 */
export class YananDalgaAnim implements Updatable {
    private scene: THREE.Scene;
    private activeAnimations: ActiveAnimation[] = [];
    private projectilePool: THREE.Group[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public play(caster: any, target: any, damage?: number, resultType?: string, onHit?: (pos: THREE.Vector3, dmg: number, type: string, tid: string) => void) {
        if (!caster || !target || document.visibilityState === 'hidden') return;

        // 1. ADIM: Karakter elini savurur (Model animasyonu başlar)
        if (caster.playAnimation) {
            caster.playAnimation('yanan_dalga');
            caster.isBusy = true;
            // PRO: Animasyon süresi 1.8 saniye (yanan_dalga.glb tam oynatılsın)
            setTimeout(() => { if (caster) caster.isBusy = false; }, 1800);
            console.log(`[YananDalgaAnim] Karakter animasyonu başlatıldı.`);
        }

        // 2. ADIM: Alev topu fırlatılır (Karakterin el savurma anına tam denk getirildi: 0.65sn)
        setTimeout(() => {
            if (!target || !target.mesh || !caster || !caster.mesh) return;
            this.launchFireball(caster, target.mesh, target.id, damage, resultType, onHit);
        }, 650); 
    }

    private launchFireball(caster: any, targetMesh: THREE.Object3D, targetId: string, damage?: number, resultType?: string, onHit?: (pos: THREE.Vector3, dmg: number, type: string, tid: string) => void) {
        const projectile = this.getProjectileFromPool();
        
        // PRO: Alev Topunu Sağ Ele Getir (Modelin bakış yönüne göre el değiştirildi)
        // Karakterin bakış yönüne göre (-0.5 sol/sağ, 1.0 boy, 0.6 ön)
        const localHandOffset = new THREE.Vector3(-0.5, 1.0, 0.6);
        localHandOffset.applyQuaternion(caster.mesh.quaternion);
        const startPos = caster.mesh.position.clone().add(localHandOffset);
        
        projectile.position.copy(startPos);
        projectile.scale.set(0.1, 0.1, 0.1); 
        projectile.lookAt(targetMesh.position); 
        this.scene.add(projectile);

        const distance = startPos.distanceTo(targetMesh.position);
        const PROJECTILE_SPEED = 12.0; // Saniyede 12 birim hız

        this.activeAnimations.push({
            casterId: caster.id,
            projectile: projectile,
            startPos: startPos,
            target: targetMesh,
            targetId: targetId, // PRO
            progress: 0,
            speed: PROJECTILE_SPEED / distance,
            onHit: onHit,
            damage: damage,
            resultType: resultType
        });
    }

    private getProjectileFromPool(): THREE.Group {
        if (this.projectilePool.length > 0) {
            const p = this.projectilePool.pop()!;
            p.visible = true;
            return p;
        }

        const group = new THREE.Group();
        
        // Çekirdek
        const coreGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Alev Haresi
        const glowGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(glow);

        // Dinamik Işık
        const light = new THREE.PointLight(0xff5500, 12, 4);
        group.add(light);

        return group;
    }

    private createTrailGhost(position: THREE.Vector3) {
        const ghostGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const ghostMat = new THREE.MeshBasicMaterial({ 
            color: 0xff4400, 
            transparent: true, 
            opacity: 0.4,
            blending: THREE.AdditiveBlending 
        });
        const ghost = new THREE.Mesh(ghostGeo, ghostMat);
        // İzi hafifçe rastgele kaydır (Silkroad tarzı dağınık duman/alev)
        const offset = 0.15;
        ghost.position.copy(position).add(new THREE.Vector3(
            (Math.random() - 0.5) * offset,
            (Math.random() - 0.5) * offset,
            (Math.random() - 0.5) * offset
        ));
        this.scene.add(ghost);

        let opacity = 0.4;
        let scale = 1.0;
        
        const fade = () => {
            opacity -= 0.05;
            scale -= 0.05;
            if (opacity <= 0) {
                this.scene.remove(ghost);
                ghostGeo.dispose();
                ghostMat.dispose();
            } else {
                ghost.material.opacity = opacity;
                ghost.scale.setScalar(scale);
                requestAnimationFrame(fade);
            }
        };
        fade();
    }

    private handleExplosion(position: THREE.Vector3) {
        const explosionGroup = new THREE.Group();
        explosionGroup.position.copy(position).add(new THREE.Vector3(0, 1, 0));
        this.scene.add(explosionGroup);

        // 1. Parlama (Flash) - Daha küçük ve yoğun
        const flashGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        explosionGroup.add(flash);

        // 2. Alev Küresi - Daha kompakt
        const flameGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        explosionGroup.add(flame);

        // 3. Güçlü Işık - Daha dar menzil
        const expLight = new THREE.PointLight(0xffaa00, 20, 8);
        explosionGroup.add(expLight);

        let startTime = Date.now();
        const duration = 500; // Daha hızlı ve vurucu

        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            const p = elapsed / duration;

            if (p >= 1) {
                this.scene.remove(explosionGroup);
                flashGeo.dispose(); flameGeo.dispose();
                flashMat.dispose(); flameMat.dispose();
            } else {
                flash.scale.setScalar(1 + p * 3);
                flash.material.opacity = 1 - p;
                flame.scale.setScalar(1 + p * 2.5);
                flame.material.opacity = (1 - p) * 0.8;
                expLight.intensity = (1 - p) * 20;
                requestAnimationFrame(animateExplosion);
            }
        };
        animateExplosion();
    }

    public update(delta: number) {
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            const anim = this.activeAnimations[i];
            anim.progress += delta * anim.speed;
            
            const currentScale = Math.min(1.0, anim.progress * 8);
            anim.projectile.scale.setScalar(currentScale);

            // Hedefin merkezini al (Gövdeye çarpma hissi için Y+1.2)
            const targetPos = anim.target.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            anim.projectile.position.lerpVectors(anim.startPos, targetPos, Math.min(anim.progress, 1));
            
            // --- Silkroad Jitter (Titreme) Efekti ---
            // Alevin düz gitmek yerine hafifçe sarsılması
            const jitter = 0.08;
            anim.projectile.position.x += (Math.random() - 0.5) * jitter;
            anim.projectile.position.y += (Math.random() - 0.5) * jitter;
            anim.projectile.position.z += (Math.random() - 0.5) * jitter;

            // Alevin kendi ekseninde hızlı dönmesi (Türbülans)
            anim.projectile.rotation.z += delta * 25;
            anim.projectile.rotation.x += delta * 10;

            this.createTrailGhost(anim.projectile.position);

            // Alev titreme ve parlama modülasyonu
            const glow = anim.projectile.children[1] as THREE.Mesh;
            const light = anim.projectile.children[2] as THREE.PointLight;
            
            const time = Date.now() * 0.01;
            const flicker = Math.sin(time * 2.0) * 0.2 + Math.random() * 0.1;
            glow.scale.setScalar(1.0 + flicker);
            if (light) light.intensity = 12 + flicker * 20; // Işık da alevle beraber titreşsin

            if (anim.progress >= 1) {
                const hitPos = anim.target.position.clone();
                this.handleExplosion(hitPos);
                
                if (anim.onHit && anim.damage !== undefined && anim.resultType) {
                    anim.onHit(hitPos, anim.damage, anim.resultType, (anim as any).targetId || "");
                }

                this.scene.remove(anim.projectile);
                this.projectilePool.push(anim.projectile);
                this.activeAnimations.splice(i, 1);
            }
        }
    }
}
