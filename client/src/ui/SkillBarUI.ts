import './SkillBarUI.css';
import { getSkillById } from '../skills/SkillRegistry';
import { YananDalgaData } from '../skills/YananDalga';

export class SkillBarUI {
    private container: HTMLDivElement;
    private xpBarFill: HTMLDivElement;
    private xpText: HTMLDivElement;
    private skillPointsBox: HTMLDivElement;
    private slots: HTMLDivElement[] = [];
    private slotSkills: (string | null)[] = new Array(10).fill(null);
    private skillCooldowns: Map<number, { endTime: number, timer: number | null }> = new Map();
    private derivedStats: any = null;
    
    private onSkillUse?: (skillId: string) => void;
    private tooltip: HTMLDivElement;

    constructor(onSkillUse: (skillId: string) => void) {
        this.onSkillUse = onSkillUse;
        
        this.container = document.createElement('div');
        this.container.className = 'skill-bar-container ui-master-panel';
        this.container.style.display = 'none';

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'skill-tooltip';
        this.tooltip.style.position = 'fixed';
        this.tooltip.style.zIndex = '3000';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);

        const header = document.createElement('div');
        header.className = 'sb-header';

        const xpBarContainer = document.createElement('div');
        xpBarContainer.className = 'xp-bar-container ui-sub-panel';
        this.xpBarFill = document.createElement('div');
        this.xpBarFill.className = 'xp-bar-fill';
        this.xpText = document.createElement('div');
        this.xpText.className = 'xp-text';
        this.xpText.innerText = 'XP: 0 / 100';
        xpBarContainer.appendChild(this.xpBarFill);
        xpBarContainer.appendChild(this.xpText);

        this.skillPointsBox = document.createElement('div');
        this.skillPointsBox.className = 'skill-points-box ui-sub-panel';
        this.skillPointsBox.innerText = 'SP: 0';

        header.appendChild(xpBarContainer);
        header.appendChild(this.skillPointsBox);
        this.container.appendChild(header);

        const slotsWrapper = document.createElement('div');
        slotsWrapper.className = 'skill-slots-wrapper';

        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        keys.forEach((key, index) => {
            const slot = document.createElement('div');
            slot.className = 'skill-slot ui-sub-panel';
            slot.dataset.index = index.toString();
            slot.innerHTML = `
                <div class="skill-icon"></div>
                <div class="skill-cooldown-overlay"></div>
                <div class="skill-cooldown-timer"></div>
                <div class="skill-key">${key}</div>
            `;
            
            slot.onclick = (e) => {
                e.stopPropagation();
                this.triggerSkill(index);
            };

            slot.addEventListener('dragstart', (e: any) => {
                const skillId = this.slotSkills[index];
                if (skillId && !this.isSlotOnCooldown(index)) {
                    e.dataTransfer.setData('skillId', skillId);
                    e.dataTransfer.setData('fromSlotIndex', index.toString());
                    slot.classList.add('dragging');
                    this.tooltip.style.display = 'none';
                } else {
                    e.preventDefault();
                }
            });

            slot.addEventListener('drop', (e: any) => {
                e.preventDefault();
                const skillId = e.dataTransfer.getData('skillId');
                const fromSlotIndexStr = e.dataTransfer.getData('fromSlotIndex');
                if (skillId) {
                    if (fromSlotIndexStr !== "" && fromSlotIndexStr !== undefined) {
                        this.swapSkills(parseInt(fromSlotIndexStr), index);
                    } else {
                        this.setSkillToSlot(index, skillId);
                    }
                }
            });

            slot.addEventListener('dragover', (e) => e.preventDefault());

            slot.addEventListener('mouseenter', (e) => {
                const skillId = this.slotSkills[index];
                if (skillId) {
                    const skill = getSkillById(skillId);
                    if (skill) this.showTooltip(skill, e.clientX, e.clientY);
                }
            });
            slot.addEventListener('mouseleave', () => this.tooltip.style.display = 'none');

            slotsWrapper.appendChild(slot);
            this.slots.push(slot);
        });

