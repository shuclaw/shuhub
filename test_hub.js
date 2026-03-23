const { Hub } = require('./hub');
const hub = new Hub();
console.log('Hub created, config type:', typeof hub.config.init);
hub.init({
    config: {},
    messageBus: { maxHistory: 100 },
    monitor: { historyLimit: 100 }
}).then(() => {
    console.log('Hub init OK');
    process.exit(0);
}).catch(e => {
    console.error('Hub init error:', e.message);
    console.error(e.stack);
    process.exit(1);
});
