package blockchain

import (
	"context"
	"fmt"
	"log"
	"math/big"

	"strings"

	"hackathon-backend/config"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type BlockchainClient struct {
	httpClient       *ethclient.Client
	wsClient         *ethclient.Client
	hackathonAddress common.Address
	nftTicketAddress common.Address
}

var BlockchainClientInstance *BlockchainClient

func Init(cfg *config.Config) error {
	// 连接 HTTP RPC
	httpClient, err := ethclient.Dial(cfg.SomniaRPCURL)
	if err != nil {
		return fmt.Errorf("failed to connect to HTTP RPC: %w", err)
	}

	// 连接 WebSocket RPC
	wsClient, err := ethclient.Dial(cfg.SomniaWSURL)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket RPC: %w", err)
	}

	// 测试连接
	ctx := context.Background()
	chainID, err := httpClient.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("failed to get chain ID: %w", err)
	}

	log.Printf("✅ Connected to blockchain (Chain ID: %s)", chainID.String())
	log.Printf("✅ WebSocket connection established")

	bc := &BlockchainClient{
		httpClient:       httpClient,
		wsClient:         wsClient,
		hackathonAddress: common.HexToAddress(cfg.HackathonContractAddress),
		nftTicketAddress: common.HexToAddress(cfg.NFTTicketContractAddress),
	}

	BlockchainClientInstance = bc
	return nil
}

func (bc *BlockchainClient) GetHTTPClient() *ethclient.Client {
	return bc.httpClient
}

func (bc *BlockchainClient) GetWSClient() *ethclient.Client {
	return bc.wsClient
}

func (bc *BlockchainClient) GetHackathonAddress() common.Address {
	return bc.hackathonAddress
}

func (bc *BlockchainClient) GetNFTTicketAddress() common.Address {
	return bc.nftTicketAddress
}

// GetLatestBlockNumber 获取最新区块号
func (bc *BlockchainClient) GetLatestBlockNumber(ctx context.Context) (uint64, error) {
	return bc.httpClient.BlockNumber(ctx)
}

// GetEventLogs 获取事件日志
func (bc *BlockchainClient) GetEventLogs(ctx context.Context, fromBlock uint64, toBlock uint64) ([]types.Log, error) {
	query := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(fromBlock),
		ToBlock:   new(big.Int).SetUint64(toBlock),
		Addresses: []common.Address{
			bc.hackathonAddress,
			bc.nftTicketAddress,
		},
	}
	return bc.httpClient.FilterLogs(ctx, query)
}

// ContractEvent 对应合约中的 Event 结构体
type ContractEvent struct {
	Id               *big.Int
	Organizer        common.Address
	Title            string
	Description      string
	StartTime        *big.Int
	EndTime          *big.Int
	Location         string
	MaxParticipants  *big.Int
	ParticipantCount *big.Int
	Active           bool
	CreatedAt        *big.Int
}

// GetEventDetails 从合约获取活动详情
func (bc *BlockchainClient) GetEventDetails(ctx context.Context, eventID *big.Int) (*ContractEvent, error) {
	// 合约 ABI 定义 (只包含 getEvent)
	const contractABI = `[{"inputs":[{"internalType":"uint256","name":"_eventId","type":"uint256"}],"name":"getEvent","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"organizer","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"string","name":"location","type":"string"},{"internalType":"uint256","name":"maxParticipants","type":"uint256"},{"internalType":"uint256","name":"participantCount","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"createdAt","type":"uint256"}],"internalType":"struct Hackathon.Event","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}]`

	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// 打包调用数据
	data, err := parsedABI.Pack("getEvent", eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to pack data: %w", err)
	}

	// 调用合约
	msg := ethereum.CallMsg{
		To:   &bc.hackathonAddress,
		Data: data,
	}
	result, err := bc.httpClient.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call contract: %w", err)
	}

	// 解析返回结果
	var out struct {
		Event ContractEvent
	}
	err = parsedABI.UnpackIntoInterface(&out, "getEvent", result)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack result: %w", err)
	}

	return &out.Event, nil
}

// SubscribeToLogs 订阅合约事件日志
func (bc *BlockchainClient) SubscribeToLogs(ctx context.Context, addresses []common.Address) (chan types.Log, ethereum.Subscription, error) {
	query := ethereum.FilterQuery{
		Addresses: addresses,
	}

	logs := make(chan types.Log)
	sub, err := bc.wsClient.SubscribeFilterLogs(ctx, query, logs)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to subscribe to logs: %w", err)
	}

	log.Printf("✅ Subscribed to logs for addresses: %v", addresses)
	return logs, sub, nil
}

func (bc *BlockchainClient) Close() error {
	bc.httpClient.Close()
	bc.wsClient.Close()
	return nil
}

// GetInstance 获取区块链客户端实例
func GetInstance() *BlockchainClient {
	return BlockchainClientInstance
}
