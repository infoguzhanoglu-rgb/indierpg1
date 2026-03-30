import { PacketType, PlayerData, NET_CONFIG, BinaryCoder } from '../../../shared/src/index';

export { PacketType };
export type { PlayerData };

export class NetworkManager {
    private ws: WebSocket | null = null;
    public myPlayerId: string = "";
    
    private worker: Worker | null = null;
    private pendingMove: { x: number, y: number, z: number, rotationY: number } | null = null;
    private serverTimeOffset: number = 0;
    public ping: number = 0;
    private lastPingTime: number = 0;
    private pingHistory: number[] = [];
    private averagePing: number = 0;
    
    // PRO: NetID -> UUID Mapping (Ağ tasarrufu için)
    private netIdToId: Map<number, string> = new Map();

    // Callbacks
    public onLoginSuccess: (player: PlayerData, others: PlayerData[], serverTime: number, totalOnline: number) => void = () => {};
    public onPlayerJoin: (player: PlayerData, serverTime: number, totalOnline: number) => void = () => {};
    public onPlayerLeave: (id: string) => void = () => {};
    public onPlayerMove: (id: string, position: { x: number, y: number, z: number }, serverTime: number, totalOnline?: number, hp?: number, maxHp?: number, mp?: number, maxMp?: number, rotationY?: number, animationState?: number) => void = () => {};
    public onChatMessage: (username: string, message: string) => void = () => {};
    public onPrivateMessage: (targetId: string, fromUsername: string, message: string) => void = () => {};
    public onWeatherUpdate: (isRainy: boolean) => void = () => {};
    public onNotice: (message: string) => void = () => {};
    public onStatUpdate: (attributes: any, derived: any) => void = () => {};
    public onLocalPlayerUpdate: (player: PlayerData) => void = () => {};
    public onSkillEffect: (casterId: string, targetId: string, skillId: string, casterRotationY: number, damage: number, resultType: string) => void = () => {};
    public onDamageMeter: (targetNetId: number, data: {username: string, amount: number}[]) => void = () => {};
    public onConnected: () => void = () => {};

    constructor() { this.initWorker(); }

    private initWorker() {
        try {
            this.worker = new Worker('/networkWorker.js');
            this.worker.onmessage = (e) => { if (e.data === 'tick') this.flushMove(); };
            this.worker.postMessage({ action: 'start', interval: NET_CONFIG.CLIENT_SEND_INTERVAL });
        } catch (err) { setInterval(() => this.flushMove(), NET_CONFIG.CLIENT_SEND_INTERVAL); }
    }

    public getServerTime(): number { 
        // PRO: NTP Senkronizasyonu (Fark - Ping/2 = Gerçek Sunucu Zamanı)
        return Date.now() + this.serverTimeOffset - (this.averagePing / 2); 
    }

