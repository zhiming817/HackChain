-- 添加链信息字段以支持多链
-- 执行日期: 2025-01-30

-- 1. 为 events 表添加链信息字段
ALTER TABLE `events` 
ADD COLUMN `chain_id` BIGINT UNSIGNED NOT NULL DEFAULT 10143 COMMENT '链ID（10143=Monad, 5003=Mantle, 50312=Somnia）' AFTER `id`,
ADD COLUMN `network` VARCHAR(50) NOT NULL DEFAULT 'monad' COMMENT '网络名称（monad, mantle, somnia）' AFTER `chain_id`;

-- 更新 events 表的索引
DROP INDEX `idx_contract_event` ON `events`;
CREATE INDEX `idx_chain_contract_event` ON `events` (`chain_id`, `network`, `contract_address`, `event_id`);

-- 2. 为 participants 表添加链信息字段
ALTER TABLE `participants`
ADD COLUMN `chain_id` BIGINT UNSIGNED NOT NULL DEFAULT 10143 COMMENT '链ID' AFTER `id`,
ADD COLUMN `network` VARCHAR(50) NOT NULL DEFAULT 'monad' COMMENT '网络名称' AFTER `chain_id`;

-- 更新 participants 表的索引
DROP INDEX `idx_contract_event_participant` ON `participants`;
CREATE INDEX `idx_chain_contract_event_participant` ON `participants` (`chain_id`, `network`, `contract_address`, `event_id`, `wallet`);

-- 3. 为 sponsors 表添加链信息字段
ALTER TABLE `sponsors`
ADD COLUMN `chain_id` BIGINT UNSIGNED NOT NULL DEFAULT 10143 COMMENT '链ID' AFTER `id`,
ADD COLUMN `network` VARCHAR(50) NOT NULL DEFAULT 'monad' COMMENT '网络名称' AFTER `chain_id`;

-- 更新 sponsors 表的索引
CREATE INDEX `idx_chain_sponsor` ON `sponsors` (`chain_id`, `network`, `contract_address`);

-- 4. 为 nft_tickets 表添加链信息字段
ALTER TABLE `nft_tickets`
ADD COLUMN `chain_id` BIGINT UNSIGNED NOT NULL DEFAULT 10143 COMMENT '链ID' AFTER `id`,
ADD COLUMN `network` VARCHAR(50) NOT NULL DEFAULT 'monad' COMMENT '网络名称' AFTER `chain_id`;

-- 更新 nft_tickets 表的索引
DROP INDEX `idx_contract_token` ON `nft_tickets`;
CREATE INDEX `idx_chain_contract_token` ON `nft_tickets` (`chain_id`, `network`, `contract_address`, `token_id`);

-- 5. 为 sync_logs 表添加链信息字段
ALTER TABLE `sync_logs`
ADD COLUMN `chain_id` BIGINT UNSIGNED NOT NULL DEFAULT 10143 COMMENT '链ID' AFTER `id`,
ADD COLUMN `network` VARCHAR(50) NOT NULL DEFAULT 'monad' COMMENT '网络名称' AFTER `chain_id`;

-- 为 sync_logs 添加索引
CREATE INDEX `idx_chain_sync` ON `sync_logs` (`chain_id`, `network`);

-- 6. 更新现有数据（如果有）
-- 假设现有数据都来自 Monad 网络
UPDATE `events` SET `chain_id` = 10143, `network` = 'monad' WHERE `chain_id` = 10143;
UPDATE `participants` SET `chain_id` = 10143, `network` = 'monad' WHERE `chain_id` = 10143;
UPDATE `sponsors` SET `chain_id` = 10143, `network` = 'monad' WHERE `chain_id` = 10143;
UPDATE `nft_tickets` SET `chain_id` = 10143, `network` = 'monad' WHERE `chain_id` = 10143;
UPDATE `sync_logs` SET `chain_id` = 10143, `network` = 'monad' WHERE `chain_id` = 10143;

-- 说明:
-- 现在每个表都有 chain_id 和 network 字段来区分不同的区块链
-- chain_id: 链的数字标识 (10143=Monad, 5003=Mantle, 50312=Somnia)
-- network: 链的名称标识 (monad, mantle, somnia)
-- 这样可以在同一个数据库中存储来自多条链的数据
