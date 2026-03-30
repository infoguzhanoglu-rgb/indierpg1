import { performance } from 'perf_hooks';

const allPlayers = new Map<string, any>();
const allEnemies = new Map<string, any>();

for (let i = 0; i < 500; i++) {
    allPlayers.set(`player_${i}`, { id: `player_${i}`, position: {x: 0, y: 0, z: 0} });
}

for (let i = 0; i < 2000; i++) {
    allEnemies.set(`enemy_${i}`, { id: `enemy_${i}`, position: {x: 0, y: 0, z: 0} });
}

const allPlayersArr = Array.from(allPlayers.values());
const allEnemiesArr = Array.from(allEnemies.values());

const start = performance.now();

for (let t = 0; t < 1000; t++) {
    const allEntitiesMap = new Map<string, any>();
    allPlayersArr.forEach(p => allEntitiesMap.set(p.id, p));
    allEnemiesArr.forEach(e => allEntitiesMap.set(e.id, e));
}

const end = performance.now();
console.log(`Baseline map creation 1000 ticks: ${end - start} ms`);

const start2 = performance.now();
for (let t = 0; t < 1000; t++) {
    // using maps directly
    const getEntity = (id: string) => {
        return allPlayers.get(id) || allEnemies.get(id);
    }
}
const end2 = performance.now();
console.log(`Direct lookup 1000 ticks: ${end2 - start2} ms`);
