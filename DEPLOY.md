# 部署指南

本文档提供详细的部署步骤，帮助你将像素图生成器部署到公网上。

## 方式一：GitHub Pages（推荐）

### 步骤 1：创建 GitHub 仓库

1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `pixel-art-generator`（或你喜欢的名字）
   - Description: 像素图生成器 - 拼豆图纸工具
   - 选择 Public（GitHub Pages 免费版需要公开仓库）
   - 不要勾选 "Initialize this repository with a README"（因为代码已经存在）

### 步骤 2：推送代码到 GitHub

在项目目录下执行以下命令：

```bash
# 如果还没有初始化 Git（通常已经有了）
git init

# 添加远程仓库（替换 YOUR_USERNAME 和 REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Pixel art generator"

# 推送到 GitHub（如果是第一次推送）
git branch -M main
git push -u origin main
```

### 步骤 3：启用 GitHub Pages

1. 进入你的 GitHub 仓库页面
2. 点击 "Settings"（设置）
3. 在左侧菜单找到 "Pages"
4. 在 "Source" 下选择：
   - Branch: `main`
   - Folder: `/ (root)`
5. 点击 "Save"

### 步骤 4：访问网站

等待 1-2 分钟后，访问：
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```

例如，如果你的用户名是 `john`，仓库名是 `pixel-art-generator`，地址就是：
```
https://john.github.io/pixel-art-generator/
```

## 方式二：Vercel（快速部署）

### 步骤 1：注册 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录（推荐）

### 步骤 2：导入项目

1. 在 Vercel 控制台点击 "Add New Project"
2. 选择你的 GitHub 仓库
3. Vercel 会自动检测项目类型（Static）
4. 直接点击 "Deploy"

### 步骤 3：访问网站

部署完成后，Vercel 会提供一个链接，例如：
```
https://pixel-art-generator.vercel.app
```

### 自定义域名

在 Vercel 项目设置中可以添加自定义域名。

## 方式三：Netlify（拖拽部署）

### 步骤 1：注册 Netlify

1. 访问 [Netlify](https://www.netlify.com)
2. 注册账号

### 步骤 2：部署

1. 登录后，点击 "Add new site" → "Deploy manually"
2. 将整个项目文件夹拖拽到上传区域
3. 等待部署完成

### 步骤 3：访问网站

Netlify 会自动生成一个链接，例如：
```
https://random-name-123456.netlify.app
```

## 方式四：其他静态托管服务

### Surge.sh

```bash
# 安装 Surge（需要 Node.js）
npm install -g surge

# 在项目目录执行
surge

# 按提示输入域名和邮箱
```

### Cloudflare Pages

1. 访问 [Cloudflare Pages](https://pages.cloudflare.com)
2. 连接 GitHub 仓库
3. 选择分支和构建设置（无需构建，直接部署）
4. 部署完成

## 常见问题

### Q: 页面显示 404？
A: 检查 GitHub Pages 设置中的分支和文件夹路径是否正确。

### Q: 样式没有加载？
A: 确保 `style.css` 文件路径正确，且使用相对路径（如 `./style.css` 或 `style.css`）。

### Q: 图片上传功能不工作？
A: 确保所有 JavaScript 文件都已正确加载，检查浏览器控制台是否有错误。

### Q: LocalStorage 数据丢失？
A: LocalStorage 是浏览器本地存储，清除浏览器数据会导致数据丢失。这是正常行为。

### Q: 如何更新网站？
A: 修改代码后，提交并推送到 GitHub，GitHub Pages 会自动更新（可能需要几分钟）。

## 性能优化建议

- 图片较大时可能加载较慢，建议压缩用户上传的图片
- LocalStorage 有大小限制（通常 5-10MB），图纸库不要保存过多
- 考虑添加图片压缩功能

## 安全提示

- 本项目为纯前端应用，不涉及服务器端数据
- 所有数据存储在用户浏览器中，不会上传到服务器
- 如果添加服务器功能，需要额外的安全措施

---

如有问题，请查看项目 README.md 或提交 Issue。

