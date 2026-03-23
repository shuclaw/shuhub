/**
 * ShuHub Frontend - 3段式设计
 * 左：Agent 成员 | 中：任务+聊天 | 右：代码浏览器
 */

class ShuHubUI {
  constructor() {
    this.agents = [
      { id: 'lingke', name: '凌刻', role: '技术开发', avatar: '🔧', color: '#dbeafe', status: 'online', progress: 75 },
      { id: 'xiaohui', name: '小绘', role: '创意设计', avatar: '🎨', color: '#fce7f3', status: 'online', progress: 60 },
      { id: 'yanjia', name: '岩甲', role: '安全运维', avatar: '🛡️', color: '#fef3c7', status: 'busy', progress: 90 },
      { id: 'bufu', name: '布土拨', role: '运营客服', avatar: '📊', color: '#d1fae5', status: 'offline', progress: 0 },
      { id: 'assistant', name: '小智', role: '前台助手', avatar: '🤖', color: '#f3e8ff', status: 'online', progress: 30 }
    ];
    
    this.tasks = [
      { id: 1, title: '实现 Safety 模块', agent: 'lingke', priority: 'high', done: true },
      { id: 2, title: '优化 Docker 配置', agent: 'lingke', priority: 'medium', done: false },
      { id: 3, title: '设计前端界面', agent: 'xiaohui', priority: 'high', done: false }
    ];
    
    this.messages = [
      { id: 1, agent: 'assistant', content: '你好！我是小智，有什么可以帮你的？', time: '12:30', type: 'in' }
    ];
    
    this.currentAgent = 'assistant';
    this.tasksVisible = true;
    
    this.init();
  }
  
  init() {
    this.renderAgents();
    this.renderTasks();
    this.renderMessages();
    this.renderCode();
    this.startStatusUpdate();
    console.log('🔧 ShuHub 3段式 UI initialized');
  }
  
