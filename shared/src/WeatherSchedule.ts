export interface WeatherInterval {
    start: string; // HH:mm formatında
    end: string;
}

export const RAIN_SCHEDULE: WeatherInterval[] = [
    { start: "00:30", end: "00:40" },
    { start: "02:00", end: "02:15" },
    { start: "03:30", end: "03:40" },
    { start: "05:00", end: "05:20" },
    { start: "07:00", end: "07:10" },
    { start: "09:00", end: "09:15" },
    { start: "11:00", end: "11:10" },
    { start: "13:00", end: "13:20" },
    { start: "15:00", end: "15:10" },
    { start: "17:00", end: "17:20" },
    { start: "19:00", end: "19:10" },
    { start: "21:00", end: "21:15" },
    { start: "23:00", end: "23:10" }
];

export function isCurrentlyRainy(): boolean {
    const now = new Date();
    // Türkiye saati UTC+3 olduğu için sunucu ortamına göre gerekirse ayarlanabilir 
    // ama istemci ve sunucu aynı saat dilimindeyse (veya Date.now() senkron ise) direkt çalışır.
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return RAIN_SCHEDULE.some(interval => {
        const [startH, startM] = interval.start.split(':').map(Number);
        const [endH, endM] = interval.end.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        return currentTime >= startTime && currentTime < endTime;
    });
}
