// client/public/networkWorker.js
// Tarayıcı arka planda (tab inactive) olsa bile bu worker çalışmaya devam eder.
// Böylece ağ paketlerini (sendMove) saniyede 20 kez (20Hz) göndermeye devam edebiliriz.

let intervalId = null;

self.onmessage = (e) => {
    const { action, interval } = e.data;

    if (action === 'start') {
        if (intervalId) clearInterval(intervalId);
        
        intervalId = setInterval(() => {
            self.postMessage('tick');
        }, interval || 50); // Varsayılan 50ms (20Hz)
        
        console.log("[Worker] Zamanlayıcı Başlatıldı.");
    } else if (action === 'stop') {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};
