/**
 * PluginManager - 插件管理器
 * 管理插件的注册、加载、激活和卸载
 */

import type { Plugin, PluginContext } from '../types';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Map<string, PluginContext> = new Map();
  private hooks: Map<string, Function[]> = new Map();
  
  constructor(private context: Omit<PluginContext, 'registerComponent' | 'registerTool' | 'registerCommand'>) {}
  
  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    const { id } = plugin.manifest;
    
    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} already registered`);
    }
    
    // 检查依赖
    if (plugin.manifest.dependencies) {
      for (const dep of plugin.manifest.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${id} requires ${dep}`);
        }
      }
    }
    
    this.plugins.set(id, plugin);
    console.log(`[PluginManager] Registered: ${id}`);
  }
  
  /**
   * 激活插件
   */
  activate(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (this.activePlugins.has(pluginId)) {
      console.warn(`[PluginManager] Plugin ${pluginId} already active`);
      return;
    }
    
    // 创建插件上下文
    const pluginContext: PluginContext = {
      ...this.context,
      registerComponent: (name, component) => {
        this.emit('component:register', { pluginId, name, component });
      },
      registerTool: (name, tool) => {
        this.emit('tool:register', { pluginId, name, tool });
      },
      registerCommand: (command) => {
        this.emit('command:register', { pluginId, command });
      }
    };
    
    // 激活插件
    plugin.activate(pluginContext);
    this.activePlugins.set(pluginId, pluginContext);
    
    this.emit('plugin:activate', { pluginId, manifest: plugin.manifest });
    console.log(`[PluginManager] Activated: ${pluginId}`);
  }
  
  /**
   * 卸载插件
   */
  deactivate(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    if (plugin.deactivate) {
      plugin.deactivate();
    }
    
    this.activePlugins.delete(pluginId);
    this.emit('plugin:deactivate', { pluginId });
    console.log(`[PluginManager] Deactivated: ${pluginId}`);
  }
  
  /**
   * 卸载并移除插件
   */
  unregister(pluginId: string): void {
    this.deactivate(pluginId);
    this.plugins.delete(pluginId);
    this.emit('plugin:unregister', { pluginId });
  }
  
  /**
   * 获取插件
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * 获取所有插件
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * 获取激活的插件
   */
  getActive(): string[] {
    return Array.from(this.activePlugins.keys());
  }
  
  /**
   * 按类别获取插件
   */
  getByCategory(category: string): Plugin[] {
    return this.getAll().filter(p => p.manifest.category === category);
  }
  
  /**
   * 注册钩子
   */
  addHook(name: string, callback: Function): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name)!.push(callback);
  }
  
  /**
   * 执行钩子
   */
  async runHook(name: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks.get(name) || [];
    const results = [];
    
    for (const hook of hooks) {
      try {
        const result = await hook(...args);
        results.push(result);
      } catch (err) {
        console.error(`[PluginManager] Hook ${name} failed:`, err);
      }
    }
    
    return results;
  }
  
  /**
   * 事件发射
   */
  private emit(event: string, data?: any): void {
    this.context.events.emit(event, data);
  }
}
