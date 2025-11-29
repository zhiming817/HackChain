import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying Hackathon contracts to Monad...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Deploy NFTTicket contract first (需要一个临时地址作为构造函数参数)
  console.log("\n📦 Deploying NFTTicket contract...");
  const tempAddress = "0x0000000000000000000000000000000000000001"; // 临时地址
  const NFTTicket = await hre.ethers.getContractFactory("NFTTicket");
  const nftTicket = await NFTTicket.deploy(tempAddress);
  await nftTicket.waitForDeployment();
  const nftTicketAddress = await nftTicket.getAddress();
  console.log("✅ NFTTicket deployed to:", nftTicketAddress);

  // Deploy Hackathon contract
  console.log("\n📦 Deploying Hackathon contract...");
  const Hackathon = await hre.ethers.getContractFactory("Hackathon");
  const hackathon = await Hackathon.deploy();
  await hackathon.waitForDeployment();
  const hackathonAddress = await hackathon.getAddress();
  console.log("✅ Hackathon deployed to:", hackathonAddress);

  // Set NFTTicket contract address in Hackathon contract
  console.log("\n🔗 Linking NFTTicket to Hackathon contract...");
  const tx1 = await hackathon.setNFTTicketContract(nftTicketAddress);
  await tx1.wait();
  console.log("✅ NFTTicket contract linked to Hackathon contract");

  // Update NFTTicket contract's hackathonContract address
  console.log("\n🔗 Updating Hackathon address in NFTTicket contract...");
  const tx2 = await nftTicket.setHackathonContract(hackathonAddress);
  await tx2.wait();
  console.log("✅ Hackathon contract address updated in NFTTicket contract");

  // Save deployment addresses
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Hackathon Contract:", hackathonAddress);
  console.log("NFTTicket Contract:", nftTicketAddress);
  console.log("========================");

  // Save to .env
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.default.join(process.cwd(), ".env");
  
  let envContent = `HACKATHON_CONTRACT_ADDRESS=${hackathonAddress}\n`;
  envContent += `NFT_TICKET_CONTRACT_ADDRESS=${nftTicketAddress}\n`;

  if (fs.default.existsSync(envPath)) {
    const existingEnv = fs.default.readFileSync(envPath, "utf-8");
    // Update or append
    if (existingEnv.includes("HACKATHON_CONTRACT_ADDRESS")) {
      envContent = existingEnv
        .replace(/HACKATHON_CONTRACT_ADDRESS=.*/, `HACKATHON_CONTRACT_ADDRESS=${hackathonAddress}`)
        .replace(/NFT_TICKET_CONTRACT_ADDRESS=.*/, `NFT_TICKET_CONTRACT_ADDRESS=${nftTicketAddress}`);
    } else {
      envContent = existingEnv + "\n" + envContent;
    }
  }

  fs.default.writeFileSync(envPath, envContent);
  console.log("\n✅ Deployment addresses saved to .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
