import * as THREE from 'three';

export interface InputEvents {
    onMove: (point: THREE.Vector3) => void;
    onSelect: (object: THREE.Object3D | null) => void; 
    onInteraction: (object: THREE.Object3D | null, x: number, y: number) => void;
    onRotate: (deltaX: number, deltaY: number) => void;
    onZoom: (deltaY: number) => void;
}

export class InputManager {
    private isRightMouseDown: boolean = false;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private camera: THREE.Camera;
    private events: InputEvents;
    
    // Performans için optimize edilmiş listeler
    private walkableObjects: THREE.Object3D[] = [];
    private selectableObjects: THREE.Object3D[] = [];
    
    private lastClickTime: number = 0;
    private clickThreshold: number = 250; // Daha hızlı tepki için 250ms

    constructor(_scene: THREE.Scene, camera: THREE.Camera, events: InputEvents) {
        this.camera = camera;
        this.events = events;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 2000; // PRO: Uzaktaki nesneleri seçebilmek için limit artırıldı
        this.mouse = new THREE.Vector2();
        
        // Raycast performans ayarları
        this.raycaster.params.Mesh.threshold = 0.1;
        
        this.initListeners();
    }

    public setWalkableObjects(objects: THREE.Object3D[]) { this.walkableObjects = objects; }
    public setSelectableObjects(objects: THREE.Object3D[]) { this.selectableObjects = objects; }
    public setLocalPlayerMesh(_mesh: THREE.Object3D) {}

    private initListeners() {
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // POINTER DOWN: Daha hızlı algılama
        document.addEventListener('pointerdown', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.ui-master-panel') || target.closest('.notice-container') || target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;

            if (e.button === 0) {
                this.handleLeftClick(e);
            } else if (e.button === 2) {
                this.isRightMouseDown = true;
                if (e.target instanceof HTMLCanvasElement) e.target.setPointerCapture(e.pointerId);
            }
        });

        document.addEventListener('pointermove', (e) => {
            if (this.isRightMouseDown) {
                // MMO standartlarında kamera hassasiyeti
                this.events.onRotate(e.movementX, e.movementY);
            }
        });

        document.addEventListener('pointerup', (e) => {
            if (e.button === 2) {
                this.isRightMouseDown = false;
                if (e.target instanceof HTMLCanvasElement) e.target.releasePointerCapture(e.pointerId);
            }
        });

        document.addEventListener('wheel', (e) => {
            this.events.onZoom(e.deltaY);
        }, { passive: false });
    }

    private handleLeftClick(e: PointerEvent) {
        // Koordinatları anlık ve hassas hesapla
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < this.clickThreshold;
        this.lastClickTime = now;

        // 1. ÖNCE SEÇİLEBİLİR NESNELERE (OYUNCULARA) BAK (PERFORMANSLI)
        const entityHits = this.raycaster.intersectObjects(this.selectableObjects, true);
        
        let foundEntity: THREE.Object3D | null = null;
        if (entityHits.length > 0) {
            let obj: THREE.Object3D | null = entityHits[0].object;
            while (obj) {
                if (obj.userData && obj.userData.entity) { foundEntity = obj; break; }
                obj = obj.parent;
            }
        }

        if (isDoubleClick && foundEntity) {
            // Çift tık: Etkileşim
            this.events.onInteraction(foundEntity, e.clientX, e.clientY);
        } else if (foundEntity) {
            // Tek tık: Seçim
            this.events.onSelect(foundEntity);
        } else {
            // 2. OYUNCU YOKSA ZEMİNE BAK (YÜRÜME)
            const groundHits = this.raycaster.intersectObjects(this.walkableObjects, false);
            if (groundHits.length > 0) {
                this.events.onMove(groundHits[0].point);
                // NOT: Seçimi kaldırmıyoruz, MMO'larda yürüme seçimi bozmaz.
            } else {
                // Sadece boşluğa (zemine bile değil) tıklanırsa seçimi kaldır
                this.events.onSelect(null);
            }
        }
    }
}
