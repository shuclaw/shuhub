/**
 * InteractionLogResizable Component
 * 可调整大小的交互日志面板
 */

class InteractionLogResizable extends ResizablePanel {
  constructor(containerId, options = {}) {
    super(containerId, {
      title: options.title || '👁️ Agent 交互日志',
      width: options.width || 400,
      height: options.height || 300,
      minWidth: 300,
      minHeight: 150,
      maxWidth: 800,
      maxHeight: 600,
      ...options
    });
    
    this.state.logs = options.logs || [];
    this.state.autoScroll = options.autoScroll !== false;
    this.state.paused = false;
    this.maxLogs = options.maxLogs || 200;
  }
  
  renderContent() {
    const { logs, paused } = this.state;
    
    return `
      <div class="interaction-log-resizable">
        ${paused ? '<div class="log-paused-badge">⏸️ 已暂停</div>' : ''}
        
        <div class="log-list-resizable" id="${this.container.id}-list">
          ${logs.length === 0 ? `
            <div class="log-empty-resizable">
              <div class="empty-icon">📋</div>
              <div>暂无交互日志</div>
            </div>
          ` : logs.map(log => this.renderLog(log)).join('')}
        </div>
        
        ${logs.length > 0 ? `
          <div class="log-footer">
            <span>共 ${logs.length} 条日志</span>
            <button class="log-clear-btn" data-action="clear">清空</button>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  renderLog(log) {
    const icons = {
      system: '⚙️',
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      command: '⌨️',
      result: '📤'
    };
    
    const typeClass = log.type || 'info';
    
    return `
      <div class="log-entry-resizable ${typeClass}">
        <div class="log-header-resizable">
          <span class="log-icon">${icons[typeClass] || '•'}</span>
          <span class="log-time-resizable">${log.time}</span>
          <span class="log-agent-resizable">${log.agent}</span>
        </div>
        <div class="log-content-resizable">${this.formatContent(log.content)}</div>
      </div>
    `;
  }
  
  formatContent(content) {
    return content
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  bindEvents() {
    super.bindEvents();
    
    this.on('click', '[data-action="clear"]', () => {
      this.clear();
    });
    
    // 监听日志列表滚动
    const list = this.container.querySelector('.log-list-resizable');
    if (list) {
      list.addEventListener('scroll', () => {
        const isAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 50;
        if (!isAtBottom && this.state.autoScroll) {
          this.setState({ autoScroll: false });
        } else if (isAtBottom && !this.state.autoScroll) {
          this.setState({ autoScroll: true });
        }
      });
    }
  }
  
  add(log) {
    if (this.state.paused) return;
    
    const logs = [...this.state.logs, { ...log, id: Date.now() }];
    
    if (logs.length > this.maxLogs) {
      logs.shift();
    }
    
    this.setState({ logs });
    
    if (this.state.autoScroll) {
      this.scrollToBottom();
    }
    
    this.emit('log:add', { log });
  }
  
  log(agent, content, type = 'info') {
    this.add({
      type,
      agent,
      content,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    });
  }
  
  system(content) {
    this.log('系统', content, 'system');
  }
  
  success(agent, content) {
    this.log(agent, content, 'success');
  }
  
  error(agent, content) {
    this.log(agent, content, 'error');
  }
  
  clear() {
    this.setState({ logs: [] });
    this.emit('log:clear');
  }
  
  togglePause() {
    this.setState({ paused: !this.state.paused });
    this.emit('log:pause', { paused: this.state.paused });
  }
  
  scrollToBottom() {
    setTimeout(() => {
      const list = this.container.querySelector('.log-list-resizable');
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    }, 10);
  }
}

// 样式
const interactionLogResizableStyles = `
  .interaction-log-resizable {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }
  .log-paused-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 20px;
    font-size: 11px;
    color: #92400e;
    z-index: 10;
  }
  .log-list-resizable {
    flex: 1;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.6;
    padding-right: 4px;
  }
  .log-empty-resizable {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #94a3b8;
  }
  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  .log-entry-resizable {
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 8px;
    border-left: 3px solid #6366f1;
    animation: fadeIn 0.3s ease;
  }
  .log-entry-resizable.system {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  .log-entry-resizable.success {
    border-left-color: #22c55e;
    background: #f0fdf4;
  }
  .log-entry-resizable.error {
    border-left-color: #ef4444;
    background: #fef2f2;
  }
  .log-header-resizable {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .log-icon {
    font-size: 14px;
  }
  .log-time-resizable {
    font-size: 10px;
    color: #94a3b8;
  }
  .log-agent-resizable {
    font-size: 11px;
    font-weight: 600;
    color: #6366f1;
  }
  .log-content-resizable {
    color: #475569;
    word-break: break-word;
  }
  .inline-code {
    background: rgba(99,102,241,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: #6366f1;
  }
  .log-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid rgba(226,232,240,0.6);
    font-size: 11px;
    color: #94a3b8;
  }
  .log-clear-btn {
    padding: 4px 12px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .log-clear-btn:hover {
    background: #fef2f2;
    border-color: #ef4444;
    color: #ef4444;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = interactionLogResizableStyles;
document.head.appendChild(styleSheet);

window.InteractionLogResizable = InteractionLogResizable;
