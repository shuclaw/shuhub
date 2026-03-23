/**
 * Safety Module - 安全防护模块
 * 
 * 防止用户误操作，三层防护：
 * 1. 文件安全 - 禁止系统目录，默认禁止删除
 * 2. 命令安全 - 禁止危险命令，默认禁止执行
 * 3. 网络安全 - 白名单域名，禁止内网扫描
 */

const { BaseModule } = require('../base');
const path = require('path');

// 默认安全配置
const DEFAULT_SAFETY_CONFIG = {
    // 文件安全
    allowedPaths: ['./workspace', './data', './temp'],
    forbiddenPaths: [
        '/etc', '/usr', '/bin', '/sbin', '/sys', '/proc', '/boot', '/dev',
        'C:\\Windows', 'C:\\Program Files', 'C:\\ProgramData'
    ],
    allowDelete: false,
    allowWrite: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    
    // 命令安全
    allowExecute: false,
    forbiddenCommands: [
        'rm -rf', 'rm -rf /', 'rm -rf /*',
        'dd if=/dev/zero', 'mkfs', 'fdisk', 'format',
        'del /f /s /q', ':(){ :|: & };:',
        'shutdown', 'reboot', 'chmod 777 /'
    ],
    
    // 网络安全
    allowNetwork: true,
    allowedDomains: ['*.openai.com', '*.anthropic.com', 'localhost'],
    forbiddenDomains: ['10.*.*.*', '172.16.*.*', '192.168.*.*'],
    
    // 审计
    auditLog: true,
    auditLevel: 'standard'
};

class SafetyModule extends BaseModule {
    constructor() {
        super('Safety');
        this.config = null;
        this.auditLog = [];
        this.suspiciousCount = new Map();
    }
    
    async init(config) {
        await super.init(config);
        this.config = { ...DEFAULT_SAFETY_CONFIG, ...config };
        console.log('[Safety] Initialized');
        console.log(`[Safety] File delete: ${this.config.allowDelete ? 'allowed' : 'forbidden'}`);
        console.log(`[Safety] Command execute: ${this.config.allowExecute ? 'allowed' : 'forbidden'}`);
    }
    
    /**
     * 检查文件操作
     */
    checkFileOperation(operation, filepath, agentId) {
        const fullPath = path.resolve(filepath);
        
        // 检查禁止路径
        for (const forbidden of this.config.forbiddenPaths) {
            if (fullPath.includes(forbidden) || fullPath.startsWith(forbidden)) {
                this.audit('BLOCKED', agentId, `Access forbidden path: ${filepath}`, { operation });
                throw new SafetyError(`Safety blocked: forbidden path ${filepath}`, 'FORBIDDEN_PATH');
            }
        }
        
        // 检查白名单
        if (this.config.allowedPaths.length > 0) {
            const inAllowed = this.config.allowedPaths.some(allowed => 
                fullPath.startsWith(path.resolve(allowed))
            );
            if (!inAllowed) {
                this.audit('BLOCKED', agentId, `Access outside workspace: ${filepath}`, { operation });
                throw new SafetyError('Safety blocked: only workspace allowed', 'OUTSIDE_WORKSPACE');
            }
        }
        
        // 检查操作类型
        if (operation === 'delete' && !this.config.allowDelete) {
            this.audit('BLOCKED', agentId, `Delete forbidden: ${filepath}`);
            throw new SafetyError('Safety blocked: delete forbidden', 'DELETE_FORBIDDEN');
        }
        
        this.audit('ALLOWED', agentId, `${operation}: ${filepath}`);
        return true;
    }
    
    /**
     * 检查命令
     */
    checkCommand(command, agentId) {
        const cmd = command.toLowerCase().trim();
        
        // 检查禁止命令
        for (const forbidden of this.config.forbiddenCommands) {
            if (cmd.includes(forbidden.toLowerCase())) {
                this.audit('BLOCKED', agentId, `Dangerous command: ${command}`);
                this.recordSuspicious(agentId, 'dangerous_command');
                throw new SafetyError(`Safety blocked: dangerous command "${forbidden}"`, 'DANGEROUS_COMMAND');
            }
        }
        
        // 检查是否允许执行
        if (!this.config.allowExecute) {
            this.audit('BLOCKED', agentId, `Execute forbidden: ${command}`);
            throw new SafetyError('Safety blocked: execute forbidden', 'EXECUTE_FORBIDDEN');
        }
        
        this.audit('ALLOWED', agentId, `command: ${command}`);
        return true;
    }
    
