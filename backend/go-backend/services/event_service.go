package services

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"time"

	"hackathon-backend/blockchain"
	"hackathon-backend/models"
	"hackathon-backend/repositories"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

type EventService struct {
	repo *repositories.EventRepository
}

func NewEventService(repo *repositories.EventRepository) *EventService {
	return &EventService{repo: repo}
}

// GetRepository 获取 repository 实例
func (s *EventService) GetRepository() *repositories.EventRepository {
	return s.repo
}

// SubscribeEvents 使用 WebSocket 订阅链上事件
func (s *EventService) SubscribeEvents(ctx context.Context) error {
	log.Println("🔌 Starting event subscription...")

	bc := s.getBlockchainClient()
	if bc == nil {
		return fmt.Errorf("blockchain client not initialized")
	}

	// 订阅 Hackathon 和 NFTTicket 合约的日志
	addresses := []common.Address{
		bc.GetHackathonAddress(),
		bc.GetNFTTicketAddress(),
	}

	logs, sub, err := bc.SubscribeToLogs(ctx, addresses)
	if err != nil {
		log.Printf("❌ Failed to subscribe to logs: %v", err)
		return err
	}

	log.Println("✅ Listening for events...")

	for {
		select {
		case err := <-sub.Err():
			log.Printf("❌ Subscription error: %v", err)
			return err
		case vLog := <-logs:
			s.processLog(vLog)
		case <-ctx.Done():
			return nil
		}
	}
}

// processLog 处理接收到的日志
func (s *EventService) processLog(vLog types.Log) {
	log.Printf("📥 Received log: Block: %d, Tx: %s", vLog.BlockNumber, vLog.TxHash.Hex())

	// 记录同步日志
	s.CreateSyncLog("event_subscription", vLog.BlockNumber, vLog.TxHash.Hex(), "received", "")

	// EventCreated(uint256,address,string)
	eventCreatedSig := crypto.Keccak256Hash([]byte("EventCreated(uint256,address,string)"))

	if vLog.Topics[0] == eventCreatedSig {
		s.handleEventCreated(vLog)
	}
}

