/**
 * TaskSticky Plugin
 * 任务便签插件 - 可放置到白板上的任务卡片
 */

import type { Plugin, PluginContext } from '../types';

export const TaskStickyPlugin: Plugin = {
  manifest: {
    id: 'shuhub.task-sticky',
    name: '任务便签',
    version: '1.0.0',
    description: '在白板上添加任务便签',
    icon: '📋',
    category: 'task'
  },
  
  activate(context: PluginContext): void {
    context.registerComponent('task-sticky', TaskStickyComponent);
    
    context.registerTool('add-task', {
      id: 'add-task',
      name: '添加任务',
      icon: '📋',
      category: 'task',
      execute: async (ctx) => {
        return await ctx.workspace.addElement({
          type: 'task-sticky',
          pluginId: 'shuhub.task-sticky',
          x: 150,
          y: 150,
          width: 180,
          height: 120,
          content: {
            title: '新任务',
            status: 'pending',
            priority: 'medium',
            assignee: null
          },
          style: {
            backgroundColor: '#fef3c7'
          }
        });
      }
    });
    
    context.logger.info('TaskSticky Plugin activated');
  }
};

/**
 * Task Sticky 组件
 */
class TaskStickyComponent {
  private element: HTMLElement;
  private data: any;
  
  constructor(container: HTMLElement, props: { data: any }) {
    this.data = props.data;
    this.element = document.createElement('div');
    this.element.className = 'plugin-task-sticky';
    this.render();
    container.appendChild(this.element);
  }
  
  render(): void {
    const { content, style } = this.data;
    const priorityColors: Record<string, string> = {
      high: '#fee2e2',
      medium: '#fef3c7',
      low: '#d1fae5'
    };
    
    const bgColor = priorityColors[content.priority] || style?.backgroundColor || '#fef3c7';
    
    this.element.innerHTML = `
      <div class="task-sticky-wrapper" style="background: ${bgColor}">
        <div class="task-header">
          <div class="task-checkbox ${content.status === 'completed' ? 'checked' : ''}"
               data-action="toggle">
            ${content.status === 'completed' ? '✓' : ''}
          </div>
          <div class="task-priority priority-${content.priority}"></div>
        </div>
        
        <div class="task-title" contenteditable="true">${content.title}</div>
        
        <div class="task-footer">
          ${content.assignee ? `
            <div class="task-assignee">@${content.assignee}</div>
          ` : ''}
          <div class="task-actions">
            <button class="task-action-btn" data-action="edit">✏️</button>
            <button class="task-action-btn" data-action="delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
    
    this.bindEvents();
  }
  
  bindEvents(): void {
    // 勾选完成
    this.element.querySelector('[data-action="toggle"]')?.addEventListener('click', () => {
      const isDone = this.data.content.status === 'completed';
      this.data.content.status = isDone ? 'pending' : 'completed';
      this.render();
      this.emit('task:toggle', { id: this.data.id, done: !isDone });
    });
    
    // 编辑标题
    const titleEl = this.element.querySelector('.task-title');
    titleEl?.addEventListener('blur', () => {
      this.data.content.title = titleEl.textContent || '';
      this.emit('task:update', { id: this.data.id, title: this.data.content.title });
    });
    
    // 按钮
    this.element.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        if (action === 'toggle') return; // 已处理
        this.emit(`task:${action}`, { id: this.data.id });
      });
    });
  }
  
  update(props: { data: any }): void {
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
  .plugin-task-sticky {
    width: 100%;
    height: 100%;
  }
  
  .task-sticky-wrapper {
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .task-sticky-wrapper:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .task-checkbox {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(0,0,0,0.2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .task-checkbox:hover {
    border-color: #6366f1;
  }
  
  .task-checkbox.checked {
    background: #22c55e;
    border-color: #22c55e;
    color: #fff;
  }
  
  .task-priority {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  
  .task-priority.priority-high {
    background: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.3);
  }
  
  .task-priority.priority-medium {
    background: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.3);
  }
  
  .task-priority.priority-low {
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.3);
  }
  
  .task-title {
    flex: 1;
    font-weight: 500;
    font-size: 14px;
    color: #1e293b;
    line-height: 1.4;
    outline: none;
  }
  
  .task-sticky-wrapper:has(.task-checkbox.checked) .task-title {
    text-decoration: line-through;
    opacity: 0.6;
  }
  
  .task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(0,0,0,0.1);
  }
  
  .task-assignee {
    font-size: 12px;
    color: #6366f1;
    font-weight: 500;
  }
  
  .task-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .task-sticky-wrapper:hover .task-actions {
    opacity: 1;
  }
  
  .task-action-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: all 0.2s;
  }
  
  .task-action-btn:hover {
    opacity: 1;
    background: rgba(0,0,0,0.1);
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
