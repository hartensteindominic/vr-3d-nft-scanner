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
      if (!(window as any).ethereum) throw new Error('No Ethereum wallet found. Install MetaMask or open HyperStream in a compatible wallet browser.')
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts?.[0]) throw new Error('No wallet account returned.')
      setAddress(accounts[0])
      setError(null)
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
      if (!name.trim() || !modelUrl.trim()) throw new Error('Name and model URL are required.')
      if (royaltyBps < 0 || royaltyBps > 1000) throw new Error('Royalty must be 0-1000 bps (0-10%).')

      const ethereum = (window as any).ethereum
      const recipient = address || ethereum?.selectedAddress
      if (!recipient) throw new Error('Connect your wallet first.')

      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, thumbnailUrl, modelUrl, recipient, royaltyBps })
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
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e6f0ff', background: 'linear-gradient(180deg,#02010a,#07162c)', minHeight: '100vh' }}>
      <h1 style={{ color: '#9be7ff' }}>HyperStream // Mint 3D NFT</h1>
      <p style={{ color: '#9ab6cc' }}>GLB/GLTF metadata is pinned to IPFS through the protected server API, then ThreeNFT mints the asset.</p>

      <div style={{ marginBottom: 16 }}>
        <button onClick={connectWallet} style={buttonStyle}>Connect MetaMask</button>
        <span style={{ marginLeft: 12, color: address ? '#9be7ff' : '#7f93a8' }}>
          {address ? `Connected: ${address}` : 'Wallet not connected'}
        </span>
      </div>

      <form onSubmit={handleMint} style={{ maxWidth: 720, display: 'grid', gap: 10 }}>
        <input required placeholder="NFT name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        <input required placeholder="Model URL (https:// or ipfs://)" value={modelUrl} onChange={e => setModelUrl(e.target.value)} style={inputStyle} />
        <input placeholder="Thumbnail URL (https:// or ipfs://)" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} style={inputStyle} />
        <label style={{ color: '#cfeffd' }}>
          Royalty (bps)
          <input type="number" min="0" max="1000" value={royaltyBps} onChange={e => setRoyaltyBps(Number(e.target.value))} style={{ ...inputStyle, marginLeft: 10, width: 120 }} />
          <span style={{ marginLeft: 10, color: '#7f93a8' }}>{(royaltyBps / 100).toFixed(2)}%</span>
        </label>
        <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Minting…' : 'Mint 3D NFT'}</button>
      </form>

      {error && <div style={{ marginTop: 16, color: '#ff9fa8' }}>Error: {error}</div>}
      {result && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(155,231,255,.18)' }}>
          <h3 style={{ color: '#9be7ff' }}>Mint complete</h3>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#dff7ff' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(155,231,255,.16)',
  background: 'rgba(255,255,255,.035)',
  color: '#e6f0ff',
  outline: 'none'
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: 10,
  border: '1px solid rgba(155,231,255,.35)',
  background: 'rgba(91,207,255,.12)',
  color: '#dff7ff',
  cursor: 'pointer'
}
