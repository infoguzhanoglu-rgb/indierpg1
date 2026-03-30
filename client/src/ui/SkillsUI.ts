import './SkillsUI.css';
import { Skill } from '../skills/BaseSkill';
import { YananDalga, YananDalgaData } from '../skills/YananDalga';
import { SeriAdimlar } from '../skills/SeriAdimlar';

export class SkillsUI {
    private container: HTMLDivElement;
    private tooltip: HTMLDivElement;
    private skillList: Skill[] = [YananDalga, SeriAdimlar];
    private derivedStats: any = null;
    
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'skills-window-container ui-master-panel';
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'skill-tooltip';
        document.body.appendChild(this.tooltip);

        this.render();
        document.body.appendChild(this.container);
        this.initTooltipEvents();
    }

    private render() {
        this.container.innerHTML = `
            <div class="skills-header">
                <span>YETENEKLER</span>
                <button class="skills-close-btn">×</button>
            </div>
            <div class="skills-main-content">
                <div class="skill-section-title">Aktif Yetenekler</div>
                <div class="skills-grid">
                    ${this.skillList.map(skill => `
                        <div class="skill-slot-container">
                            <div class="skill-item-slot ui-sub-panel" 
                                 draggable="true" 
                                 data-id="${skill.id}">
                                <img src="${skill.icon}" class="skill-item-icon">
                            </div>
                            <div class="skill-name-label">${skill.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.container.querySelector('.skills-close-btn')?.addEventListener('click', () => this.hide());
        this.initDragEvents();
    }

    private initDragEvents() {
        const slots = this.container.querySelectorAll('.skill-item-slot');
        slots.forEach(slot => {
            slot.addEventListener('dragstart', (e: any) => {
                const skillId = (e.target as HTMLElement).dataset.id;
                if (skillId) {
                    e.dataTransfer.setData('skillId', skillId);
                    slot.classList.add('dragging');
                    this.hideTooltip();
                }
            });

            slot.addEventListener('dragend', () => {
                slot.classList.remove('dragging');
            });
        });
    }

    private initTooltipEvents() {
        this.container.addEventListener('mouseover', (e) => {
            const slot = (e.target as HTMLElement).closest('.skill-item-slot') as HTMLElement;
            if (slot) {
                const skillId = slot.dataset.id;
                const skill = this.skillList.find(s => s.id === skillId);
                if (skill) {
                    this.showTooltip(skill, e.clientX, e.clientY);
                }
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display === 'block') {
                this.updateTooltipPosition(e.clientX, e.clientY);
            }
        });

        this.container.addEventListener('mouseout', (e) => {
            if ((e.target as HTMLElement).closest('.skill-item-slot')) {
                this.hideTooltip();
            }
        });
    }

    private showTooltip(skill: Skill, x: number, y: number) {
        let extraInfo = '';
        let reqInfo = '';

        if (skill.id === 'yanan_dalga') {
            const data = YananDalgaData[skill.level];
            if (data) {
                const mentalPower = this.derivedStats ? this.derivedStats.mentalPower : 0;
                const calculatedDmg = Math.round(mentalPower * data.damageMultiplier);
                
                extraInfo = `
                    <div class="tooltip-stats" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px; font-size:10px; color:#ffd700; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">
                        <span>MP: <span style="color:white;">${data.mpCost}</span></span>
                        <span>CD: <span style="color:white;">${data.cooldown}s</span></span>
                        <span>Zihinsel Hasar: <span style="color:#00ff00;">${calculatedDmg}</span></span>
                        <span>Menzil: <span style="color:white;">${data.range}m</span></span>
                    </div>
                `;
            }

            // Bir sonraki seviye gereksinimleri
            if (skill.level < skill.maxLevel) {
                const nextData = YananDalgaData[skill.level + 1];
                if (nextData) {
                    reqInfo = `
                        <div class="tooltip-reqs" style="margin-top:8px; font-size:10px; color:#ff4444; border-top:1px dashed rgba(255,255,255,0.1); padding-top:5px;">
                            Gereksinimler (Lv.${skill.level + 1}):<br>
                            • Karakter Seviyesi: ${nextData.reqLevel}<br>
                            • SP Gereksinimi: ${nextData.spCost}
                        </div>
                    `;
                }
            }
        }

        this.tooltip.innerHTML = `
            <div class="tooltip-name" style="color:#ffd700; font-weight:bold; font-size:13px; margin-bottom:5px; border-bottom:1px solid rgba(255,215,0,0.2); padding-bottom:3px;">
                ${skill.name} <span style="font-size:10px; color:#4db8ff; float:right;">Lv.${skill.level}</span>
            </div>
            <div class="tooltip-desc" style="color:#eee; font-size:11px; line-height:1.4;">${skill.description}</div>
            ${extraInfo}
            ${reqInfo}
            <div class="tooltip-meta" style="margin-top:8px; font-size:10px; color:#4db8ff; font-style:italic;">Sürükleyerek Skill Bar'a yerleştirin.</div>
        `;
        this.tooltip.style.display = 'block';
        this.updateTooltipPosition(x, y);
    }

    private updateTooltipPosition(x: number, y: number) {
        this.tooltip.style.left = `${x + 15}px`;
        this.tooltip.style.top = `${y + 15}px`;
    }

    private hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    public toggle() {
        const isVisible = this.container.style.display === 'flex';
        isVisible ? this.hide() : this.show();
    }

    public show() {
        this.container.style.display = 'flex';
    }

    public hide() {
        this.container.style.display = 'none';
        this.hideTooltip();
    }

    public updateDerivedStats(stats: any) {
        this.derivedStats = stats;
        this.render(); // Re-render to update any static text if needed
    }
}
