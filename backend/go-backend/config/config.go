package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	// Blockchain
	MonadRPCURL              string
	MonadWSURL               string
	HackathonContractAddress string
	NFTTicketContractAddress string

	// Server
	ServerPort   int
	SyncInterval int

	// Log
	LogLevel string
}

var AppConfig *Config

func init() {
	godotenv.Load()
}

func LoadConfig() *Config {
	cfg := &Config{
		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvInt("DB_PORT", 3306),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "hackathon"),

		// Blockchain
		MonadRPCURL:              getEnv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz"),
		MonadWSURL:               getEnv("MONAD_WS_URL", "wss://testnet-rpc.monad.xyz"),
		HackathonContractAddress: getEnv("HACKATHON_CONTRACT_ADDRESS", ""),
		NFTTicketContractAddress: getEnv("NFT_TICKET_CONTRACT_ADDRESS", ""),

		// Server
		ServerPort:   getEnvInt("SERVER_PORT", 8080),
		SyncInterval: getEnvInt("SYNC_INTERVAL", 30),

		// Log
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	AppConfig = cfg
	return cfg
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
