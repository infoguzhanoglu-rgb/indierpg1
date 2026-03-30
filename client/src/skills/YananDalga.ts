import { Skill } from './BaseSkill';

import { YANAN_DALGA_DATA } from '../../../shared/src/skills/SkillConfigs';
export const YananDalgaData = YANAN_DALGA_DATA; // PRO: Geriye dönük uyumluluk ve Tek Kaynak Senkronizasyonu

export const YananDalga: Skill = {
    id: 'yanan_dalga',
    name: 'Yanan Dalga',
    description: 'Alevlerle güçlendirilmiş bir dalga göndererek hedefe zihinsel temelli hasar verir.',
    icon: '/textures/skills/yanan_dalga_1.jpg',
    level: 1,
    maxLevel: 6
};
