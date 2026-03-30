import './CharacterStatsUI.css';
import { MAX_ATTRIBUTE_POINT, LEVEL_UP_SCALING } from '../../../shared/src/LevelScaling';
import { STAT_BONUSES } from '../../../shared/src/StatBonuses';
import { INITIAL_BASE_STATS, REGEN_CONFIG } from '../../../shared/src/BaseStats';

export interface AttributeData {
    str: number;
    int: number;
    vit: number;
    dex: number;
    luk: number;
    availablePoints: number;
}

export class CharacterStatsUI {
    private container: HTMLDivElement;
    private onConfirm?: (changes: Partial<AttributeData>) => void;

    private baseAttributes: AttributeData | null = null;
    private pendingAttributes: AttributeData | null = null;
    private baseDerived: any = null;
    private pendingDerived: any = null;
    private currentLevel: number = 1;

    constructor(onConfirm: (changes: Partial<AttributeData>) => void) {
        this.onConfirm = onConfirm;
        this.container = document.createElement('div');
        this.container.className = 'stats-panel-container ui-master-panel';
        this.container.style.display = 'none';
        this.initStructure();
        document.body.appendChild(this.container);
        this.setupKeyboard();
    }

    private checkChanges = (): boolean => {
        if (!this.pendingAttributes || !this.baseAttributes) return false;
        return (this.pendingAttributes.str !== this.baseAttributes.str ||
            this.pendingAttributes.int !== this.baseAttributes.int ||
            this.pendingAttributes.vit !== this.baseAttributes.vit ||
            this.pendingAttributes.dex !== this.baseAttributes.dex ||
            this.pendingAttributes.luk !== this.baseAttributes.luk);
    };

