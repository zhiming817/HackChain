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
	// 获取活动网络的配置
	rpcURL := cfg.GetActiveRPCURL()
	wsURL := cfg.GetActiveWSURL()
	hackathonAddr := cfg.GetActiveHackathonAddress()
	nftTicketAddr := cfg.GetActiveNFTTicketAddress()

	log.Printf("🔗 Active Network: %s", cfg.ActiveNetwork)
	log.Printf("🔗 RPC URL: %s", rpcURL)
	log.Printf("🔗 WebSocket URL: %s", wsURL)
	log.Printf("📝 Hackathon Contract: %s", hackathonAddr)
	log.Printf("🎫 NFT Ticket Contract: %s", nftTicketAddr)

	// 备用 RPC URLs (如果主 RPC 失败)
	alternativeRPCs := []string{
		rpcURL,
		"https://rpc.ankr.com/mantle_sepolia",
		"https://mantle-sepolia-rpc.publicnode.com",
	}

	// 尝试连接 HTTP RPC (带重试)
	var httpClient *ethclient.Client
	var err error

	for i, rpc := range alternativeRPCs {
		log.Printf("🔄 Attempting to connect to RPC #%d: %s", i+1, rpc)
		httpClient, err = ethclient.Dial(rpc)
		if err == nil {
			log.Printf("✅ Connected to RPC: %s", rpc)
			rpcURL = rpc // 更新为成功的 RPC
			break
		}
		log.Printf("⚠️ Failed to connect to %s: %v", rpc, err)
	}

	if httpClient == nil {
		return fmt.Errorf("failed to connect to any HTTP RPC: %w", err)
	}

	// 尝试连接 WebSocket RPC
	log.Printf("🔄 Connecting to WebSocket: %s", wsURL)
	wsClient, err := ethclient.Dial(wsURL)
	if err != nil {
		log.Printf("⚠️ WebSocket connection failed: %v", err)
		log.Printf("⚠️ Will use HTTP client for all operations")
		// 使用 HTTP 客户端作为后备
		wsClient = httpClient
	} else {
		log.Printf("✅ WebSocket connection established")
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
		hackathonAddress: common.HexToAddress(hackathonAddr),
		nftTicketAddress: common.HexToAddress(nftTicketAddr),
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

// ContractParticipant 对应合约中的 Participant 结构体
type ContractParticipant struct {
	Wallet       common.Address
	Name         string
	RegisteredAt *big.Int
	CheckedIn    bool
	CheckInTime  *big.Int
}

// ContractSponsor 对应合约中的 Sponsor 结构体
type ContractSponsor struct {
	Wallet      common.Address
	Name        string
	Amount      *big.Int
	SponsoredAt *big.Int
}

// ContractTicket 对应合约中的 Ticket 结构体
type ContractTicket struct {
	TokenID    *big.Int
	EventID    *big.Int
	Holder     common.Address
	EventTitle string
	Location   string
	StartTime  *big.Int
	EndTime    *big.Int
	Used       bool
	IssuedAt   *big.Int
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

// GetEventParticipants 从合约获取活动的所有参与者
func (bc *BlockchainClient) GetEventParticipants(ctx context.Context, eventID *big.Int) ([]ContractParticipant, error) {
	// 合约 ABI 定义 (getParticipantCount 和 eventParticipants)
	const contractABI = `[
		{"inputs":[{"internalType":"uint256","name":"_eventId","type":"uint256"}],"name":"getParticipantCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
		{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"eventParticipants","outputs":[{"internalType":"address","name":"wallet","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"registeredAt","type":"uint256"},{"internalType":"bool","name":"checkedIn","type":"bool"},{"internalType":"uint256","name":"checkInTime","type":"uint256"}],"stateMutability":"view","type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// 首先获取参与者数量
	countData, err := parsedABI.Pack("getParticipantCount", eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to pack getParticipantCount: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &bc.hackathonAddress,
		Data: countData,
	}
	countResult, err := bc.httpClient.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call getParticipantCount: %w", err)
	}

	var count *big.Int
	err = parsedABI.UnpackIntoInterface(&count, "getParticipantCount", countResult)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack count: %w", err)
	}

	// 获取每个参与者的详细信息
	participants := make([]ContractParticipant, 0, count.Int64())
	for i := int64(0); i < count.Int64(); i++ {
		data, err := parsedABI.Pack("eventParticipants", eventID, big.NewInt(i))
		if err != nil {
			log.Printf("Failed to pack eventParticipants for index %d: %v", i, err)
			continue
		}

		msg := ethereum.CallMsg{
			To:   &bc.hackathonAddress,
			Data: data,
		}
		result, err := bc.httpClient.CallContract(ctx, msg, nil)
		if err != nil {
			log.Printf("Failed to call eventParticipants for index %d: %v", i, err)
			continue
		}

		var participant ContractParticipant
		err = parsedABI.UnpackIntoInterface(&participant, "eventParticipants", result)
		if err != nil {
			log.Printf("Failed to unpack participant for index %d: %v", i, err)
			continue
		}

		participants = append(participants, participant)
	}

	return participants, nil
}

// GetEventSponsors 从合约获取活动的所有赞助商
func (bc *BlockchainClient) GetEventSponsors(ctx context.Context, eventID *big.Int) ([]ContractSponsor, error) {
	// 合约 ABI 定义 (getSponsorCount 和 eventSponsors)
	const contractABI = `[
		{"inputs":[{"internalType":"uint256","name":"_eventId","type":"uint256"}],"name":"getSponsorCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
		{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"eventSponsors","outputs":[{"internalType":"address","name":"wallet","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"sponsoredAt","type":"uint256"}],"stateMutability":"view","type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// 首先获取赞助商数量
	countData, err := parsedABI.Pack("getSponsorCount", eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to pack getSponsorCount: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &bc.hackathonAddress,
		Data: countData,
	}
	countResult, err := bc.httpClient.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call getSponsorCount: %w", err)
	}

	var count *big.Int
	err = parsedABI.UnpackIntoInterface(&count, "getSponsorCount", countResult)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack count: %w", err)
	}

	// 获取每个赞助商的详细信息
	sponsors := make([]ContractSponsor, 0, count.Int64())
	for i := int64(0); i < count.Int64(); i++ {
		data, err := parsedABI.Pack("eventSponsors", eventID, big.NewInt(i))
		if err != nil {
			log.Printf("Failed to pack eventSponsors for index %d: %v", i, err)
			continue
		}

		msg := ethereum.CallMsg{
			To:   &bc.hackathonAddress,
			Data: data,
		}
		result, err := bc.httpClient.CallContract(ctx, msg, nil)
		if err != nil {
			log.Printf("Failed to call eventSponsors for index %d: %v", i, err)
			continue
		}

		var sponsor ContractSponsor
		err = parsedABI.UnpackIntoInterface(&sponsor, "eventSponsors", result)
		if err != nil {
			log.Printf("Failed to unpack sponsor for index %d: %v", i, err)
			continue
		}

		sponsors = append(sponsors, sponsor)
	}

	return sponsors, nil
}

// GetTicket 从 NFT 合约获取门票详情
func (bc *BlockchainClient) GetTicket(ctx context.Context, tokenID *big.Int) (*ContractTicket, error) {
	// NFT 合约 ABI 定义 (getTicket)
	const contractABI = `[
		{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"getTicket","outputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"eventId","type":"uint256"},{"internalType":"address","name":"holder","type":"address"},{"internalType":"string","name":"eventTitle","type":"string"},{"internalType":"string","name":"location","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"used","type":"bool"},{"internalType":"uint256","name":"issuedAt","type":"uint256"}],"internalType":"struct NFTTicket.Ticket","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// 调用 getTicket
	data, err := parsedABI.Pack("getTicket", tokenID)
	if err != nil {
		return nil, fmt.Errorf("failed to pack getTicket: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &bc.nftTicketAddress,
		Data: data,
	}
	result, err := bc.httpClient.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call getTicket: %w", err)
	}

	// 使用 Unpack 解析 tuple 返回值
	unpacked, err := parsedABI.Unpack("getTicket", result)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack ticket: %w", err)
	}

	if len(unpacked) == 0 {
		return nil, fmt.Errorf("no data returned from getTicket")
	}

	// 从 unpacked 结果中提取字段
	ticketData, ok := unpacked[0].(struct {
		TokenId    *big.Int       `json:"tokenId"`
		EventId    *big.Int       `json:"eventId"`
		Holder     common.Address `json:"holder"`
		EventTitle string         `json:"eventTitle"`
		Location   string         `json:"location"`
		StartTime  *big.Int       `json:"startTime"`
		EndTime    *big.Int       `json:"endTime"`
		Used       bool           `json:"used"`
		IssuedAt   *big.Int       `json:"issuedAt"`
	})

	if !ok {
		return nil, fmt.Errorf("failed to convert ticket data")
	}

	ticket := &ContractTicket{
		TokenID:    ticketData.TokenId,
		EventID:    ticketData.EventId,
		Holder:     ticketData.Holder,
		EventTitle: ticketData.EventTitle,
		Location:   ticketData.Location,
		StartTime:  ticketData.StartTime,
		EndTime:    ticketData.EndTime,
		Used:       ticketData.Used,
		IssuedAt:   ticketData.IssuedAt,
	}

	return ticket, nil
}

// SubscribeToLogs 订阅合约事件日志
func (bc *BlockchainClient) SubscribeToLogs(ctx context.Context, addresses []common.Address) (chan types.Log, ethereum.Subscription, error) {
	query := ethereum.FilterQuery{
		Addresses: addresses,
	}

	log.Printf("🔗 Attempting to subscribe via WebSocket client: %p", bc.wsClient)

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
