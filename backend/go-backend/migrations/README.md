# 数据库迁移指南

本文档说明如何迁移数据库以支持多链部署。

## 迁移概述

为了支持 HackChain 在多个区块链网络（Monad、Mantle、Somnia）上的部署，我们在所有主要表中添加了链信息字段：

- `chain_id` (BIGINT UNSIGNED): 链的数字标识
  - 10143 = Monad Testnet
  - 5003 = Mantle Sepolia
  - 50312 = Somnia Network

- `network` (VARCHAR(50)): 链的名称标识
  - "monad" = Monad Testnet
  - "mantle" = Mantle Sepolia
  - "somnia" = Somnia Network

## 受影响的表

1. **events** - 黑客松活动
2. **participants** - 参与者
3. **sponsors** - 赞助商
4. **nft_tickets** - NFT 门票
5. **sync_logs** - 同步日志

## 迁移步骤

### 方式一：使用 GORM 自动迁移（推荐）

如果你的数据库是空的或者可以重建，最简单的方法是删除旧表并让 GORM 自动创建新表：

```bash
# 启动后端服务，GORM 会自动创建带有新字段的表
cd backend/go-backend
go run main.go
```

### 方式二：手动执行 SQL 迁移脚本

如果你有现有数据需要保留：

```bash
# 连接到数据库
mysql -u your_username -p hackathon

# 执行迁移脚本
source migrations/add_chain_info_fields.sql
```

或者：

```bash
# 直接执行
mysql -u your_username -p hackathon < migrations/add_chain_info_fields.sql
```

### 迁移脚本说明

**add_chain_info_fields.sql** - 主迁移脚本
- 为每个表添加 `chain_id` 和 `network` 字段
- 更新索引以包含链信息
- 默认值设置为 Monad (10143, 'monad')
- 更新现有数据为 Monad 网络

**rollback_chain_info_fields.sql** - 回滚脚本
- 如果迁移出现问题，可以使用此脚本回滚更改
- 删除新添加的字段和索引
- 恢复原始索引结构

## 迁移后验证

```sql
-- 检查表结构
DESCRIBE events;
DESCRIBE participants;
DESCRIBE sponsors;
DESCRIBE nft_tickets;
DESCRIBE sync_logs;

-- 验证索引
SHOW INDEX FROM events;
SHOW INDEX FROM participants;
SHOW INDEX FROM nft_tickets;

-- 检查数据
SELECT chain_id, network, COUNT(*) FROM events GROUP BY chain_id, network;
SELECT chain_id, network, COUNT(*) FROM participants GROUP BY chain_id, network;
```

## 代码更改

迁移后，确保你的代码在创建或查询数据时包含链信息：

```go
// 创建活动时指定链信息
event := &models.Event{
    ChainID:         10143,
    Network:         "monad",
    ContractAddress: "0x...",
    EventID:         "1",
    // ... 其他字段
}

// 查询特定链的活动
var events []models.Event
db.Where("chain_id = ? AND network = ?", 10143, "monad").Find(&events)

// 查询 Mantle 链的活动
var mantleEvents []models.Event
db.Where("chain_id = ? AND network = ?", 5003, "mantle").Find(&mantleEvents)
```

## 链 ID 参考

| 网络 | Chain ID (十进制) | Chain ID (十六进制) | Network 字段 |
|------|-------------------|---------------------|--------------|
| Monad Testnet | 10143 | 0x279f | monad |
| Mantle Sepolia | 5003 | 0x138b | mantle |
| Somnia Network | 50312 | 0xc488 | somnia |

## 回滚迁移

如果需要回滚到之前的数据库结构：

```bash
mysql -u your_username -p hackathon < migrations/rollback_chain_info_fields.sql
```

**注意**: 回滚将删除 `chain_id` 和 `network` 字段及其数据！

## 故障排除

### 错误：索引已存在
如果遇到 "Duplicate key name" 错误：
```sql
-- 先删除旧索引
DROP INDEX idx_contract_event ON events;
-- 然后重新运行迁移脚本
```

### 错误：字段已存在
如果字段已经存在：
```sql
-- 检查字段是否已添加
SHOW COLUMNS FROM events LIKE 'chain_id';
-- 如果已存在，跳过添加字段的步骤
```

### 数据一致性
迁移后验证数据一致性：
```sql
-- 检查是否有空的链信息
SELECT COUNT(*) FROM events WHERE chain_id IS NULL OR network IS NULL;
SELECT COUNT(*) FROM participants WHERE chain_id IS NULL OR network IS NULL;
```

## 最佳实践

1. **备份数据库**: 在执行迁移前，始终备份你的数据库
   ```bash
   mysqldump -u your_username -p hackathon > backup_$(date +%Y%m%d).sql
   ```

2. **测试环境**: 先在测试环境执行迁移，确认无误后再在生产环境执行

3. **监控日志**: 迁移后监控应用日志，确保没有查询错误

4. **性能测试**: 新索引可能影响查询性能，进行适当的性能测试

## 相关文档

- [部署地址文档](../../doc/DEPLOYMENT_ADDRESSES.md) - 各链的合约地址
- [后端配置](../go-backend/.env.example) - 多链配置示例
- [前端配置](../../frontend/web/src/config.js) - 前端多链配置

## 更新日志

- **2025-01-30**: 初始迁移，添加多链支持字段
