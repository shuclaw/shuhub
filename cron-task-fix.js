#!/usr/bin/env node
/**
 * Cron Task Entry - Simple version
 * No Chinese characters to avoid parsing issues
 */

const { execSync } = require('child_process');

async function run() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] START`);
    
    try {
        // Phase 1: Intel Collection
        console.log('[Phase 1] Collecting intel...');
        execSync('node /home/node/.openclaw/workspace/intel-collector.js', {
            cwd: '/home/node/.openclaw/workspace',
            stdio: 'pipe',
            timeout: 60000
        });
        console.log('[Phase 1] DONE');
        
        // Phase 2: Smart Crawler
        console.log('[Phase 2] Running crawler...');
        execSync('node /home/node/.openclaw/workspace/smart-crawler.js', {
            cwd: '/home/node/.openclaw/workspace',
            stdio: 'pipe',
            timeout: 120000
        });
        console.log('[Phase 2] DONE');
        
        console.log(`[${new Date().toISOString()}] SUCCESS`);
        
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

run();
