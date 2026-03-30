# 3D Modeller Klasörü

İnsan modellerini (Karakterler), silahları veya diğer `.gltf` / `.glb` uzantılı 3D varlıkları (assets) bu klasöre yükleyebilirsiniz.

Vite mimarisinde `public` klasörü altındaki dosyalar, tarayıcıda doğrudan `/models/...` dizinine denk gelir.

## Örnek Yükleme:
`GLTFLoader` kullanarak modelinizi oyununuza şöyle çekebilirsiniz:
```typescript
loader.load('/models/player.glb', (gltf) => {
    scene.add(gltf.scene);
});
```
