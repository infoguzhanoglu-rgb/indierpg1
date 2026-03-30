import * as THREE from 'three';

export class ClickMarker {
    private mesh: THREE.Mesh;
    private scene: THREE.Scene;
    private active: boolean = false;
    private isWaitingToHide: boolean = false;
    private hideTimer: number = 0;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // Sabit Beyaz, Şeffaf Halka
        const geometry = new THREE.RingGeometry(0.35, 0.45, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            // Titremeyi önlemek için
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.01; // Tam Zemin
        this.mesh.visible = false;
        
        this.scene.add(this.mesh);
    }

    public show(position: THREE.Vector3) {
        this.mesh.position.set(position.x, 0.01, position.z);
        this.mesh.visible = true;
        this.active = true;
        this.isWaitingToHide = false;
        this.hideTimer = 0;
    }

    public hide() {
        this.mesh.visible = false;
        this.active = false;
        this.isWaitingToHide = false;
        this.hideTimer = 0;
    }

    public update(delta: number, playerPosition?: THREE.Vector3) {
        if (!this.active || !playerPosition) return;

        if (!this.isWaitingToHide) {
            const dist = this.mesh.position.distanceTo(playerPosition);
            if (dist < 0.5) {
                this.isWaitingToHide = true;
                this.hideTimer = 0;
            }
        } else {
            this.hideTimer += delta;
            if (this.hideTimer >= 5) {
                this.hide();
            }
        }
    }
}
