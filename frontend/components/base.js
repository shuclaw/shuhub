/**
 * ShuHub Component System
 * 模块化组件系统
 */

// 组件基类
class Component {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.state = {};
    this.eventHandlers = [];
  }
  
  mount() {
    this.render();
    this.bindEvents();
  }
  
  unmount() {
    this.eventHandlers.forEach(handler => handler.remove());
    this.eventHandlers = [];
  }
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }
  
  render() {
    throw new Error('Component must implement render()');
  }
  
  bindEvents() {}
  
  on(event, selector, callback) {
    const handler = (e) => {
      if (e.target.matches(selector)) {
        callback(e);
      }
    };
    this.container.addEventListener(event, handler);
    this.eventHandlers.push({ remove: () => this.container.removeEventListener(event, handler) });
  }
  
  emit(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data, bubbles: true });
    this.container.dispatchEvent(event);
  }
}

// 导出组件系统
window.Component = Component;
