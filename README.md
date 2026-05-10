# 题库训练台

这是一个 React + Vite Web 应用，内容包含：

- 计算机三级题库
- 软件工程师题库
- 题目卡片练习
- 答题历史记录
- 答案解析
- 模拟考试
- 学习进度
- 通过率评估
- 知识要点复习

## 环境要求

- Windows
- Node.js
- npm

当前项目已针对本机 PowerShell 脚本执行限制做了处理：

- 使用 `npm.cmd` 运行 npm 命令
- 使用 `.npmrc` 指定 npm 生命周期脚本走 `cmd.exe`
- 使用 `scripts/patch-vite.js` 跳过 Vite 在 Windows 下的 `net use` 网络盘探测

## 安装依赖

首次运行前，在项目目录执行：

```bat
npm.cmd install --ignore-scripts
```

这里使用 `--ignore-scripts` 是为了避开当前环境中 `esbuild` postinstall 子进程被系统拒绝的问题。本项目构建脚本已经避开了 esbuild 运行时依赖。

## 推荐运行方式：直接打开构建版

执行：

```bat
npm.cmd run build
```

然后打开：

```text
dist\index.html
```

也可以直接双击：

```text
open-built-app.bat
```

这个方式不需要启动本地服务，适合当前环境。

## 本地服务运行方式

如果你的系统允许常驻本地服务，可以执行：

```bat
npm.cmd run start
```

启动后访问：

```text
http://127.0.0.1:5173/
```

如果浏览器提示“127.0.0.1 拒绝建立连接”，说明服务进程没有保持运行。请改用“直接打开构建版”的方式。

## 常用命令

```bat
npm.cmd run build
```

构建应用到 `dist` 目录。

```bat
npm.cmd run open
```

构建后尝试自动打开 `dist\index.html`。

```bat
npm.cmd run start
```

构建后启动本地静态服务。

## 项目结构

```text
.
├─ index.html
├─ package.json
├─ open-built-app.bat
├─ start-app.bat
├─ scripts
│  ├─ open-dist.cjs
│  ├─ patch-vite.js
│  └─ serve-dist.cjs
└─ src
   ├─ data.js
   ├─ main.js
   └─ styles.css
```

## 题库来源说明

题库数据在 `src\data.js` 中维护。当前内置：

- 计算机三级：18 题，按二级科目划分为网络技术、数据库技术、信息安全技术、嵌入式系统开发技术、Linux应用与开发技术
- 软考：24 题，按资格方向划分为公共基础、程序员、软件设计师、网络工程师、数据库系统工程师、软件评测师、系统架构设计师、信息系统项目管理师
- 知识要点：14 条

题目分为两类：

- `真题考点改编`：根据近年公开考试大纲、样题和高频考点改写，不直接复制受版权保护的真题原文。
- `模拟题`：围绕同一考试范围原创编写，用于日常练习和模拟考试。

知识要点模块已按章节式学习笔记组织，软考分节参考 51CTO 软考章节练习目录形式：

- 资格方向
- 章
- 节
- 初学者解释
- 核心要点
- 易错点
- 例题入口
- 复盘问题
- 掌握状态

每道题都包含：

- `sourceType`：题源类型
- `year`：参考年份
- `explanation`：答案解析
- `points`：知识点标签

## 注意事项

不要直接双击项目根目录的 `index.html`。它是 Vite 源入口，不是最终可直接打开的应用。

正确打开位置是：

```text
dist\index.html
```

答题历史和学习进度保存在浏览器的 `localStorage` 中。更换浏览器或清理浏览器数据后，历史记录会被清空。
