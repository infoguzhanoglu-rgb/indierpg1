import { ServerNetwork } from './network/WebSocketServer.js';
import { GameManager } from './core/GameManager.js';
import { TickLoop } from './core/TickLoop.js';

// 1. Ağ (Network) bileşenini başlat
const networkParams = new ServerNetwork(3000);

// 2. Oyun modülünü (GameManager) başlat
const gameManager = new GameManager(networkParams);

// 3. Ağdan gelen istekleri oyun modülüne bağla
networkParams.setGameManager(gameManager);

// 4. Merkezi Tick Loop (Zamanlayıcı) sistemini başlat
const tickLoop = new TickLoop(gameManager);
tickLoop.start();

console.log("Symge Online Sunucu Motoru Hazır (Tick Loop Aktif)!");
