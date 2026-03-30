import * as THREE from 'three';

export abstract class BaseEntity {
    public mesh: THREE.Group;
    protected scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
    }

    public abstract update(delta: number): void;

    public destroy() {
        this.scene.remove(this.mesh);
    }

    public get position(): THREE.Vector3 {
        return this.mesh.position;
    }
}
