import './main.css';
import * as THREE from 'three';
import { Engine } from './core/Engine';
import { Environment } from './world/Environment';
import { Player } from './entities/Player';
import { PlayerCamera } from './systems/PlayerCamera';
import { InputManager } from './systems/InputManager';
import { NetworkManager, PlayerData } from './systems/NetworkManager';
import { AssetManager } from './systems/AssetManager';
import { NetworkPlayer } from './entities/NetworkPlayer';
import { ChatUI } from './ui/ChatUI';
import { LoginUI } from './ui/LoginUI';
import { ClickMarker } from './ui/ClickMarker';
import { SelectionMarker } from './ui/SelectionMarker';
import { SoundManager } from './systems/SoundManager';
import { HUD } from './ui/HUD';
import { TargetHUD } from './ui/TargetHUD';
import { EnemyTargetHUD } from './ui/EnemyTargetHUD';
import { StatusPanel } from './ui/StatusPanel';
import { SkillBarUI } from './ui/SkillBarUI';
import { UtilityBarUI } from './ui/UtilityBarUI';
import { SettingsUI } from './ui/SettingsUI';
import { CharacterStatsUI, AttributeData } from './ui/CharacterStatsUI';
import { SkillsUI } from './ui/SkillsUI';
import { FollowSystem } from './systems/FollowSystem';
import { ChatSystem } from './systems/ChatSystem';
import { WeatherManager } from './systems/WeatherManager';
import { NoticeSystem } from './systems/NoticeSystem';
import { YananDalgaAnim } from './systems/animations/YananDalgaAnim';
import { SamanTopuAnim } from './systems/animations/SamanTopuAnim';
import { YananDalgaData } from './skills/YananDalga';
import { DamageTextManager } from './systems/DamageTextManager';
import { DamageMeterUI } from './ui/DamageMeterUI';
import { RespawnUI } from './ui/RespawnUI';

import { INITIAL_STARTING_ATTRIBUTES } from '../../shared/src/StartingStats';
import { INITIAL_BASE_STATS } from '../../shared/src/BaseStats';
import { STAT_BONUSES } from '../../shared/src/StatBonuses';
import { LEVEL_UP_SCALING } from '../../shared/src/LevelScaling';

class Game {
    private engine: Engine;
    private environment: Environment;
    private player!: Player;
    private playerCamera!: PlayerCamera;
    private inputManager!: InputManager;
    private networkManager: NetworkManager;
    private chatUI: ChatUI;
    private loginUI!: LoginUI;
    private hud: HUD;
    private targetHud: TargetHUD;
    private enemyTargetHud: EnemyTargetHUD;
    private statusPanel: StatusPanel;
    private skillBar: SkillBarUI;
    private utilityBar!: UtilityBarUI;
    private settingsUI: SettingsUI;
    private statsUI: CharacterStatsUI;
    private skillsUI: SkillsUI;
    private yananDalgaAnim!: YananDalgaAnim;
    private samanTopuAnim!: SamanTopuAnim;
    private noticeSystem: NoticeSystem;
    private clickMarker!: ClickMarker;
    private selectionMarker!: SelectionMarker;
    private damageTextManager: DamageTextManager;
    private respawnUI!: RespawnUI;
    private isDeadScreenShown: boolean = false;
    
    private followSystem!: FollowSystem;
    private chatSystem!: ChatSystem;
    private damageMeterUI: DamageMeterUI;
    private weatherManager!: WeatherManager;

    private networkPlayers: Map<string, NetworkPlayer> = new Map();
    private totalOnline: number = 0;
    private lastRainState: boolean | null = null;
    private selfDeselectTimeout: number | null = null;
    private selectableObjects: THREE.Object3D[] = [];

    private attributes: AttributeData = { ...INITIAL_STARTING_ATTRIBUTES };
    private derivedStats: any = { ...INITIAL_BASE_STATS };

    private currentApproachingSkill: { skillId: string, targetEntity: any, range: number } | null = null;

