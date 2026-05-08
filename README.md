# 番茄时钟 (Tomato Timer)

一个简洁美观的番茄时钟应用，帮助您专注学习和工作。

在线体验：https://shashawhite.github.io/tomato-timer/

## 功能特性

### 核心功能
- 🍅 **四种专注模式**：标准（25分钟）、作业（45分钟）、复习（20分钟）、考试（90分钟）
- ⏱️ **macOS风格圆环**：深色圆环从顶部顺时针消耗，直观展示剩余时间
- 🔔 **完成提醒**：提示音 + 浏览器通知
- 📊 **统计数据**：今日完成数、今日时长、累计天数、历史总时长

### 学习记录
- 📝 **科目选择**：支持选择学习科目，记录专注内容
- 📖 **学习日记**：每次专注完成后可记录学习内容
- 📈 **周报/月报**：查看专注时长趋势、科目分布、学习日记回顾

### 成就系统
- 🌱 **里程碑成就**：累计专注1/10/50/100小时解锁
- ⭐ **每日成就**：单日完成1/3/5/10个番茄解锁
- 🏆 **成就徽章**：页面上方展示已解锁成就

### 界面设计
- 🎨 **极简风格**：无边框设计，透明背景下拉列表
- 📱 **响应式布局**：自适应屏幕大小
- 💾 **本地持久化**：所有数据保存在本地，无需登录

## 开发运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 技术栈

- Vue 3 + Composition API
- Vite 构建工具
- 纯前端实现，GitHub Pages 部署

## 项目结构

```
tomato_timer/
├── src/
│   ├── App.vue              # 主应用组件
│   ├── components/
│   │   └── ReportPanel.vue  # 报告面板组件
│   ├── composables/
│   │   ├── useTimer.js      # 计时器逻辑
│   │   ├── useSettings.js   # 设置管理
│   │   ├── useStorage.js    # 统计存储
│   │   ├── useRecords.js    # 学习记录
│   │   ├── useAchievements.js # 成就系统
│   │   ├── useSound.js      # 音频提示
│   │   └── useNotification.js # 浏览器通知
│   └── utils/
│       └── format.js        # 格式化工具
├── public/
│   └── favicon.svg          # 网站图标
└── .github/workflows/
    └── deploy.yml           # GitHub Actions 自动部署
```

## License

MIT