import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying Hackathon contracts to Monad...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // 使用已部署的 NFTTicket 合约地址
  const existingNFTTicketAddress = "0x65BBA3f213534A4Dfc54E9e0CE82E944859EEB24";
  console.log("📦 Using existing NFTTicket contract at:", existingNFTTicketAddress);

  // Deploy Hackathon contract
  console.log("\n📦 Deploying Hackathon contract...");
  const Hackathon = await hre.ethers.getContractFactory("Hackathon");
  const hackathon = await Hackathon.deploy();
  await hackathon.waitForDeployment();
  const hackathonAddress = await hackathon.getAddress();
  console.log("✅ Hackathon deployed to:", hackathonAddress);

  // Set NFTTicket contract address in Hackathon contract
  console.log("\n🔗 Linking NFTTicket to Hackathon contract...");
  const tx1 = await hackathon.setNFTTicketContract(existingNFTTicketAddress);
  await tx1.wait();
  console.log("✅ NFTTicket contract linked to Hackathon contract");

  // Update NFTTicket contract's hackathonContract address
  console.log("\n🔗 Updating Hackathon address in NFTTicket contract...");
  const NFTTicket = await hre.ethers.getContractFactory("NFTTicket");
  const nftTicket = NFTTicket.attach(existingNFTTicketAddress);
  const tx2 = await nftTicket.setHackathonContract(hackathonAddress);
  await tx2.wait();
  console.log("✅ Hackathon contract address updated in NFTTicket contract");

  // Save deployment addresses
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Hackathon Contract:", hackathonAddress);
  console.log("NFTTicket Contract:", existingNFTTicketAddress);
  console.log("========================");

  // Save to .env
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.default.join(process.cwd(), ".env");
  
  let envContent = `HACKATHON_CONTRACT_ADDRESS=${hackathonAddress}\n`;
  envContent += `NFT_TICKET_CONTRACT_ADDRESS=${existingNFTTicketAddress}\n`;

  if (fs.default.existsSync(envPath)) {
    const existingEnv = fs.default.readFileSync(envPath, "utf-8");
    // Update or append
    if (existingEnv.includes("HACKATHON_CONTRACT_ADDRESS")) {
      envContent = existingEnv
        .replace(/HACKATHON_CONTRACT_ADDRESS=.*/, `HACKATHON_CONTRACT_ADDRESS=${hackathonAddress}`)
        .replace(/NFT_TICKET_CONTRACT_ADDRESS=.*/, `NFT_TICKET_CONTRACT_ADDRESS=${existingNFTTicketAddress}`);
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
