import './TargetInteractionUI.css';

export interface InteractionActions {
    onMessage: (username: string) => void;
    onFollow: (target: any) => void;
}

export class TargetInteractionUI {
    private container: HTMLDivElement;
    private targetEntity: any = null;
    private actions: InteractionActions;

    constructor(actions: InteractionActions) {
        this.actions = actions;
        
        this.container = document.createElement('div');
        this.container.className = 'target-interaction-container ui-master-panel';
        this.container.style.display = 'none';

        this.container.innerHTML = `
            <div class="ti-buttons">
                <button class="ti-btn" id="ti-msg-btn">Mesaj</button>
                <button class="ti-btn" id="ti-follow-btn">Takip Et</button>
            </div>
        `;

        document.body.appendChild(this.container);

        this.container.querySelector('#ti-msg-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.targetEntity) this.actions.onMessage(this.targetEntity.username);
        });

        this.container.querySelector('#ti-follow-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.targetEntity) this.actions.onFollow(this.targetEntity);
        });
    }

    public show(entity: any) {
        // Kendimizi seçtiysek bu paneli gösterme
        if (!entity || entity.isMe) {
            this.hide();
            return;
        }
        
        this.targetEntity = entity;
        this.container.style.display = 'flex';
    }

    public hide() {
        this.container.style.display = 'none';
        this.targetEntity = null;
    }

    public isVisible(): boolean {
        return this.container.style.display === 'flex';
    }
}
