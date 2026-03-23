/**
 * TaskPanel Component
 * 任务面板组件（可折叠）
 */

class TaskPanel extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      tasks: options.tasks || [],
      expanded: options.expanded !== false,
      title: options.title || '当前任务'
    };
  }
  
  render() {
    const { tasks, expanded, title } = this.state;
    const completedCount = tasks.filter(t => t.done).length;
    
    this.container.innerHTML = `
      <div class="task-panel-header ${expanded ? '' : 'collapsed'}" data-action="toggle">
        <div class="task-panel-title">
          <span>📋 ${title}</span>
          <span class="task-badge">${tasks.length}</span>
          ${completedCount > 0 ? `<span class="task-completed">${completedCount}✓</span>` : ''}
        </div>
        <span class="task-toggle ${expanded ? '' : 'collapsed'}">▼</span>
      </div>
      
      <div class="task-list ${expanded ? '' : 'collapsed'}">
        ${tasks.length === 0 ? `
          <div class="task-empty">暂无任务</div>
        ` : tasks.map(task => this.renderTaskItem(task)).join('')}
      </div>
    `;
  }
  
  renderTaskItem(task) {
    return `
      <div class="task-item ${task.done ? 'done' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox ${task.done ? 'checked' : ''}" data-action="check">
          ${task.done ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            ${task.agent ? `<span class="task-agent">@${task.agent}</span>` : ''}
            ${task.time ? `<span class="task-time">${task.time}</span>` : ''}
          </div>
        </div>
        ${task.priority ? `<div class="task-priority priority-${task.priority}"></div>` : ''}
      </div>
    `;
  }
  
  bindEvents() {
    // 折叠/展开
    this.on('click', '[data-action="toggle"]', () => {
      this.setState({ expanded: !this.state.expanded });
      this.emit('task:toggle', { expanded: !this.state.expanded });
    });
    
    // 勾选任务
    this.on('click', '[data-action="check"]', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.task-item');
      const taskId = parseInt(item.dataset.taskId);
      this.toggleTask(taskId);
    });
    
    // 点击任务
    this.on('click', '.task-item', (e) => {
      if (e.target.dataset.action === 'check') return;
      const item = e.target.closest('.task-item');
      const taskId = parseInt(item.dataset.taskId);
      this.emit('task:click', { taskId });
    });
  }
  
  toggleTask(taskId) {
    const tasks = this.state.tasks.map(t => 
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    this.setState({ tasks });
    
    const task = tasks.find(t => t.id === taskId);
    this.emit('task:check', { taskId, done: task.done });
  }
  
  // 公共方法
  addTask(task) {
    this.setState({ tasks: [...this.state.tasks, task] });
  }
  
  removeTask(taskId) {
    this.setState({ tasks: this.state.tasks.filter(t => t.id !== taskId) });
  }
  
  updateTask(taskId, updates) {
    this.setState({
      tasks: this.state.tasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    });
  }
  
  expand() {
    this.setState({ expanded: true });
  }
  
  collapse() {
    this.setState({ expanded: false });
  }
}

// 样式
const taskPanelStyles = `
  .task-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid rgba(226,232,240,0.6);
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-panel-header:hover {
    background: rgba(0,0,0,0.02);
  }
  .task-panel-header.collapsed {
    border-bottom-color: transparent;
  }
  .task-panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
  }
  .task-badge {
    padding: 2px 8px;
    background: rgba(99,102,241,0.1);
    border-radius: 10px;
    font-size: 11px;
    color: #6366f1;
  }
  .task-completed {
    padding: 2px 8px;
    background: rgba(34,197,94,0.1);
    border-radius: 10px;
    font-size: 11px;
    color: #16a34a;
  }
  .task-toggle {
    font-size: 12px;
    color: #94a3b8;
    transition: transform 0.3s;
  }
  .task-toggle.collapsed {
    transform: rotate(-90deg);
  }
  .task-list {
    padding: 12px 16px;
    max-height: 250px;
    overflow-y: auto;
    transition: all 0.3s;
  }
  .task-list.collapsed {
    display: none;
  }
  .task-empty {
    text-align: center;
    padding: 20px;
    color: #94a3b8;
    font-size: 13px;
  }
  .task-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.25s;
  }
  .task-item:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .task-item.done {
    opacity: 0.7;
  }
  .task-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .task-checkbox:hover {
    border-color: #6366f1;
  }
  .task-checkbox.checked {
    background: #6366f1;
    border-color: #6366f1;
    color: #fff;
  }
  .task-content {
    flex: 1;
    min-width: 0;
  }
  .task-title {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .task-item.done .task-title {
    text-decoration: line-through;
    color: #94a3b8;
  }
  .task-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .task-priority {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .priority-high { background: #ef4444; }
  .priority-medium { background: #f59e0b; }
  .priority-low { background: #22c55e; }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = taskPanelStyles;
document.head.appendChild(styleSheet);

window.TaskPanel = TaskPanel;
