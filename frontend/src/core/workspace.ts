/**
 * Workspace - 白板工作区
 * 管理页面、元素和状态
 */

import type { 
  Workspace as IWorkspace, 
  Page, 
  ElementData, 
  ElementType,
  EventBus 
} from '../types';

export class Workspace implements IWorkspace {
  id: string;
  pages: Page[] = [];
  currentPage: number = 0;
  zoom: number = 1;
  
  private eventBus: EventBus;
  private elementCounter: number = 0;
  
  constructor(eventBus: EventBus, options: { id?: string; pageSize?: { width: number; height: number } } = {}) {
    this.id = options.id || `ws-${Date.now()}`;
    this.eventBus = eventBus;
    
    // 创建默认页面
    this.addPage();
  }
  
  /**
   * 添加页面
   */
  addPage(): Page {
    const page: Page = {
      id: `page-${Date.now()}-${this.pages.length}`,
      name: `第 ${this.pages.length + 1} 页`,
      index: this.pages.length,
      elements: []
    };
    
    this.pages.push(page);
    this.emit('page:add', { page });
    
    return page;
  }
  
  /**
   * 删除页面
   */
  removePage(index: number): void {
    if (this.pages.length <= 1) {
      throw new Error('Cannot remove the last page');
    }
    
    const page = this.pages[index];
    this.pages.splice(index, 1);
    
    // 重新索引
    this.pages.forEach((p, i) => {
      p.index = i;
      p.name = `第 ${i + 1} 页`;
    });
    
    // 调整当前页
    if (this.currentPage >= this.pages.length) {
      this.currentPage = this.pages.length - 1;
    }
    
    this.emit('page:remove', { index, page });
  }
  
  /**
   * 切换到页面
   */
  goToPage(index: number): void {
    if (index < 0 || index >= this.pages.length) {
      throw new Error('Invalid page index');
    }
    
    this.currentPage = index;
    this.emit('page:change', { index, page: this.pages[index] });
  }
  
  /**
   * 添加元素
   */
  addElement(elementData: Omit<ElementData, 'id'>): ElementData {
    const element: ElementData = {
      ...elementData,
      id: `el-${++this.elementCounter}`
    };
    
    const page = this.pages[this.currentPage];
    page.elements.push(element);
    
    this.emit('element:add', { element, page: this.currentPage });
    return element;
  }
  
  /**
   * 删除元素
   */
  removeElement(id: string): void {
    const page = this.pages[this.currentPage];
    const index = page.elements.findIndex(e => e.id === id);
    
    if (index === -1) return;
    
    const element = page.elements[index];
    page.elements.splice(index, 1);
    
    this.emit('element:remove', { id, element });
  }
  
  /**
   * 更新元素
   */
  updateElement(id: string, updates: Partial<ElementData>): void {
    const page = this.pages[this.currentPage];
    const element = page.elements.find(e => e.id === id);
    
    if (!element) return;
    
    Object.assign(element, updates);
    this.emit('element:update', { id, element, updates });
  }
  
  /**
   * 获取当前页元素
   */
  getCurrentElements(): ElementData[] {
    return this.pages[this.currentPage]?.elements || [];
  }
  
  /**
   * 获取元素
   */
  getElement(id: string): ElementData | undefined {
    for (const page of this.pages) {
      const element = page.elements.find(e => e.id === id);
      if (element) return element;
    }
    return undefined;
  }
  
  /**
   * 设置缩放
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(3, zoom));
    this.emit('zoom:change', { zoom: this.zoom });
  }
  
  /**
   * 导出数据
   */
  export(): object {
    return {
      id: this.id,
      pages: this.pages,
      currentPage: this.currentPage,
      zoom: this.zoom
    };
  }
  
  /**
   * 导入数据
   */
  import(data: { pages: Page[]; currentPage?: number; zoom?: number }): void {
    this.pages = data.pages;
    this.currentPage = data.currentPage || 0;
    this.zoom = data.zoom || 1;
    this.emit('workspace:import', { data });
  }
  
  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    this.eventBus.on(event, callback);
  }
  
  /**
   * 事件发射
   */
  emit(event: string, data?: any): void {
    this.eventBus.emit(event, data);
  }
}