// handleEventCreated 处理 EventCreated 事件
func (s *EventService) handleEventCreated(vLog types.Log) {
	log.Println("🎉 Detected EventCreated event")

	if len(vLog.Topics) < 2 {
		log.Println("❌ Invalid EventCreated log: missing topics")
		return
	}

	// Topic[1] is eventId (uint256)
	eventID := new(big.Int).SetBytes(vLog.Topics[1].Bytes())
	log.Printf("🆔 Event ID: %s", eventID.String())

	// 从合约获取详细信息
	bc := s.getBlockchainClient()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	details, err := bc.GetEventDetails(ctx, eventID)
	if err != nil {
		log.Printf("❌ Failed to get event details: %v", err)
		s.CreateSyncLog("event_created", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 转换为数据库模型
	event := &models.Event{
		EventID:          details.Id.Uint64(),
		Organizer:        details.Organizer.Hex(),
		Title:            details.Title,
		Description:      details.Description,
		StartTime:        details.StartTime.Int64(),
		EndTime:          details.EndTime.Int64(),
		Location:         details.Location,
		MaxParticipants:  details.MaxParticipants.Uint64(),
		ParticipantCount: details.ParticipantCount.Uint64(),
		Active:           details.Active,
		CreatedAt:        time.Unix(details.CreatedAt.Int64(), 0),
		SyncedAt:         time.Now(),
	}

	// 保存到数据库
	if err := s.repo.CreateEvent(event); err != nil {
		log.Printf("❌ Failed to create event in DB: %v", err)
		// 尝试更新（如果已存在）
		if err := s.repo.UpdateEvent(event); err != nil {
			log.Printf("❌ Failed to update event in DB: %v", err)
			s.CreateSyncLog("event_created", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
			return
		}
	}

	log.Printf("✅ Event saved: %s (ID: %d)", event.Title, event.EventID)
	s.CreateSyncLog("event_created", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Saved event %d", event.EventID))
}

// SyncEvents 同步链上的活动数据 (Deprecated: Use SubscribeEvents instead)
func (s *EventService) SyncEvents(ctx context.Context) error {
	log.Println("🔄 Starting event sync...")

	// 获取最后同步的区块
	lastBlock, err := s.repo.GetLastSyncBlock("event")
	if err != nil {
		log.Printf("❌ Failed to get last sync block: %v", err)
		return err
	}

	log.Printf("📦 Last synced block: %d", lastBlock)

	// 获取最新区块
	bc := s.getBlockchainClient()
	if bc == nil {
		log.Println("⚠️ Blockchain client not initialized, skipping sync")
		return nil
	}

	latestBlock, err := bc.GetLatestBlockNumber(ctx)
	if err != nil {
		log.Printf("❌ Failed to get latest block: %v", err)
		return err
	}

	log.Printf("📊 Latest block: %d", latestBlock)

	// 如果没有新区块，跳过
	if latestBlock <= lastBlock {
		log.Println("✅ No new blocks to sync")
		return nil
	}

	// 分批查询（RPC 限制最多 1000 个区块）
	const batchSize = 1000
	currentBlock := lastBlock
	totalLogs := 0

	for currentBlock < latestBlock {
		toBlock := currentBlock + batchSize
		if toBlock > latestBlock {
			toBlock = latestBlock
		}

		log.Printf("📋 Syncing blocks %d to %d", currentBlock, toBlock)

		// 从区块链获取事件日志
		logs, err := bc.GetEventLogs(ctx, currentBlock, toBlock)
		if err != nil {
			log.Printf("❌ Failed to get event logs: %v", err)
			s.CreateSyncLog("event", toBlock, "", "failed", err.Error())
			return err
		}

		log.Printf("📋 Found %d logs in this batch", len(logs))
		totalLogs += len(logs)

		// 记录同步进度
		s.CreateSyncLog("event", toBlock, "", "success", "")

		currentBlock = toBlock
	}

	if totalLogs > 0 {
		log.Printf("✅ Synced %d events total", totalLogs)
	} else {
		log.Println("✅ No new events to sync")
	}

	log.Println("✅ Event sync completed")
	return nil
}

// getBlockchainClient 获取区块链客户端
func (s *EventService) getBlockchainClient() *blockchain.BlockchainClient {
	return blockchain.GetInstance()
}

// GetAllEvents 获取所有活动
func (s *EventService) GetAllEvents() ([]models.Event, error) {
	return s.repo.GetAllEvents()
}

// GetEventByID 根据 ID 获取活动
func (s *EventService) GetEventByID(eventID uint64) (*models.Event, error) {
	return s.repo.GetEventByID(eventID)
}

// GetEventByDBID 根据数据库 ID 获取活动
func (s *EventService) GetEventByDBID(id uint64) (*models.Event, error) {
	return s.repo.GetEventByDBID(id)
}

// GetEventsByOrganizer 根据组织者获取活动
func (s *EventService) GetEventsByOrganizer(organizer string) ([]models.Event, error) {
	return s.repo.GetEventsByOrganizer(organizer)
}

// GetEventParticipants 获取活动的参与者
func (s *EventService) GetEventParticipants(eventID uint64) ([]models.Participant, error) {
	return s.repo.GetParticipantsByEvent(eventID)
}

// GetEventSponsors 获取活动的赞助商
func (s *EventService) GetEventSponsors(eventID uint64) ([]models.Sponsor, error) {
	return s.repo.GetSponsorsByEvent(eventID)
}

// GetEventTickets 获取活动的 NFT 门票
func (s *EventService) GetEventTickets(eventID uint64) ([]models.NFTTicket, error) {
	var tickets []models.NFTTicket
	err := s.repo.GetDB().Where("event_id = ?", eventID).Find(&tickets).Error
	return tickets, err
}

// CreateSyncLog 创建同步日志
func (s *EventService) CreateSyncLog(eventType string, blockNumber uint64, txHash string, status string, errMsg string) error {
	log := &models.SyncLog{
		EventType:   eventType,
		BlockNumber: blockNumber,
		TxHash:      txHash,
		Status:      status,
		Error:       errMsg,
		CreatedAt:   time.Now(),
	}
	return s.repo.CreateSyncLog(log)
}

// GetSyncStats 获取同步统计
func (s *EventService) GetSyncStats() (map[string]interface{}, error) {
	var eventCount int64
	var participantCount int64
	var sponsorCount int64
	var ticketCount int64

	db := s.repo.GetDB()
	db.Model(&models.Event{}).Count(&eventCount)
	db.Model(&models.Participant{}).Count(&participantCount)
	db.Model(&models.Sponsor{}).Count(&sponsorCount)
	db.Model(&models.NFTTicket{}).Count(&ticketCount)

	return map[string]interface{}{
		"events":       eventCount,
		"participants": participantCount,
		"sponsors":     sponsorCount,
		"tickets":      ticketCount,
	}, nil
}
