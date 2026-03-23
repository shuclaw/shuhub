/**
 * Approval Module - 审批工作流 (鼠爪的职责)
 */

const { BaseModule } = require('../base');

class ApprovalModule extends BaseModule {
    constructor() {
        super('Approval');
        this.pending = [];      // 待审批
        this.approved = [];     // 已批准
        this.rejected = [];     // 已拒绝
        this.listeners = [];
    }
    
    async init(config) {
        await super.init(config);
        
        this.approvers = config.approvers || ['鼠爪', 'admin'];
        this.autoApprove = config.autoApprove || false;  // 自动批准小任务
        this.notificationUrl = config.notificationUrl;  // 通知回调
        
        // 审批规则
        this.rules = config.rules || [
            { type: 'dmz_download', requireApproval: true },
            { type: 'code_deploy', requireApproval: true, approver: '鼠爪' },
            { type: 'data_export', requireApproval: true },
            { type: 'sensitive_operation', requireApproval: true, approver: 'admin' }
        ];
        
        console.log(`[Approval] Initialized with ${this.approvers.length} approvers`);
    }
    
    /**
     * 创建审批请求
     */
    async createRequest(request) {
        const approvalItem = {
            id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: request.type,
            title: request.title,
            description: request.description,
            requester: request.requester,
            data: request.data,
            status: 'pending',
            approvers: this.getApprovers(request.type),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.pending.push(approvalItem);
        
        // 通知审批者
        await this.notify(approvalItem);
        
        return approvalItem;
    }
    
    /**
     * 获取审批人
     */
    getApprovers(type) {
        const rule = this.rules.find(r => r.type === type);
        if (rule?.approver) {
            return [rule.approver];
        }
        return this.approvers;
    }
    
    /**
     * 批准
     */
    async approve(approvalId, approver, comment = '') {
        const item = this.pending.find(a => a.id === approvalId);
        if (!item) {
            throw new Error(`Approval ${approvalId} not found`);
        }
        
        // 检查权限
        if (!item.approvers.includes(approver)) {
            throw new Error(`Unauthorized: ${approver} cannot approve this`);
        }
        
        item.status = 'approved';
        item.approver = approver;
        item.comment = comment;
        item.approvedAt = new Date().toISOString();
        
        // 移动到已批准
        this.pending = this.pending.filter(a => a.id !== approvalId);
        this.approved.push(item);
        
        // 回调通知
        if (item.callbackUrl) {
            await this.notifyCallback(item);
        }
        
        return item;
    }
    
    /**
     * 拒绝
     */
    async reject(approvalId, approver, reason = '') {
        const item = this.pending.find(a => a.id === approvalId);
        if (!item) {
            throw new Error(`Approval ${approvalId} not found`);
        }
        
        item.status = 'rejected';
        item.approver = approver;
        item.reason = reason;
        item.rejectedAt = new Date().toISOString();
        
        this.pending = this.pending.filter(a => a.id !== approvalId);
        this.rejected.push(item);
        
        return item;
    }
    
    /**
     * 获取待审批列表
     */
    getPending(approver = null) {
        if (!approver) return this.pending;
        return this.pending.filter(a => a.approvers.includes(approver));
    }
    
    /**
     * 获取已审批列表
     */
    getHistory(limit = 50) {
        return {
            approved: this.approved.slice(-limit),
            rejected: this.rejected.slice(-limit)
        };
    }
    
    /**
     * 通知审批者
     */
    async notify(item) {
        console.log(`[Approval] Notification: ${item.type} - ${item.title}`);
        
        if (this.notificationUrl) {
            try {
                await fetch(this.notificationUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'approval_required',
                        item
                    })
                });
            } catch (err) {
                console.error('[Approval] Notification failed:', err.message);
            }
        }
    }
    
    /**
     * 回调通知
     */
    async notifyCallback(item) {
        if (item.callbackUrl) {
            try {
                await fetch(item.callbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        approvalId: item.id,
                        status: item.status,
                        result: item.status === 'approved' ? item.data : null
                    })
                });
            } catch (err) {
                console.error('[Approval] Callback failed:', err.message);
            }
        }
    }
    
    /**
     * 统计
     */
    getStats() {
        return {
            pending: this.pending.length,
            approvedToday: this.approved.filter(a => 
                a.approvedAt && new Date(a.approvedAt).toDateString() === new Date().toDateString()
            ).length,
            rejectedToday: this.rejected.filter(a => 
                a.rejectedAt && new Date(a.rejectedAt).toDateString() === new Date().toDateString()
            ).length
        };
    }
    
    async health() {
        return {
            module: 'Approval',
            status: 'healthy',
            pending: this.pending.length,
            approvers: this.approvers
        };
    }
    
    destroy() {
        this.pending = [];
        this.approved = [];
        this.rejected = [];
    }
}

module.exports = { ApprovalModule };
