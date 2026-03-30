import './NameTag.css';
import * as THREE from 'three';

export class NameTag {
    private element: HTMLDivElement;
    private chatElement: HTMLDivElement | null = null;
    private targetObj: THREE.Object3D;
    private camera: THREE.Camera;
    private chatTimeout: number | null = null;
    private tempPos = new THREE.Vector3();

    constructor(name: string, targetObj: THREE.Object3D, camera: THREE.Camera, isOther: boolean = false) {
        this.targetObj = targetObj;
        this.camera = camera;

        const cleanName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

        // UI kapsayıcısını bul
        let container = document.getElementById('ui-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ui-container';
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }

        // Tag divini üret
        this.element = document.createElement('div');
        this.element.className = isOther ? 'nametag other' : 'nametag';
        this.element.innerText = cleanName;
        this.element.style.position = 'absolute';
        this.element.style.willChange = 'transform';
        this.element.style.transform = 'translate(-50%, -100%)';
        this.element.style.zIndex = isOther ? '10' : '100';

        container.appendChild(this.element);
    }

    public updateName(newName: string) {
        const cleanName = newName.charAt(0).toUpperCase() + newName.slice(1).toLowerCase();
        this.element.innerText = cleanName;
    }

    public showChat(message: string) {
        if (this.chatTimeout) {
            window.clearTimeout(this.chatTimeout);
        }

        if (!this.chatElement) {
            this.chatElement = document.createElement('div');
            this.chatElement.className = 'chat-bubble';
            this.element.parentElement?.appendChild(this.chatElement);
        }

        this.chatElement.innerText = message;
        this.chatElement.style.display = 'block';

        this.chatTimeout = window.setTimeout(() => {
            if (this.chatElement) {
                this.chatElement.style.display = 'none';
            }
            this.chatTimeout = null;
        }, 5000);
    }

    public update() {
        this.targetObj.getWorldPosition(this.tempPos);
        this.tempPos.y += 2.2;
        this.tempPos.project(this.camera);

        const isVisible = this.tempPos.z <= 1 && Math.abs(this.tempPos.x) < 1.1 && Math.abs(this.tempPos.y) < 1.1;

        if (!isVisible) {
            this.element.style.display = 'none';
            if (this.chatElement) this.chatElement.style.display = 'none';
            return;
        }

        const halfWidth = window.innerWidth / 2;
        const halfHeight = window.innerHeight / 2;

        const x = (this.tempPos.x * halfWidth) + halfWidth;
        const y = -(this.tempPos.y * halfHeight) + halfHeight;

        const distance = this.camera.position.distanceTo(this.targetObj.position);
        const maxVisibilityDistance = 30;

        let scale = 1.0;
        if (distance > 5) {
            scale = Math.max(0.75, 1.0 - (distance - 5) * 0.01);
        }

        const isWithinRange = isVisible && distance < maxVisibilityDistance;
        this.element.style.opacity = isWithinRange ? '1' : '0';

        if (isVisible) {
            this.element.style.display = 'flex';
            this.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${scale})`;

            if (this.chatElement && this.chatTimeout) {
                this.chatElement.style.opacity = isWithinRange ? '1' : '0';
                this.chatElement.style.display = 'block';
                const chatY = y - (40 * scale);
                this.chatElement.style.transform = `translate3d(${x}px, ${chatY}px, 0) translate(-50%, -100%) scale(${scale})`;
            }
        }
    }

    public destroy() {
        if (this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        }
        if (this.chatElement && this.chatElement.parentElement) {
            this.chatElement.parentElement.removeChild(this.chatElement);
        }
        if (this.chatTimeout) window.clearTimeout(this.chatTimeout);
    }
}
