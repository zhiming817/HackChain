-- 回滚链信息字段的添加
-- 执行日期: 2025-01-30

-- 1. 恢复 events 表
DROP INDEX `idx_chain_contract_event` ON `events`;
CREATE INDEX `idx_contract_event` ON `events` (`contract_address`, `event_id`);
ALTER TABLE `events` 
DROP COLUMN `network`,
DROP COLUMN `chain_id`;

-- 2. 恢复 participants 表
DROP INDEX `idx_chain_contract_event_participant` ON `participants`;
CREATE INDEX `idx_contract_event_participant` ON `participants` (`contract_address`, `event_id`, `wallet`);
ALTER TABLE `participants`
DROP COLUMN `network`,
DROP COLUMN `chain_id`;

-- 3. 恢复 sponsors 表
DROP INDEX `idx_chain_sponsor` ON `sponsors`;
ALTER TABLE `sponsors`
DROP COLUMN `network`,
DROP COLUMN `chain_id`;

-- 4. 恢复 nft_tickets 表
DROP INDEX `idx_chain_contract_token` ON `nft_tickets`;
CREATE INDEX `idx_contract_token` ON `nft_tickets` (`contract_address`, `token_id`);
ALTER TABLE `nft_tickets`
DROP COLUMN `network`,
DROP COLUMN `chain_id`;

-- 5. 恢复 sync_logs 表
DROP INDEX `idx_chain_sync` ON `sync_logs`;
ALTER TABLE `sync_logs`
DROP COLUMN `network`,
DROP COLUMN `chain_id`;