    constructor() {
        this.engine = new Engine();
        this.environment = new Environment(this.engine.scene);
        this.networkManager = new NetworkManager();
        this.hud = new HUD();
        this.statusPanel = new StatusPanel();
        this.noticeSystem = new NoticeSystem();
        this.settingsUI = new SettingsUI();
        this.statsUI = new CharacterStatsUI((changes) => {
            Object.entries(changes).forEach(([attr, count]) => {
                for (let i = 0; i < (count as number); i++) {
                    this.networkManager.requestStatIncrease(attr);
                }
            });
            this.noticeSystem.showCustom("Değişiklikler sunucuya iletildi.", 3000);
        });
        this.skillsUI = new SkillsUI();
        this.damageTextManager = new DamageTextManager(this.engine.scene);
        this.yananDalgaAnim = new YananDalgaAnim(this.engine.scene);
        this.samanTopuAnim = new SamanTopuAnim(this.engine.scene);
        
        this.damageMeterUI = new DamageMeterUI();
        
        this.skillBar = new SkillBarUI((skillId) => {
            this.handleSkillUseRequest(skillId);
        });

        this.utilityBar = new UtilityBarUI(this.settingsUI, this.statsUI, this.skillsUI);
        this.weatherManager = new WeatherManager(this.engine.scene, this.environment);
        this.chatUI = new ChatUI((msg) => this.networkManager.sendChat(msg), (t, m) => {
            let targetId: string | null = null;
            for (const np of this.networkPlayers.values()) { if (np.username === t) { targetId = np.id; break; } }
            if (targetId) { this.networkManager.sendPrivateMsg(targetId, m); this.chatUI.addPrivateMessage(t, this.player.username, m, true); }
            else this.chatUI.addMessage("", `Oyuncu bulunamadı: ${t}`);
        });
        this.chatUI.setVisible(false);
        this.chatUI.onRainCommand = (status) => this.networkManager.sendWeatherUpdate(status);
        this.chatUI.onNoticeCommand = (msg) => this.networkManager.sendNotice(msg);
        this.chatSystem = new ChatSystem(this.chatUI);
        this.targetHud = new TargetHUD({
            onMessage: (username) => this.chatSystem.initiatePrivateMessage(username),
            onFollow: (target) => this.followSystem.follow(target)
        });
        this.enemyTargetHud = new EnemyTargetHUD();
        this.loginUI = new LoginUI((u) => this.networkManager.login(u));
        this.respawnUI = new RespawnUI();
        this.respawnUI.onRespawnClick = (type) => this.networkManager.sendRespawnRequest(type);
        
        // Başlangıç statlarını hesapla ve UI'lara yolla (0 ve boş veri hatasını önlemek için)
        this.calculateDerivedStats();
        if (this.skillsUI) this.skillsUI.updateDerivedStats(this.derivedStats);
        if (this.skillBar) this.skillBar.updateDerivedStats(this.derivedStats);

        this.bootstrap();
    }

    private handleSkillUseRequest(skillId: string) {
        if (this.player.isBusy) return;

        const targetMesh = this.selectionMarker.getTarget();
        if (!targetMesh) {
            this.noticeSystem.showCustom("Lütfen önce bir hedef seçin!", 2000);
            return;
        }

        const targetEntity = targetMesh.userData.entity;
        const isEnemy = (targetEntity && targetEntity.entityType === 1) || (targetEntity && targetEntity.id === "enemy_target_cube");
        
        if (!isEnemy) {
            this.noticeSystem.showCustom("Bu yetenek sadece düşmanlara kullanılabilir!", 2000);
            return;
        }

        let range = 5;
        if (skillId === 'yanan_dalga') {
            range = YananDalgaData[this.player.level]?.range || 5;
        }

        const targetWPos = new THREE.Vector3();
        targetMesh.getWorldPosition(targetWPos);
        const distance = this.player.mesh.position.distanceTo(targetWPos);
        
        // MP Kontrolü (PRO: İstemci tarafında ön kontrol - Kilitlenmeyi önler)
        const mpCost = YananDalgaData[this.player.level]?.mpCost || 40;
        if (this.player.mp < mpCost) {
            this.noticeSystem.showCustom("Yetersiz MP!", 1500);
            return;
        }

        if (distance <= range) {
            this.executeSkill(skillId, targetEntity);
        } else {
            this.noticeSystem.showCustom("Hedef çok uzakta, yaklaşılıyor...", 1500);
            this.currentApproachingSkill = { skillId, targetEntity: targetEntity, range };
            this.followSystem.follow(targetEntity, range);
        }
    }

