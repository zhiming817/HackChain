# HackChain

去中心化黑客松管理平台，支持多链部署（EVM、SVM、Sui、Aptos 等主流公链），具有 NFT 门票、链上活动管理和实时数据同步功能。

## 🌟 功能特性

- **基于区块链的活动管理**：支持在多种主流公链上创建和管理黑客松活动
  - EVM 链：Ethereum、Polygon、Monad 等
  - SVM 链：Solana 及其生态
  - Move 链：Sui、Aptos 等
- **NFT 门票**：为参与者发放独特的 NFT 门票，支持二维码签到
- **智能合约集成**：完整的链上活动生命周期和参与者追踪
- **实时同步**：基于 WebSocket 的区块链事件同步到后端
- **赞助商系统**：链上赞助追踪和管理
- **签到系统**：基于二维码的参与者签到，支持移动端扫描

## 🏗️ 架构

```
HackChain/
├── backend/          # Go 后端服务，包含区块链同步
├── contract/         # Solidity 智能合约（Hardhat）
├── frontend/         # React + Vite 前端应用
└── doc/             # 文档
```

### 技术栈

**前端**
- React 19 + Vite
- Material-UI (MUI)
- Ethers.js v6
- React Router v7
- TanStack Query
- HTML5 二维码扫描器

**后端**
- Go 1.21+
- Gin Web 框架
- GORM（MySQL ORM）
- go-ethereum（区块链客户端）
- WebSocket 事件订阅

**智能合约**
- Solidity 0.8.27（EVM 链）
- Rust（Solana/SVM 链）
- Move（Sui、Aptos 链）
- Hardhat / Anchor / Move 开发工具链
- OpenZeppelin 及各链标准库
- 支持多链部署（Ethereum、Polygon、Monad、Solana、Sui、Aptos 等）

**数据库**
- MySQL 8.0+

## 🚀 快速开始

### 前置要求

- Node.js 18+ 和 pnpm
- Go 1.21+
- MySQL 8.0+
- 钱包支持（MetaMask、Phantom、Sui Wallet、Petra 等）
- 目标区块链的 RPC 访问权限（支持 EVM、SVM、Sui、Aptos 等主流公链）

### 1. 克隆仓库

```bash
git clone https://github.com/zhiming817/HackChain.git
cd HackChain
```

### 2. 部署智能合约

```bash
cd contract
pnpm install

# 在 .env 中配置你的私钥
cp .env.example .env

# 部署到指定网络（根据目标链选择相应的部署工具）
# EVM 链（Ethereum、Polygon、Monad 等）
pnpm hardhat run scripts/deploy.js --network monad
# pnpm hardhat run scripts/deploy.js --network sepolia
# pnpm hardhat run scripts/deploy.js --network polygon

# Solana/SVM 链
# anchor build && anchor deploy --provider.cluster devnet

# Sui 链
# sui move build && sui client publish --gas-budget 100000000

# Aptos 链
# aptos move compile && aptos move publish
```

保存部署的合约地址以供后续步骤使用。

### 3. 设置后端

```bash
cd ../backend/go-backend

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库和合约地址

# 创建数据库
mysql -u root -p
CREATE DATABASE hackathon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 运行后端（将自动迁移表）
go run main.go
```

后端将在 `http://localhost:8080` 启动

### 4. 设置前端

```bash
cd ../../frontend/web
pnpm install

# 在 src/config.js 中配置合约地址
# 更新 HACKATHON_CONTRACT_ADDRESS 和 NFT_TICKET_CONTRACT_ADDRESS

# 启动开发服务器
pnpm dev
```

前端将在 `http://localhost:5173` 启动

## 📦 智能合约

### Hackathon.sol

黑客松活动管理主合约。

**核心功能：**
- 创建带元数据的活动
- 注册参与者
- 管理赞助商
- 发放 NFT 门票
- 签到系统
- 活动生命周期管理

**事件：**
- `EventCreated(uint256 indexed eventId, address indexed organizer, ...)`
- `ParticipantRegistered(uint256 indexed eventId, address indexed participant, ...)`
- `SponsorAdded(uint256 indexed eventId, address indexed sponsor, ...)`
- `ParticipantCheckedIn(uint256 indexed eventId, address indexed participant, ...)`

### NFTTicket.sol

基于 ERC721 的 NFT 门票系统。

**核心功能：**
- 为每位参与者发放唯一的 NFT 门票
- 每位参与者每个活动只能有一张门票
- 包含活动详情的门票元数据
- 生成二维码用于签到

## 🔌 API 接口

### 健康检查
- `GET /health` - 服务健康状态

### 活动
- `GET /api/events` - 获取所有活动
- `GET /api/events/:id` - 根据 ID 获取活动
- `GET /api/events/organizer?organizer=0x...` - 根据组织者获取活动
- `GET /api/events/:id/participants` - 获取活动参与者
- `GET /api/events/:id/sponsors` - 获取活动赞助商
- `GET /api/events/:id/tickets` - 获取活动 NFT 门票

### 统计
- `GET /api/stats` - 获取同步统计信息

## 🔄 数据同步

后端根据不同链类型使用相应的事件监听机制：

