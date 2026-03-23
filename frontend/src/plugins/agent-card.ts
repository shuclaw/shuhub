/**
 * AgentCard Plugin
 * Agent 卡片插件 - 可放置到白板上的 Agent 组件
 */

import type { Plugin, PluginContext, ElementData } from '../types';

export const AgentCardPlugin: Plugin = {
  manifest: {
    id: 'shuhub.agent-card',
    name: 'Agent 卡片',
    version: '1.0.0',
    description: '在白板上显示 Agent 信息',
    icon: '🔧',
    category: 'agent'
  },
  
  activate(context: PluginContext): void {
    // 注册组件
    context.registerComponent('agent-card', AgentCardComponent);
    
    // 注册工具
    context.registerTool('add-agent', {
      id: 'add-agent',
      name: '添加 Agent',
      icon: '🔧',
      category: 'agent',
      execute: async (ctx) => {
        const agent = await ctx.workspace.addElement({
          type: 'agent-card',
          pluginId: 'shuhub.agent-card',
          x: 100,
          y: 100,
          width: 200,
          height: 80,
          content: {
            name: '新 Agent',
            role: '未分配',
            status: 'offline'
          },
          style: {
            backgroundColor: '#f8fafc'
          }
        });
        
        return agent;
      }
    });
    
    context.logger.info('AgentCard Plugin activated');
  }
};

/**
 * Agent Card 组件实现
 */
class AgentCardComponent {
  private element: HTMLElement;
  private data: ElementData;
  
  constructor(container: HTMLElement, props: { data: ElementData }) {
    this.data = props.data;
    this.element = document.createElement('div');
    this.element.className = 'plugin-agent-card';
    
    this.render();
    container.appendChild(this.element);
  }
  
  render(): void {
    const { content, style } = this.data;
    
    this.element.innerHTML = `
      <div class="agent-card-wrapper" style="background: ${style?.backgroundColor || '#fff'}">
        <div class="agent-avatar" style="background: ${content.avatarColor || '#e2e8f0'}">
          ${content.avatar || '🤖'}
        </div>
        <div class="agent-info">
          <div class="agent-name">${content.name}</div>
          <div class="agent-role">${content.role}</div>
          <div class="agent-status status-${content.status || 'offline'}"></div>
        </div>
        <div class="agent-actions">
          <button class="action-btn" data-action="chat" title="对话">💬</button>
          <button class="action-btn" data-action="task" title="分配任务">📋</button>
        </div>
      </div>
    `;
    
    this.bindEvents();
  }
  
  bindEvents(): void {
    this.element.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        this.handleAction(action);
      });
    });
  }
  
  handleAction(action: string | undefined): void {
    switch (action) {
      case 'chat':
        this.emit('agent:chat', { agentId: this.data.id });
        break;
      case 'task':
        this.emit('agent:task', { agentId: this.data.id });
        break;
    }
  }
  
  update(props: { data: ElementData }): void {
    this.data = props.data;
    this.render();
  }
  
  destroy(): void {
    this.element.remove();
  }
  
  emit(event: string, data?: any): void {
    this.element.dispatchEvent(new CustomEvent(event, { detail: data, bubbles: true }));
  }
  
  on(event: string, callback: Function): void {
    this.element.addEventListener(event, callback as EventListener);
  }
}

// 样式
const styles = `
  .plugin-agent-card {
    width: 100%;
    height: 100%;
  }
  
  .agent-card-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    border: 2px solid transparent;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    height: 100%;
    transition: all 0.2s;
  }
  
  .agent-card-wrapper:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 16px rgba(99,102,241,0.15);
  }
  
  .agent-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .agent-info {
    flex: 1;
    min-width: 0;
  }
  
  .agent-name {
    font-weight: 600;
    font-size: 15px;
    color: #1e293b;
    margin-bottom: 2px;
  }
  
  .agent-role {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
  }
  
  .agent-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  
  .agent-status.online {
    background: #22c55e;
    box-shadow: 0 0 0 2px rgba(34,197,94,0.3);
  }
  
  .agent-status.offline {
    background: #9ca3af;
  }
  
  .agent-status.busy {
    background: #f59e0b;
  }
  
  .agent-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .agent-card-wrapper:hover .agent-actions {
    opacity: 1;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(99,102,241,0.1);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .action-btn:hover {
    background: #6366f1;
    color: #fff;
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
