package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"hackathon-backend/blockchain"
	"hackathon-backend/config"
	"hackathon-backend/controllers"
	"hackathon-backend/database"
	"hackathon-backend/repositories"
	"hackathon-backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()
	log.Printf("📋 Config loaded: %+v", cfg)

	// 初始化数据库
	if err := database.Init(cfg); err != nil {
		log.Fatalf("❌ Failed to initialize database: %v", err)
	}
	defer database.Close()

	// 初始化区块链客户端
	if err := blockchain.Init(cfg); err != nil {
		log.Fatalf("❌ Failed to initialize blockchain client: %v", err)
	}
	defer blockchain.BlockchainClientInstance.Close()

	// 初始化 MVC 层
	db := database.GetDB()
	eventRepo := repositories.NewEventRepository(db)
	eventService := services.NewEventService(eventRepo)
	eventController := controllers.NewEventController(eventService)

	// 启动事件订阅 (WebSocket)
	go func() {
		log.Println("🚀 Starting WebSocket event listener...")
		for {
			if err := eventService.SubscribeEvents(context.Background()); err != nil {
				log.Printf("❌ Event subscription failed: %v. Retrying in 5 seconds...", err)
				time.Sleep(5 * time.Second)
			}
		}
	}()

	// 启动同步 goroutine (Deprecated)
	// go startSyncWorker(eventService, cfg.SyncInterval)

	// 设置 Gin 路由
	router := gin.Default()

	// 启用 CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 健康检查
	router.GET("/health", eventController.Health)

	// 活动相关 API
	router.GET("/api/events", eventController.GetAllEvents)
	router.GET("/api/events/:id", eventController.GetEventByID)
	router.GET("/api/events/organizer", eventController.GetEventsByOrganizer)
	router.GET("/api/events/:id/participants", eventController.GetEventParticipants)
	router.GET("/api/events/:id/sponsors", eventController.GetEventSponsors)
	router.GET("/api/events/:id/tickets", eventController.GetEventTickets)
	
	// 门票相关 API
	router.GET("/api/tickets", eventController.GetTicketsByHolder)

	// 统计 API
	router.GET("/api/stats", eventController.GetSyncStats)

	// 测试 API
	router.POST("/api/test/event", eventController.CreateTestEvent)

	// 启动服务器
	log.Printf("🚀 Server starting on port %d", cfg.ServerPort)
	addr := fmt.Sprintf(":%d", cfg.ServerPort)
	if err := router.Run(addr); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}

// startSyncWorker 启动同步 worker
func startSyncWorker(service *services.EventService, interval int) {
	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		if err := service.SyncEvents(ctx); err != nil {
			log.Printf("❌ Sync error: %v", err)
		}
	}
}