**EVM 链（Ethereum、Polygon、Monad 等）**
1. **WebSocket 连接**：维持与 RPC 的持久连接
2. **事件过滤**：订阅合约事件
3. **数据处理**：解析事件日志并提取数据
4. **数据库存储**：将处理后的数据存储到 MySQL
5. **心跳检测**：定期 ping 保持连接活跃

**Solana/SVM 链**
- 使用 WebSocket 订阅账户和程序日志
- 解析交易指令和事件

**Sui 链**
- 订阅事件查询 API
- 监听链上对象变化

**Aptos 链**
- 使用事件流 API
- 订阅模块事件

**支持的事件：**
- EventCreated（活动创建）
- ParticipantRegistered（参与者注册）
- SponsorAdded（赞助商添加）
- ParticipantCheckedIn（参与者签到）
- EventUpdated（活动更新）
- EventCancelled（活动取消）

## 🎫 NFT 门票系统

每位注册的参与者将收到一张 NFT 门票，包含：
- 唯一的 Token ID（由活动 ID + 参与者地址哈希生成）
- 活动元数据（标题、地点、时间）
- 用于签到的二维码
- 转账限制（每位参与者每个活动一张）

**签到流程：**
1. 参与者展示二维码（包含门票 token ID）
2. 扫描器读取二维码
3. 前端验证门票所有权
4. 后端标记参与者已签到
5. 智能合约记录签到时间戳

## 🔧 配置

### 后端 (.env)

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hackathon

# 区块链（根据目标链类型配置）
# EVM 链配置
CHAIN_TYPE=evm  # 或 svm, sui, aptos
CHAIN_RPC_URL=https://your-rpc-endpoint
CHAIN_ID=your-chain-id
HACKATHON_CONTRACT_ADDRESS=0x...
NFT_TICKET_CONTRACT_ADDRESS=0x...

# Solana/SVM 链配置（如果使用）
# CHAIN_TYPE=svm
# SOLANA_RPC_URL=https://api.devnet.solana.com
# PROGRAM_ID=...

# Sui 链配置（如果使用）
# CHAIN_TYPE=sui
# SUI_RPC_URL=https://fullnode.devnet.sui.io
# PACKAGE_ID=0x...

# Aptos 链配置（如果使用）
# CHAIN_TYPE=aptos
# APTOS_RPC_URL=https://fullnode.devnet.aptoslabs.com
# MODULE_ADDRESS=0x...

# 服务器
SERVER_PORT=8080
```

### 前端 (src/config.js)

```javascript
// 通用配置
export const CHAIN_TYPE = "evm"; // 或 "svm", "sui", "aptos"

// EVM 链配置
export const HACKATHON_CONTRACT_ADDRESS = "0x...";
export const NFT_TICKET_CONTRACT_ADDRESS = "0x...";
export const CHAIN_RPC_URL = "https://your-rpc-endpoint";
export const CHAIN_ID = "your-chain-id";

// Solana/SVM 链配置（如果使用）
// export const SOLANA_RPC_URL = "https://api.devnet.solana.com";
// export const PROGRAM_ID = "...";

// Sui 链配置（如果使用）
// export const SUI_RPC_URL = "https://fullnode.devnet.sui.io";
// export const PACKAGE_ID = "0x...";

// Aptos 链配置（如果使用）
// export const APTOS_RPC_URL = "https://fullnode.devnet.aptoslabs.com";
// export const MODULE_ADDRESS = "0x...";
```

## 📱 移动端签到扫描器

移动端扫描器使用 HTML5 QRCode 库：

1. 在移动设备上打开扫描器页面
2. 授予相机权限
3. 扫描参与者的二维码
4. 查看参与者详情和签到状态
5. 在区块链上确认签到

## 🔐 安全考虑

- **合约所有权**：只有组织者可以管理自己的活动
- **访问控制**：参与者每个活动只能注册一次
- **NFT 限制**：每位参与者每个活动只有一张门票
- **签到验证**：只有活动组织者可以为参与者签到
- **禁用外键**：后端使用程序化引用完整性

## 🐛 故障排除

### 后端无法启动
- 确保 MySQL 正在运行且数据库存在
- 验证 .env 中的合约/程序地址
- 检查区块链 RPC URL 是否可访问
- 确认 Chain Type 和 Chain ID 配置正确
- 检查对应链的 SDK 是否正确安装

### 前端无法连接钱包
- EVM 链：确保 MetaMask 已安装并添加目标网络
- Solana：确保 Phantom 或 Solflare 钱包已安装
- Sui：确保 Sui Wallet 已安装
- Aptos：确保 Petra 或 Martian 钱包已安装
- 确保你有对应链的测试代币
- 检查 config.js 中的网络配置和合约地址

### 事件不同步
- 检查后端日志中的 WebSocket 错误
- 验证合约地址与部署匹配
- 确保 RPC WebSocket 端点可用

### 数据库 ID 溢出
- ID 存储为 VARCHAR(100) 以处理 uint256 哈希
- 不要手动修改 event_id 或 token_id 列

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📧 联系方式

如有问题或需要支持，请在 GitHub 上开启 issue。

## 🙏 致谢

- 各主流公链提供的基础设施
  - EVM 生态：Ethereum、Polygon、Monad 等
  - Solana 生态及 SVM 兼容链
  - Move 生态：Sui、Aptos
- OpenZeppelin、Anchor、Move 标准库等提供的安全合约/程序库
- 整个 Web3 社区
