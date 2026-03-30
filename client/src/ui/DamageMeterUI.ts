import './DamageMeterUI.css';

export class DamageMeterUI {
    private container: HTMLDivElement;
    private title: HTMLDivElement;
    private list: HTMLDivElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'damage-meter-panel';
        this.container.className = 'ui-master-panel';

        this.title = document.createElement('div');
        this.title.className = 'dm-header';
        this.title.innerHTML = '<span>Hasar Tablosu (DPS)</span>';

        this.list = document.createElement('div');
        this.list.className = 'dm-list ui-sub-panel';

        this.container.appendChild(this.title);
        this.container.appendChild(this.list);
        document.body.appendChild(this.container);
        
        this.container.style.display = 'none';
    }

    public update(data: {username: string, amount: number}[]) {
        if (data.length === 0) {
            this.hide();
            return;
        }

        this.container.style.display = 'flex';
        this.list.innerHTML = '';
        
        const maxDmg = data.length > 0 ? data[0].amount : 1;
        const colors = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#1d3557'];

        data.forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = 'dm-row';
            
            const percentWidth = (entry.amount / maxDmg) * 100;
            
            const bar = document.createElement('div');
            bar.className = 'dm-bar';
            bar.style.width = `${percentWidth}%`;
            bar.style.backgroundColor = colors[index % colors.length];

            const content = document.createElement('div');
            content.className = 'dm-content';
            
            content.innerHTML = `<span>${index+1}. ${entry.username}</span> <span>${this.formatNumber(entry.amount)}</span>`;

            row.appendChild(bar);
            row.appendChild(content);
            this.list.appendChild(row);
        });
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    public hide() {
        this.container.style.display = 'none';
    }
}
