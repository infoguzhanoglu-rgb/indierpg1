import { Skill } from './BaseSkill';
import { YananDalga } from './YananDalga';
import { SeriAdimlar } from './SeriAdimlar';

export const SKILL_REGISTRY: { [key: string]: Skill } = {
    [YananDalga.id]: YananDalga,
    [SeriAdimlar.id]: SeriAdimlar
};

export function getSkillById(id: string): Skill | null {
    return SKILL_REGISTRY[id] || null;
}
