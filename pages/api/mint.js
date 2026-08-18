// Next.js API route: pages/api/mint.js
// Minimal example: pins metadata + files to Web3.Storage and calls a contract mint function

import { Web3Storage } from 'web3.storage'
import { ethers } from 'ethers'

const WEB3_TOKEN = process.env.WEB3_STORAGE_TOKEN // required
const RPC_URL = process.env.RPC_URL // e.g. https://rpc.provider
const PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY // private key that can call contract mint (keep secure)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const CONTRACT_ABI = [
  // Minimal ABI for mint function (owner-only mint(address,string,address,uint96))
  "function mint(address to, string calldata tokenURI_, address royaltyReceiver, uint96 royaltyBps) external returns (uint256)"
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  if (!WEB3_TOKEN) return res.status(500).json({ error: 'WEB3_STORAGE_TOKEN not configured' })

  try {
    const body = req.body // expect { name, description, thumbnailUrl, modelUrl, recipient, royaltyBps }
    const { name, description, thumbnailUrl, modelUrl, recipient, royaltyBps } = body
    if (!name || !modelUrl || !recipient) return res.status(400).json({ error: 'missing fields' })

    // 1) Pin metadata to Web3.Storage
    const client = new Web3Storage({ token: WEB3_TOKEN })

    const metadata = {
      name,
      description,
      image: thumbnailUrl,
      animation_url: modelUrl,
      properties: {
        files: [
          { uri: modelUrl, type: 'model/gltf-binary' }
        ]
      }
    }

    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    const cid = await client.put([new File([await blob.arrayBuffer()], 'metadata.json')], { wrapWithDirectory: false })
    const tokenURI = `ipfs://${cid}`

    // 2) Call contract mint function
    if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
      return res.status(200).json({ tokenURI, message: 'Metadata pinned (missing blockchain config to mint)' })
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet)

    const tx = await contract.mint(recipient, tokenURI, wallet.address, royaltyBps || 500) // default 5% royalty
    const receipt = await tx.wait()

    return res.status(200).json({ tokenURI, txHash: receipt.transactionHash })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}
