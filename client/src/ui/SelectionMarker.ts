import * as THREE from 'three';
import { Updatable } from '../core/Engine';

export class SelectionMarker implements Updatable {
    private mesh: THREE.Mesh;
    private scene: THREE.Scene;
    private target: THREE.Object3D | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        const geometry = new THREE.RingGeometry(0.35, 0.45, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            // Titremeyi (Z-fighting) önlemek için polygonOffset kullanalım
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.05; 
        this.mesh.visible = false;
        
        this.scene.add(this.mesh);
    }

    public setTarget(target: THREE.Object3D | null) {
        this.target = target;
        if (!target) {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
            
            // Renk Güncelleme
            const entity = target.userData.entity;
            if (entity && entity.entityType === 1) {
                // Enemy (Kırmızı)
                (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
            } else {
                // Player (Mavi)
                (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x00aaff);
            }
            
            this.updatePosition();
        }
    }

    public getTarget(): THREE.Object3D | null {
        return this.target;
    }

    private tempWorldPos = new THREE.Vector3();

    private updatePosition() {
        if (!this.target) return;
        
        // Dünya koordinatlarını güvenli bir şekilde al 
        this.target.getWorldPosition(this.tempWorldPos);
        
        // Y=0.01 z-fighting'i önler ve zemine yakın durur
        this.mesh.position.set(this.tempWorldPos.x, 0.01, this.tempWorldPos.z);
    }

    public update(_delta: number) {
        // update boş bırakıldı, takibi lateUpdate'e taşıdık (titremeyi önlemek için)
    }

    public lateUpdate(delta: number) {
        if (!this.target || !this.mesh.visible) return;

        this.updatePosition();
        this.mesh.rotation.z += delta * 1.5;
    }
}



