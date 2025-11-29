# Hackathon Backend - Go

基于 Go 的黑客松后端服务，用于同步 Somnia 区块链上的活动数据到数据库。

## 项目结构

```
go-backend/
├── config/              # 配置管理
├── database/            # 数据库连接
├── models/              # 数据模型
├── repositories/        # 数据访问层
├── services/            # 业务逻辑层
├── controllers/         # 控制层
├── blockchain/          # 区块链交互
├── main.go              # 入口文件
├── go.mod               # Go 模块定义
└── .env.example         # 环境变量示例
```

## 技术栈

- **框架**: Gin (Web 框架)
- **ORM**: GORM (数据库 ORM)
- **数据库**: MySQL
- **区块链**: go-ethereum (以太坊客户端)

## 快速开始

### 1. 安装依赖

```bash
cd backend/go-backend
go mod download
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入实际的配置
```

### 3. 创建数据库

```bash
mysql -u root -p
CREATE DATABASE hackathon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 运行服务

```bash
go run main.go
```

服务将在 `http://localhost:8080` 启动

## API 端点

### 健康检查
- `GET /health` - 服务健康检查

### 活动管理
- `GET /api/events` - 获取所有活动
- `GET /api/events/:id` - 获取指定活动
- `GET /api/events/organizer?organizer=0x...` - 获取组织者的活动
- `GET /api/events/:id/participants` - 获取活动参与者
- `GET /api/events/:id/sponsors` - 获取活动赞助商
- `GET /api/events/:id/tickets` - 获取活动 NFT 门票

### 统计
- `GET /api/stats` - 获取同步统计信息

## 数据模型

### Event (活动)
- ID: 主键
- EventID: 链上活动 ID
- Organizer: 组织者地址
- Title: 活动标题
- Description: 活动描述
- StartTime: 开始时间
- EndTime: 结束时间
- Location: 活动地点
- MaxParticipants: 最大参与者数
- ParticipantCount: 当前参与者数
- Active: 是否活跃

### Participant (参与者)
- ID: 主键
- EventID: 活动 ID
- Wallet: 钱包地址
- Name: 参与者名称
- RegisteredAt: 注册时间
- CheckedIn: 是否签到
- CheckInTime: 签到时间

### Sponsor (赞助商)
- ID: 主键
- EventID: 活动 ID
- Wallet: 钱包地址
- Name: 赞助商名称
- Amount: 赞助金额
- SponsoredAt: 赞助时间

### NFTTicket (NFT 门票)
- ID: 主键
- TokenID: Token ID
- EventID: 活动 ID
- Holder: 持有者地址
- EventTitle: 活动标题
- Location: 活动地点
- StartTime: 开始时间
- EndTime: 结束时间
- Used: 是否已使用

## 同步机制

后端服务会定期（默认 30 秒）从 Somnia 区块链同步数据：

1. 获取最后同步的区块号
2. 查询新的事件日志
3. 解析事件数据
4. 保存到数据库
5. 记录同步日志

## 环境变量

```
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=hackathon

# 区块链配置
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
HACKATHON_CONTRACT_ADDRESS=0x65BBA3f213534A4Dfc54E9e0CE82E944859EEB24
NFT_TICKET_CONTRACT_ADDRESS=0x3A181f96fa8a6e5757E954Bc28051a7F5C539AAb

# 服务器配置
SERVER_PORT=8080
SYNC_INTERVAL=30

# 日志级别
LOG_LEVEL=info
```

## 开发指南

### 添加新的 API 端点

1. 在 `services/event_service.go` 中添加业务逻辑
2. 在 `controllers/event_controller.go` 中添加控制器方法
3. 在 `main.go` 中注册路由

### 添加新的数据模型

1. 在 `models/event.go` 中定义模型
2. 在 `repositories/event_repository.go` 中添加数据访问方法
3. 在 `services/event_service.go` 中添加业务逻辑

## 许可证

MIT
