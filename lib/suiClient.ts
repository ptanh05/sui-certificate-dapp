import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// Sử dụng getFullnodeUrl để xác định vị trí RPC (Devnet, Testnet, v.v.)
const rpcUrl = getFullnodeUrl("testnet");

// Tạo một client kết nối đến devnet
const client = new SuiClient({ url: rpcUrl });

// Export đối tượng client để có thể sử dụng ở nơi khác
export { client };