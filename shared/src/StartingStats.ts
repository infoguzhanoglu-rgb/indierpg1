/**
 * Symge Online - Başlangıç Nitelik Puanları
 */

export interface StartingAttributes {
    str: number;
    int: number;
    dex: number; // AGI (Çeviklik)
    vit: number;
    luk: number;
    availablePoints: number;
}

export const INITIAL_STARTING_ATTRIBUTES: StartingAttributes = {
    str: 2,
    int: 2,
    vit: 2,
    dex: 2, 
    luk: 2,
    // Başlangıçta verilen ekstra serbest puan
    availablePoints: 8 
};
/* 
 Toplam Puan Hesaplaması:
 - Başlangıç Dağıtılmış : 10 (5x2)
 - Başlangıç Serbest    : 8
 - Level Up (1-40)      : 117 (39 x 3)
 TOTAL MAX              : 135 Puan
*/
