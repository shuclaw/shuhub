/**
 * ShuHub - 模块化组件化前端
 * 使用 Component 系统重构
 */

// 加载所有组件后初始化
class ShuHubApp {
  constructor() {
    this.components = {};
    this.data = {
      agents: [
        { id: 'lingke', name: '凌刻', role: '技术开发', avatar: '🔧', color: '#dbeafe', status: 'online' },
        { id: 'xiaohui', name: '小绘', role: '创意设计', avatar: '🎨', color: '#fce7f3', status: 'online' },
        { id: 'yanjia', name: '岩甲', role: '安全运维', avatar: '🛡️', color: '#fef3c7', status: 'busy' },
        { id: 'bufu', name: '布土拨', role: '运营客服', avatar: '📊', color: '#d1fae5', status: 'offline' },
        { id: 'assistant', name: '小智', role: '前台助手', avatar: '🤖', color: '#f3e8ff', status: 'online' }
      ],
      tasks: [
        { id: 1, title: '实现 Safety 模块', agent: 'lingke', priority: 'high', done: true },
        { id: 2, title: '优化 Docker 配置', agent: 'lingke', priority: 'medium', done: false },
        { id: 3, title: '设计前端界面', agent: 'xiaohui', priority: 'high', done: false }
      ],
      currentAgent: 'assistant',
      logs: [],
      messages: []
    };
  }
  
  init() {
    console.log('🔧 ShuHub 模块化前端初始化...');
    
    // 初始化各个组件
    this.initAgentList();
    this.initTaskPanel();
    this.initInteractionLog();
    this.initCodeBrowser();
    this.initChatWindow();
    
    // 加载初始数据
    this.loadInitialData();
    
    console.log('✅ 所有组件已加载');
  }
  
  /**
   * 左侧：Agent 列表
   */
  initAgentList() {
    this.components.agentList = new AgentList('agentListContainer', {
      agents: this.data.agents,
      selectedId: this.data.currentAgent
    });
    
    this.components.agentList.mount();
    
    // 监听事件
    this.components.agentList.container.addEventListener('agent:select', (e) => {
      this.selectAgent(e.detail.agentId);
    });
  }
  
  /**
   * 中上：任务面板
   */
  initTaskPanel() {
    this.components.taskPanel = new TaskPanel('taskPanelContainer', {
      tasks: this.data.tasks,
      expanded: true,
      title: '当前任务'
    });
    
    this.components.taskPanel.mount();
    
    this.components.taskPanel.container.addEventListener('task:check', (e) => {
      const { taskId, done } = e.detail;
      this.log('system', `任务 ${taskId} ${done ? '已完成' : '重新打开'}`);
    });
    
    this.components.taskPanel.container.addEventListener('task:click', (e) => {
      console.log('点击任务:', e.detail.taskId);
    });
  }
  
  /**
   * 中下：交互日志
   */
  initInteractionLog() {
    this.components.interactionLog = new InteractionLog('interactionLogContainer', {
      title: 'Agent 交互日志',
      maxLogs: 100,
      autoScroll: true
    });
    
    this.components.interactionLog.mount();
  }
  
  /**
   * 右上：代码浏览器
   */
  initCodeBrowser() {
    this.components.codeBrowser = new CodeBrowser('codeBrowserContainer', {});
    this.components.codeBrowser.mount();
    
    // 加载示例代码
    const sampleCode = `// Safety Module
class SafetyModule {
  constructor() {
    this.config = {
      allowDelete: false,
      forbiddenPaths: ['/etc']
    };
  }
  
  checkFile(path) {
    for (const forbidden of this.config.forbiddenPaths) {
      if (path.includes(forbidden)) {
        throw new Error('Forbidden!');
      }
    }
    return true;
  }
}`;

    this.components.codeBrowser.setContent(sampleCode, 'code');
  }
  
  /**
   * 右下：会话窗口
   */
  initChatWindow() {
    this.components.chatWindow = new ChatWindow('chatWindowContainer', {
      agents: this.data.agents,
      currentAgent: this.data.currentAgent,
      placeholder: '输入消息...',
      onSend: (content, agentId) => {
        this.handleSendMessage(content, agentId);
      }
    });
    
    this.components.chatWindow.mount();
    
    this.components.chatWindow.container.addEventListener('agent:selector:click', () => {
      this.rotateAgent();
    });
  }
  
  /**
   * 加载初始数据
   */
  loadInitialData() {
    // 添加一些示例日志
    this.log('system', 'ShuHub 系统启动');
    this.log('info', '凌刻', 'Safety 模块初始化完成');
    this.log('success', '凌刻', '所有测试通过 ✓');
    
    // 添加示例消息
    this.components.chatWindow.receive('assistant', '你好！我是小智，有什么可以帮你的？');
  }
  
  /**
   * 选择 Agent
   */
  selectAgent(agentId) {
    this.data.currentAgent = agentId;
    this.components.chatWindow.setAgent(agentId);
    this.log('system', `切换到 ${this.getAgentName(agentId)}`);
  }
  
  /**
   * 轮换 Agent
   */
  rotateAgent() {
    const currentIndex = this.data.agents.findIndex(a => a.id === this.data.currentAgent);
    const nextIndex = (currentIndex + 1) % this.data.agents.length;
    this.selectAgent(this.data.agents[nextIndex].id);
  }
  
  /**
   * 处理发送消息
   */
  handleSendMessage(content, agentId) {
    this.log('info', '你', `发送: "${content.substring(0, 30)}..."`);
    
    // 模拟回复
    setTimeout(() => {
      const agent = this.data.agents.find(a => a.id === agentId);
      const reply = `收到，${agent?.name || 'Agent'} 正在处理...`;
      this.components.chatWindow.receive(agentId, reply);
      this.log('info', agent?.name, reply);
    }, 800);
  }
  
  /**
   * 添加日志
   */
  log(type, agent, content) {
    this.components.interactionLog.add({
      type,
      agent,
      content,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    });
  }
  
  getAgentName(agentId) {
    const agent = this.data.agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  }
}

// 初始化
window.shuhub = new ShuHubApp();
window.shuhub.init();
