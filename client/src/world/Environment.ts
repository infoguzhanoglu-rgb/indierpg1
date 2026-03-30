import * as THREE from 'three';
import { Skybox } from './Skybox';
import { Updatable } from '../core/Engine';
import { NET_CONFIG } from '../../../shared/src/index';

export class Environment implements Updatable {
    private scene: THREE.Scene;
    public ground!: THREE.Mesh;
    public skybox!: Skybox;
    public ambientLight!: THREE.AmbientLight;
    public hemiLight!: THREE.HemisphereLight;
    public fog: THREE.Fog;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        // NET_CONFIG üzerinden sis ayarları
        this.fog = new THREE.Fog(0x74b9ff, NET_CONFIG.FOG_START, NET_CONFIG.FOG_END);
        this.scene.fog = this.fog;
        
        this.createGround();
        this.createSky();
        this.createLights();
    }

    public update(_delta: number) {}

    private createGround() {
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('/textures/grass/Grass005_1K-JPG_Color.jpg');
        
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(20, 20);

        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            color: 0xcccccc,
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    private createSky() {
        this.skybox = new Skybox(this.scene);
    }

    private createLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
        this.scene.add(this.ambientLight);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.hemiLight.position.set(0, 20, 0);
        this.scene.add(this.hemiLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -60;
        directionalLight.shadow.camera.right = 60;
        directionalLight.shadow.camera.top = 60;
        directionalLight.shadow.camera.bottom = -60;
        
        this.scene.add(directionalLight);
    }
}