        this.container.appendChild(slotsWrapper);
        document.body.appendChild(this.container);
        this.setupKeyboardEvents();
        this.initGlobalDropHandler();
    }

    private initGlobalDropHandler() {
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e: any) => {
            const fromSlotIndexStr = e.dataTransfer.getData('fromSlotIndex');
            if (fromSlotIndexStr !== "" && fromSlotIndexStr !== undefined) {
                const isOverSlot = (e.target as HTMLElement).closest('.skill-slot');
                if (!isOverSlot) {
                    this.clearSlot(parseInt(fromSlotIndexStr));
                }
            }
        });
    }

    private isSlotOnCooldown(index: number): boolean {
        const cd = this.skillCooldowns.get(index);
        return cd ? Date.now() < cd.endTime : false;
    }

    public startCooldown(skillId: string, durationSeconds: number) {
        this.slotSkills.forEach((id, index) => {
            if (id === skillId) {
                this.startSlotCooldown(index, durationSeconds);
            }
        });
    }

    private startSlotCooldown(index: number, durationSeconds: number) {
        const slot = this.slots[index];
        const timerEl = slot.querySelector('.skill-cooldown-timer') as HTMLDivElement;
        const endTime = Date.now() + (durationSeconds * 1000);

        const oldCd = this.skillCooldowns.get(index);
        if (oldCd?.timer) clearInterval(oldCd.timer);

        slot.classList.add('on-cooldown');
        
        const updateTimer = () => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (remaining > 0) {
                timerEl.innerText = remaining.toString();
            } else {
                this.stopSlotCooldown(index);
            }
        };

        const timer = window.setInterval(updateTimer, 500);
        this.skillCooldowns.set(index, { endTime, timer });
        updateTimer();
    }

    private stopSlotCooldown(index: number) {
        const slot = this.slots[index];
        const cd = this.skillCooldowns.get(index);
        if (cd?.timer) clearInterval(cd.timer);
        
        slot.classList.remove('on-cooldown');
        this.skillCooldowns.delete(index);
    }

    private triggerSkill(index: number) {
        if (this.isSlotOnCooldown(index)) return;

        const slot = this.slots[index];
        const skillId = this.slotSkills[index];
        
        if (skillId) {
            slot.classList.add('active');
            setTimeout(() => slot.classList.remove('active'), 150);
            this.onSkillUse?.(skillId);
        }
    }

    private swapSkills(fromIdx: number, toIdx: number) {
        const temp = this.slotSkills[toIdx];
        this.slotSkills[toIdx] = this.slotSkills[fromIdx];
        this.slotSkills[fromIdx] = temp;
        this.refreshSlotVisual(fromIdx);
        this.refreshSlotVisual(toIdx);
    }

    private clearSlot(index: number) {
        this.slotSkills[index] = null;
        this.refreshSlotVisual(index);
    }

    private setSkillToSlot(index: number, skillId: string) {
        this.slotSkills[index] = skillId;
        this.refreshSlotVisual(index);
    }

    private refreshSlotVisual(index: number) {
        const skillId = this.slotSkills[index];
        const slot = this.slots[index];
        const iconDiv = slot.querySelector('.skill-icon') as HTMLDivElement;
        if (skillId) {
            const skill = getSkillById(skillId);
            if (skill && iconDiv) {
                iconDiv.style.backgroundImage = `url(${skill.icon})`;
                iconDiv.style.opacity = '1';
                slot.draggable = true;
            }
        } else {
            if (iconDiv) {
                iconDiv.style.backgroundImage = 'none';
                iconDiv.style.opacity = '0';
                slot.draggable = false;
            }
        }
    }

    private showTooltip(skill: any, x: number, y: number) {
        let extraInfo = '';
        let reqInfo = '';
        if (skill.id === 'yanan_dalga') {
            const data = YananDalgaData[skill.level];
            if (data) {
                const mentalPower = this.derivedStats ? this.derivedStats.mentalPower : 0;
                const calculatedDmg = Math.round(mentalPower * data.damageMultiplier);

                extraInfo = `<div class="tooltip-stats" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px; font-size:10px; color:#ffd700; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">
                    <span>MP: <span style="color:white;">${data.mpCost}</span></span>
                    <span>CD: <span style="color:white;">${data.cooldown}s</span></span>
                    <span>Zihinsel Hasar: <span style="color:#00ff00;">${calculatedDmg}</span></span>
                    <span>Menzil: <span style="color:white;">${data.range}m</span></span>
                </div>`;
            }
            if (skill.level < skill.maxLevel) {
                const nextData = YananDalgaData[skill.level + 1];
                if (nextData) {
                    reqInfo = `<div class="tooltip-reqs" style="margin-top:8px; font-size:10px; color:#ff4444; border-top:1px dashed rgba(255,255,255,0.1); padding-top:5px;">Gereksinimler (Lv.${skill.level + 1}):<br>• Karakter Seviyesi: ${nextData.reqLevel}<br>• SP Gereksinimi: ${nextData.spCost}</div>`;
                }
            }
        }
        this.tooltip.innerHTML = `<div class="tooltip-name" style="color:#ffd700; font-weight:bold; font-size:13px; margin-bottom:5px; border-bottom:1px solid rgba(255,215,0,0.2); padding-bottom:3px;">${skill.name} <span style="font-size:10px; color:#4db8ff; float:right;">Lv.${skill.level}</span></div><div class="tooltip-desc" style="color:#eee; font-size:11px; line-height:1.4;">${skill.description}</div>${extraInfo}${reqInfo}`;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${x + 15}px`;
        this.tooltip.style.top = `${y - 80}px`;
    }

    private setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            const key = e.key;
            if (key >= '1' && key <= '9') this.triggerSkill(parseInt(key) - 1);
            else if (key === '0') this.triggerSkill(9);
        });
    }

    public updateXP(current: number, max: number) {
        const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0;
        this.xpBarFill.style.width = `${percent}%`;
        this.xpText.innerText = `XP: ${Math.floor(current)} / ${max}`;
    }

    public updateSkillPoints(points: number) {
        this.skillPointsBox.innerText = `SP: ${points}`;
        if (points > 0) this.skillPointsBox.classList.add('has-points');
        else this.skillPointsBox.classList.remove('has-points');
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }

    public updateDerivedStats(stats: any) {
        this.derivedStats = stats;
    }
}
