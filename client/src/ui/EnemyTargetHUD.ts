import './EnemyTargetHUD.css';

export class EnemyTargetHUD {
    private container: HTMLDivElement;
    private nameEl: HTMLSpanElement;
    private levelEl: HTMLSpanElement;
    private hpFill: HTMLDivElement;
    private hpGhostFill: HTMLDivElement;
    private hpText: HTMLDivElement;
    private lastHp: number = -1;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'enemy-target-hud-container ui-master-panel';
        
        this.container.innerHTML = `
            <div class="enemy-main-info">
                <div class="enemy-header">
                    <span class="enemy-name" id="enemy-target-username">-</span>
                    <span class="enemy-level" id="enemy-target-level">Lv.1</span>
                </div>
                <div class="enemy-hp-bar ui-sub-panel">
                    <div class="hud-ghost-fill hud-hp-ghost" id="enemy-target-hp-ghost"></div>
                    <div class="enemy-hp-fill" id="enemy-target-hp-fill"></div>
                    <div class="enemy-hp-text" id="enemy-target-hp-text">0 / 0</div>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        this.nameEl = document.getElementById('enemy-target-username') as HTMLSpanElement;
        this.levelEl = document.getElementById('enemy-target-level') as HTMLSpanElement;
        this.hpFill = document.getElementById('enemy-target-hp-fill') as HTMLDivElement;
        this.hpGhostFill = document.getElementById('enemy-target-hp-ghost') as HTMLDivElement;
        this.hpText = document.getElementById('enemy-target-hp-text') as HTMLDivElement;

        this.setVisible(false);
    }

    public update(entity: any) {
        if (entity.hp !== this.lastHp) {
            const rawName = entity.username || "Bilinmeyen";
            const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
            
            this.nameEl.innerText = cleanName;
            this.levelEl.innerText = `Lv.${entity.level}`;
            
            const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));

            if (entity.hp > this.lastHp && this.lastHp !== -1) {
                // İYİLEŞME: Ghost barı anında arkaya çek ki beyazlık gözükmesin
                this.hpGhostFill.style.transition = 'none';
                this.hpGhostFill.style.width = `${hpPercent}%`;
                void this.hpGhostFill.offsetHeight;
                this.hpGhostFill.style.transition = ''; 
            } else {
                // HASAR: Ghost bar kalsın (CSS'deki 0.6s ile yavaşça gelecek)
                this.hpGhostFill.style.width = `${hpPercent}%`;
            }

            this.hpFill.style.width = `${hpPercent}%`;
            this.hpText.innerText = `${Math.floor(entity.hp)} / ${entity.maxHp}`;
            this.lastHp = entity.hp;
        }
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }
}