  /**
   * 渲染左侧 Agent 列表
   */
  renderAgents() {
    const container = document.getElementById('agentList');
    
    // 添加"在线"分组标题
    const onlineAgents = this.agents.filter(a => a.status !== 'offline');
    const offlineAgents = this.agents.filter(a => a.status === 'offline');
    
    let html = '<div class="sidebar-title">在线</div>';
    
    onlineAgents.forEach(agent => {
      html += this.createAgentCard(agent);
    });
    
    if (offlineAgents.length > 0) {
      html += '<div class="sidebar-title" style="margin-top: 16px;">离线</div>';
      offlineAgents.forEach(agent => {
        html += this.createAgentCard(agent);
      });
    }
    
    container.innerHTML = html;
    
    // 绑定点击事件
    container.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectAgent(card.dataset.agentId);
      });
    });
  }
  
  createAgentCard(agent) {
    const isActive = agent.id === this.currentAgent;
    const statusClass = agent.status === 'online' ? '' : (agent.status === 'busy' ? 'busy' : 'offline');
    const cardClass = `agent-card ${isActive ? 'active' : ''} ${agent.status === 'offline' ? 'offline' : ''}`;
    
    return `
      <div class="${cardClass}" data-agent-id="${agent.id}">
        <div class="agent-header">
          <div class="agent-avatar" style="background: ${agent.color}">
            ${agent.avatar}
            <span class="avatar-badge ${statusClass}"></span>
          </div>
          <div class="agent-info">
            <h4>${agent.name}</h4>
            <p>${agent.role}</p>
          </div>
        </div>
        ${agent.status !== 'offline' ? `
          <div class="agent-status-bar">
            <div class="label">
              <span>当前任务</span>
              <span>${agent.progress}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${agent.progress}%"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * 渲染任务列表
   */
  renderTasks() {
    const list = document.getElementById('taskList');
    const count = document.getElementById('taskCount');
    
    count.textContent = this.tasks.length;
    
    list.innerHTML = this.tasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-checkbox ${task.done ? 'checked' : ''}" onclick="toggleTask(${task.id})">
          ${task.done ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title" style="${task.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</div>
          <div class="task-meta">@${this.getAgentName(task.agent)} · 2小时前</div>
        </div>
        <div class="task-priority priority-${task.priority}"></div>
      </div>
    `).join('');
  }
  
  /**
   * 渲染聊天消息
   */
  renderMessages() {
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = this.messages.map(msg => {
      const agent = this.agents.find(a => a.id === msg.agent);
      const isOwn = msg.type === 'out';
      const isSystem = msg.type === 'system';
      
      if (isSystem) {
        return `
          <div class="message system">
            <div class="message-bubble">${msg.content}</div>
          </div>
        `;
      }
      
      return `
        <div class="message ${isOwn ? 'own' : 'in'}">
          ${!isOwn ? `<div class="message-avatar" style="background: ${agent?.color || '#e2e8f0'}">${agent?.avatar || '👤'}</div>
          ` : ''}
          <div class="message-content">
            ${!isOwn ? `<div class="message-header">
              <span class="message-author">${agent?.name || '未知'}</span>
              <span class="message-time">${msg.time}</span>
            </div>` : ''}
            <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  }
  
  /**
   * 渲染代码浏览器
   */
  renderCode() {
    const code = `// Safety Module - 安全防护
class SafetyModule {
  constructor() {
    this.config = {
      allowDelete: false,
      allowExecute: false,
      forbiddenPaths: ['/etc', '/usr'],
      forbiddenCommands: ['rm -rf', 'format']
    };
  }
  
  checkFile(path) {
    // 检查禁止路径
    for (const forbidden of this.config.forbiddenPaths) {
      if (path.includes(forbidden)) {
        throw new Error('Forbidden path');
      }
    }
    return true;
  }
  
  checkCommand(cmd) {
    // 检查危险命令
    for (const forbidden of this.config.forbiddenCommands) {
      if (cmd.includes(forbidden)) {
        throw new Error('Dangerous command');
      }
    }
    return true;
  }
}`;

    const container = document.getElementById('codeContent');
    const lines = code.split('\n');
    
    container.innerHTML = lines.map((line, i) => {
      // 简单的语法高亮
      let highlighted = line
        .replace(/\b(class|constructor|const|let|var|if|for|of|return|throw|new|true|false)\b/g, '<span class="keyword">$1</span>')
        .replace(/(['"])(.*?)\1/g, '<span class="string">$1$2$1</span>')
        .replace(/\/\/.*$/, match => `<span class="comment">${match}</span>`)
        .replace(/\b(checkFile|checkCommand|includes|forEach)\b/g, '<span class="function">$1</span>');
      
      return `
        <div class="code-line">
          <span class="line-number">${i + 1}</span>
          <span class="line-content">${highlighted || '&nbsp;'}</span>
        </div>
      `;
    }).join('');
  }
  
  /**
   * 选择 Agent
   */
  selectAgent(agentId) {
    this.currentAgent = agentId;
    this.renderAgents();
    this.addMessage('system', `已切换到 ${this.getAgentName(agentId)}`, '12:35');
  }
  
  /**
   * 发送消息
   */
  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    // 添加用户消息
    this.addMessage('out', content, this.getCurrentTime());
    
    // 模拟回复
    setTimeout(() => {
      const agent = this.agents.find(a => a.id === this.currentAgent);
      const reply = this.generateReply(content, agent);
      this.addMessage(agent?.id || 'assistant', reply, this.getCurrentTime());
    }, 1000);
    
    input.value = '';
  }
  
  addMessage(type, content, time) {
    const agent = type === 'out' ? null : (type === 'system' ? null : type);
    this.messages.push({
      id: Date.now(),
      agent: agent,
      content,
      time,
      type: type === 'out' ? 'out' : (type === 'system' ? 'system' : 'in')
    });
    this.renderMessages();
  }
  
  generateReply(content, agent) {
    const replies = {
      lingke: `收到，我来处理：${content.substring(0, 20)}...`,
      xiaohui: `好的，我正在设计相关方案。`,
      yanjia: `正在检查安全策略...`,
      assistant: `我来帮您转达这个需求。`
    };
    return replies[agent?.id] || '收到，正在处理中...';
  }
  
  /**
   * 切换任务面板
   */
  toggleTasks() {
    this.tasksVisible = !this.tasksVisible;
    const list = document.getElementById('taskList');
    const toggle = document.getElementById('taskToggle');
    const header = document.querySelector('.task-header');
    
    list.classList.toggle('collapsed', !this.tasksVisible);
    toggle.classList.toggle('collapsed', !this.tasksVisible);
    header.classList.toggle('collapsed', !this.tasksVisible);
  }
  
  /**
   * 切换任务完成状态
   */
  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      this.renderTasks();
    }
  }
  
  /**
   * 清空聊天
   */
  clearChat() {
    this.messages = [];
    this.renderMessages();
  }
  
  /**
   * 获取 Agent 名称
   */
  getAgentName(agentId) {
    const agent = this.agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  }
  
  /**
   * 获取当前时间
   */
  getCurrentTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
   * 状态更新模拟
   */
  startStatusUpdate() {
    setInterval(() => {
      this.agents.forEach(agent => {
        if (agent.status !== 'offline') {
          // 随机微调进度
          const change = Math.random() > 0.5 ? 1 : -1;
          agent.progress = Math.max(0, Math.min(100, agent.progress + change));
        }
      });
      this.renderAgents();
    }, 5000);
  }
}

// 全局函数
function toggleTasks() { window.shuhub.toggleTasks(); }
function toggleTask(id) { window.shuhub.toggleTask(id); }
function sendMessage() { window.shuhub.sendMessage(); }
function clearChat() { window.shuhub.clearChat(); }
function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.shuhub = new ShuHubUI();
});
