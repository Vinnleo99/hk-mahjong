import { useEffect, useRef, useState } from 'react';
import { assessQuality } from './scan/quality';

/** Live camera with a row-shaped guide frame and blur / glare / darkness warnings. */
export function CameraGuide({ count, onCapture, onClose }: { count: number; onCapture: (b: Blob) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [warn, setWarn] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  // Guide frame: full width, height set by tile aspect (3:4) and count.
  const frameH = Math.min(0.9, (100 / count) * (4 / 3) / 100 * 1.15);
  useEffect(() => {
    let stream: MediaStream | null = null, timer = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true })!;
        timer = window.setInterval(() => {
          const v = video.current; if (!v || !v.videoWidth) return;
          const r = region(v); c.width = 160; c.height = Math.max(8, Math.round(160 * r.h / r.w));
          g.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
          setWarn(assessQuality(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height).warnings);
        }, 400);
      } catch (e) { setErr('Camera not available – allow camera access or use “choose photo”.'); }
    })();
    return () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  const region = (v: HTMLVideoElement) => {
    // Map the on-screen guide (centred, 92% wide) onto video pixels (object-fit: cover).
    const el = v.getBoundingClientRect();
    const s = Math.max(el.width / v.videoWidth, el.height / v.videoHeight);
    const ox = (v.videoWidth * s - el.width) / 2, oy = (v.videoHeight * s - el.height) / 2;
    const gw = el.width * 0.92, gh = Math.min(el.height * 0.9, el.width * frameH * 1.4);
    return { x: (ox + (el.width - gw) / 2) / s, y: (oy + (el.height - gh) / 2) / s, w: gw / s, h: gh / s, gw, gh };
  };
  const snap = () => {
    const v = video.current; if (!v) return;
    const r = region(v), pad = 0.15;
    const c = document.createElement('canvas');
    const x = Math.max(0, r.x - r.w * 0.02), y = Math.max(0, r.y - r.h * pad);
    c.width = Math.min(v.videoWidth - x, r.w * 1.04); c.height = Math.min(v.videoHeight - y, r.h * (1 + 2 * pad));
    c.getContext('2d')!.drawImage(v, x, y, c.width, c.height, 0, 0, c.width, c.height);
    c.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.92);
  };
  const r = video.current && video.current.videoWidth ? region(video.current) : null;
  return (
    <div className="cam">
      <video ref={video} playsInline muted />
      <div className="cam-frame" style={r ? { width: r.gw, height: r.gh } : { width: '92%', height: `${frameH * 140}vw` }}>
        {Array.from({ length: count - 1 }, (_, i) => <i key={i} style={{ left: `${((i + 1) * 100) / count}%` }} />)}
      </div>
      <div className="cam-top">{err ?? `Fit ${count} tiles inside the frame, one per slot`}</div>
      <div className="cam-warn">{warn.map((w) => <span key={w}>⚠︎ {w}</span>)}{!err && warn.length === 0 && <span className="ok">✓ Looks good</span>}</div>
      <div className="cam-bar">
        <button className="ghost" onClick={onClose}>Cancel</button>
        <button className="shutter" onClick={snap} disabled={!!err} aria-label="Capture" />
        <span style={{ width: 64 }} />
      </div>
    </div>
  );
}
