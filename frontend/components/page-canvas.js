/**
 * PageCanvas - 分页白板画布系统
 * 每页固定尺寸，可添加任意元素，支持翻页
 */

class PageCanvas extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    
    this.state = {
      pages: options.pages || [this.createPage(1)],
      currentPage: 0,
      pageSize: options.pageSize || { width: 1920, height: 1080 },
      zoom: options.zoom || 1,
      elements: options.elements || {}, // { pageIndex: [elements] }
      selectedElement: null
    };
    
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }
  
  createPage(index) {
    return {
      id: `page-${Date.now()}-${index}`,
      name: `第 ${index + 1} 页`,
      index: index
    };
  }
  
  render() {
    const { pages, currentPage, pageSize, zoom, elements } = this.state;
    const currentElements = elements[currentPage] || [];
    
    this.container.innerHTML = `
      <div class="page-canvas-container">
        <!-- 工具栏 -->
        <div class="canvas-toolbar">
          <div class="toolbar-group">
            <button class="tool-btn" data-tool="agent" title="添加 Agent">🔧</button>
            <button class="tool-btn" data-tool="task" title="添加任务">📋</button>
            <button class="tool-btn" data-tool="note" title="添加便签">📝</button>
            <button class="tool-btn" data-tool="text" title="添加文本">T</button>
            <button class="tool-btn" data-tool="code" title="添加代码"></></button>
            <button class="tool-btn" data-tool="image" title="添加图片">🖼️</button>
          </div>
          
          <div class="toolbar-group">
            <button class="tool-btn" data-action="zoom-out" title="缩小">−</button>
            <span class="zoom-level">${Math.round(zoom * 100)}%</span>
            <button class="tool-btn" data-action="zoom-in" title="放大">+</button>
            <button class="tool-btn" data-action="fit" title="适应屏幕">⤢</button>
          </div>
          
          <div class="toolbar-group">
            <button class="tool-btn" data-action="prev-page" ${currentPage === 0 ? 'disabled' : ''}>◀</button>
            <span class="page-indicator">${currentPage + 1} / ${pages.length}</span>
            <button class="tool-btn" data-action="next-page" ${currentPage === pages.length - 1 ? 'disabled' : ''}>▶</button>
            <button class="tool-btn primary" data-action="add-page" title="新建页面">+ 新页面</button>
          </div>
        </div>
        
        <!-- 页面缩略图侧边栏 -->
        <div class="page-sidebar">
          ${pages.map((page, i) => `
            <div class="page-thumb ${i === currentPage ? 'active' : ''}" data-page="${i}">
              <div class="page-thumb-preview">
                <div class="thumb-content">${page.name}</div>
              </div>
              <div class="page-thumb-name">${page.name}</div>
            </div>
          `).join('')}
        </div>
        
        <!-- 画布区域 -->
        <div class="canvas-viewport" id="canvas-viewport">
          <div class="canvas-page" 
               style="width: ${pageSize.width}px; height: ${pageSize.height}px; transform: scale(${zoom});"
               id="canvas-page">
            <!-- 网格背景 -->
            <div class="canvas-grid"></div>
            
            <!-- 页面元素 -->
            ${currentElements.map(el => this.renderElement(el)).join('')}
          </div>
        </div>
      </div>
    `;
    
    this.bindCanvasEvents();
  }
  
  renderElement(element) {
    const { id, type, x, y, width, height, content, style = {} } = element;
    const isSelected = this.state.selectedElement === id;
    
    const renderers = {
      agent: () => `
        <div class="element-agent ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;">
          <div class="agent-card-element">
            <div class="agent-avatar-el" style="background: ${style.color || '#e2e8f0'}">${style.avatar || '🤖'}</div>
            <div class="agent-info-el">
              <div class="agent-name-el">${content.name || 'Agent'}</div>
              <div class="agent-role-el">${content.role || ''}</div>
            </div>
          </div>
          <div class="element-resize-handle" data-resize="se"></div>
        </div>
      `,
      
      task: () => `
        <div class="element-task ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;">
          <div class="task-sticky-note priority-${content.priority || 'medium'}">
            <div class="task-checkbox-el ${content.done ? 'checked' : ''}">${content.done ? '✓' : ''}</div>
            <div class="task-title-el">${content.title || '任务'}</div>
            <div class="task-meta-el">@${content.agent || '未分配'}</div>
          </div>
          <div class="element-resize-handle" data-resize="se"></div>
        </div>
      `,
      
      note: () => `
        <div class="element-note ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; background: ${style.color || '#fef3c7'};">
          <div class="note-content" contenteditable="true">${content.text || '点击编辑...'}</div>
          <div class="element-resize-handle" data-resize="se"></div>
        </div>
      `,
      
      text: () => `
        <div class="element-text ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; font-size: ${style.fontSize || 16}px;">
          <div class="text-content" contenteditable="true">${content.text || '文本'}</div>
        </div>
      `,
      
      code: () => `
        <div class="element-code ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;">
          <div class="code-header">
            <span class="code-lang">${content.language || 'javascript'}</span>
            <button class="code-copy">复制</button>
          </div>
          <pre class="code-content"><code>${content.code || '// code'}</code></pre>
          <div class="element-resize-handle" data-resize="se"></div>
        </div>
      `,
      
      image: () => `
        <div class="element-image ${isSelected ? 'selected' : ''}" data-id="${id}"
             style="left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;">
          <img src="${content.src || ''}" alt="${content.alt || 'image'}" draggable="false" />
          <div class="element-resize-handle" data-resize="se"></div>
        </div>
      `
    };
    
    return (renderers[type] || renderers.note)();
  }
  
  bindCanvasEvents() {
    // 工具栏
    this.on('click', '[data-tool]', (e) => {
      const tool = e.target.dataset.tool;
      this.addElement(tool);
    });
    
    // 缩放
    this.on('click', '[data-action="zoom-in"]', () => this.zoom(0.1));
    this.on('click', '[data-action="zoom-out"]', () => this.zoom(-0.1));
    this.on('click', '[data-action="fit"]', () => this.fitToScreen());
    
    // 翻页
    this.on('click', '[data-action="prev-page"]', () => this.prevPage());
    this.on('click', '[data-action="next-page"]', () => this.nextPage());
    this.on('click', '[data-action="add-page"]', () => this.addPage());
    this.on('click', '[data-page]', (e) => {
      const page = parseInt(e.target.closest('[data-page]').dataset.page);
      this.goToPage(page);
    });
    
    // 画布点击（取消选择）
    this.on('click', '.canvas-page', (e) => {
      if (e.target.classList.contains('canvas-page') || e.target.classList.contains('canvas-grid')) {
        this.setState({ selectedElement: null });
      }
    });
    
    // 元素选择和拖拽
    this.bindElementEvents();
  }
  
  bindElementEvents() {
    let draggedElement = null;
    let resizeElement = null;
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    
    // 选择元素
    this.on('mousedown', '[data-id]', (e) => {
      if (e.target.dataset.resize) return;
      
      const el = e.target.closest('[data-id]');
      const id = el.dataset.id;
      this.setState({ selectedElement: id });
      
      // 开始拖拽
      draggedElement = el;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(el.style.left);
      startTop = parseInt(el.style.top);
      
      el.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    // 调整大小
    this.on('mousedown', '[data-resize]', (e) => {
      e.stopPropagation();
      
      resizeElement = e.target.closest('[data-id]');
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(resizeElement.style.width);
      startHeight = parseInt(resizeElement.style.height);
      
      e.preventDefault();
    });
    
    // 全局鼠标移动
    document.addEventListener('mousemove', (e) => {
      const { zoom } = this.state;
      
      if (draggedElement) {
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        
        draggedElement.style.left = `${startLeft + dx}px`;
        draggedElement.style.top = `${startTop + dy}px`;
      }
      
      if (resizeElement) {
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        
        resizeElement.style.width = `${Math.max(100, startWidth + dx)}px`;
        resizeElement.style.height = `${Math.max(50, startHeight + dy)}px`;
      }
    });
    
    // 全局鼠标释放
    document.addEventListener('mouseup', () => {
      if (draggedElement) {
        draggedElement.style.cursor = '';
        
        // 更新状态
        const id = draggedElement.dataset.id;
        this.updateElement(id, {
          x: parseInt(draggedElement.style.left),
          y: parseInt(draggedElement.style.top)
        });
        
        draggedElement = null;
      }
      
      if (resizeElement) {
        const id = resizeElement.dataset.id;
        this.updateElement(id, {
          width: parseInt(resizeElement.style.width),
          height: parseInt(resizeElement.style.height)
        });
        
        resizeElement = null;
      }
    });
  }
  
  addElement(type) {
    const { currentPage, elements, pageSize } = this.state;
    
    const defaults = {
      agent: { width: 200, height: 80, content: { name: '新 Agent', role: '未分配' } },
      task: { width: 180, height: 100, content: { title: '新任务', priority: 'medium' } },
      note: { width: 200, height: 150, content: { text: '' }, style: { color: '#fef3c7' } },
      text: { width: 200, height: 50, content: { text: '文本' }, style: { fontSize: 16 } },
      code: { width: 400, height: 200, content: { code: '// 代码', language: 'javascript' } },
      image: { width: 300, height: 200, content: { src: '', alt: '图片' } }
    };
    
    const def = defaults[type];
    
    const newElement = {
      id: `el-${Date.now()}`,
      type,
      x: pageSize.width / 2 - def.width / 2 + Math.random() * 40 - 20,
      y: pageSize.height / 2 - def.height / 2 + Math.random() * 40 - 20,
      ...def
    };
    
    const pageElements = [...(elements[currentPage] || []), newElement];
    
    this.setState({
      elements: { ...elements, [currentPage]: pageElements },
      selectedElement: newElement.id
    });
    
    this.emit('element:add', { element: newElement });
  }
  
  updateElement(id, updates) {
    const { currentPage, elements } = this.state;
    
    const pageElements = (elements[currentPage] || []).map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    
    this.setState({
      elements: { ...elements, [currentPage]: pageElements }
    });
  }
  
  zoom(delta) {
    const newZoom = Math.max(0.3, Math.min(2, this.state.zoom + delta));
    this.setState({ zoom: newZoom });
  }
  
  fitToScreen() {
    const viewport = document.getElementById('canvas-viewport');
    const page = document.getElementById('canvas-page');
    
    if (viewport && page) {
      const vRect = viewport.getBoundingClientRect();
      const { pageSize } = this.state;
      
      const scaleX = (vRect.width - 40) / pageSize.width;
      const scaleY = (vRect.height - 40) / pageSize.height;
      
      this.setState({ zoom: Math.min(scaleX, scaleY, 1) });
    }
  }
  
  prevPage() {
    if (this.state.currentPage > 0) {
      this.goToPage(this.state.currentPage - 1);
    }
  }
  
  nextPage() {
    if (this.state.currentPage < this.state.pages.length - 1) {
      this.goToPage(this.state.currentPage + 1);
    }
  }
  
  goToPage(index) {
    this.setState({ currentPage: index, selectedElement: null });
    this.emit('page:change', { page: index });
  }
  
  addPage() {
    const { pages, currentPage } = this.state;
    const newPage = this.createPage(pages.length + 1);
    
    this.setState({
      pages: [...pages, newPage],
      currentPage: pages.length
    });
    
    this.emit('page:add', { page: newPage });
  }
  
  deletePage(index) {
    const { pages, elements } = this.state;
    
    if (pages.length <= 1) return; // 至少保留一页
    
    const newPages = pages.filter((_, i) => i !== index);
    const newElements = { ...elements };
    delete newElements[index];
    
    // 重新索引
    const reindexedElements = {};
    let offset = 0;
    for (let i = 0; i <= pages.length; i++) {
      if (i !== index) {
        reindexedElements[i - offset] = newElements[i];
      } else {
        offset = 1;
      }
    }
    
    this.setState({
      pages: newPages.map((p, i) => ({ ...p, index: i, name: `第 ${i + 1} 页` })),
      elements: reindexedElements,
      currentPage: Math.min(currentPage, newPages.length - 1)
    });
  }
}

// 样式
const pageCanvasStyles = `
  .page-canvas-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f0f2f5;
  }
  
  .canvas-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .tool-btn {
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tool-btn:hover {
    background: #f1f5f9;
    border-color: #6366f1;
  }
  
  .tool-btn.primary {
    background: #6366f1;
    color: #fff;
    border-color: #6366f1;
  }
  
  .tool-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .zoom-level, .page-indicator {
    font-size: 13px;
    color: #64748b;
    min-width: 50px;
    text-align: center;
  }
  
  .page-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    bottom: 0;
    width: 160px;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    padding: 16px;
    overflow-y: auto;
    z-index: 10;
  }
  
  .page-thumb {
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .page-thumb:hover {
    transform: translateY(-2px);
  }
  
  .page-thumb.active .page-thumb-preview {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
  }
  
  .page-thumb-preview {
    width: 100%;
    aspect-ratio: 16/9;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  .thumb-content {
    font-size: 12px;
    color: #94a3b8;
  }
  
  .page-thumb-name {
    text-align: center;
    font-size: 12px;
    color: #64748b;
    margin-top: 6px;
  }
  
  .canvas-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 40px;
    margin-left: 160px;
  }
  
  .canvas-page {
    background: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    position: relative;
    transform-origin: center center;
    transition: transform 0.2s;
  }
  
  .canvas-grid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(to right, #f1f5f9 1px, transparent 1px),
      linear-gradient(to bottom, #f1f5f9 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }
  
  /* 元素样式 */
  .element-agent, .element-task, .element-note, .element-text, .element-code, .element-image {
    position: absolute;
    cursor: grab;
    user-select: none;
  }
  
  .element-agent:active, .element-task:active, .element-note:active {
    cursor: grabbing;
  }
  
  .element-agent.selected, .element-task.selected, .element-note.selected,
  .element-text.selected, .element-code.selected, .element-image.selected {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
  
  .element-resize-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: #6366f1;
    border-radius: 50%;
    cursor: se-resize;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .element-agent:hover .element-resize-handle,
  .element-task:hover .element-resize-handle,
  .element-note:hover .element-resize-handle,
  .element-code:hover .element-resize-handle,
  .element-image:hover .element-resize-handle {
    opacity: 1;
  }
  
  /* Agent 卡片 */
  .agent-card-element {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 100%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  
  .agent-avatar-el {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  
  .agent-name-el {
    font-weight: 600;
    color: #1e293b;
  }
  
  .agent-role-el {
    font-size: 12px;
    color: #64748b;
  }
  
  /* 任务便签 */
  .task-sticky-note {
    background: #fef3c7;
    border-radius: 8px;
    padding: 16px;
    height: 100%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .task-sticky-note.priority-high { background: #fee2e2; }
  .task-sticky-note.priority-medium { background: #fef3c7; }
  .task-sticky-note.priority-low { background: #d1fae5; }
  
  .task-checkbox-el {
    width: 20px;
    height: 20px;
    border: 2px solid currentColor;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    cursor: pointer;
  }
  
  .task-checkbox-el.checked {
    background: #22c55e;
    border-color: #22c55e;
    color: #fff;
  }
  
  .task-title-el {
    font-weight: 500;
    margin-bottom: 4px;
  }
  
  .task-meta-el {
    font-size: 11px;
    color: #64748b;
  }
  
  /* 便签 */
  .note-content {
    width: 100%;
    height: 100%;
    padding: 12px;
    border: none;
    background: transparent;
    outline: none;
    resize: none;
    font-size: 14px;
    line-height: 1.5;
  }
  
  /* 文本 */
  .text-content {
    padding: 8px;
    outline: none;
  }
  
  /* 代码 */
  .element-code {
    background: #1e293b;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #0f172a;
    color: #94a3b8;
    font-size: 12px;
  }
  
  .code-copy {
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #334155;
    border-radius: 4px;
    color: #94a3b8;
    font-size: 11px;
    cursor: pointer;
  }
  
  .code-content {
    padding: 12px;
    margin: 0;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow: auto;
    height: calc(100% - 40px);
  }
  
  /* 图片 */
  .element-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = pageCanvasStyles;
document.head.appendChild(styleSheet);

window.PageCanvas = PageCanvas;
