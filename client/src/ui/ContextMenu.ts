import './ContextMenu.css';

export interface ContextMenuAction {
    label: string;
    action: () => void;
}

export class ContextMenu {
    private container: HTMLDivElement;
    private static instance: ContextMenu | null = null;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'game-context-menu';
        this.container.className = 'context-menu ui-master-panel';
        this.container.style.display = 'none';
        document.body.appendChild(this.container);
        
        // Dışarı tıklayınca kapansnsın
        document.addEventListener('pointerdown', (e) => {
            const target = e.target as HTMLElement;
            if (this.container.style.display === 'flex' && !this.container.contains(target)) {
                this.hide();
            }
        });

        ContextMenu.instance = this;
    }

    public static getInstance(): ContextMenu {
        if (!ContextMenu.instance) new ContextMenu();
        return ContextMenu.instance!;
    }

    public show(x: number, y: number, title: string, actions: ContextMenuAction[]) {
        // İçeriği temizle ve yeniden oluştur
        this.container.innerHTML = `<div class="context-menu-header">${title}</div>`;
        
        actions.forEach(item => {
            const btn = document.createElement('div');
            btn.className = 'context-menu-item';
            btn.innerText = item.label;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.action();
                this.hide();
            };
            this.container.appendChild(btn);
        });

        // Önce görünür yap (Boyutların hesaplanabilmesi için şart)
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        
        // Boyutları al ve konumu hesapla
        const width = 150; // Sabit genişlik üzerinden gidelim risk almayalım
        const height = this.container.offsetHeight || 80;

        let posX = x;
        let posY = y;

        // Ekran sınır kontrolü
        if (x + width > window.innerWidth) posX = window.innerWidth - width - 10;
        if (y + height > window.innerHeight) posY = window.innerHeight - height - 10;

        this.container.style.left = `${posX}px`;
        this.container.style.top = `${posY}px`;
        
        console.log("Panel açıldı:", title, "Konum:", posX, posY);
    }

    public hide() {
        this.container.style.display = 'none';
    }
}
