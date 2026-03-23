/**
 * ShuHub Frontend - 4段式设计
 * 左上: Agent 成员 | 右上: 代码浏览器
 * 左下: 任务      | 右下: 会话窗口
 * 中间: Agent 交互区（只读）
 */

class ShuHubUI {
  constructor() {
    this.agents = [
      { id: 'lingke', name: '凌刻', role: '技术开发', avatar: '🔧', color: '#dbeafe', status: 'online' },
      { id: 'xiaohui', name: '小绘', role: '创意设计', avatar: '🎨', color: '#fce7f3', status: 'online' },
      { id: 'yanjia', name: '岩甲', role: '安全运维', avatar: '🛡️', color: '#fef3c7', status: 'busy' },
      { id: 'bufu', name: '布土拨', role: '运营客服', avatar: '📊', color: '#d1fae5', status: 'offline' },
      { id: 'assistant', name: '小智', role: '前台助手', avatar: '🤖', color: '#f3e8ff', status: 'online' }
    ];
    
    this.tasks = [
      { id: 1, title: '实现 Safety 模块', agent: 'lingke', priority: 'high', done: true },
      { id: 2, title: '优化 Docker 配置', agent: 'lingke', priority: 'medium', done: false },
      { id: 3, title: '设计前端界面', agent: 'xiaohui', priority: 'high', done: false }
    ];
    
    // 交互日志（只读）
    this.interactionLogs = [
      { id: 1, type: 'system', time: '14:02:15', agent: '系统', content: '凌刻 开始执行任务: 实现 Safety 模块' },
      { id: 2, type: 'log', time: '14:02:18', agent: '凌刻', content: '正在初始化 SafetyModule...' },
      { id: 3, type: 'log', time: '14:02:20', agent: '凌刻', content: '配置文件加载完成' },
      { id: 4, type: 'log', time: '14:02:22', agent: '凌刻', content: '检查文件操作权限...' },
      { id: 5, type: 'log', time: '14:02:25', agent: '凌刻', content: '<code>checkFile("./workspace/test.js")</code> 通过' },
      { id: 6, type: 'log', time: '14:02:28', agent: '凌刻', content: '<code>checkCommand("ls -la")</code> 允许执行' },
      { id: 7, type: 'success', time: '14:02:30', agent: '凌刻', content: '✅ Safety 模块测试通过' }
    ];
    
    // 会话消息（可发送）
    this.chatMessages = [
      { id: 1, agent: 'assistant', content: '你好！我是小智，有什么可以帮你的？', time: '14:00', type: 'in' }
    ];
    
    this.currentAgent = 'assistant';
    this.tasksVisible = true;
    
    this.init();
  }
  
  init() {
    this.renderAgents();
    this.renderTasks();
    this.renderInteractionLogs();
    this.renderChatMessages();
    this.renderCode();
    this.updateChatAgentSelector();
    console.log('🔧 ShuHub 4段式 UI initialized');
  }
  
  /**
   * 渲染左侧 Agent 列表
   */
  renderAgents() {
    const container = document.getElementById('agentList');
    
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
        <div class="task-checkbox ${task.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTask(${task.id})">
          ${task.done ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title" style="${task.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</div>
          <div class="task-meta">@${this.getAgentName(task.agent)}</div>
        </div>
        <div class="task-priority priority-${task.priority}"></div>
      </div>
    `).join('');
  }
  
  /**
   * 渲染中间 Agent 交互日志（只读）
   */
  renderInteractionLogs() {
    const container = document.getElementById('interactionContent');
    
    container.innerHTML = this.interactionLogs.map(log => {
      const logClass = log.type === 'system' ? 'system' : (log.type === 'error' ? 'error' : '');
      return `
        <div class="interaction-log ${logClass}">
          <div class="log-time">${log.time}</div>
          <div class="log-agent">${log.agent}</div>
          <div class="log-content">${log.content}</div>
        </div>
      `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  }
  
  /**
   * 渲染右下会话消息
   */
  renderChatMessages() {
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = this.chatMessages.map(msg => {
      const agent = this.agents.find(a => a.id === msg.agent);
      const isOwn = msg.type === 'out';
      
      return `
        <div class="message ${isOwn ? 'own' : 'in'}">
          ${!isOwn ? `<div class="message-avatar" style="background: ${agent?.color || '#e2e8f0'}">${agent?.avatar || '👤'}</div>` : ''}
          <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
        </div>
      `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  }
  
  /**
   * 渲染右上代码浏览器
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
    this.updateChatAgentSelector();
    this.addInteractionLog('system', '系统', `切换到 ${this.getAgentName(agentId)}`);
    
    // 更新中间标题
    document.getElementById('currentAgentBadge').textContent = this.getAgentName(agentId);
    document.getElementById('interactionStatus').textContent = `${this.getAgentName(agentId)} 工作中...`;
  }
  
  /**
   * 更新会话窗口的 Agent 选择器
   */
  updateChatAgentSelector() {
    const agent = this.agents.find(a => a.id === this.currentAgent);
    if (agent) {
      document.getElementById('chatAgentAvatar').style.background = agent.color;
      document.getElementById('chatAgentAvatar').textContent = agent.avatar;
      document.getElementById('chatAgentName').textContent = agent.name;
    }
  }
  
  /**
   * 发送消息
   */
  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    // 添加到会话
    this.chatMessages.push({
      id: Date.now(),
      agent: 'user',
      content: content,
      time: this.getCurrentTime(),
      type: 'out'
    });
    this.renderChatMessages();
    
    // 添加到交互日志
    this.addInteractionLog('log', '你', `发送消息: "${content}"`);
    
    // 模拟 Agent 回复
    setTimeout(() => {
      const agent = this.agents.find(a => a.id === this.currentAgent);
      const reply = this.generateReply(content, agent);
      
      // 添加到会话
      this.chatMessages.push({
        id: Date.now() + 1,
        agent: agent?.id || 'assistant',
        content: reply,
        time: this.getCurrentTime(),
        type: 'in'
      });
      this.renderChatMessages();
      
      // 添加到交互日志
      this.addInteractionLog('log', agent?.name || 'Agent', `回复: "${reply.substring(0, 50)}..."`);
    }, 1000);
    
    input.value = '';
  }
  
  addInteractionLog(type, agent, content) {
    this.interactionLogs.push({
      id: Date.now(),
      type,
      time: this.getCurrentTimeFull(),
      agent,
      content
    });
    this.renderInteractionLogs();
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
    
    list.classList.toggle('collapsed', !this.tasksVisible);
    toggle.classList.toggle('collapsed', !this.tasksVisible);
  }
  
  /**
   * 切换任务完成状态
   */
  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      this.renderTasks();
      this.addInteractionLog('system', '系统', `任务 "${task.title}" ${task.done ? '已完成' : '重新打开'}`);
    }
  }
  
  /**
   * 显示 Agent 选择器
   */
  showAgentSelector() {
    // 简单实现：点击切换到下一个 Agent
    const currentIndex = this.agents.findIndex(a => a.id === this.currentAgent);
    const nextIndex = (currentIndex + 1) % this.agents.length;
    this.selectAgent(this.agents[nextIndex].id);
  }
  
  getAgentName(agentId) {
    const agent = this.agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  }
  
  getCurrentTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  getCurrentTimeFull() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 全局函数
function toggleTasks() { window.shuhub.toggleTasks(); }
function toggleTask(id) { window.shuhub.toggleTask(id); }
function sendMessage() { window.shuhub.sendMessage(); }
function showAgentSelector() { window.shuhub.showAgentSelector(); }
function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.shuhub = new ShuHubUI();
});
