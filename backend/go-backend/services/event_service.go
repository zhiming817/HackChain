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

// getContractAddress 从日志中获取合约地址
func (s *EventService) getContractAddress(vLog types.Log) string {
	return vLog.Address.Hex()
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

	log.Printf("📝 Contract addresses to subscribe:")
	log.Printf("   Hackathon: %s", bc.GetHackathonAddress().Hex())
	log.Printf("   NFTTicket: %s", bc.GetNFTTicketAddress().Hex())

	logs, sub, err := bc.SubscribeToLogs(ctx, addresses)
	if err != nil {
		log.Printf("⚠️ WebSocket subscription not supported: %v", err)
		log.Println("🔄 Falling back to polling mode...")
		return fmt.Errorf("websocket not supported, use polling instead")
	}

	log.Println("✅ Listening for events...")

	// 添加心跳检测
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case err := <-sub.Err():
			log.Printf("❌ Subscription error: %v", err)
			return err
		case vLog := <-logs:
			log.Printf("📥 Received log from address: %s", vLog.Address.Hex())
			s.processLog(vLog)
		case <-heartbeat.C:
			log.Println("💓 Event listener heartbeat - still listening...")
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

	// 事件签名
	eventCreatedSig := crypto.Keccak256Hash([]byte("EventCreated(uint256,address,string)"))
	participantRegisteredSig := crypto.Keccak256Hash([]byte("ParticipantRegistered(uint256,address)"))
	participantCheckedInSig := crypto.Keccak256Hash([]byte("ParticipantCheckedIn(uint256,address)"))
	sponsorAddedSig := crypto.Keccak256Hash([]byte("SponsorAdded(uint256,address,uint256)"))
	ticketIssuedSig := crypto.Keccak256Hash([]byte("TicketIssued(uint256,address,uint256)"))
	ticketUsedSig := crypto.Keccak256Hash([]byte("TicketUsed(uint256)"))

	// 根据事件类型处理
	switch vLog.Topics[0] {
	case eventCreatedSig:
		s.handleEventCreated(vLog)
	case participantRegisteredSig:
		s.handleParticipantRegistered(vLog)
	case participantCheckedInSig:
		s.handleParticipantCheckedIn(vLog)
	case sponsorAddedSig:
		s.handleSponsorAdded(vLog)
	case ticketIssuedSig:
		s.handleTicketIssued(vLog)
	case ticketUsedSig:
		s.handleTicketUsed(vLog)
	default:
		log.Printf("⚠️ Unknown event: %s", vLog.Topics[0].Hex())
	}
}

