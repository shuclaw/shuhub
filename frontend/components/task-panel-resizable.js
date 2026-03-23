/**
 * TaskPanelResizable Component
 * 可调整大小的任务面板
 */

class TaskPanelResizable extends ResizablePanel {
  constructor(containerId, options = {}) {
    super(containerId, {
      title: options.title || '📋 当前任务',
      width: options.width || 320,
      height: options.height || 250,
      minWidth: 250,
      minHeight: 150,
      maxWidth: 500,
      maxHeight: 400,
      ...options
    });
    
    this.state.tasks = options.tasks || [];
    this.state.filter = options.filter || 'active'; // 'active' | 'completed' | 'all'
  }
  
  renderContent() {
    const { tasks, filter } = this.state;
    
    let filteredTasks = tasks;
    if (filter === 'active') filteredTasks = tasks.filter(t => !t.done);
    if (filter === 'completed') filteredTasks = tasks.filter(t => t.done);
    
    return `
      <div class="task-panel-resizable">
        <div class="task-filters">
          <button class="task-filter ${filter === 'active' ? 'active' : ''}" data-filter="active">进行中</button>
          <button class="task-filter ${filter === 'completed' ? 'active' : ''}" data-filter="completed">已完成</button>
          <button class="task-filter ${filter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
        </div>
        
        <div class="task-list-resizable">
          ${filteredTasks.length === 0 ? `
            <div class="task-empty-resizable">暂无${filter === 'active' ? '进行中' : (filter === 'completed' ? '已完成' : '')}任务</div>
          ` : filteredTasks.map(task => this.renderTask(task)).join('')}
        </div>
        
        <div class="task-stats">
          <span>共 ${tasks.length} 个任务</span>
          <span>${tasks.filter(t => t.done).length} 完成</span>
        </div>
      </div>
    `;
  }
  
  renderTask(task) {
    return `
      <div class="task-item-resizable ${task.done ? 'done' : ''}" data-task-id="${task.id}">
        <div class="task-check ${task.done ? 'checked' : ''}" data-action="toggle">${task.done ? '✓' : ''}</div>
        <div class="task-info">
          <div class="task-title-resizable">${task.title}</div>
          <div class="task-meta-resizable">
            <span class="task-agent">@${task.agent}</span>
            <span class="task-priority-resizable priority-${task.priority}"></span>
          </div>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    super.bindEvents();
    
    // 筛选
    this.on('click', '[data-filter]', (e) => {
      this.setState({ filter: e.target.dataset.filter });
      this.emit('task:filter', { filter: e.target.dataset.filter });
    });
    
    // 切换任务状态
    this.on('click', '[data-action="toggle"]', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.task-item-resizable');
      const taskId = parseInt(item.dataset.taskId);
      this.toggleTask(taskId);
    });
  }
  
  toggleTask(taskId) {
    const tasks = this.state.tasks.map(t => 
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    this.setState({ tasks });
    
    const task = tasks.find(t => t.id === taskId);
    this.emit('task:toggle', { taskId, done: task.done });
  }
  
  addTask(task) {
    this.setState({ tasks: [...this.state.tasks, task] });
  }
  
  removeTask(taskId) {
    this.setState({ tasks: this.state.tasks.filter(t => t.id !== taskId) });
  }
}

// 样式
const taskPanelResizableStyles = `
  .task-panel-resizable {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .task-filters {
    display: flex;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(226,232,240,0.6);
    margin-bottom: 8px;
  }
  .task-filter {
    padding: 4px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-filter:hover {
    border-color: #6366f1;
  }
  .task-filter.active {
    background: rgba(99,102,241,0.1);
    border-color: #6366f1;
    color: #6366f1;
  }
  .task-list-resizable {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .task-empty-resizable {
    text-align: center;
    padding: 30px;
    color: #94a3b8;
    font-size: 13px;
  }
  .task-item-resizable {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-item-resizable:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }
  .task-item-resizable.done {
    opacity: 0.6;
  }
  .task-item-resizable.done .task-title-resizable {
    text-decoration: line-through;
    color: #94a3b8;
  }
  .task-check {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .task-check:hover {
    border-color: #6366f1;
  }
  .task-check.checked {
    background: #6366f1;
    border-color: #6366f1;
    color: #fff;
  }
  .task-info {
    flex: 1;
    min-width: 0;
  }
  .task-title-resizable {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .task-meta-resizable {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .task-agent {
    color: #6366f1;
  }
  .task-priority-resizable {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .task-stats {
    display: flex;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(226,232,240,0.6);
    font-size: 11px;
    color: #94a3b8;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = taskPanelResizableStyles;
document.head.appendChild(styleSheet);

window.TaskPanelResizable = TaskPanelResizable;
