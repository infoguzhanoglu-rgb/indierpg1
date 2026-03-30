import './StatusPanel.css';
import { MAX_LEVEL } from '../../../shared/src/LevelScaling';

export class StatusPanel {
    private container: HTMLDivElement;
    private statusContent: HTMLDivElement;
    
    private frameCount: number = 0;
    private lastTime: number = 0;
    private currentFPS: number = 0;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'status-panel-container ui-master-panel';
        
        this.statusContent = document.createElement('div');
        this.statusContent.className = 'status-content';
        this.container.appendChild(this.statusContent);

        document.body.appendChild(this.container);
        
        this.lastTime = performance.now();
        this.setVisible(false);
    }

    public update(ping: number, _serverTimestamp: number, onlinePlayers: number) {
        // FPS Hesaplama
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastTime;

        if (elapsed >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTime = now;
        }

        // Zaman
        const nowLocal = new Date();
        const timeStr = nowLocal.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Tüm içeriği tek bir satırda tertipli birleştir
        this.statusContent.innerHTML = `
            <span>FPS: ${this.currentFPS}</span>
            <span class="sep">|</span>
            <span>Ping: ${Math.round(ping)}ms</span>
            <span class="sep">|</span>
            <span>Online: ${onlinePlayers}</span>
            <span class="sep">|</span>
            <span>Max Lv: ${MAX_LEVEL}</span>
            <span class="sep">|</span>
            <span>${timeStr}</span>
        `;
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }
}
