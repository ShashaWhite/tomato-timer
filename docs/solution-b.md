# 番茄钟网页技术方案（扩展优先）

## 一、技术架构（扩展优先）

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Views     │  │ Components  │  │   Layouts   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Stores    │  │ Composables │  │  Services   │     │
│  │  (Pinia)    │  │  (Hooks)    │  │  (Logic)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                       Core Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Timer Core  │  │  Notifier  │  │  Scheduler  │     │
│  │  (Engine)   │  │  (Alert)   │  │  (Task)     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Storage   │  │   Plugin    │  │   Config    │     │
│  │   (Persist) │  │  (Extend)   │  │  (Setting)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 | 实现方式 |
|------|------|----------|
| 单一职责 | 每个模块只负责一个功能 | 模块化拆分，接口隔离 |
| 开闭原则 | 对扩展开放，对修改关闭 | 抽象接口 + 策略模式 |
| 依赖倒置 | 依赖抽象而非具体实现 | Interface + DI |
| 插件化 | 核心功能可插拔 | Plugin System |

---

## 二、核心模块设计（考虑未来扩展）

### 2.1 计时器核心模块（Timer Core）

```typescript
// types/timer.ts
interface TimerConfig {
  duration: number;          // 持续时间（秒）
  interval: number;          // tick间隔（毫秒）
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  remaining: number;
  elapsed: number;
  progress: number;  // 0-1
}

// 核心接口 - 支持多种计时器实现
interface ITimer {
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  getState(): TimerState;
  subscribe(callback: (state: TimerState) => void): () => void;
}
```

**扩展预留：**
- 支持多种计时模式：倒计时、正计时、番茄钟模式
- 支持自定义时长配置
- 支持计时器事件钩子

### 2.2 任务调度模块（Scheduler）

```typescript
// types/scheduler.ts
interface Task {
  id: string;
  type: 'work' | 'break' | 'long-break';
  duration: number;
  order: number;
}

interface SchedulerConfig {
  workDuration: number;        // 工作时长（默认25分钟）
  shortBreakDuration: number;   // 短休息时长（默认5分钟）
  longBreakDuration: number;    // 长休息时长（默认15分钟）
  longBreakInterval: number;    // 长休息间隔（默认4个番茄后）
}

interface IScheduler {
  getCurrentTask(): Task | null;
  getNextTask(): Task | null;
  skipToNext(): void;
  reset(): void;
  getProgress(): { completed: number; total: number };
}
```

### 2.3 通知模块（Notifier）

```typescript
// types/notifier.ts
interface NotificationOptions {
  sound?: boolean;
  vibration?: boolean;
  browser?: boolean;
  visual?: boolean;
}

interface INotifier {
  notify(options: NotificationOptions): Promise<void>;
  registerSound(name: string, source: string): void;
  playSound(name: string): void;
  requestPermission(): Promise<boolean>;
}
```

**扩展预留：**
- 支持自定义提示音
- 支持浏览器原生通知
- 支持震动提示（移动端）
- 支持自定义视觉动效

### 2.4 统计模块（Statistics）

```typescript
// types/statistics.ts
interface StatRecord {
  id: string;
  timestamp: number;
  type: 'work' | 'break';
  duration: number;
  completed: boolean;
  taskId?: string;
  tags?: string[];
}

interface StatisticsSummary {
  totalTomatoes: number;
  totalWorkTime: number;
  totalBreakTime: number;
  dailyAverage: number;
  weeklyTrend: number[];
}
```

---

## 三、未来扩展路线图

### Phase 1 (MVP)
- 基础番茄钟计时
- 简单统计
- 本地存储

### Phase 2
- 自定义时长配置
- 主题切换
- 键盘快捷键

### Phase 3
- 任务管理系统
- 标签分类
- 数据导出

### Phase 4
- 云端同步
- 多设备支持
- 社交分享

### Phase 5
- 插件市场
- 开放API
- 第三方集成

---

## 四、技术选型说明

| 技术 | 选型 | 理由 |
|------|------|------|
| 框架 | Vue 3 | 组合式API、TypeScript友好 |
| 构建工具 | Vite | 快速开发体验 |
| 状态管理 | Pinia | 类型安全、模块化（预留） |
| 样式方案 | CSS Variables | 主题支持、无运行时开销 |
| 测试 | Vitest | 快速单元测试 |

---

## 五、开发规范

### 5.1 命名规范
- 组件：PascalCase（如 `TimerDisplay.vue`）
- 文件：kebab-case（如 `countdown-timer.ts`）
- 接口：I前缀（如 `ITimer`）
- 常量：UPPER_SNAKE_CASE

### 5.2 目录规范
- `core/`：纯逻辑，无框架依赖
- `infrastructure/`：基础设施实现
- `application/`：应用状态和逻辑
- `presentation/`：UI组件

### 5.3 测试规范
- 核心模块：单元测试覆盖率 > 80%
- 组件：关键交互E2E测试
- 提交前：所有测试通过