# 番茄钟网页技术方案

## 技术架构（简洁优先）

```
Vue 3 + Vite + TypeScript
单一页面应用，无路由，无状态管理库
```

## 核心模块设计

### 1. 计时器模块 (核心)
```typescript
interface TimerState {
  mode: 'work' | 'break'      // 工作或休息模式
  status: 'idle' | 'running' | 'paused'
  remainingSeconds: number     // 剩余秒数
  completedPomodoros: number   // 完成的番茄数
}
```

### 2. 功能函数
- `formatTime(seconds: number): string` - 格式化显示时间 (mm:ss)
- `startTimer()` - 开始计时
- `pauseTimer()` - 暂停计时
- `resetTimer()` - 重置计时器
- `playSound()` - 播放提示音

### 3. 响应式设计策略
- 移动端优先
- Flexbox 居中布局
- 媒体查询适配桌面端

## 文件结构规划

```
src/
├── App.vue              # 主组件（含所有逻辑）
├── main.ts              # 入口文件
├── style.css            # 全局样式
├── assets/
│   └── alarm.mp3        # 提示音（可选内联）
index.html
vite.config.ts
package.json
tsconfig.json
```

## 实现要点

### 计时器实现
- 使用 `setInterval` 每秒递减
- `onUnmounted` 清除定时器防止内存泄漏
- 使用 `ref` 和 `computed` 管理响应式状态

### 提示音方案
- 方案A：内联 Base64 音频（简洁）
- 方案B：Web Audio API 生成简单提示音（无外部依赖）

### 样式设计
- 圆形计时器显示
- 按钮状态视觉反馈
- 完成时动画/颜色变化提示
- CSS 变量管理主题色

### 数据持久化（可选）
- `localStorage` 保存今日完成数
- 页面刷新后恢复统计

## 最小实现清单

1. 创建 Vite + Vue 3 + TS 项目
2. 实现 App.vue 计时器逻辑
3. 添加基础样式和响应式布局
4. 添加提示音功能
5. 测试并优化