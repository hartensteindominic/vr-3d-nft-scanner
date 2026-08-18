import React, { useState } from 'react'

export default function MintPage() {
  const [address, setAddress] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modelUrl, setModelUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [royaltyBps, setRoyaltyBps] = useState(500)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) throw new Error('No Ethereum wallet found (MetaMask)')
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }

  async function handleMint(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (!modelUrl || !name) throw new Error('Missing required fields: name and modelUrl')
      const recipient = address || (window as any).ethereum?.selectedAddress || undefined
      if (!recipient) throw new Error('Connect your wallet or provide a recipient address')

      const body = { name, description, thumbnailUrl, modelUrl, recipient, royaltyBps }
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      setResult(data)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e6f0ff', background: 'linear-gradient(180deg,#001428,#001a36)', minHeight: '100vh' }}>
      <h1 style={{ color: '#9be7ff' }}>Mint 3D NFT (Demo)</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={connectWallet} style={{ padding: '8px 12px', borderRadius: 8 }}>Connect MetaMask</button>
        <span style={{ marginLeft: 12 }}>{address ? `Connected: ${address}` : 'Not connected'}</span>
      </div>

      <form onSubmit={handleMint} style={{ maxWidth: 720, display: 'grid', gap: 10 }}>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        <input placeholder="Model URL (https:// or ipfs://)" value={modelUrl} onChange={e => setModelUrl(e.target.value)} style={inputStyle} />
        <input placeholder="Thumbnail URL (https:// or ipfs://)" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} style={inputStyle} />
        <label style={{ color: '#cfeffd' }}>
          Royalty (bps):
          <input type="number" value={royaltyBps} onChange={e => setRoyaltyBps(Number(e.target.value))} style={{ marginLeft: 8, width: 120 }} />
        </label>

        <div>
          <button type="submit" disabled={loading} style={{ padding: '10px 16px', borderRadius: 8 }}>
            {loading ? 'Minting...' : 'Mint & Pin Metadata'}
          </button>
        </div>
      </form>

      {error && <div style={{ marginTop: 12, color: '#ffb3b3' }}>Error: {error}</div>}

      {result && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
          <h3 style={{ color: '#9be7ff' }}>Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#dff7ff' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: 40, color: '#9be7ff' }}>
        <h4>Notes</h4>
        <ul>
          <li>Server-side minting requires environment variables: WEB3_STORAGE_TOKEN, RPC_URL, MINTER_PRIVATE_KEY, CONTRACT_ADDRESS.</li>
          <li>If blockchain config is missing, the API will still pin metadata and return an IPFS CID.</li>
        </ul>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
  color: '#e6f0ff'
}
