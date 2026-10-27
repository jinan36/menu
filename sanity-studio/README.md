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

后台连接 Sanity 项目 `t3dj4nuv`，通过 `SANITY_STUDIO_PROJECT_ID`
和 `SANITY_STUDIO_DATASET` 环境变量配置，Studio 和 CLI 共用 `sanityEnvironment.js`。

- `pnpm dev` 和普通 CLI 命令读取 `.env.development`，使用 `development`。
- `pnpm build` / `sanity deploy` 读取 `.env.production`，使用 `production`。
- 手动设置的环境变量优先；不要在 `.env.local` 里固定正式数据集。
- 本地后台顶部显示黄色“开发环境”提示。编辑、上传、发布和保存排序写入开发数据。
- 线上后台继续操作正式数据。开发数据和正式数据不会自动同步。

两份数据都在 Sanity 云端，停止本地服务不会清除开发数据。
导入导出时明确指定目标，例如导入只能对 `development` 操作；
不要把测试数据导回 `production`。

## 构建和测试

在此目录运行一键检查，依次执行代码检查、测试和构建；任一步失败即停止：

```powershell
pnpm check
```

也可以单独运行：

- `pnpm lint`：只检查，不修改文件；存在错误或警告时失败。
- `pnpm lint:fix`：自动修复可修复的规范问题。
- `pnpm test`：运行 `tests/` 下全部 `*.test.mjs` 测试。
- `pnpm build`：构建后台，不发布代码或修改 Sanity 数据。

从仓库根目录运行 `pnpm --dir sanity-studio check`，效果相同。
构建产物为此目录下的 `dist/`，检查排除构建产物和 `.sanity/` 缓存。
测试覆盖菜单排序、分类变更和环境隔离规则，不写入 Sanity 数据。
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
- Production 环境可以明确设置 `SANITY_STUDIO_PROJECT_ID=t3dj4nuv` 和
  `SANITY_STUDIO_DATASET=production`；未覆盖时也会使用 `.env.production`。

保持现有的 Ignored Build Step 目录判断规则。推送 GitHub 后由 Vercel 部署；
`package.json` 中的 `deploy` 脚本是发布到 Sanity 托管服务，不用于 Vercel。
