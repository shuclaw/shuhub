/**
 * ResizablePanel Component
 * 可拖拽、可调整大小、带磁吸的面板容器
 */

class ResizablePanel extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      x: options.x || 0,
      y: options.y || 0,
      width: options.width || 300,
      height: options.height || 200,
      minWidth: options.minWidth || 200,
      minHeight: options.minHeight || 100,
      maxWidth: options.maxWidth || 600,
      maxHeight: options.maxHeight || 400,
      title: options.title || '面板',
      collapsed: options.collapsed || false,
      snapped: false
    };
    
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeDirection = null;
    
    // 磁吸阈值
    this.snapThreshold = 20;
  }
  
  render() {
    const { x, y, width, height, title, collapsed } = this.state;
    
    this.container.innerHTML = `
      <div class="resizable-panel ${collapsed ? 'collapsed' : ''}" 
           style="left: ${x}px; top: ${y}px; width: ${width}px; ${collapsed ? '' : `height: ${height}px;`}">
        
        <!-- 标题栏（拖拽区） -->
        <div class="panel-header" data-action="drag">
          <div class="panel-title">${title}</div>
          <div class="panel-actions">
            <button class="panel-btn" data-action="collapse" title="${collapsed ? '展开' : '折叠'}">${collapsed ? '▲' : '▼'}</button>
            <button class="panel-btn" data-action="snap" title="磁吸">🧲</button>
          </div>
        </div>
        
        <!-- 内容区 -->
        <div class="panel-content" id="${this.container.id}-content">
          ${collapsed ? '' : this.renderContent()}
        </div>
        
        ${!collapsed ? `
          <!-- 调整大小手柄 -->
          <div class="resize-handle resize-e" data-resize="e"></div>
          <div class="resize-handle resize-s" data-resize="s"></div>
          <div class="resize-handle resize-se" data-resize="se">⤡</div>
        ` : ''}
      </div>
    `;
  }
  
  renderContent() {
    // 子类重写
    return '';
  }
  
  bindEvents() {
    const panel = this.container.querySelector('.resizable-panel');
    
    // 拖拽
    this.on('mousedown', '[data-action="drag"]', (e) => {
      this.startDrag(e);
    });
    
    // 折叠
    this.on('click', '[data-action="collapse"]', () => {
      this.toggleCollapse();
    });
    
    // 磁吸
    this.on('click', '[data-action="snap"]', () => {
      this.toggleSnap();
    });
    
    // 调整大小
    this.on('mousedown', '[data-resize]', (e) => {
      this.startResize(e);
    });
    
    // 全局鼠标事件
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
  }
  
  startDrag(e) {
    if (this.state.snapped) return; // 磁吸状态下不可拖拽
    
    this.isDragging = true;
    const panel = this.container.querySelector('.resizable-panel');
    const rect = panel.getBoundingClientRect();
    
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    panel.style.transition = 'none';
    panel.classList.add('dragging');
  }
  
  startResize(e) {
    this.isResizing = true;
    this.resizeDirection = e.target.dataset.resize;
    
    const panel = this.container.querySelector('.resizable-panel');
    panel.style.transition = 'none';
    
    e.preventDefault();
    e.stopPropagation();
  }
  
  onMouseMove(e) {
    if (this.isDragging) {
      this.handleDrag(e);
    } else if (this.isResizing) {
      this.handleResize(e);
    }
  }
  
  handleDrag(e) {
    const { minWidth, maxWidth, minHeight, maxHeight } = this.state;
    
    let newX = e.clientX - this.dragOffset.x;
    let newY = e.clientY - this.dragOffset.y;
    
    // 边界限制
    const parentRect = this.container.parentElement.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, parentRect.width - minWidth));
    newY = Math.max(0, Math.min(newY, parentRect.height - minHeight));
    
    // 磁吸检测
    const snapX = this.checkSnapX(newX);
    const snapY = this.checkSnapY(newY);
    
    if (snapX !== null) newX = snapX;
    if (snapY !== null) newY = snapY;
    
    this.state.x = newX;
    this.state.y = newY;
    
    const panel = this.container.querySelector('.resizable-panel');
    panel.style.left = `${newX}px`;
    panel.style.top = `${newY}px`;
    
    this.emit('panel:move', { x: newX, y: newY });
  }
  
  handleResize(e) {
    const panel = this.container.querySelector('.resizable-panel');
    const rect = panel.getBoundingClientRect();
    
    let newWidth = this.state.width;
    let newHeight = this.state.height;
    
    if (this.resizeDirection.includes('e')) {
      newWidth = e.clientX - rect.left;
    }
    if (this.resizeDirection.includes('s')) {
      newHeight = e.clientY - rect.top;
    }
    
    // 限制尺寸
    newWidth = Math.max(this.state.minWidth, Math.min(newWidth, this.state.maxWidth));
    newHeight = Math.max(this.state.minHeight, Math.min(newHeight, this.state.maxHeight));
    
    this.state.width = newWidth;
    this.state.height = newHeight;
    
    panel.style.width = `${newWidth}px`;
    panel.style.height = `${newHeight}px`;
    
    this.emit('panel:resize', { width: newWidth, height: newHeight });
  }
  
  checkSnapX(x) {
    // 吸附到边缘
    if (x < this.snapThreshold) return 0;
    
    const parentWidth = this.container.parentElement.clientWidth;
    const panelWidth = this.state.width;
    
    if (x + panelWidth > parentWidth - this.snapThreshold) {
      return parentWidth - panelWidth;
    }
    
    return null;
  }
  
  checkSnapY(y) {
    if (y < this.snapThreshold) return 0;
    
    const parentHeight = this.container.parentElement.clientHeight;
    const panelHeight = this.state.height;
    
    if (y + panelHeight > parentHeight - this.snapThreshold) {
      return parentHeight - panelHeight;
    }
    
    return null;
  }
  
  onMouseUp() {
    if (this.isDragging || this.isResizing) {
      const panel = this.container.querySelector('.resizable-panel');
      panel.style.transition = '';
      panel.classList.remove('dragging');
      
      this.isDragging = false;
      this.isResizing = false;
      this.resizeDirection = null;
      
      this.emit('panel:change', { ...this.state });
    }
  }
  
  toggleCollapse() {
    this.setState({ collapsed: !this.state.collapsed });
    this.emit('panel:collapse', { collapsed: this.state.collapsed });
  }
  
  toggleSnap() {
    this.state.snapped = !this.state.snapped;
    
    if (this.state.snapped) {
      // 磁吸到最近边缘
      const snapX = this.checkSnapX(this.state.x);
      const snapY = this.checkSnapY(this.state.y);
      
      if (snapX !== null) this.state.x = snapX;
      if (snapY !== null) this.state.y = snapY;
      
      this.render();
    }
    
    this.emit('panel:snap', { snapped: this.state.snapped });
  }
  
  // 设置尺寸限制
  setLimits(limits) {
    this.setState({
      minWidth: limits.minWidth || this.state.minWidth,
      minHeight: limits.minHeight || this.state.minHeight,
      maxWidth: limits.maxWidth || this.state.maxWidth,
      maxHeight: limits.maxHeight || this.state.maxHeight
    });
  }
}

