import './HUD.css';

export class HUD {
    private container: HTMLDivElement;
    private usernameEl: HTMLSpanElement;
    private levelEl: HTMLSpanElement;
    private hpFill: HTMLDivElement;
    private mpFill: HTMLDivElement;
    private hpText: HTMLDivElement;
    private mpText: HTMLDivElement;

    private lastHp: number = -1;
    private lastMaxHp: number = -1;
    private lastMp: number = -1;
    private lastMaxMp: number = -1;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'hud-container ui-master-panel';
        this.container.innerHTML = `
            <div class="hud-header">
                <span class="hud-name" id="hud-username">-</span>
                <span class="hud-level" id="hud-level">Lv.1</span>
            </div>
            <div class="hud-stat-bar ui-sub-panel">
                <div class="hud-bar-fill hud-hp-fill" id="hud-hp-fill"></div>
                <div class="hud-bar-text" id="hud-hp-text">0 / 0</div>
            </div>
            <div class="hud-stat-bar ui-sub-panel">
                <div class="hud-bar-fill hud-mp-fill" id="hud-mp-fill"></div>
                <div class="hud-bar-text" id="hud-mp-text">0 / 0</div>
            </div>
        `;

        document.body.appendChild(this.container);

        this.usernameEl = document.getElementById('hud-username') as HTMLSpanElement;
        this.levelEl = document.getElementById('hud-level') as HTMLSpanElement;
        this.hpFill = document.getElementById('hud-hp-fill') as HTMLDivElement;
        this.mpFill = document.getElementById('hud-mp-fill') as HTMLDivElement;
        this.hpText = document.getElementById('hud-hp-text') as HTMLDivElement;
        this.mpText = document.getElementById('hud-mp-text') as HTMLDivElement;

        this.setVisible(false);
    }

    public update(username: string, level: number, hp: number, maxHp: number, mp: number, maxMp: number) {
        this.usernameEl.innerText = username;
        this.levelEl.innerText = `Lv.${level}`;

        const safeMaxHp = maxHp > 0 ? maxHp : 100;
        const safeMaxMp = maxMp > 0 ? maxMp : 100;
        const hpPercent = Math.max(0, Math.min(100, (hp / safeMaxHp) * 100));
        const mpPercent = Math.max(0, Math.min(100, (mp / safeMaxMp) * 100));

        // --- HP UPDATES ---
        if (hp !== this.lastHp || maxHp !== this.lastMaxHp) {
            // Initial load check
            if (this.lastHp === -1) {
                this.hpFill.style.transition = 'none';
                this.hpFill.style.width = `${hpPercent}%`;
                void this.hpFill.offsetHeight;
                this.hpFill.style.transition = '';
            } else {
                this.hpFill.style.width = `${hpPercent}%`;
            }

            const newHpText = `${Math.floor(hp)} / ${maxHp}`;
            if (this.hpText.innerText !== newHpText) this.hpText.innerText = newHpText;
            
            this.lastHp = hp;
            this.lastMaxHp = maxHp;
        }

        // --- MP UPDATES ---
        if (mp !== this.lastMp || maxMp !== this.lastMaxMp) {
            if (this.lastMp === -1) {
                this.mpFill.style.transition = 'none';
                this.mpFill.style.width = `${mpPercent}%`;
                void this.mpFill.offsetHeight;
                this.mpFill.style.transition = '';
            } else {
                this.mpFill.style.width = `${mpPercent}%`;
            }

            const newMpText = `${Math.floor(mp)} / ${maxMp}`;
            if (this.mpText.innerText !== newMpText) this.mpText.innerText = newMpText;
            
            this.lastMp = mp;
            this.lastMaxMp = maxMp;
        }
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }
}