    private executeSkill(skillId: string, targetEntity: any) {
        this.player.stopMove(true); // PRO: Yetenek başlarken idle'a girmeye çalışma (akıcılık)
        
        // Cooldown süresini al
        let cd = 10;
        if (skillId === 'yanan_dalga') {
            cd = YananDalgaData[this.player.level]?.cooldown || 10;
        }

        // Karakteri kilitle ve hedefe döndür (Rotasyonu anında güncelle ki hareket bozulmasın)
        this.player.isBusy = true;
        
        // EMNİYET KİLİDİ: Sunucudan paket gelmezse veya MP hatası olursa karakter 2sn sonra çözülsün (PRO)
        // Not: Bu süre animasyon süresinden (1.8sn) uzun olmalı ki animasyon yarıda kesilmesin.
        setTimeout(() => { if (this.player.isBusy) this.player.isBusy = false; }, 2000);

        const target = targetEntity.id === this.networkManager.myPlayerId ? this.player : this.networkPlayers.get(targetEntity.id);
        if (target) {
            const direction = new THREE.Vector3().subVectors(target.mesh.position, this.player.mesh.position).normalize();
            this.player.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }

        // Skill Bar'da CD başlat
        this.skillBar.startCooldown(skillId, cd);

        // Sunucuya gönder (NetID ile - Daha güvenli ve sayısal)
        this.networkManager.sendSkillCast(skillId, targetEntity.netId);
    }

    private calculateDerivedStats() {
        if (!this.player) return;
        const base = INITIAL_BASE_STATS;
        const attr = this.attributes;
        const bonus = STAT_BONUSES;
        const scaling = LEVEL_UP_SCALING;
        const lvGains = this.player.level - 1;

        this.derivedStats.physicalPower = base.physicalPower + (lvGains * scaling.physicalPower) + (attr.str * bonus.STR.physicalPower);
        this.derivedStats.physicalDefense = base.physicalDefense + (lvGains * scaling.physicalDefense) + (attr.str * bonus.STR.physicalDefense) + (attr.vit * bonus.VIT.physicalDefense);
        this.derivedStats.mentalPower = base.mentalPower + (lvGains * scaling.mentalPower) + (attr.int * bonus.INT.mentalPower);
        this.derivedStats.mentalDefense = base.mentalDefense + (lvGains * scaling.mentalDefense) + (attr.vit * bonus.VIT.mentalDefense);
        this.derivedStats.hp = base.hp + (lvGains * scaling.hp) + (attr.vit * bonus.VIT.hp);
        this.derivedStats.mp = base.mp + (lvGains * scaling.mp) + (attr.int * bonus.INT.mp);
        this.derivedStats.critRate = base.critRate + (attr.luk * bonus.LUK.critRate);
        this.derivedStats.dodgeRate = base.dodgeRate + (attr.dex * bonus.AGI.dodgeRate);
        this.derivedStats.moveSpeed = base.moveSpeed + (attr.dex * bonus.AGI.moveSpeed);
        
        this.player.maxHp = this.derivedStats.hp;
        this.player.maxMp = this.derivedStats.mp;
    }

    private async bootstrap() {
        await AssetManager.instance.initialize();
        this.networkManager.connect();
        this.setupNetworkingEvents();
    }