// 样式
const resizablePanelStyles = `
  .resizable-panel {
    position: absolute;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.2s;
    min-width: 200px;
    min-height: 100px;
  }
  .resizable-panel:hover {
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  }
  .resizable-panel.dragging {
    box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    z-index: 1000;
  }
  .resizable-panel.collapsed {
    height: auto !important;
    min-height: 40px;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-bottom: 1px solid rgba(226,232,240,0.6);
    cursor: move;
    user-select: none;
  }
  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
  }
  .panel-actions {
    display: flex;
    gap: 4px;
  }
  .panel-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    transition: all 0.2s;
  }
  .panel-btn:hover {
    background: rgba(99,102,241,0.1);
    color: #6366f1;
  }
  
  .panel-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }
  
  .resize-handle {
    position: absolute;
    z-index: 10;
  }
  .resize-e {
    right: 0;
    top: 40px;
    bottom: 0;
    width: 6px;
    cursor: e-resize;
  }
  .resize-s {
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    cursor: s-resize;
  }
  .resize-se {
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: se-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #94a3b8;
    background: rgba(99,102,241,0.1);
    border-radius: 8px 0 0 0;
  }
  .resize-handle:hover {
    background: rgba(99,102,241,0.2);
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = resizablePanelStyles;
document.head.appendChild(styleSheet);

window.ResizablePanel = ResizablePanel;
