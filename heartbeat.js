const redis = require('redis');

(async () => {
    const client = redis.createClient({
        socket: {
            host: '172.18.0.3',
            port: 6379
        },
        password: 'redis_kEdWHE'
    });
    
    await client.connect();
    
    await client.setEx('heartbeat:duzong', 300, JSON.stringify({
        status: 'active',
        timestamp: new Date().toISOString(),
        last_check: 'heartbeat'
    }));
    
    console.log('HEARTBEAT_OK');
    await client.quit();
})();
