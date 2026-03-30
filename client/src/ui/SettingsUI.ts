import './SettingsUI.css';
import { SoundManager } from '../systems/SoundManager';

export class SettingsUI {
    private container: HTMLDivElement;
    private contentEl: HTMLDivElement;
    private currentTab: string = 'audio';
    
    // Global erişilebilir ayar durumları
    public static settings = {
        disableMessaging: false
    };

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'settings-container ui-master-panel';
        this.container.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'settings-header';
        header.innerHTML = `
            <span>AYARLAR</span>
            <button class="settings-close-btn">×</button>
        `;
        header.querySelector('.settings-close-btn')?.addEventListener('click', () => this.hide());
        this.container.appendChild(header);

        const tabBar = document.createElement('div');
        tabBar.className = 'settings-tabs';
        tabBar.innerHTML = `
            <div class="settings-tab active" data-tab="audio">Ses Ayarları</div>
            <div class="settings-tab" data-tab="game">Oyun Ayarları</div>
        `;
        this.container.appendChild(tabBar);

        this.contentEl = document.createElement('div');
        this.contentEl.className = 'settings-content';
        this.container.appendChild(this.contentEl);

        document.body.appendChild(this.container);

        tabBar.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabBar.querySelector('.active')?.classList.remove('active');
                tab.classList.add('active');
                this.switchTab(tab.getAttribute('data-tab') || 'audio');
            });
        });

        this.renderAudioSettings();
    }

    private switchTab(tabId: string) {
        this.currentTab = tabId;
        this.contentEl.innerHTML = '';
        if (tabId === 'audio') this.renderAudioSettings();
        else if (tabId === 'game') this.renderGameSettings();
    }

    private renderAudioSettings() {
        const div = document.createElement('div');
        div.className = 'settings-group';
        div.innerHTML = `
            <div class="settings-row">
                <label>Genel Ses Seviyesi</label>
                <input type="range" id="main-vol" min="0" max="100" value="70">
            </div>
            <div class="settings-row">
                <label>Yağmur Ses Seviyesi</label>
                <input type="range" id="rain-vol" min="0" max="100" value="40">
            </div>
        `;
        this.contentEl.appendChild(div);

        const mainVol = div.querySelector('#main-vol') as HTMLInputElement;
        mainVol.addEventListener('input', () => SoundManager.instance.setVolume(Number(mainVol.value) / 100));

        const rainVol = div.querySelector('#rain-vol') as HTMLInputElement;
        rainVol.addEventListener('input', () => (SoundManager.instance as any).fadeRainVolume?.(Number(rainVol.value) / 100, 100));
    }

    private renderGameSettings() {
        const div = document.createElement('div');
        div.className = 'settings-group';
        div.innerHTML = `
            <div class="settings-row">
                <label>Mesaj Gönderimini Kapat</label>
                <input type="checkbox" id="disable-msg" ${SettingsUI.settings.disableMessaging ? 'checked' : ''}>
            </div>
        `;
        this.contentEl.appendChild(div);

        const disableMsg = div.querySelector('#disable-msg') as HTMLInputElement;
        disableMsg.addEventListener('change', () => {
            SettingsUI.settings.disableMessaging = disableMsg.checked;
            console.log("Mesaj gönderimi:", SettingsUI.settings.disableMessaging ? "Kapalı" : "Açık");
        });
    }

    public toggle() {
        if (this.container.style.display === 'none') this.show();
        else this.hide();
    }

    public show() {
        this.container.style.display = 'flex';
        // Tabı yenile ki checkbox durumu güncel kals.
        this.switchTab(this.currentTab);
    }

    public hide() {
        this.container.style.display = 'none';
    }
}
