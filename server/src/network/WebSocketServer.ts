import { WebSocketServer, WebSocket } from 'ws';
import { GameManager } from '../core/GameManager.js';
import { handleIncomingPacket } from '../handlers/PacketHandler.js';
import { Player } from '../entities/Player.js'; // type info

export class ServerNetwork {
    private wss: WebSocketServer;
    private gameManager!: GameManager;
    
    // Yalnızca ağ bağlantılarını izlemek için
    private connections: Map<WebSocket, string> = new Map();

    constructor(port: number) {
        this.wss = new WebSocketServer({ port: port }, () => {
            console.log(`[Sunucu] WebSocket dinlemeye başladı (Port: ${port})`);
        });

        // Olayları (Event) kur
        this.setupEvents();
    }

    public setGameManager(gm: GameManager) {
        this.gameManager = gm;
    }

    private setupEvents() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log(`[Ağ] Yeni bağlantı. Giriş paketi (LOGIN_REQ) bekleniyor...`);

            ws.on('message', (message: Buffer) => {
                // Ham veri (Buffer) PacketHandler dosyasına gönderilir (Binary uyumluluğu için)
                const arrayBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
                handleIncomingPacket(
                    ws, 
                    arrayBuffer as ArrayBuffer,
                    this.gameManager,
                    (socket) => this.connections.get(socket),
                    (socket, id) => this.mapConnectionToId(socket, id)
                );
            });

            ws.on('close', () => {
                const id = this.connections.get(ws);
                if (id) {
                    // Bağlantı koptysa GameManager'a bildir, o tüm veritabanı/hafıza/broadcast işlemlerini halleder
                    this.gameManager.removePlayer(id);
                    this.connections.delete(ws);
                }
            });
        });
    }

    /**
     * Tüm aktif istemcilere veya (excludeId verilirse) o kişi hariç herkese mesaj yayar
     * Veri String (JSON) veya ArrayBuffer (Binary) olabilir.
     */
    public broadcast(data: any, excludeId?: string) {
        // Eğer data zaten bir Buffer/ArrayBuffer değilse JSON.stringify yapalım (Geriye dönük uyum için)
        const payload = (data instanceof ArrayBuffer || data instanceof Buffer) ? data : JSON.stringify(data);
        
        for (const [ws, id] of this.connections.entries()) {
            if (ws.readyState === WebSocket.OPEN && id !== excludeId) {
                ws.send(payload);
            }
        }
    }

    /**
     * PacketHandler'da LOGIN_REQ olunca WebSocket'e 'id' etiketi yapıştırırız.
     * Böylece ws koptuğunda (close) hangi ID koptu bilebiliriz.
     */
    public mapConnectionToId(ws: WebSocket, id: string) {
        this.connections.set(ws, id);
    }
}
