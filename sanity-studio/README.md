# 菜单管理后台（Sanity Studio）

此目录是独立的 Sanity Studio，使用自己的 `package.json` 和 `pnpm-lock.yaml`。
与顾客菜单统一使用 **pnpm 10.24.0**，Node.js 使用 **22.x（至少 22.12.0）**。

## 安装和启动

在此目录打开终端：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

通常打开 `http://localhost:3333/`；菜品和分类编辑在 `/structure`，排序工具在 `/menu-order`。
在终端按 **Ctrl+C** 停止服务。手机访问方式见 [项目说明](../README.md)。

后台连接 Sanity 项目 `t3dj4nuv` 的 `production` 数据集，配置位于
`sanity.config.js` 和 `sanity.cli.js`。本地与线上后台使用同一份数据：
编辑、上传、发布和保存排序会写入云端，不是仅保存在本地的演示数据。

## 构建和测试

```powershell
pnpm build
pnpm test
```

构建产物为此目录下的 `dist/`。测试覆盖菜单排序和分类变更规则，不写入 Sanity 数据。
修改依赖时使用 `pnpm add`，并一起提交 `package.json` 和 `pnpm-lock.yaml`。

## Vercel 设置

- 项目：`menu-sanity`
- Root Directory：`sanity-studio`
- Framework Preset：`Other`
- Install Command（Override）：`pnpm install --frozen-lockfile`
- Build Command（Override）：`pnpm build`
- Output Directory：`dist`
- Node.js Version：`22.x`
- Environment Variables：添加 `ENABLE_EXPERIMENTAL_COREPACK=1`，应用于 Production 和 Preview。

保持现有的 Ignored Build Step 目录判断规则。推送 GitHub 后由 Vercel 部署；
`package.json` 中的 `deploy` 脚本是发布到 Sanity 托管服务，不用于 Vercel。
