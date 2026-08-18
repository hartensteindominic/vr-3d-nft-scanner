const projectId='f9f636bc1db354b9bfddddd2ad1d4eae';
let scannerStream=null,scanTimer=null,scanBusy=false,signClient=null;
function status(t,e=false){const x=document.getElementById('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
async function getSignClient(){
  if(signClient)return signClient;
  status('Loading WalletConnect…');
  try{
    const mod=await import('https://esm.sh/@walletconnect/sign-client@latest?bundle');
    const SignClient=mod.default||mod.SignClient;
    if(!SignClient)throw Error('WalletConnect SignClient failed to load.');
    signClient=await SignClient.init({projectId,metadata:{name:'HyperStream 3D NFT Studio',description:'Quest QR wallet scanner',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/',icons:[]}});
    signClient.on('session_event',({event})=>console.debug('WC session event',event));
    signClient.on('session_update',({topic,params})=>syncSession(topic,params?.namespaces));
    signClient.on('session_delete',()=>status('Wallet session ended.'));
    return signClient;
  }catch(e){signClient=null;throw Error('WalletConnect could not load. Check Quest internet access and refresh.\n'+(e.message||e))}
}
function syncSession(topic,namespaces){try{const s=topic&&signClient?signClient.session.get(topic):null;const ns=namespaces||s?.namespaces;const accounts=ns?.eip155?.accounts||[];const address=accounts[0]?.split(':')[2];if(address){setAddress(address);status('🦊 Wallet session connected ✓')}}catch(e){console.debug(e)}}
async function pairScannedUri(uri){
  if(!uri||(!uri.startsWith('wc:')&&!uri.startsWith('WALLETCONNECT:')))throw Error('That QR is not a WalletConnect QR.');
  const client=await getSignClient();
  status('WalletConnect QR detected. Pairing…');
  try{
    await client.core.pairing.pair({uri});
    status('Pairing request sent. Approve the connection in the wallet…');
    const sessions=client.session.getAll();
    const s=sessions[sessions.length-1];
    if(s)syncSession(s.topic);
  }catch(e){throw Error(e.message||'WalletConnect pairing failed.')}
}
async function startScanner(){
  if(scannerStream)return;
  const video=document.getElementById('qrVideo'),canvas=document.getElementById('qrCanvas'),wrap=document.getElementById('qrScanner');
  if(!video||!canvas||!wrap){status('QR scanner UI is missing. Refresh the page.',true);return}
  wrap.hidden=false;document.getElementById('qrScanBtn').textContent='⏹ STOP SCANNER';
  status('Allow Quest camera access, then point it at the QR shown on your phone.');
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('This Quest browser does not expose camera access to this page.');
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=scannerStream;await video.play();
    if(!window.jsQR)throw Error('QR decoder failed to load. Refresh once with an internet connection.');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const scan=async()=>{
      if(!scannerStream)return;
      if(!scanBusy&&video.readyState>=2&&video.videoWidth){
        canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height);
        const code=window.jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'});
        if(code?.data){scanBusy=true;try{await pairScannedUri(code.data);stopScanner()}catch(e){status(e.message,true);scanBusy=false}}
      }
      scanTimer=requestAnimationFrame(scan);
    };
    scanTimer=requestAnimationFrame(scan);
  }catch(e){stopScanner();status('Camera could not start.\n'+(e.message||e),true)}
}
function stopScanner(){
  if(scanTimer)cancelAnimationFrame(scanTimer);scanTimer=null;
  if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null}
  const v=document.getElementById('qrVideo');if(v)v.srcObject=null;
  const w=document.getElementById('qrScanner');if(w)w.hidden=true;
  const b=document.getElementById('qrScanBtn');if(b)b.textContent='📷 SCAN QR CODE WITH QUEST';
  scanBusy=false;
}
window.walletProvider=null;
window.startQuestQrScanner=startScanner;
window.stopQuestQrScanner=stopScanner;
window.reownConnect=async()=>{status('Use SCAN QR CODE WITH QUEST for the phone QR flow.')};
window.addEventListener('load',()=>{
  const b=document.getElementById('qrScanBtn');
  if(b)b.disabled=false;
});
