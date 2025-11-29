-- 移除 events 表中 event_id 字段的唯一约束
-- 执行日期: 2025-11-29
-- 注意：按顺序逐条执行，如果某条SQL报错可以跳过继续执行下一条

-- 1. 查看 participants 表的外键
SHOW CREATE TABLE participants;

-- 2. 查看 sponsors 表的外键
SHOW CREATE TABLE sponsors;

-- 根据上面的结果，找到外键约束名称，然后执行下面的删除命令
-- 常见的外键名称格式：fk_participants_events, participants_ibfk_1 等

-- 3. 删除 participants 表的外键（根据实际名称调整）
-- ALTER TABLE `participants` DROP FOREIGN KEY `外键名称`;

-- 4. 删除 sponsors 表的外键（根据实际名称调整）
-- ALTER TABLE `sponsors` DROP FOREIGN KEY `外键名称`;

-- 5. 删除唯一索引
-- ALTER TABLE `events` DROP INDEX `idx_events_event_id`;

-- 6. 创建普通索引
-- CREATE INDEX `idx_events_event_id` ON `events` (`event_id`);

-- 7. 重新创建外键约束（可选，如果不需要外键约束可以跳过）
-- ALTER TABLE `participants` 
--     ADD CONSTRAINT `fk_participants_event_id` 
--     FOREIGN KEY (`event_id`) 
--     REFERENCES `events` (`event_id`);

-- ALTER TABLE `sponsors` 
--     ADD CONSTRAINT `fk_sponsors_event_id` 
--     FOREIGN KEY (`event_id`) 
--     REFERENCES `events` (`event_id`);

-- 8. 验证索引
-- SHOW INDEX FROM events WHERE Column_name = 'event_id';
