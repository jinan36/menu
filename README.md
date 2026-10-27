# 餐厅菜单

顾客菜单使用 Vue 3 + Vite；管理界面使用 Sanity Studio，位于 `sanity-studio/`。
两部分保留独立的依赖和锁文件，统一使用 pnpm，无需同时启动。

## 环境准备

- Node.js：使用 22.x，至少 22.12.0；Vercel 两个项目也使用 22.x。
- pnpm：两部分均固定为 10.24.0。

首次在电脑上安装 pnpm：

```powershell
npm install --global pnpm@10.24.0
pnpm --version
```

这里只用 npm 安装 pnpm 工具；项目依赖使用下面的 pnpm 命令安装。

## 启动顾客菜单

在项目根目录打开终端，例如 `C:\Project\menu`：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的地址，通常是 `http://localhost:5173/`。
端口被占用时可能自动改为 5174 等，以终端输出为准。

根目录需要 `.env.local`，内容如下；已有文件无需重新创建：

```dotenv
VITE_SANITY_PROJECT_ID=t3dj4nuv
VITE_SANITY_DATASET=production
```

修改环境变量后重启开发服务。这两个值用于选择 Sanity 项目和数据集，
不需要在前台填写写入 Token。

## 启动 Sanity 后台

另开一个终端，在项目根目录执行：

```powershell
cd sanity-studio
pnpm install --frozen-lockfile
pnpm dev
```

通常访问 `http://localhost:3333/`，菜单排序页面为 `/menu-order`。
详细说明见 [后台说明](sanity-studio/README.md)。

## 手机预览与停止服务

手机与电脑连接同一个 Wi-Fi，菜单可使用终端显示的 Network 地址预览，
例如 `http://电脑局域网IP:5173/`。电脑 IP 可能变化，不要固定使用旧地址。
如果无法连接，检查 Windows 防火墙是否允许该服务通过专用网络。

需要让手机访问后台时，在后台目录运行：

```powershell
pnpm dev --host 0.0.0.0
```

后台还需要在 Sanity 项目的 API → CORS origins 中加入对应的完整来源，
例如 `http://电脑局域网IP:3333`，并允许凭据（Allow credentials），以支持登录。

关闭浏览器不会停止服务；在运行服务的终端按 **Ctrl+C** 停止。
关闭对应终端或关机也会结束本地服务，不影响线上网站。

## 构建与检查

在根目录构建菜单：

```powershell
pnpm build
```

产物位于根目录 `dist/`。`pnpm preview` 可以预览构建产物，通常使用 4173 端口；
生产模式会直接访问 Sanity，需要该预览来源在 Sanity CORS 配置中获准。

在后台目录构建和运行排序测试：

```powershell
pnpm build
pnpm test
```

后台产物位于 `sanity-studio/dist/`。首次安装以及修改依赖后需要安装，
日常重新启动服务只需 `pnpm dev`。
添加依赖时在对应目录运行 `pnpm add 包名`，同时提交该目录的 `package.json`
和 `pnpm-lock.yaml`；不要重新生成 `package-lock.json`。

## Vercel 部署

同一个 GitHub 仓库对应两个 Vercel 项目：

| 设置 | menu（菜单前台） | menu-sanity（后台） |
| --- | --- | --- |
| Root Directory | 仓库根目录（留空或 `./`） | `sanity-studio` |
| Framework Preset | Vite | Other |
| Install Command（Override） | `pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile` |
| Build Command（Override） | `pnpm build` | `pnpm build` |
| Output Directory | `dist` | `dist` |
| Node.js Version | 22.x | 22.x |

前台的 Environment Variables 需要配置上面的两个 `VITE_SANITY_*` 变量。
在两个 Vercel 项目的 Environment Variables 中都添加
`ENABLE_EXPERIMENTAL_COREPACK=1`，应用于 Production 和 Preview，
以便按各目录 `packageManager` 字段使用固定的 pnpm 版本。
参考 [Vercel 包管理器说明](https://vercel.com/docs/package-managers)。
不要通过 `pnpm deploy` 发布 Vercel 项目；推送 GitHub 后由 Vercel 自动部署。

Vercel 的 Ignored Build Step 已按目录分别配置：只改 `sanity-studio/` 时前台跳过，
只改前台时后台跳过。规则保存在 Vercel 项目设置中，不在仓库内；
涉及两部分的改动应分别构建。看到 `Canceled by Ignored Build Step` 表示按规则跳过。
