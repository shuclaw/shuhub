/**
 * ShuHub Plugin System - TypeScript
 * 插件化白板系统
 */

// 插件类型定义
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  category: 'agent' | 'task' | 'tool' | 'ui' | 'integration';
  permissions?: string[];
  dependencies?: string[];
}

export interface Plugin {
  manifest: PluginManifest;
  activate(context: PluginContext): void;
  deactivate?(): void;
}

export interface PluginContext {
  workspace: Workspace;
  events: EventBus;
  storage: Storage;
  logger: Logger;
  registerComponent(name: string, component: ComponentClass): void;
  registerTool(name: string, tool: Tool): void;
  registerCommand(command: Command): void;
}

// 白板类型
export interface Workspace {
  id: string;
  pages: Page[];
  currentPage: number;
  zoom: number;
  
  addPage(): Page;
  removePage(index: number): void;
  goToPage(index: number): void;
  
  addElement(element: ElementData): void;
  removeElement(id: string): void;
  updateElement(id: string, updates: Partial<ElementData>): void;
  
  on(event: string, callback: Function): void;
  emit(event: string, data?: any): void;
}

export interface Page {
  id: string;
  name: string;
  index: number;
  elements: ElementData[];
  background?: string;
}

// 元素类型
export type ElementType = 
  | 'agent-card' 
  | 'task-sticky' 
  | 'interaction-log'
  | 'code-block'
  | 'chat-window'
  | 'note'
  | 'text'
  | 'image'
  | 'connector';

export interface ElementData {
  id: string;
  type: ElementType;
  pluginId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: any;
  style?: ElementStyle;
  metadata?: Record<string, any>;
}

export interface ElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  shadow?: boolean;
  opacity?: number;
  zIndex?: number;
}

// 组件基类
export interface ComponentClass {
  new (container: HTMLElement, props: any): Component;
}

export interface Component {
  render(): void;
  update(props: any): void;
  destroy(): void;
  
  on(event: string, callback: Function): void;
  emit(event: string, data?: any): void;
}

// 工具类型
export interface Tool {
  id: string;
  name: string;
  icon: string;
  category: string;
  
  execute(context: ToolContext): Promise<any>;
}

export interface ToolContext {
  workspace: Workspace;
  selection: ElementData[];
  clipboard: any;
}

// 命令类型
export interface Command {
  id: string;
  title: string;
  keybinding?: string;
  when?: string;
  
  execute(): void;
}

// 事件总线
export interface EventBus {
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, data?: any): void;
  once(event: string, callback: Function): void;
}

// 存储
export interface Storage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// 日志
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Agent 类型
export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  color: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  
  send(message: Message): Promise<void>;
  onMessage(callback: (message: Message) => void): void;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'code' | 'image' | 'file';
  content: any;
  timestamp: number;
  metadata?: any;
}

// 任务类型
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: any;
}

// API 响应类型
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// WebSocket 消息类型
export interface WSMessage {
  type: 'agent:status' | 'agent:message' | 'task:update' | 'workspace:sync';
  payload: any;
  timestamp: number;
}
