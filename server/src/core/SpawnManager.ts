import { Vector3 } from '../../../shared/src/index.js';

export interface SpawnPoint {
    type: string;
    position: Vector3;
    count: number;
    radius: number;
}

export const SPAWN_CONFIG: SpawnPoint[] = [
    {
        type: "SAMAN",
        position: { x: 10, y: 0, z: 10 },
        count: 5,
        radius: 8
    },
    {
        type: "SAMAN",
        position: { x: -10, y: 0, z: -15 },
        count: 3,
        radius: 5
    }
];
