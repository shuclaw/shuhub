/**
 * ChatWindow Component
 * 会话窗口组件
 */

class ChatWindow extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      messages: options.messages || [],
      currentAgent: options.currentAgent || null,
      agents: options.agents || [],
      title: options.title || '会话',
      placeholder: options.placeholder || '输入消息...'
    };
    this.onSend = options.onSend || (() => {});
  }
  
  render() {
    const { messages, currentAgent, title } = this.state;
    const agent = this.state.agents.find(a => a.id === currentAgent);
    
    this.container.innerHTML = `
      <div class="chat-header">
        <div class="chat-title">💬 ${title}</div>
        
        <div class="chat-agent-selector" data-action="select-agent">
          ${agent ? `
            <span class="chat-agent-avatar" style="background: ${agent.color}">${agent.avatar}</span>
            <span class="chat-agent-name">${agent.name}</span>
          ` : '<span>选择 Agent</span>'}
          <span class="dropdown-arrow">▼</span>
        </div>
      </div>
      
      <div class="chat-messages">
        ${messages.length === 0 ? `
          <div class="chat-welcome">
            <div class="welcome-icon">💬</div>
            <div class="welcome-text">开始对话吧</div>
          </div>
        ` : messages.map(msg => this.renderMessage(msg)).join('')}
      </div>
      
      <div class="chat-input-area">
        <div class="chat-toolbar">
          <button class="toolbar-btn" data-action="file" title="文件">📎</button>
          <button class="toolbar-btn" data-action="emoji" title="表情">😊</button>
          <button class="toolbar-btn" data-action="code" title="代码">📝</button>
          <span class="toolbar-divider"></span>
          <button class="toolbar-btn" data-action="annotate" title="标注">✏️</button>
          <button class="toolbar-btn" data-action="screenshot" title="截图">📷</button>
        </div>
        
        <div class="chat-input-row">
          <input type="text" 
                 class="chat-input" 
                 placeholder="${this.state.placeholder}" 
                 data-input="message"
                 onkeypress="if(event.key==='Enter') this.closest('.chat-window').querySelector('[data-action=send]').click()">
          <button class="send-btn" data-action="send" title="发送">➤</button>
        </div>
      </div>
    `;
    
    this.scrollToBottom();
  }
  
  renderMessage(msg) {
    const isOwn = msg.type === 'out';
    const agent = this.state.agents.find(a => a.id === msg.agent);
    
    return `
      <div class="chat-message ${isOwn ? 'own' : 'in'}">
        ${!isOwn ? `
          <div class="message-avatar" style="background: ${agent?.color || '#e2e8f0'}">${agent?.avatar || '👤'}</div>
        ` : ''}
        
        <div class="message-bubble">
          ${!isOwn ? `<div class="message-author">${agent?.name || '未知'}</div>` : ''}
          <div class="message-content">${this.escapeHtml(msg.content)}</div>
          <div class="message-time">${msg.time || ''}</div>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    // 发送消息
    this.on('click', '[data-action="send"]', () => {
      const input = this.container.querySelector('[data-input="message"]');
      const content = input.value.trim();
      
      if (!content) return;
      
      this.send(content);
      input.value = '';
    });
    
    // 选择 Agent
    this.on('click', '[data-action="select-agent"]', () => {
      this.emit('agent:selector:click');
    });
    
    // 工具栏按钮
    this.on('click', '[data-action="file"]', () => this.emit('toolbar:file'));
    this.on('click', '[data-action="emoji"]', () => this.emit('toolbar:emoji'));
    this.on('click', '[data-action="code"]', () => this.emit('toolbar:code'));
    this.on('click', '[data-action="annotate"]', () => this.emit('toolbar:annotate'));
    this.on('click', '[data-action="screenshot"]', () => this.emit('toolbar:screenshot'));
  }
  
  send(content) {
    const message = {
      id: Date.now(),
      agent: 'user',
      content,
      time: this.getCurrentTime(),
      type: 'out'
    };
    
    this.setState({ messages: [...this.state.messages, message] });
    this.emit('message:send', { content, agent: this.state.currentAgent });
    
    // 回调
    if (this.onSend) {
      this.onSend(content, this.state.currentAgent);
    }
  }
  
  receive(agentId, content) {
    const message = {
      id: Date.now(),
      agent: agentId,
      content,
      time: this.getCurrentTime(),
      type: 'in'
    };
    
    this.setState({ messages: [...this.state.messages, message] });
    this.emit('message:receive', { agentId, content });
  }
  
  setAgent(agentId) {
    this.setState({ currentAgent: agentId });
    this.emit('agent:change', { agentId });
  }
  
  clear() {
    this.setState({ messages: [] });
    this.emit('chat:clear');
  }
  
  scrollToBottom() {
    setTimeout(() => {
      const messages = this.container.querySelector('.chat-messages');
      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      }
    }, 10);
  }
  
  getCurrentTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 样式
const chatWindowStyles = `
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #f8fafc;
    border-bottom: 1px solid rgba(226,232,240,0.6);
  }
  .chat-title {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
  }
  .chat-agent-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .chat-agent-selector:hover {
    border-color: #6366f1;
    background: rgba(99,102,241,0.05);
  }
  .chat-agent-avatar {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .chat-agent-name {
    font-size: 12px;
    color: #1e293b;
  }
  .dropdown-arrow {
    font-size: 10px;
    color: #94a3b8;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .chat-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #94a3b8;
  }
  .welcome-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
  .welcome-text {
    font-size: 14px;
  }
  .chat-message {
    display: flex;
    gap: 8px;
    max-width: 85%;
    animation: fadeIn 0.3s ease;
  }
  .chat-message.own {
    flex-direction: row-reverse;
    align-self: flex-end;
  }
  .message-avatar {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .message-bubble {
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 100%;
  }
  .chat-message.in .message-bubble {
    background: #f1f5f9;
    border-radius: 12px 12px 12px 4px;
  }
  .chat-message.own .message-bubble {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border-radius: 12px 12px 4px 12px;
  }
  .message-author {
    font-size: 11px;
    font-weight: 600;
    color: #6366f1;
    margin-bottom: 2px;
  }
  .chat-message.own .message-author {
    color: rgba(255,255,255,0.8);
  }
  .message-content {
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }
  .message-time {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 4px;
    text-align: right;
  }
  .chat-message.own .message-time {
    color: rgba(255,255,255,0.7);
  }
  .chat-input-area {
    padding: 10px 12px;
    border-top: 1px solid rgba(226,232,240,0.6);
    background: #fff;
  }
  .chat-toolbar {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .toolbar-btn {
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
    color: #64748b;
    transition: all 0.2s;
  }
  .toolbar-btn:hover {
    background: rgba(99,102,241,0.1);
    color: #6366f1;
  }
  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: #e2e8f0;
    margin: 0 4px;
  }
  .chat-input-row {
    display: flex;
    gap: 8px;
  }
  .chat-input {
    flex: 1;
    height: 36px;
    background: #f8fafc;
    border: 1px solid rgba(226,232,240,0.8);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    outline: none;
    transition: all 0.2s;
  }
  .chat-input:focus {
    background: #fff;
    border-color: rgba(99,102,241,0.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .send-btn {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .send-btn:hover {
    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = chatWindowStyles;
document.head.appendChild(styleSheet);

window.ChatWindow = ChatWindow;
