import './RespawnUI.css';

export class RespawnUI {
    private container: HTMLDivElement;
    private cityBtnEl: HTMLButtonElement | null = null;
    private timerInterval: any = null;
    private remainingSeconds: number = 60;
    public onRespawnClick?: (spawnType: number) => void;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'respawn-container ui-master-panel';
        this.container.style.display = 'none';
        
        this.container.innerHTML = `
            <div class="respawn-title">ÖLDÜN!</div>
            <div class="respawn-buttons">
                <button class="respawn-btn city-btn ui-sub-panel" id="respawn-city">Şehir Merkezinde Doğ (60)</button>
                <button class="respawn-btn here-btn ui-sub-panel" id="respawn-here">Olduğun Yerde Doğ</button>
            </div>
        `;
        
        document.body.appendChild(this.container);

        this.cityBtnEl = this.container.querySelector('#respawn-city') as HTMLButtonElement;
        const hereBtn = this.container.querySelector('#respawn-here');

        this.cityBtnEl?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleRespawn(0);
        });

        hereBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleRespawn(1);
        });
    }

    private handleRespawn(type: number) {
        this.hide();
        if (this.onRespawnClick) this.onRespawnClick(type);
    }

    public show() {
        this.container.style.display = 'flex';
        this.remainingSeconds = 60;
        this.updateButtonText();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateButtonText();

            if (this.remainingSeconds <= 0) {
                this.handleRespawn(0); // Süre bitince Şehirde Doğ
            }
        }, 1000);
    }

    private updateButtonText() {
        if (this.cityBtnEl) {
            this.cityBtnEl.innerText = `Şehir Merkezinde Doğ (${this.remainingSeconds})`;
        }
    }

    public hide() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.container.style.display = 'none';
    }
}