// handleParticipantRegistered 处理 ParticipantRegistered 事件
func (s *EventService) handleParticipantRegistered(vLog types.Log) {
	log.Println("👤 Detected ParticipantRegistered event")

	if len(vLog.Topics) < 3 {
		log.Println("❌ Invalid ParticipantRegistered log: missing topics")
		return
	}

	// Topic[1] is eventId (uint256)
	eventID := new(big.Int).SetBytes(vLog.Topics[1].Bytes())
	// Topic[2] is participant address
	participantAddr := common.BytesToAddress(vLog.Topics[2].Bytes())

	log.Printf("🆔 Event ID: %s, Participant: %s", eventID.String(), participantAddr.Hex())

	// 从合约获取参与者详细信息
	bc := s.getBlockchainClient()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	participants, err := bc.GetEventParticipants(ctx, eventID)
	if err != nil {
		log.Printf("❌ Failed to get participant details: %v", err)
		s.CreateSyncLog("participant_registered", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 找到对应的参与者
	var targetParticipant *blockchain.ContractParticipant
	for _, p := range participants {
		if p.Wallet == participantAddr {
			targetParticipant = &p
			break
		}
	}

	if targetParticipant == nil {
		log.Printf("❌ Participant not found in contract data")
		s.CreateSyncLog("participant_registered", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", "participant not found")
		return
	}

	// 转换为数据库模型
	participant := &models.Participant{
		ContractAddress: s.getContractAddress(vLog),
		EventID:         eventID.String(),
		Wallet:          targetParticipant.Wallet.Hex(),
		Name:            targetParticipant.Name,
		RegisteredAt:    targetParticipant.RegisteredAt.Int64(),
		CheckedIn:       targetParticipant.CheckedIn,
		CheckInTime:     targetParticipant.CheckInTime.Int64(),
	}

	// 保存到数据库
	if err := s.repo.CreateParticipant(participant); err != nil {
		log.Printf("❌ Failed to create participant in DB: %v", err)
		s.CreateSyncLog("participant_registered", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 更新活动的参与者计数
	event, err := s.repo.GetEventByID(eventID.String())
	if err == nil {
		event.ParticipantCount++
		s.repo.UpdateEvent(event)
	}

	log.Printf("✅ Participant saved: %s for event %s", participant.Name, participant.EventID)
	s.CreateSyncLog("participant_registered", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Saved participant %s", participant.Wallet))
}

// handleParticipantCheckedIn 处理 ParticipantCheckedIn 事件
func (s *EventService) handleParticipantCheckedIn(vLog types.Log) {
	log.Println("✅ Detected ParticipantCheckedIn event")

	if len(vLog.Topics) < 3 {
		log.Println("❌ Invalid ParticipantCheckedIn log: missing topics")
		return
	}

	// Topic[1] is eventId (uint256)
	eventID := new(big.Int).SetBytes(vLog.Topics[1].Bytes())
	// Topic[2] is participant address
	participantAddr := common.BytesToAddress(vLog.Topics[2].Bytes())

	log.Printf("🆔 Event ID: %s, Participant: %s", eventID.String(), participantAddr.Hex())

	// 从合约获取参与者详细信息
	bc := s.getBlockchainClient()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	participants, err := bc.GetEventParticipants(ctx, eventID)
	if err != nil {
		log.Printf("❌ Failed to get participant details: %v", err)
		s.CreateSyncLog("participant_checked_in", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 找到对应的参与者
	var targetParticipant *blockchain.ContractParticipant
	for _, p := range participants {
		if p.Wallet == participantAddr {
			targetParticipant = &p
			break
		}
	}

	if targetParticipant == nil {
		log.Printf("❌ Participant not found in contract data")
		s.CreateSyncLog("participant_checked_in", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", "participant not found")
		return
	}

	// 更新数据库中的参与者状态
	var participant models.Participant
	if err := s.repo.GetDB().Where("contract_address = ? AND event_id = ? AND wallet = ?", s.getContractAddress(vLog), eventID.String(), participantAddr.Hex()).First(&participant).Error; err != nil {
		log.Printf("❌ Failed to find participant in DB: %v", err)
		s.CreateSyncLog("participant_checked_in", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	participant.CheckedIn = targetParticipant.CheckedIn
	participant.CheckInTime = targetParticipant.CheckInTime.Int64()

	if err := s.repo.GetDB().Save(&participant).Error; err != nil {
		log.Printf("❌ Failed to update participant in DB: %v", err)
		s.CreateSyncLog("participant_checked_in", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	log.Printf("✅ Participant checked in: %s for event %d", participant.Wallet, participant.EventID)
	s.CreateSyncLog("participant_checked_in", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Updated participant %s", participant.Wallet))
}

// handleSponsorAdded 处理 SponsorAdded 事件
func (s *EventService) handleSponsorAdded(vLog types.Log) {
	log.Println("💰 Detected SponsorAdded event")

	if len(vLog.Topics) < 3 {
		log.Println("❌ Invalid SponsorAdded log: missing topics")
		return
	}

	// Topic[1] is eventId (uint256)
	eventID := new(big.Int).SetBytes(vLog.Topics[1].Bytes())
	// Topic[2] is sponsor address
	sponsorAddr := common.BytesToAddress(vLog.Topics[2].Bytes())

	log.Printf("🆔 Event ID: %s, Sponsor: %s", eventID.String(), sponsorAddr.Hex())

	// 从合约获取赞助商详细信息
	bc := s.getBlockchainClient()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	sponsors, err := bc.GetEventSponsors(ctx, eventID)
	if err != nil {
		log.Printf("❌ Failed to get sponsor details: %v", err)
		s.CreateSyncLog("sponsor_added", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 找到对应的赞助商
	var targetSponsor *blockchain.ContractSponsor
	for _, sp := range sponsors {
		if sp.Wallet == sponsorAddr {
			targetSponsor = &sp
			break
		}
	}

	if targetSponsor == nil {
		log.Printf("❌ Sponsor not found in contract data")
		s.CreateSyncLog("sponsor_added", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", "sponsor not found")
		return
	}

	// 转换为数据库模型
	sponsor := &models.Sponsor{
		ContractAddress: s.getContractAddress(vLog),
		EventID:         eventID.String(),
		Wallet:          targetSponsor.Wallet.Hex(),
		Name:            targetSponsor.Name,
		Amount:          targetSponsor.Amount.String(),
		SponsoredAt:     targetSponsor.SponsoredAt.Int64(),
	}

	// 保存到数据库
	if err := s.repo.CreateSponsor(sponsor); err != nil {
		log.Printf("❌ Failed to create sponsor in DB: %v", err)
		s.CreateSyncLog("sponsor_added", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	log.Printf("✅ Sponsor saved: %s for event %d (Amount: %s)", sponsor.Name, sponsor.EventID, sponsor.Amount)
	s.CreateSyncLog("sponsor_added", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Saved sponsor %s", sponsor.Wallet))
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
		ContractAddress:  s.getContractAddress(vLog),
		EventID:          details.Id.String(), // 转换为字符串
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

	log.Printf("✅ Event saved: %s (ID: %s)", event.Title, event.EventID)
	s.CreateSyncLog("event_created", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Saved event %s", event.EventID))
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
func (s *EventService) GetEventByID(eventID string) (*models.Event, error) {
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
func (s *EventService) GetEventParticipants(eventID string) ([]models.Participant, error) {
	return s.repo.GetParticipantsByEvent(eventID)
}

// GetEventSponsors 获取活动的赞助商
func (s *EventService) GetEventSponsors(eventID string) ([]models.Sponsor, error) {
	return s.repo.GetSponsorsByEvent(eventID)
}

// GetEventTickets 获取活动的 NFT 门票
func (s *EventService) GetEventTickets(eventID string) ([]models.NFTTicket, error) {
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

// handleTicketIssued 处理 TicketIssued 事件
func (s *EventService) handleTicketIssued(vLog types.Log) {
	log.Println("🎫 Detected TicketIssued event")

	if len(vLog.Topics) < 4 {
		log.Printf("⚠️ Invalid TicketIssued event topics length: %d", len(vLog.Topics))
		return
	}

	// Topic[1] is eventId (uint256)
	eventID := new(big.Int).SetBytes(vLog.Topics[1].Bytes())
	// Topic[2] is participant/holder address
	holderAddr := common.BytesToAddress(vLog.Topics[2].Bytes())
	// Topic[3] is tokenId (uint256)
	tokenID := new(big.Int).SetBytes(vLog.Topics[3].Bytes())

	log.Printf("🆔 Event ID: %s, Holder: %s, Token ID: %s", eventID.String(), holderAddr.Hex(), tokenID.String())

	// 从 NFT 合约获取门票详细信息
	bc := s.getBlockchainClient()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ticket, err := bc.GetTicket(ctx, tokenID)
	if err != nil {
		log.Printf("❌ Failed to get ticket details from contract: %v", err)
		s.CreateSyncLog("ticket_issued", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	// 转换为数据库模型
	nftTicket := &models.NFTTicket{
		ContractAddress: s.getContractAddress(vLog),
		TokenID:         ticket.TokenID.String(),
		EventID:         ticket.EventID.String(),
		Holder:          ticket.Holder.Hex(),
		EventTitle:      ticket.EventTitle,
		Location:        ticket.Location,
		StartTime:       ticket.StartTime.Int64(),
		EndTime:         ticket.EndTime.Int64(),
		Used:            ticket.Used,
		IssuedAt:        ticket.IssuedAt.Int64(),
	}

	// 保存到数据库
	if err := s.repo.GetDB().Create(nftTicket).Error; err != nil {
		log.Printf("❌ Failed to save NFT ticket: %v", err)
		s.CreateSyncLog("ticket_issued", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	log.Printf("✅ NFT Ticket saved: Token ID %d for event %d, holder %s", nftTicket.TokenID, nftTicket.EventID, nftTicket.Holder)
	s.CreateSyncLog("ticket_issued", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Saved NFT ticket %d", nftTicket.TokenID))
}

// handleTicketUsed 处理 TicketUsed 事件
func (s *EventService) handleTicketUsed(vLog types.Log) {
	log.Printf("📝 Processing TicketUsed event, Block: %d, TxHash: %s", vLog.BlockNumber, vLog.TxHash.Hex())

	// 检查是否已处理
	var existingLog models.SyncLog
	if err := s.repo.GetDB().Where("tx_hash = ? AND event_type = ?", vLog.TxHash.Hex(), "ticket_used").First(&existingLog).Error; err == nil {
		log.Printf("⏭️  Event already processed: %s", vLog.TxHash.Hex())
		return
	}

	// TicketUsed 事件只有一个参数: tokenId (indexed)
	// Topics[0]: 事件签名
	// Topics[1]: tokenId
	if len(vLog.Topics) < 2 {
		log.Printf("❌ Invalid TicketUsed event: insufficient topics")
		s.CreateSyncLog("ticket_used", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", "Insufficient topics")
		return
	}

	tokenID := new(big.Int).SetBytes(vLog.Topics[1][:])
	tokenIDStr := tokenID.String()
	log.Printf("🎫 Token ID from event: %s", tokenIDStr)

	// 查询 NFT ticket (使用合约地址+tokenId定位)
	var nftTicket models.NFTTicket
	if err := s.repo.GetDB().Where("contract_address = ? AND token_id = ?", s.getContractAddress(vLog), tokenIDStr).First(&nftTicket).Error; err != nil {
		log.Printf("❌ Failed to find NFT ticket: %v", err)
		s.CreateSyncLog("ticket_used", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", fmt.Sprintf("Ticket not found: %s", tokenIDStr))
		return
	}

	// 检查是否已经被使用
	if nftTicket.Used {
		log.Printf("⚠️  Ticket %s already marked as used", tokenIDStr)
		s.CreateSyncLog("ticket_used", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Ticket %s already used", tokenIDStr))
		return
	}

	// 更新票据为已使用状态
	if err := s.repo.GetDB().Model(&nftTicket).Update("used", true).Error; err != nil {
		log.Printf("❌ Failed to mark ticket as used: %v", err)
		s.CreateSyncLog("ticket_used", vLog.BlockNumber, vLog.TxHash.Hex(), "failed", err.Error())
		return
	}

	log.Printf("✅ Ticket marked as used: Token ID %s", tokenIDStr)
	s.CreateSyncLog("ticket_used", vLog.BlockNumber, vLog.TxHash.Hex(), "success", fmt.Sprintf("Marked ticket %s as used", tokenIDStr))
}
