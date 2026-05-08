# 番茄钟网页应用详细架构设计

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    App.vue                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ TimerDisplay│ │ ControlPanel│ │ StatsDisplay│   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Composables / Functions                 │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ useTimer     │  │ useSound     │                │   │
│  │  │ - 状态管理    │  │ - 音频播放    │                │   │
│  │  │ - 计时逻辑    │  │ - 提示音生成  │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ useStorage   │  │ useNotify    │                │   │
│  │  │ - 本地存储    │  │ - 通知提醒    │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        基础设施层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ localStorage│  │ Web Audio API│  │ Notification│        │
│  │   (持久化)   │  │   (音频)     │  │    API      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 架构说明

本应用采用简洁的单页应用架构，基于 Vue 3 Composition API 构建：

- **用户界面层**：负责视图渲染和用户交互
- **业务逻辑层**：封装核心业务逻辑，提供可复用的 Composables
- **基础设施层**：提供浏览器 API 的抽象封装

## 2. 核心模块

### 2.1 计时器模块 (Timer Module)

#### 职责
- 管理番茄钟计时状态
- 控制计时器的启动、暂停、重置
- 处理工作/休息模式切换

#### 接口定义

```typescript
// types/timer.ts

/** 计时器模式 */
type TimerMode = 'work' | 'break';

/** 计时器状态 */
type TimerStatus = 'idle' | 'running' | 'paused';

/** 计时器配置 */
interface TimerConfig {
  workDuration: number;      // 工作时长（分钟），默认 25
  breakDuration: number;     // 休息时长（分钟），默认 5
  longBreakDuration: number; // 长休息时长（分钟），默认 15
  longBreakInterval: number; // 长休息间隔（番茄数），默认 4
}

/** 计时器状态 */
interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  completedPomodoros: number;
  totalWorkTime: number;     // 累计工作时间（秒）
}

/** 计时器操作接口 */
interface TimerActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setConfig: (config: Partial<TimerConfig>) => void;
}

/** 计时器 Composable */
interface UseTimerReturn {
  state: Readonly<TimerState>;
  config: Readonly<TimerConfig>;
  actions: TimerActions;
  formattedTime: string;
  progress: number;  // 0-1 进度百分比
}
```

### 2.2 音频模块 (Sound Module)

#### 职责
- 播放计时结束提示音
- 支持音量控制
- 支持静音切换

#### 实现策略

```typescript
// composables/useSound.ts

export function useSound(): UseSoundReturn {
  const state = reactive<SoundState>({
    isMuted: false,
    volume: 0.7
  });

  // 使用 Web Audio API 生成提示音
  const playBeep = (frequency: number, duration: number) => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = state.isMuted ? 0 : state.volume;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };
}
```

### 2.3 存储模块 (Storage Module)

#### 职责
- 持久化今日番茄数和统计
- 支持数据恢复
- 自动清理过期数据

#### 接口定义

```typescript
// types/storage.ts

interface DailyStats {
  date: string;              // YYYY-MM-DD 格式
  completedPomodoros: number;
  totalWorkTime: number;
  sessions: SessionRecord[];
}

interface SessionRecord {
  startTime: number;         // timestamp
  endTime: number;
  duration: number;
  type: 'work' | 'break';
}
```

### 2.4 通知模块 (Notification Module)

#### 职责
- 发送系统通知
- 请求通知权限
- 处理通知点击事件

## 3. 数据流

### 3.1 数据流转图

```
用户操作
    │
    ▼
┌─────────────┐
│  UI Events  │  点击开始/暂停/重置按钮
└─────────────┘
    │
    ▼
┌─────────────┐
│  Actions    │  调用对应的 action 方法
└─────────────┘
    │
    ├── start() ────► 启动 setInterval
    │                    │
    │                    ▼
    │               每秒触发 tick()
    │                    │
    │                    ▼
    │               更新 remainingSeconds
    │                    │
    │                    ├── 剩余 > 0: 更新显示
    │                    │
    │                    └── 剩余 = 0: 计时完成
    │                              │
    │                              ▼
    │                         ┌──────────┐
    │                         │ Callback │
    │                         └──────────┘
    │                              │
    │                ┌─────────────┼─────────────┐
    │                ▼             ▼             ▼
    │           playSound()  notifyUser()  saveSession()
    │
    ├── pause() ────► 清除 interval, status = 'paused'
    │
    ├── reset() ────► 清除 interval, 重置状态
    │
    └── skip() ────► 切换到下一阶段
```

## 4. 技术选型

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| Vue | 3.4+ | Composition API，响应式系统，性能优秀 |
| Vite | 5.0+ | 快速开发服务器，优秀的构建性能 |
| TypeScript | 5.0+ | 类型安全，开发体验好 |
| Vitest | 1.0+ | 单元测试 |

## 5. 文件结构

```
tomato-timer/
├── public/
│   └── favicon.svg            # 网站图标
├── src/
│   ├── App.vue                # 主应用组件
│   ├── main.ts                # 应用入口
│   │
│   ├── components/            # UI 组件
│   │   ├── TimerDisplay.vue   # 计时器显示组件
│   │   ├── ControlPanel.vue   # 控制面板组件
│   │   ├── StatsDisplay.vue   # 统计显示组件
│   │
│   ├── composables/           # 组合式函数
│   │   ├── useTimer.ts        # 计时器逻辑
│   │   ├── useSound.ts        # 音频逻辑
│   │   ├── useStorage.ts      # 存储逻辑
│   │   └── useNotification.ts # 通知逻辑
│   │
│   ├── types/                 # 类型定义
│   │   ├── timer.ts           # 计时器类型
│   │   ├── storage.ts         # 存储类型
│   │   └── sound.ts           # 音频类型
│   │
│   ├── utils/                 # 工具函数
│   │   └── format.ts          # 格式化工具
│   │
│   └── styles/                # 样式文件
│       ├── variables.css      # CSS 变量
│       ├── base.css           # 基础样式
│       └── animations.css     # 动画样式
│
├── index.html                 # HTML 入口
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

## 6. 测试策略

### 测试覆盖目标

| 模块 | 覆盖率目标 | 重点测试项 |
|------|-----------|-----------|
| useTimer | 90%+ | 状态转换、计时精度、边界条件 |
| useSound | 80%+ | 音频播放、静音控制 |
| useStorage | 85%+ | 读写操作、错误处理 |
| utils/format | 95%+ | 时间格式化、边界值 |

---

## 附录

### A. 开发规范

1. 使用 TypeScript strict 模式
2. 遵循 Vue 3 Composition API 最佳实践
3. 组件命名使用 PascalCase
4. 函数命名使用 camelCase
5. 常量使用 UPPER_SNAKE_CASE
6. CSS 类名使用 kebab-case

### B. Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### C. 版本规划

- v1.0.0: 基础番茄钟功能
- v1.1.0: 统计功能
- v1.2.0: 自定义设置