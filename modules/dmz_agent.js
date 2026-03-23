/**
 * DMZ Agent Module
 * DMZ 隔离区 Agent - 安全上网，只能存本地文件
 */

const { BaseModule } = require('../base');
const fs = require('fs').promises;
const path = require('path');

class DMZAgentModule extends BaseModule {
    constructor() {
        super('DMZAgent');
        this.enabled = false;
        this.internetAccess = false;
        this.canWriteDB = false;    // 永远禁止
        this.localStorage = '/data/dmz/downloads';
        this.requireApproval = true;
        this.approvalQueue = [];
        this.allowedNetworks = ['0.0.0.0/0'];
        this.blockedNetworks = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
    }
    
    async init(config) {
        await super.init(config);
        
        this.enabled = config.enabled || false;
        this.internetAccess = config.internet_access || false;
        this.localStorage = config.local_storage || '/data/dmz/downloads';
        this.requireApproval = config.require_approval !== false;
        this.allowedNetworks = config.allow_networks || ['0.0.0.0/0'];
        this.blockedNetworks = config.block_networks || [];
        
        // 创建本地存储目录
        try {
            await fs.mkdir(this.localStorage, { recursive: true });
        } catch (err) {
            console.warn('[DMZAgent] Local storage directory creation failed:', err.message);
        }
        
        console.log(`[DMZAgent] Initialized: enabled=${this.enabled}, internet=${this.internetAccess}`);
    }
    
    /**
     * 开启上网功能
     */
    enableInternet() {
        this.internetAccess = true;
        this.emit('enable', { internetAccess: true });
        console.log('[DMZAgent] Internet access enabled');
    }
    
    /**
     * 关闭上网功能
     */
    disableInternet() {
        this.internetAccess = false;
        this.emit('disable', { internetAccess: false });
        console.log('[DMZAgent] Internet access disabled');
    }
    
    /**
     * 下载文件 - 只能存本地
     */
    async downloadFile(url, filename = null) {
        if (!this.enabled) {
            throw new Error('DMZ Agent is not enabled');
        }
        
        if (!this.internetAccess) {
            throw new Error('Internet access is disabled');
        }
        
        // 验证网络
        if (!this.isNetworkAllowed(url)) {
            throw new Error('Network is blocked');
        }
        
        // 下载到本地
        const savedPath = await this.downloadToLocal(url, filename);
        
        // 创建审批任务
        const approvalTask = await this.createApprovalTask(savedPath, url);
        
        // 通知管理员
        await this.notifyAdmin(approvalTask);
        
        return {
            status: 'pending_approval',
            taskId: approvalTask.id,
            localPath: savedPath,
            message: 'File downloaded, awaiting approval to move to database'
        };
    }
    
    /**
     * 下载到本地
     */
    async downloadToLocal(url, filename) {
        const axios = require('axios');
        
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        
        // 生成文件名
        const name = filename || this.generateFilename(url);
        const filePath = path.join(this.localStorage, name);
        
        // 写入本地文件
        await fs.writeFile(filePath, response.data);
        
        console.log(`[DMZAgent] Downloaded to: ${filePath}`);
        
        return filePath;
    }
    
    /**
     * 生成文件名
     */
    generateFilename(url) {
        const timestamp = Date.now();
        const urlHash = url.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return `dmz_${timestamp}_${Math.abs(urlHash)}.dat`;
    }
    
    /**
     * 检查网络是否允许
     */
    isNetworkAllowed(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // 检查是否在黑名单
            for (const blocked of this.blockedNetworks) {
                if (this.isInCIDR(hostname, blocked)) {
                    return false;
                }
            }
            
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 检查 IP 是否在 CIDR 范围内
     */
    isInCIDR(hostname, cidr) {
        // 简化实现：只检查内网地址
        const internalPatterns = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^localhost$/
        ];
        
        return internalPatterns.some(p => p.test(hostname));
    }
    