    private setupNetworkingEvents() {
        this.networkManager.onConnected = () => this.loginUI.setStatus("Giriş Yapabilirsiniz.", "#4caf50");
        this.networkManager.onLoginSuccess = (myPlayer, others, serverTime, totalOnline) => {
            this.totalOnline = totalOnline;
            SoundManager.instance.initialize(this.engine.camera);
            this.loginUI.hide();
            this.chatUI.setVisible(true);
            this.hud.setVisible(true);
            this.statusPanel.setVisible(true);
            this.skillBar.setVisible(true);
            this.utilityBar.setVisible(true);
            this.chatUI.setLocalUsername(myPlayer.username);
            this.targetHud.setLocalPlayerId(myPlayer.id);
            this.noticeSystem.showWelcomeMessage(myPlayer.username);
            this.initLocalPlayer(myPlayer);
            others.forEach(p => this.addNetworkPlayer(p, serverTime));
            this.calculateDerivedStats();

            // PRO: Otomatik Doğma Callback
            this.noticeSystem.onDeathRespawn = () => {
                this.networkManager.sendRespawnRequest(0); // Şehirde Doğ (Sürekli)
            };
        };

        this.networkManager.onLocalPlayerUpdate = (p) => {
            if (this.player) {
                if (p.hp !== undefined) this.player.hp = p.hp;
                
                // ÖLÜM KONTROLÜ (Geliştirilmiş: Notice Geri Sayımı)
                if (this.player.hp <= 0) {
                    if (!this.isDeadScreenShown) {
                        // Artik panel yerine duyuru üzerinden geri sayım yapılıyor
                        this.noticeSystem.showDeathNotice("Canavar"); 
                        this.isDeadScreenShown = true;
                        this.damageMeterUI.hide(); // PRO: Öldüğümüzde tabloyu kapat
                    }
                } else {
                    if (this.isDeadScreenShown) {
                        this.isDeadScreenShown = false;
                    }
                }

                if (p.mp !== undefined) this.player.mp = p.mp;
                if (p.level !== undefined) this.player.level = p.level;
                if (p.maxHp !== undefined) this.player.maxHp = p.maxHp;
                if (p.maxMp !== undefined) this.player.maxMp = p.maxMp;
            }
        };

        this.networkManager.onStatUpdate = (attributes, derived) => {
            this.attributes = attributes;
            this.derivedStats = derived;
            if (this.player) {
                // Correct stats (hp/mp are the maxes in derived if using BaseStats structure correctly)
                this.player.maxHp = derived.hp; 
                this.player.maxMp = derived.mp;
            }
            this.statsUI.update(this.attributes, this.derivedStats, this.player ? this.player.level : 1);
            
            // PRO: Yetenek hasarlarını güncellemek içinderivedStats'ı ilet
            if (this.skillsUI) this.skillsUI.updateDerivedStats(this.derivedStats);
            if (this.skillBar) this.skillBar.updateDerivedStats(this.derivedStats);
        };

        this.networkManager.onDamageMeter = (_, data) => {
            this.damageMeterUI.update(data);
        };

        this.networkManager.onSkillEffect = (casterId, targetId, skillId, casterRotationY, damage, resultType) => {
            console.log(`[Combat] Efekt Alındı -> Caster: ${casterId}, Target: ${targetId}, Skill: ${skillId}, Damage: ${damage}, Type: ${resultType}`);
            let casterEntity: any = null;
            let targetEntity: any = null;

            if (casterId === this.networkManager.myPlayerId) casterEntity = this.player;
            else casterEntity = this.networkPlayers.get(casterId) || null;

            if (targetId === this.networkManager.myPlayerId) targetEntity = this.player;
            else targetEntity = this.networkPlayers.get(targetId) || null;

            if (casterEntity && targetEntity) {
                // Atıcının rotasyonunu uygula (PRO Sync)
                if (casterId !== this.networkManager.myPlayerId && casterRotationY !== undefined) {
                    if (casterEntity instanceof NetworkPlayer) {
                        casterEntity.mesh.rotation.y = casterRotationY;
                    }
                }
                
                // Herkes için oynat (Siz dahil herkes senkronize görür)
                if (skillId === 'yanan_dalga') {
                    this.yananDalgaAnim.play(casterEntity, targetEntity, damage, resultType, (pos: any, dmg: any, type: any, tid: any) => {
                        this.damageTextManager.show(pos, dmg, type, tid);
                    });
                } else if (skillId === 'saman_topu') {
                    this.samanTopuAnim.play(casterEntity, targetEntity, damage, resultType, (pos: any, dmg: any, type: any, tid: any) => {
                        this.damageTextManager.show(pos, dmg, type, tid);
                    });
                }
            } else {
                console.warn(`[Combat] Varlıklar bulunamadığı için animasyon oynatılamadı! Caster: ${!!casterEntity}, Target: ${!!targetEntity}`);
            }
        };

        this.networkManager.onNotice = (msg) => this.noticeSystem.showCustom(msg);
        this.networkManager.onWeatherUpdate = (isRainy) => {
            const isInitialState = this.lastRainState === null;
            if (isRainy) { this.weatherManager.startRain(); if (!isInitialState && this.lastRainState !== isRainy) this.noticeSystem.showRainStart(); }
            else { this.weatherManager.stopRain(); if (!isInitialState && this.lastRainState !== isRainy) this.noticeSystem.showRainStop(); }
            this.lastRainState = isRainy;
        };

        this.networkManager.onChatMessage = (username, message) => {
            this.chatUI.addMessage(username, message);
            if (this.player && this.player.username === username) this.player.nameTag.showChat(message);
            else { for (const np of this.networkPlayers.values()) { if (np.username === username) { np.nameTag.showChat(message); break; } } }
        };

        this.networkManager.onPrivateMessage = (_targetId, fromUsername, message) => this.chatUI.addPrivateMessage(fromUsername, fromUsername, message, false);
        this.networkManager.onPlayerJoin = (player, serverTime, totalOnline) => { this.totalOnline = totalOnline; this.addNetworkPlayer(player, serverTime); };
        this.networkManager.onPlayerLeave = (id) => {
            const np = this.networkPlayers.get(id);
            if (np) {
                if (this.selectionMarker.getTarget() === np.hitbox) { this.selectionMarker.setTarget(null); this.targetHud.setVisible(false); this.enemyTargetHud.setVisible(false); }
                this.selectableObjects = this.selectableObjects.filter(obj => obj !== np.hitbox);
                this.inputManager.setSelectableObjects(this.selectableObjects);
                this.engine.unregister(np);
                np.destroy();
                this.networkPlayers.delete(id);
            }
        };
        this.networkManager.onPlayerMove = (id, position, serverTime, totalOnline, hp, maxHp, mp, maxMp, rotationY, animationState) => {
            if (totalOnline !== undefined) this.totalOnline = totalOnline;
            const np = this.networkPlayers.get(id);
            if (np) {
                np.moveTo(position, serverTime, rotationY);
                if (hp !== undefined) np.hp = hp;
                if (maxHp !== undefined && maxHp !== null) np.maxHp = maxHp;
                if (mp !== undefined) np.mp = mp;
                if (maxMp !== undefined && maxMp !== null) np.maxMp = maxMp;
                if (animationState !== undefined) np.animationState = animationState;

                // PRO: Eğer şu anki target öldüyse seçimi iptal et
                const currentTargetMesh = this.selectionMarker.getTarget();
                if (currentTargetMesh && currentTargetMesh.userData.entity && currentTargetMesh.userData.entity.id === id && hp !== undefined && hp <= 0) {
                    this.selectionMarker.setTarget(null);
                    this.targetHud.setVisible(false);
                    this.enemyTargetHud.setVisible(false);
                    this.damageMeterUI.hide();
                }
            }
        };
    }

