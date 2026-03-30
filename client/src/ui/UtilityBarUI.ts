import './UtilityBarUI.css';
import { SettingsUI } from './SettingsUI';
import { CharacterStatsUI } from './CharacterStatsUI';
import { SkillsUI } from './SkillsUI';

export class UtilityBarUI {
    private container: HTMLDivElement;
    private settingsUI: SettingsUI;
    private statsUI: CharacterStatsUI;
    private skillsUI: SkillsUI;
    private charSlot: HTMLDivElement | null = null;

    constructor(settingsUI: SettingsUI, statsUI: CharacterStatsUI, skillsUI: SkillsUI) {
        this.settingsUI = settingsUI;
        this.statsUI = statsUI;
        this.skillsUI = skillsUI;
        
        this.container = document.createElement('div');
        this.container.className = 'utility-bar-container ui-master-panel';
        this.container.style.display = 'none';

        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'utility-slot ui-sub-panel';
            
            if (i === 0) {
                slot.innerHTML = `<div class="utility-icon">⚙️</div>`;
                slot.title = "Ayarlar";
                slot.onclick = () => this.settingsUI.toggle();
            } else if (i === 1) {
                this.charSlot = slot;
                slot.innerHTML = `<div class="utility-icon">👤</div>`;
                slot.title = "Karakter (C)";
                slot.onclick = () => this.statsUI.toggle();
            } else if (i === 2) {
                slot.innerHTML = `<div class="utility-icon">📜</div>`;
                slot.title = "Yetenekler (K)";
                slot.onclick = () => this.skillsUI.toggle();
            } else {
                slot.innerHTML = `<div class="utility-icon"></div>`;
            }

            this.container.appendChild(slot);
        }

        document.body.appendChild(this.container);
    }

    public updateNotification(hasPoints: boolean) {
        if (!this.charSlot) return;
        if (hasPoints) {
            this.charSlot.classList.add('has-notification');
        } else {
            this.charSlot.classList.remove('has-notification');
        }
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }
}
