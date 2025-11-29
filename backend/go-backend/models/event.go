package models

import (
	"time"

	"gorm.io/gorm"
)

// Event 黑客松活动
type Event struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	EventID          uint64    `gorm:"index" json:"event_id"`
	Organizer        string    `gorm:"index" json:"organizer"`
	Title            string    `json:"title"`
	Description      string    `gorm:"type:text" json:"description"`
	StartTime        int64     `json:"start_time"`
	EndTime          int64     `json:"end_time"`
	Location         string    `json:"location"`
	MaxParticipants  uint64    `json:"max_participants"`
	ParticipantCount uint64    `json:"participant_count"`
	Active           bool      `json:"active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	SyncedAt         time.Time `json:"synced_at"`

	// Relations
	Participants []Participant `gorm:"foreignKey:EventID;references:EventID" json:"participants,omitempty"`
	Sponsors     []Sponsor     `gorm:"foreignKey:EventID;references:EventID" json:"sponsors,omitempty"`
}

// TableName 指定表名
func (Event) TableName() string {
	return "events"
}

// Participant 参与者
type Participant struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	EventID      uint64    `gorm:"index" json:"event_id"`
	Wallet       string    `gorm:"index" json:"wallet"`
	Name         string    `json:"name"`
	RegisteredAt int64     `json:"registered_at"`
	CheckedIn    bool      `json:"checked_in"`
	CheckInTime  int64     `json:"check_in_time"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Participant) TableName() string {
	return "participants"
}

// Sponsor 赞助商
type Sponsor struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	EventID     uint64    `gorm:"index" json:"event_id"`
	Wallet      string    `gorm:"index" json:"wallet"`
	Name        string    `json:"name"`
	Amount      string    `json:"amount"` // 使用 string 存储大数字
	SponsoredAt int64     `json:"sponsored_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Sponsor) TableName() string {
	return "sponsors"
}

// NFTTicket NFT 门票
type NFTTicket struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TokenID    uint64    `gorm:"uniqueIndex" json:"token_id"`
	EventID    uint64    `gorm:"index" json:"event_id"`
	Holder     string    `gorm:"index" json:"holder"`
	EventTitle string    `json:"event_title"`
	Location   string    `json:"location"`
	StartTime  int64     `json:"start_time"`
	EndTime    int64     `json:"end_time"`
	Used       bool      `json:"used"`
	IssuedAt   int64     `json:"issued_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (NFTTicket) TableName() string {
	return "nft_tickets"
}

// SyncLog 同步日志
type SyncLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	EventType   string    `json:"event_type"` // "event", "participant", "sponsor", "ticket"
	BlockNumber uint64    `json:"block_number"`
	TxHash      string    `json:"tx_hash"`
	Status      string    `json:"status"` // "success", "failed"
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (SyncLog) TableName() string {
	return "sync_logs"
}

// AutoMigrate 自动迁移数据库
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&Event{},
		&Participant{},
		&Sponsor{},
		&NFTTicket{},
		&SyncLog{},
	)
}