    private addNetworkPlayer(playerData: PlayerData, serverTime: number) {
        if (playerData.id === this.networkManager.myPlayerId) return;
        
        const existingNp = this.networkPlayers.get(playerData.id);
        if (existingNp) {
            existingNp.level = playerData.level;
            existingNp.hp = playerData.hp;
            existingNp.maxHp = playerData.maxHp;
            existingNp.mp = playerData.mp;
            existingNp.maxMp = playerData.maxMp;
            existingNp.username = playerData.username;
            existingNp.nameTag.updateName(playerData.username);
            return;
        }

        const np = new NetworkPlayer(this.engine.scene, this.engine.camera, playerData.id, playerData.netId || 0, playerData.username, playerData.position, serverTime, () => this.networkManager.getServerTime(), playerData.level, playerData.hp, playerData.maxHp, playerData.mp, playerData.maxMp, playerData.entityType || 0);
        this.engine.register(np);
        this.networkPlayers.set(playerData.id, np);
        this.selectableObjects.push(np.hitbox); 
        if (this.inputManager) this.inputManager.setSelectableObjects(this.selectableObjects);
    }

    private initLocalPlayer(myPlayer: PlayerData) {
        this.player = new Player(this.engine.scene, this.engine.camera, myPlayer.id, myPlayer.netId || 0, myPlayer.username, myPlayer.level, myPlayer.hp, myPlayer.mp);
        this.player.mesh.position.set(myPlayer.position.x, myPlayer.position.y, myPlayer.position.z);
        this.playerCamera = new PlayerCamera(this.engine.camera, this.player.mesh);
        this.clickMarker = new ClickMarker(this.engine.scene);
        this.selectionMarker = new SelectionMarker(this.engine.scene);
        this.followSystem = new FollowSystem(this.player);
        this.player.onMove = () => {
            this.followSystem.stop();
            this.currentApproachingSkill = null; 
        };

        this.inputManager = new InputManager(this.engine.scene, this.engine.camera, {
            onMove: (point: THREE.Vector3) => { this.player.moveTo(point); this.clickMarker.show(point); },
            onSelect: (object: THREE.Object3D | null) => {
                this.selectionMarker.setTarget(object);
                
                if (this.selfDeselectTimeout) { window.clearTimeout(this.selfDeselectTimeout); this.selfDeselectTimeout = null; }
                
                if (!object) {
                    this.targetHud.setVisible(false);
                    this.enemyTargetHud.setVisible(false);
                    this.damageMeterUI.hide(); // Seçim boşsa tabloyu kapat
                } else {
                    const entity = object.userData.entity;
                    if (entity && entity.entityType === 1) {
                        this.enemyTargetHud.setVisible(true);
                        this.targetHud.setVisible(false);
                    } else {
                        this.enemyTargetHud.setVisible(false);
                        this.targetHud.setVisible(true);
                        this.damageMeterUI.hide(); // Seçilen şey düşman değilse tabloyu kapat
                    }

                    if (entity && entity.id === this.player.id) {
                        this.selfDeselectTimeout = window.setTimeout(() => {
                            const currentTarget = this.selectionMarker.getTarget();
                            if (currentTarget && currentTarget.userData.entity && currentTarget.userData.entity.id === this.player.id) {
                                this.selectionMarker.setTarget(null); 
                                this.targetHud.setVisible(false); 
                                this.damageMeterUI.hide();
                            }
                            this.selfDeselectTimeout = null;
                        }, 10000);
                    }
                }
            },
            onInteraction: (_object: THREE.Object3D | null, _x: number, _y: number) => {},
            onRotate: (deltaX: number, deltaY: number) => this.playerCamera.rotate(deltaX, deltaY),
            onZoom: (delta: number) => this.playerCamera.zoom(delta)
        });

        this.inputManager.setLocalPlayerMesh(this.player.mesh);
        this.inputManager.setWalkableObjects([this.environment.ground]);
        this.selectableObjects.push(this.player.hitbox); // PRO: Self-selection hitbox
        this.inputManager.setSelectableObjects(this.selectableObjects);

        window.addEventListener('keydown', (e) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            const key = e.key.toLowerCase();
            if (key === 'c') this.statsUI.toggle();
            if (key === 'k') this.skillsUI.toggle();
        });

