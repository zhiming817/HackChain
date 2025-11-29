package controllers

import (
	"net/http"

	"hackathon-backend/models"
	"hackathon-backend/services"

	"github.com/gin-gonic/gin"
)

type EventController struct {
	service *services.EventService
}

func NewEventController(service *services.EventService) *EventController {
	return &EventController{service: service}
}

// GetAllEvents 获取所有活动
func (c *EventController) GetAllEvents(ctx *gin.Context) {
	events, err := c.service.GetAllEvents()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": events,
	})
}

// GetEventByID 根据 ID 获取活动
func (c *EventController) GetEventByID(ctx *gin.Context) {
	eventID := ctx.Param("id")
	if eventID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	event, err := c.service.GetEventByID(eventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": event,
	})
}

// GetEventsByOrganizer 根据组织者获取活动
func (c *EventController) GetEventsByOrganizer(ctx *gin.Context) {
	organizer := ctx.Query("organizer")
	if organizer == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Organizer address required"})
		return
	}

	events, err := c.service.GetEventsByOrganizer(organizer)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": events,
	})
}

// GetEventParticipants 获取活动的参与者
func (c *EventController) GetEventParticipants(ctx *gin.Context) {
	eventID := ctx.Param("id")
	if eventID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	participants, err := c.service.GetEventParticipants(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": participants,
	})
}

// GetEventSponsors 获取活动的赞助商
func (c *EventController) GetEventSponsors(ctx *gin.Context) {
	eventID := ctx.Param("id")
	if eventID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	sponsors, err := c.service.GetEventSponsors(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": sponsors,
	})
}

// GetEventTickets 获取活动的 NFT 门票
func (c *EventController) GetEventTickets(ctx *gin.Context) {
	eventID := ctx.Param("id")
	if eventID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	tickets, err := c.service.GetEventTickets(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": tickets,
	})
}

// GetTicketsByHolder 获取持有者的所有 NFT 门票
func (c *EventController) GetTicketsByHolder(ctx *gin.Context) {
	holder := ctx.Query("holder")
	if holder == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "holder address is required"})
		return
	}

	repo := c.service.GetRepository()
	tickets, err := repo.GetNFTTicketsByHolder(holder)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": tickets,
	})
}

// GetSyncStats 获取同步统计
func (c *EventController) GetSyncStats(ctx *gin.Context) {
	stats, err := c.service.GetSyncStats()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": stats,
	})
}

// Health 健康检查
func (c *EventController) Health(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

// CreateTestEvent 创建测试活动
func (c *EventController) CreateTestEvent(ctx *gin.Context) {
	event := &models.Event{
		EventID:         "1",
		Organizer:       "0xad6F55f669eaf666b7628d7Bd482Eb000e24D687",
		Title:           "Test Hackathon",
		Description:     "This is a test hackathon event",
		StartTime:       1700000000,
		EndTime:         1700100000,
		Location:        "Shanghai",
		MaxParticipants: 100,
		Active:          true,
	}

	repo := c.service.GetRepository()
	if err := repo.CreateEvent(event); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": event,
	})
}
