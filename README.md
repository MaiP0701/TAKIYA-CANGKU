# 奶茶店库存管理系统

基于 `Next.js + Prisma + PostgreSQL` 的多门店库存管理网页应用，面向奶茶店门店与总仓的日常高频操作。当前版本已经从演示型 MVP 推进到更接近真实运营工具的阶段，重点放在：

- 多地点可扩展
- 可维护的基础资料
- 统一库存服务层
- 完整库存审计日志
- 移动端高频操作体验
- 低库存预警与门店报表
- PWA 安装与基础缓存

## 当前能力

### 基础资料

- 地点管理：新增、编辑、启用、停用门店/仓库/其他地点
- 单位管理：新增、编辑、启用、停用单位
- 物料管理：分类、SKU、规格、主单位、安全库存、预警开关、启用状态
- 用户管理：管理员 / 店员 / 仓库人员

### 库存业务

- 入库
- 出库
- 报损
- 调拨
- 快速出入库
- 盘点创建与盘点修正
- 低库存预警
- 库存日志追踪

### 管理视图

- 仪表盘
- 库存列表
- 库存日志
- 调拨页面
- 盘点页面
- 预警页面
- 门店库存报表
- CSV 导出

### 工程能力

- Prisma schema 与 seed 同步维护
- 核心库存变更走统一 service
- 库存快照与日志同事务写入
- `Serializable` 事务隔离级别 + 冲突重试
- API 统一返回结构
- PWA manifest + service worker + 离线提示页

## 技术栈

- Next.js 15
- React 19
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- 自定义 Cookie Session 认证

## 项目结构

```text
.
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ public/
│  ├─ manifest.webmanifest
│  ├─ sw.js
│  └─ offline.html
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login
│  │  ├─ (app)/
│  │  └─ api/
│  ├─ components/
│  ├─ lib/
│  │  ├─ auth/
│  │  ├─ constants/
│  │  ├─ db/
│  │  └─ services/
│  └─ types/
├─ .env.example
├─ next.config.ts
└─ README.md
```

## 本地运行

### 环境要求

- Node.js 20+ 或 22+
- PostgreSQL 15+

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bubble_tea_inventory"
SESSION_SECRET="replace-with-a-long-random-secret"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 4. 推送数据库结构

开发环境可直接使用：

```bash
npm run db:push
```

如果你希望用 Prisma Migration 管理本地演进：

```bash
npm run db:migrate
```

### 5. 导入种子数据

```bash
npm run db:seed
```

### 6. 启动开发环境

```bash
npm run dev
```

访问：

- [http://localhost:3000](http://localhost:3000)

## 默认账号

- 管理员：`admin / Admin123!`
- 店员：`kanda / Store123!`
- 仓库人员：`warehouse / Warehouse123!`

## 种子数据内容

### 地点

- 总仓
- 神田店
- 上野店
- 池袋店（停用示例）

### 单位

- 千克 `kg`
- 升 `L`
- 个
- 片
- 袋
- 箱
- 包
- 瓶
- 托盘（停用示例）

### 物料

- 红茶茶叶
- 绿茶茶叶
- 乌龙茶茶叶
- 牛奶
- 浓缩牛奶
- 草莓果酱
- 芒果果酱
- 珍珠
- 椰果
- 蛋挞皮
- 鸡蛋
- 中杯杯子
- 大杯杯子
- 吸管
- 纸袋
- 塑料袋
- 一次性手套
- 餐巾纸
- 清洁剂

### 演示业务数据

- 总仓初始化库存
- 总仓到门店调拨
- 门店日常出库
- 报损
- 快速调整
- 一张已完成盘点单
- 多条库存变更日志
- 若干低库存预警样例

## 主要页面

- `/login` 登录
- `/` 仪表盘
- `/quick-adjust` 快速出入库
- `/inventory` 库存列表
- `/transactions` 库存日志
- `/transfers` 调拨
- `/stocktakes` 盘点
- `/alerts` 预警
- `/reports` 门店库存报表
- `/items` 物料管理
- `/locations` 地点管理
- `/units` 单位管理
- `/users` 用户管理

## 关键业务规则

### 1. 库存不能直接手改

库存变化必须来自以下操作之一：

- 入库
- 出库
- 调拨
- 报损
- 盘点修正
- 其他调整

### 2. 所有库存变化统一走服务层

核心入口在：

- [src/lib/services/inventory.ts](/Users/maip/Desktop/Codex/PROJECT3/src/lib/services/inventory.ts)

服务层会在同一个事务里完成：

- 校验物料 / 地点 / 权限 / 停用状态
- 校验数量与防负库存
- 更新当前库存快照
- 写入 `inventory_transactions`
- 写入 `inventory_change_logs`

### 3. 停用不删除

- 停用地点、单位、物料不能参与新操作
- 历史库存、历史日志、历史盘点仍保留
- 默认不开放物理删除

### 4. 大额调整保护

当数量达到 `50` 及以上时：

- 前端会二次确认
- 服务层要求 `confirmed`
- 建议填写备注

### 5. 备注强制规则

以下操作会要求备注：

- 报损
- 盘点修正
- 其他调整
- 大额操作

## 报表与导出

报表页支持：

- 按地点筛选
- 按分类筛选
- 按低库存筛选
- 按库存排序
- 查看最近变更
- 导出 CSV

CSV 接口：

- `GET /api/reports/inventory.csv`

## API 返回结构

成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": {
    "message": "错误信息",
    "status": 400,
    "code": "APP_ERROR"
  }
}
```

## PWA 使用说明

系统已包含：

- `manifest.webmanifest`
- `sw.js`
- `offline.html`

### iPhone / iPad 安装到主屏幕

1. 用 Safari 打开系统
2. 点击分享按钮
3. 选择“添加到主屏幕”
4. 安装后可用接近全屏方式打开

### Android 安装

1. 用 Chrome 打开系统
2. 点击浏览器菜单
3. 选择“安装应用”或“添加到主屏幕”

### 当前离线策略

- 静态资源和基础入口页会缓存
- 网络波动时可提升启动稳定性
- 不支持离线写库存
- 库存操作仍需联网，避免数据不一致

## 开发建议

### 常用命令

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
npm run build
```

### 重要文件

- [prisma/schema.prisma](/Users/maip/Desktop/Codex/PROJECT3/prisma/schema.prisma)
- [prisma/seed.ts](/Users/maip/Desktop/Codex/PROJECT3/prisma/seed.ts)
- [src/lib/services/inventory.ts](/Users/maip/Desktop/Codex/PROJECT3/src/lib/services/inventory.ts)
- [src/lib/services/queries.ts](/Users/maip/Desktop/Codex/PROJECT3/src/lib/services/queries.ts)

## 后续可扩展方向

- 供应商管理
- 采购单 / 采购入库
- 按地点独立预警规则
- 批次与保质期管理
- 销售联动扣库存
- 自动补货建议
- 中文 / 日文多语言
- 调拨申请、在途、签收确认

## 当前限制

- 当前库存列表只展示已有库存记录的地点-物料组合，不自动补 0 行
- 物料 `规格` 目前只做说明，不做单位换算
- 尚未接入采购、供应商、消息推送和批次追踪
- PWA 图标目前使用仓库内静态资源，正式上线建议替换为品牌化 PNG 图标
