package repositories

import (
	"hackathon-backend/models"

	"gorm.io/gorm"
)

type EventRepository struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) *EventRepository {
	return &EventRepository{db: db}
}

// GetDB 获取数据库实例
func (r *EventRepository) GetDB() *gorm.DB {
	return r.db
}

// CreateEvent 创建活动
func (r *EventRepository) CreateEvent(event *models.Event) error {
	return r.db.Create(event).Error
}

// UpdateEvent 更新活动
func (r *EventRepository) UpdateEvent(event *models.Event) error {
	return r.db.Save(event).Error
}

// GetEventByID 根据链上 ID 获取活动
func (r *EventRepository) GetEventByID(eventID uint64) (*models.Event, error) {
	var event models.Event
	err := r.db.Where("event_id = ?", eventID).First(&event).Error
	return &event, err
}

// GetEventByDBID 根据数据库 ID 获取活动
func (r *EventRepository) GetEventByDBID(id uint64) (*models.Event, error) {
	var event models.Event
	err := r.db.Where("id = ?", id).First(&event).Error
	return &event, err
}

// GetAllEvents 获取所有活动
func (r *EventRepository) GetAllEvents() ([]models.Event, error) {
	var events []models.Event
	err := r.db.Find(&events).Error
	return events, err
}

// GetEventsByOrganizer 根据组织者获取活动
func (r *EventRepository) GetEventsByOrganizer(organizer string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("organizer = ?", organizer).Find(&events).Error
	return events, err
}

// DeleteEvent 删除活动
func (r *EventRepository) DeleteEvent(eventID uint64) error {
	return r.db.Where("event_id = ?", eventID).Delete(&models.Event{}).Error
}

// CreateParticipant 创建参与者
func (r *EventRepository) CreateParticipant(participant *models.Participant) error {
	return r.db.Create(participant).Error
}

// UpdateParticipant 更新参与者
func (r *EventRepository) UpdateParticipant(participant *models.Participant) error {
	return r.db.Save(participant).Error
}

// GetParticipantsByEvent 获取活动的所有参与者
func (r *EventRepository) GetParticipantsByEvent(eventID uint64) ([]models.Participant, error) {
	var participants []models.Participant
	err := r.db.Where("event_id = ?", eventID).Find(&participants).Error
	return participants, err
}

// CreateSponsor 创建赞助商
func (r *EventRepository) CreateSponsor(sponsor *models.Sponsor) error {
	return r.db.Create(sponsor).Error
}

// GetSponsorsByEvent 获取活动的所有赞助商
func (r *EventRepository) GetSponsorsByEvent(eventID uint64) ([]models.Sponsor, error) {
	var sponsors []models.Sponsor
	err := r.db.Where("event_id = ?", eventID).Find(&sponsors).Error
	return sponsors, err
}

// CreateNFTTicket 创建 NFT 门票
func (r *EventRepository) CreateNFTTicket(ticket *models.NFTTicket) error {
	return r.db.Create(ticket).Error
}

// GetNFTTicketByTokenID 根据 Token ID 获取 NFT 门票
func (r *EventRepository) GetNFTTicketByTokenID(tokenID uint64) (*models.NFTTicket, error) {
	var ticket models.NFTTicket
	err := r.db.Where("token_id = ?", tokenID).First(&ticket).Error
	return &ticket, err
}

// GetNFTTicketsByHolder 获取持有者的所有 NFT 门票
func (r *EventRepository) GetNFTTicketsByHolder(holder string) ([]models.NFTTicket, error) {
	var tickets []models.NFTTicket
	err := r.db.Where("holder = ?", holder).Find(&tickets).Error
	return tickets, err
}

// CreateSyncLog 创建同步日志
func (r *EventRepository) CreateSyncLog(log *models.SyncLog) error {
	return r.db.Create(log).Error
}

// GetLastSyncBlock 获取最后同步的区块
func (r *EventRepository) GetLastSyncBlock(eventType string) (uint64, error) {
	var log models.SyncLog
	err := r.db.Where("event_type = ? AND status = ?", eventType, "success").
		Order("block_number DESC").
		First(&log).Error

	if err == gorm.ErrRecordNotFound {
		return 0, nil
	}

	return log.BlockNumber, err
}
