/**
 * CodeBrowser Component
 * 代码/图片浏览器组件
 */

class CodeBrowser extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      file: options.file || null,
      files: options.files || [],
      mode: options.mode || 'code' // 'code' | 'image' | 'markdown'
    };
  }
  
  render() {
    const { file, mode } = this.state;
    
    this.container.innerHTML = `
      <div class="browser-toolbar">
        <button class="browser-btn" data-action="back" title="后退">←</button>
        <button class="browser-btn" data-action="forward" title="前进">→</button>
        <button class="browser-btn" data-action="refresh" title="刷新">↻</button>
        <input type="text" class="browser-address" value="${file?.path || '选择文件'}" readonly>
        <button class="browser-btn" data-action="copy" title="复制">📋</button>
      </div>
      
      <div class="browser-content ${mode}-mode">
        ${this.renderContent()}
      </div>
    `;
  }
  
  renderContent() {
    const { file, mode } = this.state;
    
    if (!file) {
      return '<div class="browser-empty">请选择文件</div>';
    }
    
    switch (mode) {
      case 'image':
        return `<img src="${file.content}" class="browser-image" alt="${file.name}">`;
      
      case 'markdown':
        return `<div class="browser-markdown">${this.renderMarkdown(file.content)}</div>`;
      
      case 'code':
      default:
        return this.renderCode(file.content);
    }
  }
  
  renderCode(code) {
    const lines = code.split('\n');
    return lines.map((line, i) => {
      const highlighted = this.highlightSyntax(line);
      return `
        <div class="code-line">
          <span class="line-number">${i + 1}</span>
          <span class="line-content">${highlighted || '&nbsp;'}</span>
        </div>
      `;
    }).join('');
  }
  
  highlightSyntax(line) {
    // 简单语法高亮
    return line
      .replace(/\b(import|export|class|const|let|var|function|return|if|else|for|while|async|await|try|catch)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/(['"`])(.*?)\1/g, '<span class="token-string">$1$2$1</span>')
      .replace(/\/\/.*$/, '<span class="token-comment">$\u0026</span>')
      .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
  }
  
  renderMarkdown(content) {
    // 简单 Markdown 渲染
    return content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
  
  bindEvents() {
    this.on('click', '[data-action="copy"]', () => {
      if (this.state.file) {
        navigator.clipboard.writeText(this.state.file.content);
        this.emit('file:copy', { file: this.state.file });
      }
    });
    
    this.on('click', '[data-action="refresh"]', () => {
      this.emit('file:refresh', { file: this.state.file });
    });
  }
  
  // 加载文件
  load(file) {
    // 自动检测模式
    const ext = file.name.split('.').pop().toLowerCase();
    const mode = this.detectMode(ext);
    this.setState({ file, mode });
    this.emit('file:load', { file, mode });
  }
  
  detectMode(ext) {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const markdownExts = ['md', 'markdown'];
    
    if (imageExts.includes(ext)) return 'image';
    if (markdownExts.includes(ext)) return 'markdown';
    return 'code';
  }
  
  // 设置内容
  setContent(content, mode = 'code') {
    const file = { content, name: 'untitled', path: 'untitled' };
    this.setState({ file, mode });
  }
}

// 样式
const codeBrowserStyles = `
  .browser-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(15,23,42,0.9);
    border-bottom: 1px solid rgba(99,102,241,0.2);
  }
  .browser-btn {
    width: 28px;
    height: 28px;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 6px;
    color: #94a3b8;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .browser-btn:hover {
    background: rgba(99,102,241,0.2);
    color: #e2e8f0;
  }
  .browser-address {
    flex: 1;
    height: 28px;
    background: rgba(30,41,59,0.8);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 6px;
    padding: 0 12px;
    font-size: 12px;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', monospace;
  }
  .browser-content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }
  .browser-content.code-mode {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.8;
    color: #e2e8f0;
  }
  .browser-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    font-size: 14px;
  }
  .code-line {
    display: flex;
  }
  .line-number {
    color: #475569;
    min-width: 48px;
    text-align: right;
    padding-right: 16px;
    border-right: 1px solid rgba(71,85,105,0.5);
    user-select: none;
  }
  .line-content {
    padding-left: 16px;
    white-space: pre;
  }
  .token-keyword { color: #c792ea; }
  .token-string { color: #c3e88d; }
  .token-comment { color: #546e7a; }
  .token-number { color: #f78c6c; }
  .browser-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .browser-markdown {
    color: #e2e8f0;
    line-height: 1.8;
  }
  .browser-markdown h1, .browser-markdown h2, .browser-markdown h3 {
    color: #fff;
    margin: 16px 0 8px;
  }
  .browser-markdown code {
    background: rgba(99,102,241,0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = codeBrowserStyles;
document.head.appendChild(styleSheet);

window.CodeBrowser = CodeBrowser;
