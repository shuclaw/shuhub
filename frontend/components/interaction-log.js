/**
 * InteractionLog Component
 * Agent 交互日志组件（只读）
 */

class InteractionLog extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      logs: options.logs || [],
      title: options.title || 'Agent 交互日志',
      maxLogs: options.maxLogs || 100
    };
    this.autoScroll = options.autoScroll !== false;
  }
  
  render() {
    const { logs, title } = this.state;
    
    this.container.innerHTML = `
      <div class="interaction-header">
        <div class="interaction-title">
          <span>👁️ ${title}</span>
          <span class="log-count">${logs.length}</span>
        </div>
        <div class="interaction-actions">
          <button class="action-btn" data-action="clear" title="清空">🗑️</button>
          <button class="action-btn" data-action="pause" title="暂停">⏸️</button>
        </div>
      </div>
      
      <div class="interaction-content" id="${this.container.id}-content">
        ${logs.length === 0 ? `
          <div class="log-empty">暂无日志</div>
        ` : logs.map(log => this.renderLogItem(log)).join('')}
      </div>
    `;
    
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }
  
  renderLogItem(log) {
    const typeClass = log.type || 'info';
    const typeIcon = {
      system: '⚙️',
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      command: '⌨️',
      result: '📤'
    }[typeClass] || '•';
    
    return `
      <div class="log-item ${typeClass}" data-log-id="${log.id}">
        <div class="log-header">
          <span class="log-time">${log.time}</span>
          <span class="log-type-icon">${typeIcon}</span>
          <span class="log-agent">${log.agent}</span>
        </div>
        <div class="log-body">${this.formatContent(log.content)}</div>
      </div>
    `;
  }
  
  formatContent(content) {
    // 高亮代码块
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  bindEvents() {
    this.on('click', '[data-action="clear"]', () => {
      this.clear();
    });
    
    this.on('click', '[data-action="pause"]', (e) => {
      this.autoScroll = !this.autoScroll;
      e.target.textContent = this.autoScroll ? '⏸️' : '▶️';
      e.target.title = this.autoScroll ? '暂停' : '继续';
    });
  }
  
  // 添加日志
  add(log) {
    const logs = [...this.state.logs, { ...log, id: Date.now() }];
    
    // 限制数量
    if (logs.length > this.state.maxLogs) {
      logs.shift();
    }
    
    this.setState({ logs });
    this.emit('log:add', { log });
  }
  
  // 添加系统日志
  system(content) {
    this.add({
      type: 'system',
      agent: '系统',
      content,
      time: this.getCurrentTime()
    });
  }
  
  // 添加 Agent 日志
  log(agent, content, type = 'info') {
    this.add({
      type,
      agent,
      content,
      time: this.getCurrentTime()
    });
  }
  
  // 清空日志
  clear() {
    this.setState({ logs: [] });
    this.emit('log:clear');
  }
  
  // 导出日志
  export() {
    return this.state.logs.map(log => 
      `[${log.time}] ${log.agent}: ${log.content}`
    ).join('\n');
  }
  
  scrollToBottom() {
    setTimeout(() => {
      const content = this.container.querySelector('.interaction-content');
      if (content) {
        content.scrollTop = content.scrollHeight;
      }
    }, 10);
  }
  
  getCurrentTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }
}

// 样式
const interactionLogStyles = `
  .interaction-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid rgba(226,232,240,0.6);
  }
  .interaction-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
  }
  .log-count {
    padding: 2px 8px;
    background: rgba(99,102,241,0.1);
    border-radius: 10px;
    font-size: 11px;
    color: #6366f1;
  }
  .interaction-actions {
    display: flex;
    gap: 4px;
  }
  .action-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .action-btn:hover {
    background: rgba(0,0,0,0.05);
  }
  .interaction-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.7;
  }
  .log-empty {
    text-align: center;
    padding: 40px;
    color: #94a3b8;
  }
  .log-item {
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #fff;
    border-radius: 8px;
    border-left: 3px solid #6366f1;
    animation: fadeIn 0.3s ease;
  }
  .log-item.system {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  .log-item.success {
    border-left-color: #22c55e;
    background: #f0fdf4;
  }
  .log-item.warning {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  .log-item.error {
    border-left-color: #ef4444;
    background: #fef2f2;
  }
  .log-item.command {
    border-left-color: #8b5cf6;
    background: #faf5ff;
  }
  .log-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .log-time {
    font-size: 11px;
    color: #94a3b8;
  }
  .log-type-icon {
    font-size: 12px;
  }
  .log-agent {
    font-weight: 600;
    color: #6366f1;
  }
  .log-body {
    color: #475569;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .log-body code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: #6366f1;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = interactionLogStyles;
document.head.appendChild(styleSheet);

window.InteractionLog = InteractionLog;
