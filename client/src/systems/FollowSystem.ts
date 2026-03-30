import * as THREE from 'three';
import { Player } from '../entities/Player';

export class FollowSystem {
    private player: Player;
    private target: any | null = null;
    
    private followDistance: number = 2.8; 
    private stopDistance: number = 2.4; 
    
    private isMovingToTarget: boolean = false;

    constructor(player: Player) {
        this.player = player;
    }

    public follow(target: any, range?: number) {
        this.target = target;
        this.isMovingToTarget = false;
        
        // Eğer bir menzil verildiyse durma mesafesini ona göre ayarla
        if (range !== undefined) {
            this.stopDistance = range * 0.8; // Menzilin biraz içine girsin garanti olsun
            this.followDistance = range;
        } else {
            this.followDistance = 2.8;
            this.stopDistance = 2.4;
        }
    }

    public stop() {
        this.target = null;
        this.isMovingToTarget = false;
    }

    public update() {
        if (!this.target) return;
        
        // target bir mesh olabilir veya mesh içeren bir entity olabilir
        const targetMesh = this.target.mesh || (this.target instanceof THREE.Object3D ? this.target : null);
        if (!targetMesh) return;

        const targetPos = targetMesh.position;
        const playerPos = this.player.mesh.position;
        const currentDist = playerPos.distanceTo(targetPos);

        if (currentDist > this.followDistance) {
            this.isMovingToTarget = true;
        } else if (currentDist < this.stopDistance) {
            this.isMovingToTarget = false;
        }

        if (this.isMovingToTarget) {
            const dir = new THREE.Vector3().subVectors(targetPos, playerPos).normalize();
            const movePos = new THREE.Vector3()
                .copy(targetPos)
                .sub(dir.multiplyScalar(this.stopDistance * 0.9));
            
            this.player.setTargetPosition(movePos);
        } else {
            this.player.setTargetPosition(playerPos);
        }
    }

    public isFollowing(): boolean {
        return this.target !== null;
    }
}
