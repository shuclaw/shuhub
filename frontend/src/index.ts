/**
 * ShuHub Frontend - Main Entry
 * TypeScript Plugin System for Whiteboard Canvas
 */

import { PluginManager } from './core/plugin-manager';
import { Workspace } from './core/workspace';
import { EventEmitter } from 'eventemitter3';
import type { EventBus, Storage, Logger } from './types';

// 导出核心类
export { PluginManager } from './core/plugin-manager';
export { Workspace } from './core/workspace';

// 导出类型
export * from './types';

// 导出插件
export { AgentCardPlugin } from './plugins/agent-card';
export { TaskStickyPlugin } from './plugins/task-sticky';

/**
 * ShuHub Application
 */
export class ShuHubApp {
  pluginManager: PluginManager;
  workspace: Workspace;
  events: EventBus;
  storage: Storage;
  logger: Logger;
  
  constructor() {
    // 初始化事件总线
    this.events = new EventEmitter() as EventBus;
    
    // 初始化存储
    this.storage = this.createStorage();
    
    // 初始化日志
    this.logger = this.createLogger();
    
    // 初始化工作区
    this.workspace = new Workspace(this.events);
    
    // 初始化插件管理器
    this.pluginManager = new PluginManager({
      events: this.events,
      storage: this.storage,
      logger: this.logger
    });
    
    console.log('🔧 ShuHub TypeScript Frontend initialized');
  }
  
  /**
   * 启动应用
   */
  async start(): Promise<void> {
    // 加载核心插件
    this.loadCorePlugins();
    
    // 恢复工作区状态
    await this.restoreWorkspace();
    
    console.log('✅ ShuHub started');
  }
  
  /**
   * 加载核心插件
   */
  private loadCorePlugins(): void {
    // 动态导入插件
    import('./plugins/agent-card').then(({ AgentCardPlugin }) => {
      this.pluginManager.register(AgentCardPlugin);
      this.pluginManager.activate('shuhub.agent-card');
    });
    
    import('./plugins/task-sticky').then(({ TaskStickyPlugin }) => {
      this.pluginManager.register(TaskStickyPlugin);
      this.pluginManager.activate('shuhub.task-sticky');
    });
  }
  
  /**
   * 恢复工作区
   */
  private async restoreWorkspace(): Promise<void> {
    try {
      const saved = await this.storage.get('workspace');
      if (saved) {
        this.workspace.import(saved);
      }
    } catch (err) {
      this.logger.warn('Failed to restore workspace:', err);
    }
  }
  
  /**
   * 保存工作区
   */
  async save(): Promise<void> {
    try {
      await this.storage.set('workspace', this.workspace.export());
    } catch (err) {
      this.logger.error('Failed to save workspace:', err);
    }
  }
  
  /**
   * 创建存储
   */
  private createStorage(): Storage {
    return {
      async get<T>(key: string): Promise<T | null> {
        const data = localStorage.getItem(`shuhub:${key}`);
        return data ? JSON.parse(data) : null;
      },
      
      async set<T>(key: string, value: T): Promise<void> {
        localStorage.setItem(`shuhub:${key}`, JSON.stringify(value));
      },
      
      async remove(key: string): Promise<void> {
        localStorage.removeItem(`shuhub:${key}`);
      },
      
      async clear(): Promise<void> {
        localStorage.clear();
      }
    };
  }
  
  /**
   * 创建日志
   */
  private createLogger(): Logger {
    return {
      debug: (message: string, ...args: any[]) => {
        console.debug(`[ShuHub] ${message}`, ...args);
      },
      info: (message: string, ...args: any[]) => {
        console.info(`[ShuHub] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        console.warn(`[ShuHub] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        console.error(`[ShuHub] ${message}`, ...args);
      }
    };
  }
}

// 默认导出
export default ShuHubApp;

// 全局声明
declare global {
  interface Window {
    shuhub: ShuHubApp;
  }
}