    /**
     * 检查网络请求
     */
    checkNetworkRequest(url, agentId) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // 检查禁止域名
            for (const forbidden of this.config.forbiddenDomains) {
                const pattern = forbidden.replace(/\*/g, '.*').replace(/\./g, '\\.');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(hostname)) {
                    this.audit('BLOCKED', agentId, `Forbidden domain: ${url}`);
                    this.recordSuspicious(agentId, 'forbidden_network');
                    throw new SafetyError(`Safety blocked: forbidden domain ${hostname}`, 'FORBIDDEN_DOMAIN');
                }
            }
            
            // 检查白名单
            if (this.config.allowedDomains.length > 0) {
                const isAllowed = this.config.allowedDomains.some(allowed => {
                    const pattern = allowed.replace(/\*/g, '.*').replace(/\./g, '\\.');
                    const regex = new RegExp(`^${pattern}$`);
                    return regex.test(hostname);
                });
                
                if (!isAllowed) {
                    this.audit('BLOCKED', agentId, `Domain not allowed: ${url}`);
                    throw new SafetyError(`Safety blocked: ${hostname} not in whitelist`, 'DOMAIN_NOT_ALLOWED');
                }
            }
            
            this.audit('ALLOWED', agentId, `network: ${url}`);
            return true;
        } catch (err) {
            if (err instanceof SafetyError) throw err;
            throw new SafetyError(`Invalid URL: ${url}`, 'INVALID_URL');
        }
    }
    
    /**
     * 记录可疑行为
     */
    recordSuspicious(agentId, reason) {
        const count = (this.suspiciousCount.get(agentId) || 0) + 1;
        this.suspiciousCount.set(agentId, count);
        console.warn(`[Safety] Warning: Agent ${agentId} suspicious #${count}: ${reason}`);
    }
    
    /**
     * 审计日志
     */
    audit(action, agentId, details, metadata = {}) {
        if (!this.config.auditLog) return;
        
        const entry = {
            timestamp: Date.now(),
            action,
            agentId,
            details,
            metadata
        };
        
        this.auditLog.push(entry);
        
        // 限制日志大小
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
        
        const icon = action === 'BLOCKED' ? '🚫' : '✅';
        console.log(`[Safety] ${icon} [${action}] ${agentId}: ${details}`);
    }
    
    /**
     * 获取审计日志
     */
    getAuditLog(options = {}) {
        let logs = [...this.auditLog];
        
        if (options.agentId) logs = logs.filter(l => l.agentId === options.agentId);
        if (options.action) logs = logs.filter(l => l.action === options.action);
        if (options.since) logs = logs.filter(l => l.timestamp >= options.since);
        
        return logs.slice(-(options.limit || 100));
    }
    
    /**
     * 导出安全报告
     */
    exportReport() {
        return {
            generatedAt: Date.now(),
            config: {
                allowDelete: this.config.allowDelete,
                allowExecute: this.config.allowExecute
            },
            stats: {
                total: this.auditLog.length,
                blocked: this.auditLog.filter(l => l.action === 'BLOCKED').length,
                allowed: this.auditLog.filter(l => l.action === 'ALLOWED').length,
                suspicious: Array.from(this.suspiciousCount.entries())
            }
        };
    }
    
    async health() {
        return {
            status: 'healthy',
            config: {
                allowDelete: this.config.allowDelete,
                allowExecute: this.config.allowExecute
            },
            stats: {
                totalAudits: this.auditLog.length,
                suspiciousAgents: this.suspiciousCount.size
            }
        };
    }
}

class SafetyError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'SafetyError';
    }
}

module.exports = { SafetyModule, SafetyError };
