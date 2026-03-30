import * as THREE from 'three';
import { NET_CONFIG } from '../../../shared/src/index';

export class Skybox {
    private scene: THREE.Scene;
    private skyColor: THREE.Color;
    private stormColor: THREE.Color;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.skyColor = new THREE.Color(0x74b9ff); // Normal mavi
        this.stormColor = new THREE.Color(0x576574); // Hafif kapalı gri (Simsiyah değil)
        
        this.scene.background = this.skyColor;
        this.setupFog();
    }

    public setIntensity(value: number) {
        // value: 1 (güneşli) -> 0 (hafif yağmurlu)
        const factor = 1 - value;
        
        // Çok hafif bir renk değişimi
        const currentColor = this.skyColor.clone().lerp(this.stormColor, factor * 0.6); // Sadece %60'ı kadar etki etsin
        this.scene.background = currentColor;

        if (this.scene.fog instanceof THREE.Fog) {
            this.scene.fog.color.copy(currentColor);
            // Sisi çok yaklaştırma
            this.scene.fog.near = NET_CONFIG.FOG_START - (factor * 5);
            this.scene.fog.far = NET_CONFIG.FOG_END - (factor * 10);
        }
    }

    private setupFog() {
        this.scene.fog = new THREE.Fog(this.skyColor, NET_CONFIG.FOG_START, NET_CONFIG.FOG_END);
    }

    public update() {}
}
