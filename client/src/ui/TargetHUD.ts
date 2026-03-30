import './TargetHUD.css';

export interface TargetHUDActions {
    onMessage: (username: string) => void;
    onFollow: (target: any) => void;
}

export class TargetHUD {
    private container: HTMLDivElement;
    private nameEl: HTMLSpanElement;
    private levelEl: HTMLSpanElement;
    private hpFill: HTMLDivElement;
    private hpGhostFill: HTMLDivElement;
    private hpText: HTMLDivElement;
    private interactionContainer: HTMLDivElement;
    
    private currentTargetEntity: any = null;
    private lastHp: number = -1;
    private actions: TargetHUDActions;
    private localPlayerId: string = "";

    constructor(actions: TargetHUDActions) {
        this.actions = actions;
        
        this.container = document.createElement('div');
        this.container.className = 'target-hud-container ui-master-panel';
        
        this.container.innerHTML = `
            <div class="target-main-info">
                <div class="target-header">
                    <span class="target-name" id="target-username">-</span>
                    <span class="target-level" id="target-level">Lv.1</span>
                </div>
                <div class="target-stat-bar ui-sub-panel">
                    <div class="hud-ghost-fill hud-hp-ghost" id="target-hp-ghost"></div>
                    <div class="target-hp-fill" id="target-hp-fill"></div>
                    <div class="target-hp-text" id="target-hp-text">0 / 0</div>
                </div>
            </div>
            <div class="target-actions" id="target-interaction-area">
                <button class="target-action-btn" id="target-msg-btn" title="Mesaj Gönder">✉️</button>
                <button class="target-action-btn" id="target-follow-btn" title="Takip Et">👣</button>
            </div>
        `;

        document.body.appendChild(this.container);

        this.nameEl = document.getElementById('target-username') as HTMLSpanElement;
        this.levelEl = document.getElementById('target-level') as HTMLSpanElement;
        this.hpFill = document.getElementById('target-hp-fill') as HTMLDivElement;
        this.hpGhostFill = document.getElementById('target-hp-ghost') as HTMLDivElement;
        this.hpText = document.getElementById('target-hp-text') as HTMLDivElement;
        this.interactionContainer = document.getElementById('target-interaction-area') as HTMLDivElement;

        document.getElementById('target-msg-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.currentTargetEntity) this.actions.onMessage(this.currentTargetEntity.username);
        });

        document.getElementById('target-follow-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.currentTargetEntity) this.actions.onFollow(this.currentTargetEntity);
        });

        this.setVisible(false);
    }

    public setLocalPlayerId(id: string) {
        this.localPlayerId = id;
    }

    public update(entity: any) {
        this.currentTargetEntity = entity;
        
        this.nameEl.innerText = entity.username;
        this.levelEl.innerText = `Lv.${entity.level}`;
        
        const hpPercent = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));

        if (entity.hp > this.lastHp) {
            this.hpGhostFill.style.transition = 'none';
            this.hpGhostFill.style.width = `${hpPercent}%`;
            void this.hpGhostFill.offsetHeight;
            this.hpGhostFill.style.transition = '';
        } else {
            this.hpGhostFill.style.width = `${hpPercent}%`;
        }

        this.hpFill.style.width = `${hpPercent}%`;
        this.hpText.innerText = `${Math.floor(entity.hp)} / ${entity.maxHp}`;
        this.lastHp = entity.hp;

        // ID bazlı kesin kontrol: Eğer seçilen oyuncunun ID'si bizim ID'mizle aynıysa butonları gizle
        if (entity.id === this.localPlayerId) {
            this.interactionContainer.style.display = 'none';
        } else {
            this.interactionContainer.style.display = 'flex';
        }
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
        if (!visible) this.currentTargetEntity = null;
    }
}
