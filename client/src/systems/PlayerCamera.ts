import * as THREE from 'three';
import { Updatable } from '../core/Engine';

export class PlayerCamera implements Updatable {
    public camera: THREE.PerspectiveCamera;
    private target: THREE.Object3D;
    
    private distance: number = 10.0;
    private targetDistance: number = 10.0;
    private readonly minDistance: number = 3.0;
    private readonly maxDistance: number = 40.0;
    
    private rotationY: number = 0;
    private rotationX: number = -0.6;
    private targetRotationY: number = 0;
    private targetRotationX: number = -0.6;
    
    private smoothFactor: number = 0.1;
    private zoomSmoothFactor: number = 0.2;
    public priority: number = 1;

    constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
        this.camera = camera;
        this.target = target;
        this.camera.name = "Player Kamerası";
    }

    public rotate(deltaX: number, deltaY: number) {
        this.targetRotationY -= (deltaX * 0.005);
        this.targetRotationX -= (deltaY * 0.005);
        
        // Classic MMO pitch limits (avoid looking straight down or through the ground)
        this.targetRotationX = Math.max(-1.4, Math.min(-0.2, this.targetRotationX));
    }

    public zoom(delta: number) {
        // Handle both scroll directions and intensities
        this.targetDistance += (delta * 0.01);
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
    }

    public update(_delta: number) {
        // update boş bırakıldı, kamera takibi lateUpdate'e taşındı
    }

    public lateUpdate(delta: number) {
        // Frame-rate independent smoothing factors
        const rotationAdjustment = 1 - Math.pow(this.smoothFactor, delta * 30);
        const zoomAdjustment = 1 - Math.pow(this.zoomSmoothFactor, delta * 30);

        // Interpolate values
        this.rotationY += (this.targetRotationY - this.rotationY) * rotationAdjustment;
        this.rotationX += (this.targetRotationX - this.rotationX) * rotationAdjustment;
        this.distance += (this.targetDistance - this.distance) * zoomAdjustment;

        // Calculate offset position using spherical coordinates
        const offsetX = Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.distance;
        const offsetY = -Math.sin(this.rotationX) * this.distance;
        const offsetZ = Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.distance;

        // Apply new position
        this.camera.position.set(
            this.target.position.x + offsetX,
            this.target.position.y + offsetY,
            this.target.position.z + offsetZ
        );

        // Look at the player's "head" area (approx 0.8 units up)
        const lookAtTarget = this.target.position.clone();
        lookAtTarget.y += 0.8; 
        
        this.camera.lookAt(lookAtTarget);
    }
}