    /**
     * 创建审批任务
     */
    async createApprovalTask(localPath, sourceUrl) {
        const task = {
            id: `approval_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            localPath,
            sourceUrl,
            status: 'pending',
            createdAt: new Date(),
            createdBy: 'dmz_agent',
            metadata: {
                fileSize: (await fs.stat(localPath)).size,
                mimeType: this.guessMimeType(localPath)
            }
        };
        
        this.approvalQueue.push(task);
        this.emit('approval_task', task);
        
        return task;
    }
    
    /**
     * 猜测 MIME 类型
     */
    guessMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.zip': 'application/zip',
            '.json': 'application/json',
            '.txt': 'text/plain'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    /**
     * 通知管理员
     */
    async notifyAdmin(task) {
        // 通过 MessageBus 或其他方式通知
        this.emit('notify_admin', {
            type: 'approval_required',
            task
        });
        
        console.log(`[DMZAgent] Approval task created: ${task.id}`);
    }
    
    /**
     * 审批通过 - 移动到数据库
     */
    async approve(taskId, options = {}) {
        const task = this.approvalQueue.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Approval task not found: ${taskId}`);
        }
        
        if (task.status !== 'pending') {
            throw new Error(`Task already processed: ${task.status}`);
        }
        
        // 读取文件内容
        const fileContent = await fs.readFile(task.localPath);
        
        // 如果需要移动到数据库 (通过 Storage 模块)
        if (options.moveToStorage && this.storageModule) {
            await this.storageModule.save(`dmz/${taskId}`, {
                content: fileContent.toString('base64'),
                mimeType: task.metadata.mimeType,
                sourceUrl: task.sourceUrl,
                originalName: path.basename(task.localPath)
            }, { provider: 'postgres' });
        }
        
        // 删除本地文件
        await fs.unlink(task.localPath);
        
        // 更新任务状态
        task.status = 'approved';
        task.approvedAt = new Date();
        task.approvedBy = options.approvedBy || 'system';
        
        this.emit('approved', task);
        console.log(`[DMZAgent] Task approved: ${taskId}`);
        
        return {
            status: 'approved',
            task,
            movedToStorage: !!options.moveToStorage
        };
    }
    
    /**
     * 审批拒绝
     */
    async reject(taskId, reason = '', rejectedBy = 'system') {
        const task = this.approvalQueue.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Approval task not found: ${taskId}`);
        }
        
        // 删除本地文件
        try {
            await fs.unlink(task.localPath);
        } catch (err) {
            console.warn(`[DMZAgent] Failed to delete local file: ${err.message}`);
        }
        
        // 更新任务状态
        task.status = 'rejected';
        task.rejectedAt = new Date();
        task.rejectedBy = rejectedBy;
        task.rejectReason = reason;
        
        this.emit('rejected', task);
        console.log(`[DMZAgent] Task rejected: ${taskId}, reason: ${reason}`);
        
        return { status: 'rejected', task };
    }
    
    /**
     * 获取待审批队列
     */
    getApprovalQueue() {
        return this.approvalQueue.filter(t => t.status === 'pending');
    }
    
    /**
     * 获取所有任务
     */
    getAllTasks() {
        return [...this.approvalQueue];
    }
    
    /**
     * 写数据库 - 永远禁止
     */
    async writeDatabase(table, data) {
        throw new Error('Permission denied: DMZ agent cannot write to database');
    }
    
    /**
     * 设置存储模块
     */
    setStorageModule(storage) {
        this.storageModule = storage;
    }
    
    /**
     * 设置审批模块
     */
    setApprovalModule(approval) {
        this.approvalModule = approval;
    }
    
    status() {
        return {
            ...super.status(),
            enabled: this.enabled,
            internetAccess: this.internetAccess,
            canWriteDB: this.canWriteDB,
            localStorage: this.localStorage,
            requireApproval: this.requireApproval,
            pendingApprovals: this.approvalQueue.filter(t => t.status === 'pending').length,
            totalTasks: this.approvalQueue.length
        };
    }
}

module.exports = { DMZAgentModule };