        this.engine.register(this.player);
        this.engine.register(this.playerCamera);
        this.engine.register(this.selectionMarker);
        this.engine.register(this.yananDalgaAnim);
        this.engine.register(this.samanTopuAnim);
        this.engine.register({ update: (delta: number) => this.damageTextManager.update(delta) });
        this.engine.register({ update: () => this.followSystem.update() });
        this.engine.register({ update: () => { if (this.statusPanel) this.statusPanel.update(this.networkManager.ping, this.networkManager.getServerTime(), this.totalOnline); } });
        this.engine.register({ update: () => { 
            if (this.player && this.hud) { 
                this.hud.update(this.player.username, this.player.level, this.player.hp, this.player.maxHp, this.player.mp, this.player.maxMp); 
                if (this.skillBar) { this.skillBar.updateXP(0, 100); this.skillBar.updateSkillPoints(this.attributes.availablePoints); } 
                if (this.statsUI) { 
                    this.calculateDerivedStats(); 
                    this.statsUI.update(this.attributes, this.derivedStats, this.player.level); 
                }
                if (this.utilityBar) { this.utilityBar.updateNotification(this.attributes.availablePoints > 0); }
            } 
        } });
        this.engine.register({
            update: () => {
                const targetMesh = this.selectionMarker.getTarget();
                if (targetMesh) {
                    if (this.currentApproachingSkill) {
                        const targetPos = new THREE.Vector3();
                        targetMesh.getWorldPosition(targetPos);
                        const dist = this.player.mesh.position.distanceTo(targetPos);
                        if (dist <= this.currentApproachingSkill.range) {
                            const { skillId, targetEntity } = this.currentApproachingSkill;
                            this.currentApproachingSkill = null;
                            this.followSystem.stop();
                            this.executeSkill(skillId, targetEntity);
                        }
                    }

                    if (targetMesh !== this.player.mesh) {
                        const targetPos = new THREE.Vector3();
                        targetMesh.getWorldPosition(targetPos);
                        const distance = this.player.mesh.position.distanceTo(targetPos);
                        if (distance > 20) { this.selectionMarker.setTarget(null); this.targetHud.setVisible(false); this.enemyTargetHud.setVisible(false); return; }
                    }
                    let targetEntity = targetMesh.userData.entity;
                    if (targetEntity) { 
                        targetEntity.id = targetEntity.id || ""; 
                        if (targetEntity.entityType === 1) {
                            this.enemyTargetHud.update(targetEntity);
                        } else {
                            this.targetHud.update(targetEntity); 
                        }
                    }
                }
            }
        });
        this.engine.register({ update: (delta) => { this.clickMarker.update(delta, this.player?.mesh.position); if (this.player && this.weatherManager) this.weatherManager.update(this.player.mesh.position, delta); } });
        this.engine.register({ update: () => { if (this.player) this.networkManager.sendMove({ x: this.player.mesh.position.x, y: this.player.mesh.position.y, z: this.player.mesh.position.z }, this.player.mesh.rotation.y); } });
        
        this.engine.start();
    }
}

new Game();
