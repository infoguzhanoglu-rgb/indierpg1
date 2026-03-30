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
 * Saman Topu (Enemy Skill) - Daha ince, saman/büyü renginde bir projectile.
 */
export class SamanTopuAnim implements Updatable {
    private scene: THREE.Scene;
    private activeAnimations: ActiveAnimation[] = [];
    private projectilePool: THREE.Group[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public play(caster: any, target: any, damage?: number, resultType?: string, onHit?: (pos: THREE.Vector3, dmg: number, type: string, tid: string) => void) {
        if (!caster || !target || document.visibilityState === 'hidden') return;

        // Canavarın el savurma anına denk getir: 850ms (Savurma biterken fırlar)
        setTimeout(() => {
            if (!target || !target.mesh || !caster || !caster.mesh) return;
            this.launchProjectile(caster, target.mesh, target.id, damage, resultType, onHit);
        }, 850); 
    }

    private launchProjectile(caster: any, targetMesh: THREE.Object3D, targetId: string, damage?: number, resultType?: string, onHit?: (pos: THREE.Vector3, dmg: number, type: string, tid: string) => void) {
        const projectile = this.getProjectileFromPool();
        
        // Saman sağ el pozisyonuna getir (Hassas Offset)
        const handOffset = new THREE.Vector3(-0.4, 0.8, 0.5);
        handOffset.applyQuaternion(caster.mesh.quaternion);
        const startPos = caster.mesh.position.clone().add(handOffset);
        
        projectile.position.copy(startPos);
        projectile.scale.set(0.1, 0.1, 0.1); 
        this.scene.add(projectile);

        const distance = startPos.distanceTo(targetMesh.position);
        const PROJECTILE_SPEED = 14.0; // Biraz daha hızlı

        this.activeAnimations.push({
            casterId: caster.id, projectile, startPos,
            target: targetMesh, targetId,
            progress: 0, speed: PROJECTILE_SPEED / distance,
            onHit, damage, resultType
        });
    }

    private getProjectileFromPool(): THREE.Group {
        if (this.projectilePool.length > 0) {
            const p = this.projectilePool.pop()!;
            p.visible = true;
            return p;
        }

        const group = new THREE.Group();
        
        // Daha ince çekirdek (Straw Ball)
        const coreGeo = new THREE.SphereGeometry(0.059, 6, 6);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Büyü Haresi (Sarı/Altın)
        const glowGeo = new THREE.SphereGeometry(0.175, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xcca652, 
            transparent: true, 
            opacity: 0.7,
            blending: THREE.AdditiveBlending 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(glow);

        const light = new THREE.PointLight(0xcca652, 6, 3);
        group.add(light);

        return group;
    }

    private createTrail(position: THREE.Vector3) {
        const ghostGeo = new THREE.SphereGeometry(0.06, 4, 4);
        const ghostMat = new THREE.MeshBasicMaterial({ 
            color: 0xccaa44, transparent: true, opacity: 0.3,
            blending: THREE.AdditiveBlending 
        });
        const ghost = new THREE.Mesh(ghostGeo, ghostMat);
        ghost.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1));
        this.scene.add(ghost);

        let opacity = 0.3;
        const fade = () => {
            opacity -= 0.04;
            if (opacity <= 0) {
                this.scene.remove(ghost);
                ghostGeo.dispose(); ghostMat.dispose();
            } else {
                ghost.material.opacity = opacity;
                requestAnimationFrame(fade);
            }
        };
        fade();
    }

    public update(delta: number) {
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            const anim = this.activeAnimations[i];
            anim.progress += delta * anim.speed;
            
            const currentScale = Math.min(1.0, anim.progress * 10);
            anim.projectile.scale.setScalar(currentScale);

            // Oyuncunun gövdesine hedefle (Y+1.2)
            const targetPos = anim.target.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            anim.projectile.position.lerpVectors(anim.startPos, targetPos, Math.min(anim.progress, 1));
            
            this.createTrail(anim.projectile.position);

            if (anim.progress >= 1) {
                if (anim.onHit && anim.damage !== undefined && anim.resultType) {
                    // PRO: target.position (y=0) gönder ki DamageTextManager kendi offsetini (3.4) sağlıklı eklesin
                    anim.onHit(anim.target.position.clone(), anim.damage, anim.resultType, anim.targetId);
                }
                this.scene.remove(anim.projectile);
                this.projectilePool.push(anim.projectile);
                this.activeAnimations.splice(i, 1);
            }
        }
    }
}
