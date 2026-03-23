/**
 * ShuHub Frontend - Web UI 交互
 */

class ShuHubUI {
    constructor() {
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.logContainer = document.getElementById('logContainer');
        
        this.currentAgent = 'assistant';
        this.agents = new Map();
        this.tasks = new Map();
        this.ws = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.connectWebSocket();
        this.loadAgents();
        console.log('🔧 ShuHub UI initialized');
    }
    
    bindEvents() {
        // 发送消息
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Agent 切换
        document.querySelectorAll('.agent-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.agent-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentAgent = item.dataset.agent;
                this.addLog(`切换至 ${this.getAgentName(this.currentAgent)}`, 'info');
            });
        });
    }
    
    /**
     * 连接 WebSocket
     */
    connectWebSocket() {
        const wsUrl = window.location.protocol === 'https:' 
            ? `wss://${window.location.host}/ws`
            : `ws://${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.addLog('WebSocket 已连接', 'success');
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('❌ WebSocket disconnected');
                this.addLog('WebSocket 断开，5秒后重连...', 'warning');
                setTimeout(() => this.connectWebSocket(), 5000);
            };
            
            this.ws.onerror = (err) => {
                console.error('WebSocket error:', err);
                this.addLog('WebSocket 错误', 'error');
            };
            
        } catch (err) {
            console.warn('WebSocket not available, using polling');
            this.startPolling();
        }
    }
    
    /**
     * 处理 WebSocket 消息
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'message':
                this.addMessage(data.agent, data.content, false);
                break;
            case 'task_update':
                this.updateTask(data.task);
                break;
            case 'agent_status':
                this.updateAgentStatus(data.agent, data.status);
                break;
            case 'log':
                this.addLog(data.message, data.level);
                break;
        }
    }
    
    /**
     * 轮询模式（WebSocket 不可用时）
     */
    startPolling() {
        setInterval(() => {
            this.fetchUpdates();
        }, 3000);
    }
    
    async fetchUpdates() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            this.updateUI(data);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }
    
    /**
     * 发送消息
     */
    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;
        
        // 添加用户消息
        this.addMessage('user', content, true);
        this.messageInput.value = '';
        
        // 发送给后端
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    agent: this.currentAgent,
                    sessionId: this.getSessionId()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 显示 Agent 回复
                setTimeout(() => {
                    this.addMessage(data.agent, data.response, false);
                }, 500);
                
                // 更新任务
                if (data.task) {
                    this.updateTask(data.task);
                }
            } else {
                this.addMessage('system', `错误: ${data.error}`, false);
            }
            
        } catch (err) {
            this.addMessage('system', '网络错误，请重试', false);
            console.error('Send error:', err);
        }
    }
    
    /**
     * 添加消息到界面
     */
    addMessage(agent, content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : ''}`;
        
        const agentInfo = this.getAgentInfo(agent);
        const time = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar" style="background: ${agentInfo.color}">
                ${agentInfo.avatar}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${agentInfo.name}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-body">${this.escapeHtml(content)}</div>
            </div>
        `;
        
        this.messages.appendChild(messageDiv);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
    
    /**
     * 获取 Agent 信息
     */
    getAgentInfo(agent) {
        const agents = {
            user: { name: '你', avatar: '👤', color: '#667eea' },
            assistant: { name: '小智', avatar: '🤖', color: '#f3e8ff' },
            lingke: { name: '凌刻', avatar: '🔧', color: '#dbeafe' },
            xiaohui: { name: '小绘', avatar: '🎨', color: '#fce7f3' },
            yanjia: { name: '岩甲', avatar: '🛡️', color: '#fef3c7' },
            bufu: { name: '布土拨', avatar: '📊', color: '#d1fae5' },
            system: { name: '系统', avatar: '⚙️', color: '#fee2e2' }
        };
        return agents[agent] || agents.system;
    }
    
    getAgentName(agentId) {
        return this.getAgentInfo(agentId).name;
    }
    
    /**
     * 更新任务显示
     */
    updateTask(task) {
        // 简化实现，实际应该更新右侧面板的任务列表
        console.log('Task update:', task);
    }
    
    /**
     * 更新 Agent 状态
     */
    updateAgentStatus(agent, status) {
        const agentItem = document.querySelector(`[data-agent="${agent}"]`);
        if (agentItem) {
            const statusEl = agentItem.querySelector('.agent-status');
            statusEl.className = `agent-status status-${status}`;
        }
    }
    
    /**
     * 添加日志
     */
    addLog(message, level = 'info') {
        const time = new Date().toLocaleTimeString('zh-CN', {
            hour12: false
        });
        
        const logDiv = document.createElement('div');
        logDiv.className = 'log-entry';
        logDiv.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-${level}">[${level.toUpperCase()}]</span> ${this.escapeHtml(message)}
        `;
        
        this.logContainer.appendChild(logDiv);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // 限制日志数量
        while (this.logContainer.children.length > 50) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }
    
    /**
     * 加载 Agents
     */
    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            const data = await response.json();
            
            if (data.agents) {
                data.agents.forEach(agent => {
                    this.agents.set(agent.id, agent);
                });
            }
        } catch (err) {
            console.warn('Failed to load agents:', err);
        }
    }
    
    /**
     * 获取会话 ID
     */
    getSessionId() {
        let sessionId = localStorage.getItem('shuhub_session');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('shuhub_session', sessionId);
        }
        return sessionId;
    }
    
    /**
     * 转义 HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 更新 UI
     */
    updateUI(data) {
        // 更新 Agent 状态
        if (data.agents) {
            data.agents.forEach(agent => {
                this.updateAgentStatus(agent.id, agent.status);
            });
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.shuhub = new ShuHubUI();
});
