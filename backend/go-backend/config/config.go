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

	// Blockchain - Monad
	MonadRPCURL                   string
	MonadWSURL                    string
	MonadHackathonContractAddress string
	MonadNFTTicketContractAddress string

	// Blockchain - Mantle
	MantleRPCURL                   string
	MantleWSURL                    string
	MantleHackathonContractAddress string
	MantleNFTTicketContractAddress string

	// Blockchain - Somnia
	SomniaRPCURL                   string
	SomniaWSURL                    string
	SomniaHackathonContractAddress string
	SomniaNFTTicketContractAddress string

	// Active Network
	ActiveNetwork string

	// Legacy compatibility
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

		// Blockchain - Monad
		MonadRPCURL:                   getEnv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz"),
		MonadWSURL:                    getEnv("MONAD_WS_URL", "wss://testnet-rpc.monad.xyz"),
		MonadHackathonContractAddress: getEnv("MONAD_HACKATHON_CONTRACT_ADDRESS", ""),
		MonadNFTTicketContractAddress: getEnv("MONAD_NFT_TICKET_CONTRACT_ADDRESS", ""),

		// Blockchain - Mantle
		MantleRPCURL:                   getEnv("MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz"),
		MantleWSURL:                    getEnv("MANTLE_WS_URL", "wss://mantle-sepolia.drpc.org"),
		MantleHackathonContractAddress: getEnv("MANTLE_HACKATHON_CONTRACT_ADDRESS", ""),
		MantleNFTTicketContractAddress: getEnv("MANTLE_NFT_TICKET_CONTRACT_ADDRESS", ""),

		// Blockchain - Somnia
		SomniaRPCURL:                   getEnv("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network"),
		SomniaWSURL:                    getEnv("SOMNIA_WS_URL", "wss://dream-rpc.somnia.network/ws"),
		SomniaHackathonContractAddress: getEnv("SOMNIA_HACKATHON_CONTRACT_ADDRESS", ""),
		SomniaNFTTicketContractAddress: getEnv("SOMNIA_NFT_TICKET_CONTRACT_ADDRESS", ""),

		// Active Network
		ActiveNetwork: getEnv("ACTIVE_NETWORK", "somnia"),

		// Legacy compatibility
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

// GetActiveRPCURL returns the RPC URL for the active network
func (c *Config) GetActiveRPCURL() string {
	switch c.ActiveNetwork {
	case "mantle":
		return c.MantleRPCURL
	case "somnia":
		return c.SomniaRPCURL
	default:
		return c.MonadRPCURL
	}
}

// GetActiveWSURL returns the WebSocket URL for the active network
func (c *Config) GetActiveWSURL() string {
	switch c.ActiveNetwork {
	case "mantle":
		return c.MantleWSURL
	case "somnia":
		return c.SomniaWSURL
	default:
		return c.MonadWSURL
	}
}

// GetActiveHackathonAddress returns the Hackathon contract address for the active network
func (c *Config) GetActiveHackathonAddress() string {
	switch c.ActiveNetwork {
	case "mantle":
		return c.MantleHackathonContractAddress
	case "somnia":
		return c.SomniaHackathonContractAddress
	default:
		return c.MonadHackathonContractAddress
	}
}

// GetActiveNFTTicketAddress returns the NFT Ticket contract address for the active network
func (c *Config) GetActiveNFTTicketAddress() string {
	switch c.ActiveNetwork {
	case "mantle":
		return c.MantleNFTTicketContractAddress
	case "somnia":
		return c.SomniaNFTTicketContractAddress
	default:
		return c.MonadNFTTicketContractAddress
	}
}

// GetActiveChainID returns the Chain ID for the active network
func (c *Config) GetActiveChainID() uint64 {
	switch c.ActiveNetwork {
	case "mantle":
		return 5003 // Mantle Sepolia
	case "somnia":
		return 50312 // Somnia Network
	default:
		return 10143 // Monad Testnet
	}
}

// GetActiveNetworkName returns the network name for the active network
func (c *Config) GetActiveNetworkName() string {
	return c.ActiveNetwork
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
