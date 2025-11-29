package database

import (
	"fmt"
	"log"

	"hackathon-backend/config"
	"hackathon-backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(cfg *config.Config) error {
	dsn := cfg.GetDSN()

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		DisableForeignKeyConstraintWhenMigrating: true, // 禁用外键约束，由程序内部控制
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db
	log.Println("✅ Database connected successfully")

	// 自动迁移
	if err := models.AutoMigrate(db); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("✅ Database migration completed")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}

func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
