(() => {
  let stream = null;
  let frame = null;
  let busy = false;
  const $ = id => document.getElementById(id);
  const setStatus = (text, error = false) => {
    const el = $('status');
    if (!el) return;
    el.textContent = text;
    el.className = 'status' + (error ? ' error' : '');
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    const video = $('qrVideo');
    if (video) video.srcObject = null;
    const wrap = $('qrScanner');
    if (wrap) wrap.hidden = true;
    const button = $('qrScanBtn');
    if (button) button.textContent = '📷 SCAN QR CODE WITH QUEST';
    busy = false;
  };
  const handleCode = async uri => {
    if (!uri) return;
    if (!/^wc:/i.test(uri)) {
      setStatus('QR detected, but it is not a WalletConnect QR. Show the WalletConnect QR from your phone.', true);
      busy = false;
      return;
    }
    busy = true;
    setStatus('🔗 WalletConnect QR detected. Pairing with your phone…');
    try {
      if (typeof window.pairScannedWalletConnectUri !== 'function') {
        throw new Error('Wallet connector is not ready yet. Please wait a moment and scan again.');
      }
      await window.pairScannedWalletConnectUri(uri);
      stop();
    } catch (e) {
      busy = false;
      setStatus('Wallet connection failed. ' + (e?.message || e), true);
    }
  };
  async function start() {
    if (stream) return;
    const video = $('qrVideo'), canvas = $('qrCanvas'), wrap = $('qrScanner'), button = $('qrScanBtn');
    if (!video || !canvas || !wrap) return setStatus('QR scanner interface failed to load. Refresh the page.', true);
    if (!navigator.mediaDevices?.getUserMedia) return setStatus('Quest browser camera access is unavailable on this page.', true);
    if (!window.jsQR) return setStatus('QR decoder failed to load. Refresh once with an internet connection.', true);
    wrap.hidden = false;
    button.textContent = '⏹ STOP SCANNER';
    setStatus('📷 Allow camera access, then hold your phone QR inside the frame.');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = stream;
      await video.play();
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const loop = () => {
        if (!stream) return;
        if (!busy && video.readyState >= 2 && video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
          if (code?.data) handleCode(code.data);
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    } catch (e) {
      stop();
      setStatus('Camera could not start. Allow camera permission for HyperStream in Quest settings. ' + (e?.message || ''), true);
    }
  }
  window.startQuestQrScanner = start;
  window.stopQuestQrScanner = stop;
  window.addEventListener('load', () => {
    const b = $('qrScanBtn');
    if (b) b.onclick = () => stream ? stop() : start();
  });
})();
