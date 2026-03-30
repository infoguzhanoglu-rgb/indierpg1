import { NoticeUI } from '../ui/NoticeUI';

export class NoticeSystem {
    private ui: NoticeUI;

    constructor() {
        this.ui = new NoticeUI();
    }

    public set onDeathRespawn(callback: () => void) {
        this.ui.onDeathRespawn = callback;
    }

    public showWelcomeMessage(username: string) {
        this.ui.show(`Hoş geldin ${username}! Symge Online dünyasına katıldın.`, 7000);
    }

    public showRainStart() { this.ui.show("Gökyüzü kararıyor... Şiddetli bir fırtına yaklaşıyor!", 6000); }
    public showRainStop() { this.ui.show("Fırtına dindi, güneş yüzünü göstermeye başladı.", 6000); }
    public showCustom(message: string, duration?: number) { this.ui.show(message, duration); }

    public showDeathNotice(attackerName: string) {
        this.ui.showDeathNotice(attackerName);
    }
}