    private initStructure() {
        this.container.innerHTML = `
            <div class="stats-header">
                <span>KARAKTER STATİSTİKLERİ</span>
                <button class="stats-close-btn">×</button>
            </div>
            <div class="stats-main-content">
                <div class="stats-col attributes-col">
                    <div class="stats-section-title">Temel Nitelikler (Max: ${MAX_ATTRIBUTE_POINT})</div>
                    ${['str', 'int', 'vit', 'dex', 'luk'].map(id => this.createAttrHTML(id)).join('')}
                    <div class="available-points-box ui-sub-panel">
                        Harcanabilir Puan: <span id="sp-val">0</span>
                    </div>
                </div>
                <div class="stats-col derived-col">
                    <div class="stats-section-title">Detaylı İstatistikler</div>
                    <div class="derived-stats-grid" id="derived-grid"></div>
                </div>
            </div>
            <div class="stats-footer">
                <button class="stats-btn cancel-btn" id="stats-cancel" disabled>İptal</button>
                <button class="stats-btn confirm-btn" id="stats-confirm" disabled>Onayla</button>
            </div>
        `;

        this.container.querySelector('.stats-close-btn')?.addEventListener('click', () => this.hide());
        this.container.querySelectorAll('.attr-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const attr = btn.getAttribute('data-attr') as keyof AttributeData;
                this.modifyAttribute(attr, btn.classList.contains('plus') ? 1 : -1);
            });
        });

        this.container.querySelector('#stats-confirm')?.addEventListener('click', () => {
            if (this.checkChanges()) {
                const changes: any = {};
                ['str', 'int', 'vit', 'dex', 'luk'].forEach(k => {
                    const key = k as keyof AttributeData;
                    if (this.pendingAttributes![key] > this.baseAttributes![key]) {
                        changes[key] = this.pendingAttributes![key] - this.baseAttributes![key];
                    }
                });
                this.onConfirm?.(changes);
            }
        });
        this.container.querySelector('#stats-cancel')?.addEventListener('click', () => this.resetPending());
    }

    private createAttrHTML(id: string) {
        const labels: any = { str: 'STR', int: 'INT', vit: 'VIT', dex: 'AGI', luk: 'LUK' };
        return `
            <div class="attr-block">
                <div class="attr-info">
                    <span class="attr-name">${labels[id]}</span>
                    <span class="attr-values" id="val-${id}">0</span>
                </div>
                <div class="attr-bar-wrapper">
                    <button class="attr-btn minus" data-attr="${id}">-</button>
                    <div class="attr-progress-bg ui-sub-panel">
                        <div class="attr-progress-fill" id="fill-${id}"></div>
                    </div>
                    <button class="attr-btn plus" data-attr="${id}">+</button>
                </div>
            </div>
        `;
    }

    private modifyAttribute(attr: keyof AttributeData, amount: number) {
        if (!this.pendingAttributes || !this.baseAttributes) return;
        if (amount > 0 && (this.pendingAttributes.availablePoints <= 0 || (this.pendingAttributes as any)[attr] >= MAX_ATTRIBUTE_POINT)) return;
        if (amount < 0 && (this.pendingAttributes as any)[attr] <= (this.baseAttributes as any)[attr]) return;

        (this.pendingAttributes as any)[attr] += amount;
        this.pendingAttributes.availablePoints -= amount;
        this.calculatePendingDerived();
        this.refreshUI();
    }

    private calculatePendingDerived() {
        if (!this.pendingAttributes) return;
        const attr = this.pendingAttributes;
        const base = INITIAL_BASE_STATS;
        const bonus = STAT_BONUSES;
        const scaling = LEVEL_UP_SCALING;
        const config = REGEN_CONFIG;
        const lvGains = this.currentLevel - 1;

        this.pendingDerived = {
            physicalPower: base.physicalPower + (lvGains * scaling.physicalPower) + (attr.str * bonus.STR.physicalPower),
            physicalDefense: base.physicalDefense + (lvGains * scaling.physicalDefense) + (attr.str * bonus.STR.physicalDefense) + (attr.vit * bonus.VIT.physicalDefense),
            mentalPower: base.mentalPower + (lvGains * scaling.mentalPower) + (attr.int * bonus.INT.mentalPower),
            mentalDefense: base.mentalDefense + (lvGains * scaling.mentalDefense) + (attr.vit * bonus.VIT.mentalDefense),
            hp: base.hp + (lvGains * scaling.hp) + (attr.vit * bonus.VIT.hp),
            mp: base.mp + (lvGains * scaling.mp) + (attr.int * bonus.INT.mp),
            critRate: base.critRate + (attr.luk * bonus.LUK.critRate),
            dodgeRate: base.dodgeRate + (attr.dex * bonus.AGI.dodgeRate),
            attackSpeed: base.attackSpeed + (attr.dex * bonus.AGI.attackSpeed),
            moveSpeed: base.moveSpeed + (attr.dex * bonus.AGI.moveSpeed),
            // Regen Hesaplamaları
            hpRegen: config.HP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (attr.vit * config.VIT_BONUS_PERCENT),
            mpRegen: config.MP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (attr.int * config.INT_BONUS_PERCENT)
        };
    }

    private refreshUI() {
        if (!this.pendingAttributes || !this.baseAttributes) return;
        const spEl = document.getElementById('sp-val');
        if (spEl) spEl.innerText = this.pendingAttributes.availablePoints.toString();

        ['str', 'int', 'vit', 'dex', 'luk'].forEach(id => {
            const key = id as keyof AttributeData;
            const cur = (this.pendingAttributes as any)[key];
            const old = (this.baseAttributes as any)[key];
            const modified = cur > old;

            const valEl = document.getElementById(`val-${id}`);
            if (valEl) valEl.innerHTML = modified ? `${old} <span class="arrow">→</span> <span class="mod-val">${cur}</span>` : `${old}`;

            const fillEl = document.getElementById(`fill-${id}`);
            if (fillEl) fillEl.style.width = `${(cur / MAX_ATTRIBUTE_POINT) * 100}%`;

            const btnMinus = this.container.querySelector(`.minus[data-attr="${id}"]`) as HTMLButtonElement;
            if (btnMinus) btnMinus.disabled = !modified;

            const btnPlus = this.container.querySelector(`.plus[data-attr="${id}"]`) as HTMLButtonElement;
            if (btnPlus) btnPlus.disabled = this.pendingAttributes!.availablePoints <= 0 || cur >= MAX_ATTRIBUTE_POINT;
        });

        const grid = document.getElementById('derived-grid');
        if (grid) {
            grid.innerHTML = '';
            const stats = [
                { label: 'Fiziksel Hasar', key: 'physicalPower' },
                { label: 'Zihinsel Hasar', key: 'mentalPower' },
                { label: 'Fiziksel Sav.', key: 'physicalDefense' },
                { label: 'Zihinsel Sav.', key: 'mentalDefense' },
                { label: 'Maksimum HP', key: 'hp' },
                { label: 'Maksimum MP', key: 'mp' },
                { label: 'HP Yenilenme', key: 'hpRegen', unit: '%' },
                { label: 'MP Yenilenme', key: 'mpRegen', unit: '%' },
                { label: 'Kritik Şansı', key: 'critRate', unit: '%' },
                { label: 'Kaçınma', key: 'dodgeRate', unit: '%' },
                { label: 'Hareket Hızı', key: 'moveSpeed', unit: '%' }
            ];

            stats.forEach(s => {
                const cur = this.pendingDerived[s.key] || 0;
                const old = this.baseDerived[s.key] || 0;
                const modified = Math.abs(cur - old) > 0.0001;
                const row = document.createElement('div');
                row.className = 'derived-row';

                const valStr = (val: number) => val.toFixed(s.unit === '%' ? 2 : 0);

                row.innerHTML = `
                    <span class="label">${s.label}</span>
                    <span class="value">${valStr(old)}${s.unit || ''} ${modified ? `<span class="arrow">→</span> <span class="mod-val">${valStr(cur)}${s.unit || ''}</span>` : ''}</span>
                `;
                grid.appendChild(row);
            });
        }

        const hasChanges = this.checkChanges();
        const confirmBtn = document.getElementById('stats-confirm') as HTMLButtonElement;
        const cancelBtn = document.getElementById('stats-cancel') as HTMLButtonElement;
        if (confirmBtn) confirmBtn.disabled = !hasChanges;
        if (cancelBtn) cancelBtn.disabled = !hasChanges;
    }

    public update(data: AttributeData, derived: any, level: number) {
        this.baseAttributes = JSON.parse(JSON.stringify(data));

        // Derived verilerine regenleri de ekle (Senkronizasyon için)
        const lvGains = level - 1;
        const config = REGEN_CONFIG;
        this.baseDerived = {
            ...derived,
            hpRegen: config.HP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (data.vit * config.VIT_BONUS_PERCENT),
            mpRegen: config.MP_BASE_PERCENT + (lvGains * config.LEVEL_BONUS_PERCENT) + (data.int * config.INT_BONUS_PERCENT)
        };

        this.currentLevel = level;

        if (this.container.style.display === 'none' || !this.checkChanges()) {
            this.pendingAttributes = JSON.parse(JSON.stringify(data));
            this.calculatePendingDerived();
            if (this.container.style.display === 'flex') this.refreshUI();
        }
    }

    private resetPending() {
        if (this.baseAttributes) {
            this.pendingAttributes = JSON.parse(JSON.stringify(this.baseAttributes));
            this.calculatePendingDerived();
            this.refreshUI();
        }
    }

    private setupKeyboard() {
        window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'c' && document.activeElement?.tagName !== 'INPUT') this.toggle(); });
    }

    public toggle() { this.container.style.display === 'none' ? this.show() : this.hide(); }
    public show() { this.container.style.display = 'flex'; this.refreshUI(); }
    public hide() { this.container.style.display = 'none'; }
}
