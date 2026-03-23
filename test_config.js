const { ConfigModule } = require('./modules/config');
const c = new ConfigModule();
console.log('ConfigModule init type:', typeof c.init);
c.init({}).then(() => {
    console.log('ConfigModule init OK');
    process.exit(0);
}).catch(e => {
    console.error('ConfigModule init error:', e.message);
    process.exit(1);
});
