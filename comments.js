(function () {
  'use strict';

  // ── Firebase config (shared across all team prototypes) ──
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBwRNBa-0Tm2A_h52Qklc6yVBBBhkVPg54",
    authDomain: "calculator-prototype-899ab.firebaseapp.com",
    databaseURL: "https://calculator-prototype-899ab-default-rtdb.firebaseio.com",
    projectId: "calculator-prototype-899ab",
    storageBucket: "calculator-prototype-899ab.firebasestorage.app",
    messagingSenderId: "987611360552",
    appId: "1:987611360552:web:443c5dea6572fcad46f41d"
  };

  // Each prototype gets its own comment thread, scoped by URL
  function protoKey() {
    return btoa(location.origin + location.pathname).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  }

  // Load Firebase + html2canvas, then start
  const DEPS = [
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  ];

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    for (const src of DEPS) await loadScript(src);
    init();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();

  function init() {
    const style = document.createElement('style');
    style.textContent = `
      #cc-toolbar {
        position: fixed; top: 16px; right: 16px;
        display: flex; align-items: center; gap: 8px;
        background: rgba(14,14,22,0.92);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
        padding: 7px 10px; z-index: 9000;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      }
      .cc-btn {
        display: flex; align-items: center; gap: 6px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 9px; padding: 6px 11px; cursor: pointer;
        color: rgba(255,255,255,0.5); font-family: inherit;
        font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em;
        transition: all 0.15s; white-space: nowrap;
      }
      .cc-btn:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
      .cc-btn.active { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.35); color: #fbbf24; }
      .cc-count { background: rgba(251,191,36,0.2); border-radius: 100px; padding: 1px 6px; font-size: 10.5px; color: rgba(251,191,36,0.9); display: none; }
      .cc-count.visible { display: inline; }
      #cc-bar {
        position: fixed; bottom: 20px; left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: rgba(14,14,22,0.92); backdrop-filter: blur(16px);
        border: 1px solid rgba(251,191,36,0.3); border-radius: 12px;
        padding: 10px 18px; font-size: 12px; color: rgba(255,255,255,0.7);
        z-index: 9001; display: flex; align-items: center; gap: 10px;
        transition: transform 0.25s ease; pointer-events: none; white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      }
      #cc-bar.visible { transform: translateX(-50%) translateY(0); pointer-events: all; }
      .cc-bar-dot { width: 7px; height: 7px; border-radius: 50%; background: #fbbf24; flex-shrink: 0; }
      .cc-esc { background: rgba(255,255,255,0.1); border-radius: 5px; padding: 2px 7px; font-size: 11px; color: rgba(255,255,255,0.5); }
      #cc-layer { position: fixed; inset: 0; z-index: 8000; pointer-events: none; }
      body.cc-mode #cc-layer { pointer-events: all; cursor: crosshair; }
      .cc-pin {
        position: absolute; width: 28px; height: 32px;
        transform: translate(-50%, -100%); cursor: pointer;
        border-radius: 50% 50% 50% 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 800; color: #fff;
        user-select: none; pointer-events: all;
        transition: transform 0.15s; opacity: 0; pointer-events: none;
      }
      body.cc-mode .cc-pin[data-key] { opacity: 1; pointer-events: all; }
      .cc-pin.active { transform: translate(-50%,-100%) scale(1.15); }
      .cc-pin--pending { opacity: 1 !important; pointer-events: none !important; background: rgba(255,255,255,0.3) !important; }
      .cc-popover {
        position: fixed; width: 276px;
        background: rgba(18,18,28,0.97); backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #f59e0b;
        border-radius: 14px; overflow: hidden; z-index: 8500; pointer-events: all;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      }
      .cc-thumbnail { width: 100%; display: block; cursor: zoom-in; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: 160px; object-fit: cover; }
      .cc-comment { padding: 13px 14px 12px; }
      .cc-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
      .cc-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }
      .cc-author { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cc-time { font-size: 11px; color: rgba(255,255,255,0.26); flex-shrink: 0; }
      .cc-del-btn { background: none; border: none; color: rgba(255,255,255,0); cursor: pointer; padding: 3px; border-radius: 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color 0.15s, background 0.15s; margin-left: auto; }
      .cc-comment:hover .cc-del-btn { color: rgba(255,255,255,0.25); }
      .cc-del-btn:hover { color: rgba(248,113,113,0.9) !important; background: rgba(248,113,113,0.1); }
      .cc-text { font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,0.78); word-break: break-word; }
      .cc-replies-list { padding: 0 14px; }
      .cc-reply { padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); }
      .cc-reply-meta { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
      .cc-reply-avatar { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0; }
      .cc-reply-author { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); flex: 1; }
      .cc-reply-time { font-size: 11px; color: rgba(255,255,255,0.25); }
      .cc-reply-text { font-size: 12.5px; line-height: 1.5; color: rgba(255,255,255,0.68); padding-left: 27px; }
      .cc-reply-form { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.07); }
      .cc-reply-input { flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 11px; font-size: 12.5px; color: rgba(255,255,255,0.82); font-family: inherit; outline: none; }
      .cc-reply-input::placeholder { color: rgba(255,255,255,0.3); }
      .cc-reply-send { width: 32px; height: 32px; flex-shrink: 0; background: rgba(251,191,36,0.8); border: none; border-radius: 8px; color: #000; font-size: 14px; cursor: pointer; transition: background 0.15s; }
      .cc-reply-send:hover { background: #fbbf24; }
      .cc-form { padding: 14px; }
      .cc-form-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 10px; }
      .cc-form textarea { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 9px 11px; font-size: 13px; color: rgba(255,255,255,0.88); font-family: inherit; resize: none; min-height: 72px; outline: none; margin-bottom: 8px; box-sizing: border-box; }
      .cc-form input[type=text] { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; padding: 7px 11px; font-size: 12px; color: rgba(255,255,255,0.7); font-family: inherit; outline: none; margin-bottom: 10px; box-sizing: border-box; }
      .cc-form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .cc-hint { font-size: 11px; color: rgba(255,255,255,0.25); margin-right: auto; }
      .cc-btn-cancel { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 14px; cursor: pointer; color: rgba(255,255,255,0.5); font-family: inherit; font-size: 12px; }
      .cc-btn-post { background: #fbbf24; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; color: #000; font-weight: 700; font-family: inherit; font-size: 12px; }
      #cc-panel {
        position: fixed; right: 0; top: 0; bottom: 0; width: 300px;
        background: rgba(11,11,18,0.97); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border-left: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column;
        transform: translateX(100%); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        z-index: 9000; box-shadow: -12px 0 40px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      }
      #cc-panel.open { transform: translateX(0); }
      .cp-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 14px; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
      .cp-title { font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: 0.03em; text-transform: uppercase; }
      .cp-title-count { font-weight: 400; color: rgba(255,255,255,0.3); margin-left: 5px; }
      .cp-close { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; transition: color 0.15s, background 0.15s; }
      .cp-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.07); }
      .cp-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
      .cp-list::-webkit-scrollbar { width: 4px; }
      .cp-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      .cp-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.18); font-size: 13px; gap: 10px; padding: 40px 0; }
      .cp-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-left: 3px solid var(--cc,#f59e0b); border-radius: 10px; padding: 11px 12px; cursor: pointer; transition: background 0.15s; }
      .cp-card:hover { background: rgba(255,255,255,0.065); }
      .cp-card-meta { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
      .cp-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
      .cp-author { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.82); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cp-num { font-size: 11px; color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.07); padding: 1px 6px; border-radius: 20px; flex-shrink: 0; }
      .cp-time { font-size: 11px; color: rgba(255,255,255,0.22); flex-shrink: 0; }
      .cp-text { font-size: 12.5px; line-height: 1.5; color: rgba(255,255,255,0.65); word-break: break-word; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .cp-thumb { width: 100%; border-radius: 6px; display: block; opacity: 0.65; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.06); }
      .cp-footer { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
      .cp-reply-count { font-size: 11px; color: rgba(255,255,255,0.28); display: flex; align-items: center; gap: 4px; }
      .cp-go-hint { margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.2); transition: color 0.15s; }
      .cp-card:hover .cp-go-hint { color: rgba(255,255,255,0.55); }
      #cc-lightbox { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      #cc-lightbox.open { opacity: 1; pointer-events: all; cursor: zoom-out; }
      #cc-lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); }
    `;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="cc-toolbar">
        <button class="cc-btn" id="cc-toggle-btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 9a5.5 5.5 0 0 1-5.5 5H3.5L2 15.5V8a5.5 5.5 0 0 1 5.5-5.5A5.5 5.5 0 0 1 13.5 8V9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          Comment <span class="cc-count" id="cc-count">0</span>
        </button>
        <button class="cc-btn" id="cc-review-btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          Review
        </button>
      </div>
      <div id="cc-bar">
        <span class="cc-bar-dot"></span>
        Comment mode · Click anywhere to place · <span class="cc-esc">Esc</span> to exit
      </div>
      <div id="cc-layer"></div>
      <div id="cc-panel">
        <div class="cp-header">
          <span class="cp-title">Comments<span class="cp-title-count" id="cp-count"></span></span>
          <button class="cp-close" id="cp-close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="cp-list" id="cp-list"></div>
      </div>
      <div id="cc-lightbox"><img id="cc-lightbox-img" src="" alt=""></div>
    `);

    const layer      = document.getElementById('cc-layer');
    const bar        = document.getElementById('cc-bar');
    const toggleBtn  = document.getElementById('cc-toggle-btn');
    const reviewBtn  = document.getElementById('cc-review-btn');
    const countEl    = document.getElementById('cc-count');
    const panel      = document.getElementById('cc-panel');
    const cpClose    = document.getElementById('cp-close');
    const cpList     = document.getElementById('cp-list');
    const cpCountEl  = document.getElementById('cp-count');
    const lightbox   = document.getElementById('cc-lightbox');
    const lightboxImg= document.getElementById('cc-lightbox-img');

    let commentMode=false, panelOpen=false, openPopover=null, openPinEl=null;
    let activeReplyRef=null, activeReplyCallback=null, comments=[];
    let savedName = localStorage.getItem('cc-name') || '';

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const commentsRef = firebase.database().ref('proto-comments/' + protoKey());

    const PALETTE = ['#f59e0b','#3b82f6','#10b981','#ec4899','#06b6d4','#f97316','#8b5cf6','#ef4444'];
    const authorColor = n => { if (!n||n==='Anonymous') return '#f59e0b'; let h=0; for (const c of n) h=(h*31+c.charCodeAt(0))&0xffff; return PALETTE[h%PALETTE.length]; };
    const initials = n => (n||'?').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'?';
    const timeAgo = ts => { const s=Math.floor((Date.now()-ts)/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; };
    const esc = t => (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');

    function setCommentMode(on) { commentMode=on; document.body.classList.toggle('cc-mode',on); bar.classList.toggle('visible',on); toggleBtn.classList.toggle('active',on); if(!on) closePopover(); }
    function togglePanel(open) { panelOpen=open; panel.classList.toggle('open',open); reviewBtn.classList.toggle('active',open); }
    function closePopover() {
      if (activeReplyRef&&activeReplyCallback) { activeReplyRef.off('value',activeReplyCallback); activeReplyRef=null; activeReplyCallback=null; }
      if (openPopover) { openPopover.remove(); openPopover=null; }
      if (openPinEl)   { openPinEl.classList.remove('active'); openPinEl=null; }
    }
    function placePopover(pop,px,py) {
      const GAP=14,W=window.innerWidth,H=window.innerHeight,pw=276,ph=pop.offsetHeight||170;
      let left=px+GAP,top=py-20;
      if(left+pw>W-12) left=px-pw-GAP; if(top+ph>H-12) top=H-ph-12; if(top<12) top=12;
      pop.style.left=left+'px'; pop.style.top=top+'px';
    }
    async function captureThumb() {
      const tb=document.getElementById('cc-toolbar');
      layer.style.visibility='hidden'; tb.style.visibility='hidden';
      try { const c=await html2canvas(document.body,{scale:0.65,useCORS:true,logging:false,backgroundColor:null,width:window.innerWidth,height:window.innerHeight,windowWidth:window.innerWidth,windowHeight:window.innerHeight}); return c.toDataURL('image/jpeg',0.8); }
      catch { return null; }
      finally { layer.style.visibility=''; tb.style.visibility=''; }
    }
    function repositionPin(pin,c) { pin.style.left=(c.xPct/100*window.innerWidth)+'px'; pin.style.top=(c.yPct/100*window.innerHeight)+'px'; }

    async function openNewCommentAt(x,y) {
      closePopover();
      const thumbnail = await captureThumb();
      const pending = document.createElement('div');
      pending.className='cc-pin cc-pin--pending active'; pending.style.cssText=`left:${x}px;top:${y}px;`; pending.textContent='+';
      layer.appendChild(pending); openPinEl=pending;
      const pop=document.createElement('div'); pop.className='cc-popover';
      pop.innerHTML=`<div class="cc-form"><div class="cc-form-label">New comment</div><textarea placeholder="Type a comment…"></textarea><input type="text" placeholder="Your name (optional)" value="${(savedName||'').replace(/"/g,'&quot;')}"><div class="cc-form-actions"><span class="cc-hint">⌘↵ to post</span><button class="cc-btn-cancel">Cancel</button><button class="cc-btn-post">Post</button></div></div>`;
      layer.appendChild(pop); openPopover=pop;
      requestAnimationFrame(()=>placePopover(pop,x,y));
      const ta=pop.querySelector('textarea'),inp=pop.querySelector('input'); ta.focus();
      const submit=()=>{ const text=ta.value.trim(); if(!text){cancel();return;} savedName=inp.value.trim(); if(savedName)localStorage.setItem('cc-name',savedName); commentsRef.push({xPct:x/window.innerWidth*100,yPct:y/window.innerHeight*100,text,author:savedName||'Anonymous',time:Date.now(),thumbnail}); pending.remove();pop.remove();openPopover=null;openPinEl=null; };
      const cancel=()=>{ pending.remove();pop.remove();openPopover=null;openPinEl=null; };
      pop.querySelector('.cc-btn-post').onclick=submit; pop.querySelector('.cc-btn-cancel').onclick=cancel;
      ta.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();submit();} if(e.key==='Escape'){e.stopPropagation();cancel();} });
    }

    function renderPin(comment) {
      const color=authorColor(comment.author);
      const pin=document.createElement('div'); pin.className='cc-pin'; pin.dataset.key=comment.fbKey; pin.textContent=comment.id;
      pin.style.background=`linear-gradient(145deg,${color}ee,${color})`; pin.style.boxShadow=`0 3px 10px ${color}88,0 0 0 2px rgba(255,255,255,0.18)`;
      repositionPin(pin,comment); layer.appendChild(pin);
      pin.addEventListener('click',e=>{ e.stopPropagation(); if(openPinEl===pin){closePopover();return;} closePopover();openPinEl=pin;pin.classList.add('active');
        const pop=document.createElement('div'); pop.className='cc-popover'; pop.style.borderLeftColor=color;
        pop.innerHTML=`${comment.thumbnail?`<img class="cc-thumbnail" src="${comment.thumbnail}" alt="">`:''}
          <div class="cc-comment"><div class="cc-meta"><div class="cc-avatar" style="background:${color}">${initials(comment.author)}</div><span class="cc-author">${esc(comment.author)}</span><span class="cc-time">${timeAgo(comment.time)}</span><button class="cc-del-btn" title="Delete"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M4.5 3.5v6a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5v3M7.5 5.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button></div><div class="cc-text">${esc(comment.text)}</div></div>
          <div class="cc-replies-list"></div><div class="cc-reply-form"><input class="cc-reply-input" type="text" placeholder="Reply…"><button class="cc-reply-send">↵</button></div>`;
        layer.appendChild(pop); openPopover=pop;
        requestAnimationFrame(()=>placePopover(pop,parseFloat(pin.style.left),parseFloat(pin.style.top)+28));
        const repliesList=pop.querySelector('.cc-replies-list'),replyRef=commentsRef.child(comment.fbKey).child('replies');
        activeReplyRef=replyRef;
        activeReplyCallback=snap=>{ repliesList.innerHTML=''; Object.entries(snap.val()||{}).forEach(([,r])=>{ const rc=authorColor(r.author),div=document.createElement('div'); div.className='cc-reply'; div.innerHTML=`<div class="cc-reply-meta"><div class="cc-reply-avatar" style="background:${rc}">${initials(r.author)}</div><span class="cc-reply-author">${esc(r.author)}</span><span class="cc-reply-time">${timeAgo(r.time)}</span></div><div class="cc-reply-text">${esc(r.text)}</div>`; repliesList.appendChild(div); }); repliesList.scrollTop=repliesList.scrollHeight; requestAnimationFrame(()=>placePopover(pop,parseFloat(pin.style.left),parseFloat(pin.style.top)+28)); };
        replyRef.on('value',activeReplyCallback);
        const replyInput=pop.querySelector('.cc-reply-input'),submitReply=()=>{ const text=replyInput.value.trim(); if(!text)return; replyRef.push({text,author:savedName||'Anonymous',time:Date.now()}); replyInput.value=''; };
        pop.querySelector('.cc-reply-send').onclick=submitReply; replyInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitReply();}});
        pop.querySelector('.cc-del-btn').onclick=()=>{ commentsRef.child(comment.fbKey).remove();pop.remove();openPopover=null;openPinEl=null; };
      });
    }

    function renderPanel() {
      cpCountEl.textContent=comments.length?` (${comments.length})`:''; cpList.innerHTML='';
      if(!comments.length){ cpList.innerHTML=`<div class="cp-empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>No comments yet</div>`; return; }
      comments.forEach(comment=>{ const color=authorColor(comment.author),card=document.createElement('div'); card.className='cp-card'; card.style.setProperty('--cc',color);
        card.innerHTML=`${comment.thumbnail?`<img class="cp-thumb" src="${comment.thumbnail}" alt="">`:''}
          <div class="cp-card-meta"><div class="cp-avatar" style="background:${color}">${initials(comment.author)}</div><span class="cp-author">${esc(comment.author)}</span><span class="cp-num">#${comment.id}</span><span class="cp-time">${timeAgo(comment.time)}</span></div>
          <div class="cp-text">${esc(comment.text)}</div>
          <div class="cp-footer"><span class="cp-reply-count" id="cpr-${comment.fbKey}"></span><span class="cp-go-hint">View on canvas →</span></div>`;
        card.addEventListener('click',()=>{ togglePanel(false);setCommentMode(true); const pin=layer.querySelector(`.cc-pin[data-key="${comment.fbKey}"]`); if(pin)pin.click(); });
        cpList.appendChild(card);
        commentsRef.child(comment.fbKey).child('replies').once('value',snap=>{ const n=Object.keys(snap.val()||{}).length,el=document.getElementById(`cpr-${comment.fbKey}`); if(el&&n>0)el.innerHTML=`<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M13.5 9a5.5 5.5 0 0 1-5.5 5H3.5L2 15.5V8a5.5 5.5 0 0 1 5.5-5.5A5.5 5.5 0 0 1 13.5 8V9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> ${n} ${n===1?'reply':'replies'}`; });
      });
    }

    toggleBtn.addEventListener('click',()=>setCommentMode(!commentMode));
    reviewBtn.addEventListener('click',()=>togglePanel(!panelOpen));
    cpClose.addEventListener('click',()=>togglePanel(false));
    layer.addEventListener('click',e=>{ if(!commentMode)return; if(e.target.closest('.cc-pin')||e.target.closest('.cc-popover'))return; if(openPopover){closePopover();return;} openNewCommentAt(e.clientX,e.clientY); });
    document.addEventListener('click',e=>{ if(e.target.classList.contains('cc-thumbnail')){lightboxImg.src=e.target.src;lightbox.classList.add('open');} });
    lightbox.addEventListener('click',()=>lightbox.classList.remove('open'));
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'){if(lightbox.classList.contains('open')){lightbox.classList.remove('open');return;} if(openPopover){closePopover();return;} if(commentMode){setCommentMode(false);return;}} const inInput=['INPUT','TEXTAREA'].includes(document.activeElement.tagName); if(!inInput&&(e.key==='c'||e.key==='C'))setCommentMode(!commentMode); },true);
    window.addEventListener('resize',()=>{ layer.querySelectorAll('.cc-pin[data-key]').forEach(pin=>{ const c=comments.find(c=>c.fbKey===pin.dataset.key); if(c)repositionPin(pin,c); }); closePopover(); });

    commentsRef.on('value',snapshot=>{ layer.querySelectorAll('.cc-pin[data-key]').forEach(p=>p.remove()); if(openPinEl&&openPinEl.dataset.key)closePopover(); comments=[];let id=1; Object.entries(snapshot.val()||{}).forEach(([key,c])=>{ const comment={...c,fbKey:key,id:id++}; comments.push(comment);renderPin(comment); }); countEl.textContent=comments.length; countEl.classList.toggle('visible',comments.length>0); renderPanel(); });
  }
})();
