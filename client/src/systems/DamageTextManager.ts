import * as THREE from 'three';

export class DamageTextManager {
    private scene: THREE.Scene;
    private activeTexts: { mesh: THREE.Sprite, life: number, velocity: THREE.Vector3, targetId: string }[] = [];
    private readonly MAX_LIFE = 1.2; // saniye
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public show(position: THREE.Vector3, amount: number, type: string, targetId: string) {
        const canvas = document.createElement('canvas');
        // PRO: Çözünürlüğü iki katına çıkar (Daha net yazılar)
        canvas.width = 512; 
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Montserrat-Bold Stili Stil Belirleme
        let color = '#ff0000'; // Klasik MMO Kırmızısı
        let fontSize = 'bold italic 100px Montserrat-Bold, sans-serif';
        let text = amount.toString();
        let isCrit = false;

        switch (type) {
            case 'CRIT':
                color = '#ffcc00'; // Altın Sarısı
                fontSize = 'bold italic 122px Montserrat-Bold, sans-serif';
                isCrit = true;
                break;
            case 'DODGE':
                color = '#ffffff';
                fontSize = 'italic 76px Montserrat-Bold, sans-serif';
                text = 'Dodge';
                break;
            case 'MISS':
                color = '#aaaaaa';
                fontSize = 'italic 98px Montserrat-Bold, sans-serif';
                text = 'Miss';
                break;
        }

        ctx.font = fontSize;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Silkroad Tarzı Kalın Dış Çizgi (Stroke)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10; // Đncelttik (14 -> 10)
        ctx.strokeText(text, 256, 128);
        
        // İç Dolgu
        ctx.fillStyle = color;
        ctx.fillText(text, 256, 128);

        if (isCrit) {
            // "Critical" alt yazısı
            ctx.font = 'bold italic 44px Montserrat-Bold, sans-serif';
            ctx.strokeText('Critical', 256, 205);
            ctx.fillStyle = '#ff6600';
            ctx.fillText('Critical', 256, 205);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false,
            depthWrite: false,
            opacity: 0.85 // Başlangıçta hafif saydam
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.renderOrder = 9999; 

        // Silkroad Döngüsel Sıralama (Cyclic Stacking): 4 slota bölünmüş dikey sıra
        const activeCount = this.activeTexts.filter(t => t.targetId === targetId).length;
        const slot = activeCount % 4; // 0, 1, 2, 3 slotları
        const stackOffset = slot * 0.7; // Her yazı için dikey boşluk

        const startPos = position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.2, // Çok hafif yatay oynama (Hiza bozulmasın diye minimize edildi)
            2.8 + stackOffset, // Dikey olarak sıraya girer (3.4 -> 2.8: Name Tag üstü hiza)
            (Math.random() - 0.5) * 0.2
        ));
        
        sprite.position.copy(startPos);
        sprite.scale.set(0.1, 0.1, 0.1); 
        
        this.scene.add(sprite);
        
        // Yatay hızı minimize ettik, dikey hıza odaklandık (Hizalı Rise)
        this.activeTexts.push({
            mesh: sprite,
            life: this.MAX_LIFE,
            velocity: new THREE.Vector3(0, 1.8, 0), // Daha stabil ve dikey uçuş
            targetId: targetId 
        });
    }

    public update(delta: number) {
        for (let i = this.activeTexts.length - 1; i >= 0; i--) {
            const data = this.activeTexts[i];
            const elapsed = this.MAX_LIFE - data.life;
            data.life -= delta;

            if (data.life <= 0) {
                this.scene.remove(data.mesh);
                data.mesh.material.map?.dispose();
                data.mesh.material.dispose();
                this.activeTexts.splice(i, 1);
            } else {
                // 1. ADIM: İvme ve Yerçekimi (Fiziksel Yay Çizme)
                data.mesh.position.addScaledVector(data.velocity, delta);
                data.velocity.y -= delta * 3.5; // Yerçekimi etkisi (Yere doğru kavis)
                data.velocity.x *= 0.96; // Sürtünme

                // 2. ADIM: Pop-up ve Ölçeklendirme (Silkroad Impact)
                // İlk 0.15 saniyede hızlıca büyü, sonra yavaşça küçül
                let scaleFactor = 1.0;
                if (elapsed < 0.15) {
                    scaleFactor = (elapsed / 0.15) * 1.5; // İlk patlama %150
                } else {
                    scaleFactor = 1.5 - (elapsed - 0.15) * 0.5; // Yavaşça sönümlen
                    scaleFactor = Math.max(1.0, scaleFactor);
                }

                // Opaklık azalması (Fade out)
                data.mesh.material.opacity = Math.min(0.85, data.life * 2.0); // 0.85 tavan oldu
                
                const baseScaleW = 2.6; // %35 Küçültüldü (4.0 * 0.65)
                const baseScaleH = 1.3; // %35 Küçültüldü (2.0 * 0.65)
                data.mesh.scale.set(baseScaleW * scaleFactor, baseScaleH * scaleFactor, 1);
            }
        }
    }
}