    public connect() {
        this.ws = new WebSocket("ws://localhost:3000");
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => this.onConnected();

        this.ws.onmessage = (event) => {
            const data = BinaryCoder.decode(event.data);
            if (!data) return;
            
            switch (data.type) {
                case PacketType.LOGIN_RES:
                    this.myPlayerId = data.player.id;
                    if (data.player.netId) this.netIdToId.set(data.player.netId, data.player.id);
                    data.others.forEach((p: PlayerData) => { if (p.netId) this.netIdToId.set(p.netId, p.id); });
                    
                    this.serverTimeOffset = data.serverTime - Date.now();
                    this.onLoginSuccess(data.player, data.others, data.serverTime, data.totalOnline);
                    break;
                case PacketType.JOIN:
                    if (data.player.netId && data.player.id) this.netIdToId.set(data.player.netId, data.player.id);
                    if (data.player.id !== this.myPlayerId) this.onPlayerJoin(data.player, data.serverTime, data.totalOnline);
                    break;
                case PacketType.LEAVE:
                    this.onPlayerLeave(data.id);
                    break;
                case PacketType.STATE_UPDATE:
                    if (data.self) {
                        if (data.self.netId && data.self.id) this.netIdToId.set(data.self.netId, data.self.id);
                        this.onLocalPlayerUpdate(data.self);
                    }
                    data.players.forEach((p: PlayerData) => { 
                        // PRO: Her durumda haritalamayı güncelle (Yeni gelen oyuncular için kritik)
                        if (p.netId && p.id) this.netIdToId.set(p.netId, p.id);
                        
                        const realId = p.netId ? this.netIdToId.get(p.netId) : p.id;
                        if (!realId) return;

                        if (realId !== this.myPlayerId) {
                            this.onPlayerMove(realId, p.position, data.serverTime, data.totalOnline, p.hp, undefined, p.mp, undefined, p.rotationY, p.animationState);
                        }
                    });
                    break;
                case PacketType.MOVE:
                    if (data.id !== this.myPlayerId) this.onPlayerMove(data.id, data.position, data.serverTime || Date.now(), undefined, undefined, undefined, undefined, undefined, data.rotationY);
                    break;
                case PacketType.CHAT_MSG:
                    this.onChatMessage(data.username, data.message);
                    break;
                case PacketType.PRIVATE_MSG:
                    this.onPrivateMessage(data.targetId, data.fromUsername, data.message);
                    break;
                case PacketType.WEATHER_UPDATE:
                    this.onWeatherUpdate(data.isRainy);
                    break;
                case PacketType.NOTICE:
                    this.onNotice(data.message);
                    break;
                case PacketType.STAT_UPDATE:
                    if (data.mode === "FULL_SYNC") this.onStatUpdate(data.attributes, data.derived);
                    break;
                case PacketType.SKILL_EFFECT: {
                    console.log("[Network] SKILL_EFFECT paketi alındı:", data);
                    const casterId = this.netIdToId.get(data.casterNetId) || "";
                    const targetId = this.netIdToId.get(data.targetNetId) || "";
                    if (casterId && targetId) {
                        this.onSkillEffect(casterId, targetId, data.skillId, data.casterRotationY, data.damage, data.resultType);
                    } else {
                        console.warn(`[Network] SKILL_EFFECT Mapping Hatası! CasterNetID: ${data.casterNetId}(${casterId}), TargetNetID: ${data.targetNetId}(${targetId})`);
                    }
                    break;
                }
                case PacketType.DAMAGE_METER:
                    this.onDamageMeter(data.targetNetId, data.data);
                    break;
                case PacketType.PING:
                    const currentPing = Date.now() - this.lastPingTime;
                    this.ping = currentPing;
                    
                    // PRO: Akıllı Ping Filtresi (Average)
                    this.pingHistory.push(currentPing);
                    if (this.pingHistory.length > 5) this.pingHistory.shift();
                    this.averagePing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
                    break;
            }
        };
    }

    public login(username: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(BinaryCoder.encodeLoginReq(username));
            this.startPingInterval();
        }
    }

    public sendRespawnRequest(spawnType: number) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(BinaryCoder.encodeRespawnRequest(spawnType));
        }
    }

    private startPingInterval() {
        setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.lastPingTime = Date.now();
                this.ws.send(BinaryCoder.encodePing());
            }
        }, 2000);
    }

    public sendMove(position: { x: number, y: number, z: number }, rotationY: number) { 
        this.pendingMove = { ...position, rotationY }; 
    }

    private flushMove() {
        if (!this.pendingMove || this.ws?.readyState !== WebSocket.OPEN) return;
        this.ws.send(BinaryCoder.encodeMove(this.pendingMove, this.pendingMove.rotationY));
    }

    public sendChat(message: string) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(BinaryCoder.encodeChat("", message)); }
    public sendPrivateMsg(targetId: string, message: string) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(BinaryCoder.encodePrivateMsg(targetId, "", message)); }
    public sendWeatherUpdate(isRainy: boolean) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(BinaryCoder.encodeWeatherUpdate(isRainy)); }
    public sendNotice(message: string) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(BinaryCoder.encodeNotice(message)); }
    
    public requestStatIncrease(attrName: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(BinaryCoder.encodeStatUpdate(attrName));
        }
    }

    public sendSkillCast(skillId: string, targetNetId: number) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(BinaryCoder.encodeSkillCast(skillId, targetNetId));
        }
    }
}
