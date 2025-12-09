# <img src="./public/logo.png" width="32" height="32" alt="Logo" style="vertical-align: bottom; margin-right: 8px;">【我推的格子】

> **Create, Share, and Discover your Anime Taste.**

一个现代化的、高颜值的动画角色喜好表生成器。

![Example](./example.png)

## ✨ 核心特性

### 🎨 多样化模板
- **经典 (Classic)**: 5x3 布局，包含“本命”、“初恋”、“意难平”等经典标签。
- **扩展 (Extended)**: 5x6 豪华布局，30 个标签涵盖核心关系、情感投射及抽象梗。
- **CP 问卷 (Couple)**: 4x4 布局，专为磕 CP 设计，支持成对标签。
- **绅士问卷 (NSFW)**: 3x3 布局，懂的都懂 (⁄ ⁄•⁄ω⁄•⁄ ⁄)。
- **绅士问卷 (NSFW Classic)**: 5x3 布局，更丰富、更刺激的经典版本。
- **真爱 (Oshi)**: 4x4 布局，全方位展示对本命角色的爱。
- **萌属性 (Moe)**: 5x3 布局，傲娇、病娇、三无等经典萌属性大赏。
- **发色图鉴 (Hair Color)**: 4x3 布局，红黄蓝绿紫粉金白黑，各种发色控一本满足。
- **关系 (Family)**: 4x4 布局，父母兄弟姐妹恋人，角色关系全覆盖。
- **喜闻乐见 (Tropes)**: 5x3 布局，败犬、青梅竹马、天降系等经典套路。
- **主观锐评 (Opinions)**: 4x2 布局，男女角色过誉、低估、尬黑等主观评价。

### ⚡️ 极致体验
- **自动搜索**: 输入关键词自动联想，无需回车，丝滑流畅。
- **响应式设计**: 手机、平板、电脑完美适配，随时随地编辑。
- **高清导出**: 一键生成带有精美水印的高清大图，分享无忧。
- **隐私安全**: 所有数据存储在本地浏览器，刷新不丢失，隐私绝对安全。

## 🚀 快速开始

### 部署指南

本项目基于 Vue 3 + Vite 构建，推荐使用 Cloudflare Pages 进行部署。

1. **Fork** 本仓库到你的 GitHub。
2. 在 **Cloudflare Pages** 中连接你的仓库。
3. **构建设置**：
   - 构建命令: `npm run build`
   - 输出目录: `dist`
4. **环境变量** (可选):
   - `VITE_BANGUMI_ACCESS_TOKEN`: 用于提高 API 调用额度。

### 本地开发

```bash
# 安装依赖
npm install
```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
```

## 🛠️ 如何添加新模板

本项目设计了灵活的模板系统，你可以轻松添加自定义模板。

1.  打开文件：`src/logic/templates.ts`
2.  在 `TEMPLATES` 数组中添加一个新的对象：

```typescript
{
  id: 'my-new-template',      // 唯一ID
  name: '我的新模板 (4x2)',    // 显示名称
  cols: 4,                    // 列数
  items: [                    // 格子标签列表
    '标签1', '标签2', '标签3', '标签4',
    '标签5', '标签6', '标签7', '标签8'
  ]
}
```

3.  保存文件，页面会自动刷新，你就能在下拉菜单中看到新模板了！

## 📄 部署指南

本项目完全静态，可以部署到任何静态托管服务。推荐使用 **Cloudflare Pages**。

详细部署教程请查看：[DEPLOY.md](./deploy.md)
