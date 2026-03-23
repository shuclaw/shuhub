/**
 * AgentList Component
 * 左侧 Agent 列表组件
 */

class AgentList extends Component {
  constructor(containerId, options = {}) {
    super(containerId, options);
    this.state = {
      agents: options.agents || [],
      selectedId: options.selectedId || null
    };
  }
  
  render() {
    const { agents, selectedId } = this.state;
    
    const onlineAgents = agents.filter(a => a.status !== 'offline');
    const offlineAgents = agents.filter(a => a.status === 'offline');
    
    this.container.innerHTML = `
      <div class="agent-list-header">
        <span class="section-title">Agents</span>
        <span class="agent-count">${onlineAgents.length}/${agents.length}</span>
      </div>
      
      <div class="agent-group">
        <div class="group-title">在线</div>
        ${onlineAgents.map(agent => this.renderAgentCard(agent, selectedId)).join('')}
      </div>
      
      ${offlineAgents.length > 0 ? `
        <div class="agent-group">
          <div class="group-title">离线</div>
          ${offlineAgents.map(agent => this.renderAgentCard(agent, selectedId)).join('')}
        </div>
      ` : ''}
    `;
  }
  
  renderAgentCard(agent, selectedId) {
    const isActive = agent.id === selectedId;
    const statusClass = agent.status === 'online' ? 'online' : 
                       (agent.status === 'busy' ? 'busy' : 'offline');
    
    return `
      <div class="agent-card ${isActive ? 'active' : ''} ${agent.status === 'offline' ? 'offline' : ''}" 
           data-agent-id="${agent.id}">
        <div class="agent-avatar" style="background: ${agent.color}">
          ${agent.avatar}
          <span class="status-dot ${statusClass}"></span>
        </div>
        <div class="agent-info">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-role">${agent.role}</div>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    this.on('click', '.agent-card', (e) => {
      const card = e.target.closest('.agent-card');
      const agentId = card.dataset.agentId;
      this.setState({ selectedId: agentId });
      this.emit('agent:select', { agentId });
    });
  }
  
  // 公共方法：更新 Agent 状态
  updateAgentStatus(agentId, status) {
    const agents = this.state.agents.map(a => 
      a.id === agentId ? { ...a, status } : a
    );
    this.setState({ agents });
  }
  
  // 公共方法：添加 Agent
  addAgent(agent) {
    this.setState({ agents: [...this.state.agents, agent] });
  }
  
  // 公共方法：移除 Agent
  removeAgent(agentId) {
    this.setState({ 
      agents: this.state.agents.filter(a => a.id !== agentId) 
    });
  }
}

// 样式
const agentListStyles = `
  .agent-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid rgba(226,232,240,0.6);
  }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .agent-count {
    font-size: 11px;
    color: #94a3b8;
    background: rgba(99,102,241,0.1);
    padding: 2px 8px;
    border-radius: 10px;
  }
  .agent-group {
    padding: 8px 12px;
  }
  .group-title {
    font-size: 10px;
    color: #94a3b8;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .agent-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #fff;
    border: 2px solid transparent;
    border-radius: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }
  .agent-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
  .agent-card.active {
    border-color: #6366f1;
    background: rgba(99,102,241,0.05);
  }
  .agent-card.offline {
    opacity: 0.6;
  }
  .agent-avatar {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    position: relative;
  }
  .status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid #fff;
  }
  .status-dot.online {
    background: #22c55e;
    animation: pulse-green 2s infinite;
  }
  .status-dot.busy {
    background: #f59e0b;
  }
  .status-dot.offline {
    background: #9ca3af;
  }
  .agent-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
  .agent-role {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
`;

// 注入样式
const styleSheet = document.createElement('style');
styleSheet.textContent = agentListStyles;
document.head.appendChild(styleSheet);

window.AgentList = AgentList;
