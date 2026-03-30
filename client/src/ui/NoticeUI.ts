import './NoticeUI.css';

export class NoticeUI {
    private container: HTMLDivElement;
    public onDeathRespawn?: () => void; // PRO: Otomatik doğma tetikleyicisi

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notice-container';
        document.body.appendChild(this.container);
    }

    public show(message: string, duration: number = 5000) {
        const notice = this.createNoticeElement(message);
        this.container.appendChild(notice);

        requestAnimationFrame(() => notice.classList.add('active'));

        window.setTimeout(() => {
            notice.classList.remove('active');
            setTimeout(() => { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 600);
        }, duration);
    }

    /**
     * ÖLÜM ÖZEL DUYURUSU: 5 Saniye sayar ve callback tetikler. (STANDART PANEL TASARIMI)
     */
    public showDeathNotice(attackerName: string) {
        const message = `${attackerName} tarafından öldürüldün!`;
        const notice = this.createNoticeElement(message);
        this.container.appendChild(notice);

        requestAnimationFrame(() => notice.classList.add('active'));

        let countdown = 5;
        const interval = setInterval(() => {
            countdown--;
            notice.innerText = `${message} Şehre ışınlanıyor: ${countdown}`;

            if (countdown <= 0) {
                clearInterval(interval);
                notice.classList.remove('active');
                setTimeout(() => { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 600);
                
                if (this.onDeathRespawn) this.onDeathRespawn();
            }
        }, 1000);

        notice.innerText = `${message} Şehre ışınlanıyor: ${countdown}`;
    }

    private createNoticeElement(text: string): HTMLDivElement {
        const notice = document.createElement('div');
        notice.className = 'notice-bar ui-sub-panel'; // PRO: Panel stili entegre
        notice.innerText = text;
        return notice;
    }
}
