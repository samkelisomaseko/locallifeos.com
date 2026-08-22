(function(){
  // ---------- Lightweight DB (falls back to localStorage) ----------
  const DB_PRO = window.DB_PRO || (function(){
    const ns = "locallife-db";
    const read = () => JSON.parse(localStorage.getItem(ns) || "{}");
    const write = (o) => localStorage.setItem(ns, JSON.stringify(o));
    return {
      async getAll(store){ const db = read(); return Object.values(db[store]||{}); },
      async get(store, id){ const db = read(); return (db[store]||{})[id]||null; },
      async put(store, obj){ const db = read(); db[store]=db[store]||{}; db[store][obj.id]=obj; write(db); },
      async del(store, id){ const db = read(); if(db[store]){ delete db[store][id]; write(db);} }
    };
  })();
  window.DB_PRO = DB_PRO;

  // ---------- Toast helper ----------
  window.toast = window.toast || function(msg){
    const t = document.createElement("div");
    t.textContent = msg; t.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:12px;z-index:999999;box-shadow:0 8px 28px rgba(0,0,0,.3)";
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .4s"; }, 1400);
    setTimeout(()=> t.remove(), 1800);
  };

  // ---------- Viewport-safe Context Menu ----------
  window.showCtxMenu = function(items, x, y){
    // cleanup
    document.querySelectorAll(".ll-ctx").forEach(n=>n.remove());
    const menu = document.createElement("div");
    menu.className = "ll-ctx"; menu.setAttribute("role","menu");
    items.forEach((it,i)=>{
      if(it === "hr"){ menu.appendChild(document.createElement("hr")); return; }
      const b = document.createElement("button");
      b.setAttribute("role","menuitem");
      b.innerHTML = `${it.icon ? `<i class="${it.icon}" aria-hidden="true"></i>`:""} <span>${it.label}</span>` + (it.k?`<span class="k">${it.k}</span>`:"");
      if(it.className) b.classList.add(it.className);
      b.addEventListener("click", ()=>{ it.onClick?.(); menu.remove(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    // position + clamp
    const pad = 8;
    const r = menu.getBoundingClientRect();
    let left = x, top = y;
    if (left + r.width + pad > innerWidth) left = innerWidth - r.width - pad;
    if (top + r.height + pad > innerHeight) top = innerHeight - r.height - pad;
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    // dismiss
    setTimeout(()=>{
      const h = (ev)=>{ if(!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("pointerdown", h); } };
      document.addEventListener("pointerdown", h);
    });
  };

  // ---------- Long-press handlers ----------
  function attachLongPress(selector, builder){
    document.querySelectorAll(selector).forEach(el=>{
      if(el.__lpBound2) return; el.__lpBound2 = true;
      let t=null;
      el.addEventListener("pointerdown", (e)=>{
        if(e.button!==0) return;
        const x=e.clientX, y=e.clientY;
        t = setTimeout(()=>{
          const items = builder(el, e) || [];
          if(items.length>0){ showCtxMenu(items, x, y); }
        }, 420);
      });
      ["pointerup","pointerleave","pointercancel"].forEach(ev=> el.addEventListener(ev, ()=> t && clearTimeout(t)));
    });
  }

  // helper share
  async function sharePayload(payload){
    try{
      if(navigator.share){ await navigator.share(payload); }
      else { await navigator.clipboard.writeText(payload.url || payload.text || ""); toast("Copied"); }
    }catch(e){ console.warn(e); }
  }

  function openDirectionsFromEl(el){
    const lat = el.dataset.lat, lng = el.dataset.lng, q = el.dataset.address || el.dataset.title || el.textContent.trim();
    const url = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}` :
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(url, "_blank", "noopener");
  }

  // Apply to three menu types
  attachLongPress(".card:not(.place-card):not(.bulletin-card)", (el)=>[
    { label:"Pin", icon:"fas fa-thumbtack", onClick: ()=>{ el.dataset.pinned="1"; el.style.outline="2px solid var(--accent, #6366f1)"; } },
    { label:"Share", icon:"fas fa-share-alt", onClick: ()=>{
      const title = el.querySelector(".card-title")?.textContent?.trim() || "Card";
      sharePayload({ title, url: location.href.split('#')[0] });
    }}
  ]);

  attachLongPress(".place-card, [data-lat][data-lng], .card[data-address]", (el)=>[
    { label:"View details", icon:"fas fa-eye", onClick: ()=>{ el.querySelector("a,button,[role='button']")?.click(); } },
    { label:"Share", icon:"fas fa-share-alt", onClick: ()=>{
      const title = el.dataset.title || el.querySelector(".card-title")?.textContent?.trim() || "Place";
      sharePayload({ title, url: el.dataset.url || location.href.split('#')[0] });
    }},
    { label:"Get directions", icon:"fas fa-location-arrow", onClick: ()=> openDirectionsFromEl(el) }
  ]);

  attachLongPress(".task-item, li.task", (el)=>[
    { label:"Edit", icon:"fas fa-pen", onClick: ()=>{
        const textEl = el.querySelector(".task-text")||el;
        const newText = prompt("Edit task:", textEl.textContent.trim());
        if(newText) textEl.textContent = newText;
      }},
    { label:"Delete", icon:"fas fa-trash", className:"danger", onClick: ()=> el.remove() }
  ]);

  // Bulletin: owner-only edit/delete
  const currentUser = (function(){
    try { return JSON.parse(localStorage.getItem("currentUser")||"{}"); } catch(e){ return {}; }
  })();
  attachLongPress(".bulletin-card", (el)=>{
    const id = el.dataset.id || Math.random().toString(36).slice(2);
    const owner = String(el.dataset.owner||"");
    const isOwner = currentUser && String(currentUser.id)===owner;
    const items = [
      { label:"Pin", icon:"fas fa-thumbtack", onClick: ()=>{ el.dataset.pinned="1"; } },
      { label:"Share", icon:"fas fa-share-alt", onClick: ()=>{
        const title = el.querySelector(".card-title, strong, h3")?.textContent?.trim() || "Post";
        const url = location.href.split('#')[0] + "#post-"+id;
        sharePayload({ title, url });
      }}
    ];
    if(isOwner){
      items.push(
        { label:"Edit", icon:"fas fa-pen", onClick: async ()=>{
            const bodyEl = el.querySelector("p,.body,.content")||el;
            const newText = prompt("Edit your post:", bodyEl.textContent.trim());
            if(newText===null) return;
            bodyEl.textContent = newText;
            await DB_PRO.put("posts", { id, authorId: owner, content: newText, updatedAt: new Date().toISOString() });
            toast("Post updated");
        }},
        { label:"Delete", icon:"fas fa-trash", className:"danger", onClick: async ()=>{
            if(!confirm("Delete this post?")) return;
            el.remove(); await DB_PRO.del("posts", id); toast("Deleted");
        }}
      );
    } else {
      items.push({ label:"Report", icon:"fas fa-flag", onClick: ()=> toast("Thanks, we'll review.") });
    }
    return items;
  });

  // ---------- Privacy & Security ----------
  function ensurePrivacyUI(){
    const host = document.querySelector("#privacy, #privacySecurity, [data-section='privacy']");
    if(!host) return;
    // Sandbox
    let row = document.getElementById("privacySandboxRow");
    if(!row){
      row = document.createElement("div"); row.id = "privacySandboxRow";
      row.innerHTML = `<div><strong>Privacy Sandbox Mode</strong><div style="opacity:.7;font-size:12px">Blocks cross-site tracking, limits background analytics, and hardens permissions.</div></div><div id="sandboxSwitch" class="switch" role="switch" aria-checked="false" tabindex="0"></div>`;
      host.prepend(row);
    }
    const sw = row.querySelector("#sandboxSwitch");
    const key = "privacy.sandbox";
    const apply = (on)=>{
      sw.classList.toggle("on", !!on);
      sw.setAttribute("aria-checked", !!on);
      document.documentElement.dataset.privacySandbox = on ? "on" : "off";
    };
    apply(localStorage.getItem(key)==="1");
    const toggle = ()=>{ const v = sw.classList.toggle("on"); localStorage.setItem(key, v?"1":"0"); apply(v); toast(v?"Sandbox ON":"Sandbox OFF"); };
    sw.addEventListener("click", toggle); sw.addEventListener("keydown", (e)=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggle(); }});

    // Export sheet
    if(!document.getElementById("exportSheet")){
      const sheet = document.createElement("div");
      sheet.id = "exportSheet";
      sheet.innerHTML = `<div class="panel">
        <h3>Export My Data</h3>
        <div class="row">
          <div class="btn" data-exp="json">Export JSON</div>
          <div class="btn" data-exp="csv">Export CSV</div>
        </div>
        <div style="text-align:right;margin-top:10px"><button id="exportClose" class="btn">Close</button></div>
      </div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click", (e)=>{ if(e.target.id==="exportClose" || e.target===sheet) sheet.style.display="none"; });
      sheet.querySelectorAll("[data-exp]").forEach(btn=> btn.addEventListener("click", async ()=>{
        const fmt = btn.dataset.exp;
        const data = {
          posts: await DB_PRO.getAll("posts"),
          tasks: await DB_PRO.getAll("tasks"),
          goals: await DB_PRO.getAll("goals"),
          nutrition: await DB_PRO.getAll("nutrition"),
          focusSessions: JSON.parse(localStorage.getItem("focusSessions")||"[]"),
          exercises: JSON.parse(localStorage.getItem("mindfulnessProgress")||"{}"),
        };
        if(fmt==="json"){
          const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
          const url = URL.createObjectURL(blob); const a = Object.assign(document.createElement("a"), { href:url, download:"locallife-export.json" }); a.click(); URL.revokeObjectURL(url);
        } else {
          // CSV simple flatten
          const rows = [["type","id","payload"]];
          for(const [k, arr] of Object.entries(data)){
            const list = Array.isArray(arr)?arr:Object.entries(arr);
            list.forEach((v,i)=> rows.push([k, (v && v.id)||(i+1), JSON.stringify(v)]));
          }
          const csv = rows.map(r=> r.map(x=> `"${String(x).replace(/"/g,'""')}"`).join(",")).join("
");
          const blob = new Blob([csv], {type: "text/csv"});
          const url = URL.createObjectURL(blob); const a = Object.assign(document.createElement("a"), { href:url, download:"locallife-export.csv" }); a.click(); URL.revokeObjectURL(url);
        }
        toast("Exported");
      }));
    }
    // Hook "Export my data" button
    document.addEventListener("click", (e)=>{
      const t = e.target.closest("button, .btn");
      if(!t) return;
      const txt = (t.textContent||"").trim().toLowerCase();
      if(txt.includes("export my data")){
        e.preventDefault();
        document.getElementById("exportSheet").style.display="grid";
      }
    });
  }
  ensurePrivacyUI();

  // ---------- Goals visibility (robust) ----------
  function tuneGoalsVisibility(){
    const holders = [
      document.querySelector("#planner #goalsHolder"),
      document.querySelector("#goalsHolder"),
      [...document.querySelectorAll("section,div")].find(s=>/your goals/i.test(s?.textContent||""))
    ].filter(Boolean);
    holders.forEach(holder=>{
      const list = holder.querySelector("#goalsList, ul, .list");
      if(!list) return;
      const apply=()=> holder.style.display = (list.children.length>0) ? "" : "none";
      const mo=new MutationObserver(apply); mo.observe(list,{childList:true}); apply();
    });
  }
  tuneGoalsVisibility();

  // ---------- Nutrition Tracker: Scan Meal ----------
  (function(){
    // Food color heuristic
    const FOOD_MAP = [
      {name:"Banana", kcal:105, carbs:27, protein:1.3, fat:0.3, colors:["#d9c43e","#f2d23b","#e7d96c"]},
      {name:"Apple", kcal:95, carbs:25, protein:0.5, fat:0.3, colors:["#b22222","#cc3333","#8a1c1c"]},
      {name:"Pizza slice", kcal:285, carbs:36, protein:12, fat:10, colors:["#d9a441","#a63e2d","#f2cb66"]},
      {name:"Green salad", kcal:120, carbs:10, protein:3, fat:7, colors:["#2e7d32","#4caf50","#8bc34a"]},
      {name:"Yogurt", kcal:150, carbs:17, protein:12, fat:3, colors:["#f2f2f2","#e6e6e6","#ffffff"]},
    ];
    function nearestFood(avg){
      // simple nearest by color distance in LAB-ish via RGB
      function hexToRgb(h){ const x=h.replace("#",""); return { r:parseInt(x.slice(0,2),16), g:parseInt(x.slice(2,4),16), b:parseInt(x.slice(4,6),16) }; }
      function d(c1,c2){ return Math.hypot(c1.r-c2.r, c1.g-c2.g, c1.b-c2.b); }
      let best=null, bestDist=1e9;
      for(const f of FOOD_MAP){
        for(const hc of f.colors){
          const dist = d(avg, hexToRgb(hc));
          if(dist<bestDist){ best=f; bestDist=dist; }
        }
      }
      return best;
    }
    async function analyzeFile(file){
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d",{ willReadFrequently:true });
      const w = canvas.width = 64, h = canvas.height = 64;
      ctx.drawImage(img, 0,0, w,h);
      const data = ctx.getImageData(0,0,w,h).data;
      let r=0,g=0,b=0,c=0;
      for(let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; c++; }
      r=Math.round(r/c); g=Math.round(g/c); b=Math.round(b/c);
      const f = nearestFood({r,g,b});
      return f;
    }
    function attach(){
      document.querySelectorAll(".scan-meal, [data-action='scan-meal']").forEach(btn=>{
        if(btn.__scanBound) return; btn.__scanBound=true;
        btn.addEventListener("click", async ()=>{
          const input = document.createElement("input"); input.type="file"; input.accept="image/*"; input.capture="environment";
          input.onchange = async ()=>{
            const file = input.files?.[0]; if(!file) return;
            const guess = await analyzeFile(file);
            if(!guess){ toast("Couldn't recognize, please enter manually."); return; }
            if(confirm(`Log ${guess.name}? (${guess.kcal} kcal)`)){
              const rec = { id: "n_"+Date.now(), name: guess.name, kcal:guess.kcal, carbs:guess.carbs, protein:guess.protein, fat:guess.fat, at:new Date().toISOString() };
              await DB_PRO.put("nutrition", rec);
              toast("Meal logged");
              document.dispatchEvent(new CustomEvent("nutrition:logged",{detail:rec}));
            }
          };
          input.click();
        });
      });
    }
    attach();
    // in case of dynamic rendering
    const mo=new MutationObserver(attach); mo.observe(document.body,{childList:true,subtree:true});
  })();

  // ---------- Mindful Focus Session ----------
  (function(){
    const host = document.querySelector("#mindfulFocus, [data-module='focus']");
    if(!host) return;
    if(host.__focusBound) return; host.__focusBound=true;
    host.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;justify-content:space-between">
        <div>
          <div style="font-weight:800">Mindful Focus</div>
          <div style="opacity:.7;font-size:12px">Customize timer, view history, and stay motivated.</div>
        </div>
        <div class="progress-ring"><span id="focusPct">0%</span></div>
      </div>
      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap">
        <input id="focusMins" type="number" min="1" max="180" value="25" style="width:90px" aria-label="Minutes">
        <button id="focusStart" class="btn">Start</button>
        <button id="focusStop" class="btn">Stop</button>
        <button id="focusHistoryBtn" class="btn">History</button>
      </div>
      <div id="focusStats" style="display:flex; gap:16px; margin-top:10px; font-size:12px; opacity:.85">
        <div>Total mins: <strong id="focusTotal">0</strong></div>
        <div>Sessions: <strong id="focusCount">0</strong></div>
        <div>Streak: <strong id="focusStreak">0</strong></div>
      </div>
      <div id="focusHistory" style="display:none; margin-top:12px"></div>
    `;
    const ring = host.querySelector(".progress-ring"); const pct = host.querySelector("#focusPct");
    const minsEl = host.querySelector("#focusMins");
    const btnStart = host.querySelector("#focusStart");
    const btnStop = host.querySelector("#focusStop");
    const btnHist = host.querySelector("#focusHistoryBtn");
    let timer=null, startAt=null, durationMs=0;

    function beep(){
      try{
        const ac = new (window.AudioContext||window.webkitAudioContext)();
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type="sine"; o.frequency.value=880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+0.3);
        o.start(); o.stop(ac.currentTime+0.3);
      }catch(e){}
    }
    function setProgress(p){
      ring.style.setProperty("--p", Math.max(0, Math.min(1,p))*360+"deg");
      pct.textContent = Math.round(Math.max(0, Math.min(1,p))*100) + "%";
    }
    function loadHistory(){ return JSON.parse(localStorage.getItem("focusSessions")||"[]"); }
    function saveHistory(arr){ localStorage.setItem("focusSessions", JSON.stringify(arr)); }
    function refreshStats(){
      const arr = loadHistory();
      const total = arr.reduce((s,a)=> s+a.mins,0);
      const count = arr.length;
      // streak: consecutive days ending today
      const days = new Set(arr.map(a=> a.date.slice(0,10)));
      let streak=0; let d=new Date(); for(;;){ const k=d.toISOString().slice(0,10); if(days.has(k)){ streak++; d.setDate(d.getDate()-1);} else break; }
      host.querySelector("#focusTotal").textContent = total;
      host.querySelector("#focusCount").textContent = count;
      host.querySelector("#focusStreak").textContent = streak;
    }
    refreshStats();

    btnStart.addEventListener("click", ()=>{
      const mins = Math.max(1, Math.min(180, parseInt(minsEl.value||"25",10)));
      durationMs = mins*60*1000; startAt = Date.now();
      clearInterval(timer);
      timer = setInterval(()=>{
        const p = (Date.now()-startAt)/durationMs;
        setProgress(p);
        if(p>=1){
          clearInterval(timer); timer=null; setProgress(1); beep(); beep();
          const arr = loadHistory(); arr.push({ date:new Date().toISOString(), mins }); saveHistory(arr);
          refreshStats(); toast("Session complete");
        }
      }, 250);
      toast("Focus started");
    });
    btnStop.addEventListener("click", ()=>{ clearInterval(timer); timer=null; setProgress(0); toast("Stopped"); });
    btnHist.addEventListener("click", ()=>{
      const arr = loadHistory();
      const wrap = host.querySelector("#focusHistory");
      wrap.style.display = wrap.style.display==="none" ? "block":"none";
      wrap.innerHTML = "<ul>"+arr.map(a=>`<li>${new Date(a.date).toLocaleString()} — ${a.mins} mins</li>`).join("")+"</ul>";
    });
  })();

  // ---------- Mindfulness Exercises (Guided via speech) ----------
  (function(){
    const host = document.querySelector("#mindfulnessExercises, [data-module='mindfulness']");
    if(!host) return;
    if(host.__mindBound) return; host.__mindBound=true;
    host.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:800">Mindfulness Exercises</div>
          <div style="opacity:.7;font-size:12px">Guided audio narration with progress and difficulty.</div>
        </div>
        <select id="mindLevel" aria-label="Difficulty">
          <option value="easy">Easy</option><option value="standard">Standard</option><option value="intense">Intense</option>
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap">
        <button id="mindPlay" class="btn">Play Guided Session</button>
        <button id="mindStop" class="btn">Stop</button>
      </div>
      <div id="mindProg" style="margin-top:8px; font-size:12px; opacity:.85"></div>
    `;
    const synth = window.speechSynthesis;
    const scriptByLevel = {
      easy: ["Welcome. Sit comfortably.","Breathe in... and out.","Gently scan your body from head to toes.","Notice any tension and release."],
      standard: ["Focus attention on your breath.","If thoughts arise, acknowledge and let go.","Expand awareness to sounds and sensations.","Return to breath."],
      intense: ["Maintain steady attention for longer counts.","Inhale for 4, hold for 4, exhale for 6.","Observe urges to move, without reacting.","Finish with gratitude."]
    };
    const progEl = host.querySelector("#mindProg");
    const levelEl = host.querySelector("#mindLevel");
    const playBtn = host.querySelector("#mindPlay");
    const stopBtn = host.querySelector("#mindStop");

    function say(text){ const u = new SpeechSynthesisUtterance(text); u.rate=1; u.pitch=1; synth.speak(u); }
    function saveProgress(step){ const p = JSON.parse(localStorage.getItem("mindfulnessProgress")||"{}"); const lvl=levelEl.value; p[lvl]=(p[lvl]||0)+step; localStorage.setItem("mindfulnessProgress", JSON.stringify(p)); renderProgress(); }
    function renderProgress(){ const p = JSON.parse(localStorage.getItem("mindfulnessProgress")||"{}"); progEl.textContent = "Progress — Easy: "+(p.easy||0)+", Standard: "+(p.standard||0)+", Intense: "+(p.intense||0); }
    renderProgress();

    playBtn.addEventListener("click", async ()=>{
      const seq = scriptByLevel[levelEl.value]; let i=0;
      const loop = ()=>{
        if(i>=seq.length){ toast("Session finished"); saveProgress(1); return; }
        say(seq[i++]); setTimeout(loop, 3500);
      };
      loop();
    });
    stopBtn.addEventListener("click", ()=>{ synth.cancel(); toast("Guided session stopped"); });
  })();

  // ---------- Claim This Listing ----------
  (function(){
    const host = document.querySelector("#claimListing, [data-module='claim']");
    if(!host) return;
    if(host.__claimBound) return; host.__claimBound=true;
    host.innerHTML = `
      <div style="font-weight:800">Claim This Listing</div>
      <form id="claimForm" style="display:grid; gap:8px; max-width:420px; margin-top:8px">
        <input required name="biz" placeholder="Business name">
        <input required type="email" name="email" placeholder="Work email">
        <input name="phone" placeholder="Phone (optional)">
        <button class="btn" type="submit">Send Verification Code</button>
      </form>
      <form id="claimVerify" style="display:none; gap:8px; max-width:420px; margin-top:8px">
        <input required name="code" placeholder="6-digit code">
        <button class="btn" type="submit">Verify & Claim</button>
      </form>
      <div id="claimMsg" style="margin-top:8px; font-size:12px; opacity:.85"></div>
    `;
    const f1 = host.querySelector("#claimForm");
    const f2 = host.querySelector("#claimVerify");
    const msg = host.querySelector("#claimMsg");
    let pending = null;
    f1.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f1).entries());
      // basic validation
      if(!/^[^@]+@[^@]+\.[^@]+$/.test(data.email)){ toast("Invalid email"); return; }
      const code = String(Math.floor(100000+Math.random()*900000));
      pending = { id:"claim_"+Date.now(), ...data, code, created:new Date().toISOString(), verified:false };
      await DB_PRO.put("claims", pending);
      msg.textContent = "Verification code sent to "+data.email+" (for demo, code: "+code+")";
      f1.style.display="none"; f2.style.display="grid";
    });
    f2.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const input = new FormData(f2).get("code");
      const rec = pending || await DB_PRO.get("claims", pending?.id);
      if(rec && input===rec.code){
        rec.verified = true; await DB_PRO.put("claims", rec);
        msg.textContent = "✅ Listing successfully claimed. We'll review and confirm ownership.";
        f2.style.display="none";
      } else { toast("Incorrect code"); }
    });
  })();

  // ---------- Service Marketplace & Civil Engagement Hub ----------
  (function(){
    const host = document.querySelector("#marketplace, [data-module='market']");
    if(!host) return;
    if(host.__marketBound) return; host.__marketBound=true;
    host.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="mkSearch" placeholder="Search services & civic events" style="flex:1 1 260px">
        <div class="filter-chip" data-f="nearby">Nearby</div>
        <div class="filter-chip" data-f="open">Open now</div>
        <div class="filter-chip" data-f="free">Free</div>
        <button id="mkFilters" class="btn">Filters</button>
      </div>
      <div id="mkList" style="margin-top:10px; display:grid; gap:10px"></div>
      <dialog id="mkModal" style="max-width:560px; border:none; border-radius:16px; padding:0">
        <div style="padding:16px">
          <h3 id="mkTitle"></h3>
          <div id="mkBody" style="opacity:.85"></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
            <button id="mkClose" class="btn">Close</button>
            <button id="mkDirection" class="btn">Get Directions</button>
          </div>
        </div>
      </dialog>
    `;
    const data = [
      {id:"svc1", type:"service", title:"Plumber Pro", open:true, price:50, lat:-26.32,lng:31.14, desc:"24/7 emergency plumbing."},
      {id:"svc2", type:"service", title:"Tutoring Hub", open:false, price:0, lat:-26.32,lng:31.15, desc:"Math & Science tutoring."},
      {id:"civ1", type:"civic", title:"Park Clean-up", open:true, price:0, lat:-26.33,lng:31.14, desc:"Join community cleanup Saturday."},
    ];
    const list = host.querySelector("#mkList");
    const modal = host.querySelector("#mkModal");
    const mTitle = host.querySelector("#mkTitle");
    const mBody = host.querySelector("#mkBody");
    function render(items){
      list.innerHTML = items.map(it=>`
        <div class="card place-card" data-title="${it.title}" data-lat="${it.lat}" data-lng="${it.lng}" style="padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:14px">
          <div class="card-title" style="font-weight:700">${it.title}</div>
          <div style="opacity:.7;font-size:12px">${it.type.toUpperCase()} ${it.open?"• Open":"• Closed"} ${it.price===0?"• Free":""}</div>
          <p style="margin-top:6px">${it.desc}</p>
          <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-id="${it.id}" data-action="view">View</button><button class="btn" data-id="${it.id}" data-action="share">Share</button></div>
        </div>`).join("");
    }
    function applyFilters(){
      const q = (document.getElementById("mkSearch").value||"").toLowerCase();
      const chips = [...host.querySelectorAll(".filter-chip.on")].map(x=>x.dataset.f);
      const now = new Date();
      const res = data.filter(it=> it.title.toLowerCase().includes(q))
        .filter(it=> !chips.includes("open") || it.open)
        .filter(it=> !chips.includes("free") || it.price===0);
      render(res);
    }
    host.addEventListener("click", (e)=>{
      const chip = e.target.closest(".filter-chip"); if(chip){ chip.classList.toggle("on"); localStorage.setItem("market.filter."+chip.dataset.f, chip.classList.contains("on")?"1":"0"); applyFilters(); }
      const b = e.target.closest("button.btn");
      if(b && b.dataset.action==="view"){
        const it = data.find(x=> x.id===b.dataset.id);
        mTitle.textContent = it.title;
        mBody.textContent = it.desc;
        modal.showModal();
        host.querySelector("#mkDirection").onclick = ()=> window.open(`https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`,"_blank");
        host.querySelector("#mkClose").onclick = ()=> modal.close();
      }
      if(b && b.dataset.action==="share"){
        const it = data.find(x=> x.id===b.dataset.id);
        sharePayload({ title: it.title, text: it.desc, url: location.href.split('#')[0] });
      }
    });
    host.querySelector("#mkSearch").addEventListener("input", applyFilters);
    // restore chip state
    host.querySelectorAll(".filter-chip").forEach(ch=> ch.classList.toggle("on", localStorage.getItem("market.filter."+ch.dataset.f)==="1"));
    applyFilters();
  })();

  // ---------- AI Auto Check-In & Smart Filter Toggles ----------
  (function(){
    async function autoCheckIn(){
      if(!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const rec = { id:"chk_"+Date.now(), ts:new Date().toISOString(), lat:pos.coords.latitude, lng:pos.coords.longitude };
        await DB_PRO.put("checkins", rec);
        document.dispatchEvent(new CustomEvent("checkin:new",{detail:rec}));
      }, ()=>{}, { enableHighAccuracy:false, maximumAge:60000, timeout:8000 });
    }
    // Run on load and every 3 hours
    autoCheckIn(); setInterval(autoCheckIn, 3*60*60*1000);

    // Smart filter: if time is evening, auto-enable "Open now" in marketplace
    const hour = new Date().getHours();
    if(hour>=18 || hour<=7){ localStorage.setItem("market.filter.open","1"); }
  })();

  // ---------- Performance tweaks ----------
  (function(){
    // Defer heavy images
    document.querySelectorAll("img[data-src]").forEach(img=>{
      const io = new IntersectionObserver((es)=> es.forEach(e=>{ if(e.isIntersecting){ img.src=img.dataset.src; io.disconnect(); }}));
      io.observe(img);
    });
  })();

})(); // end IIFE

/* === LocalAI Super-Core (v16) — all inline, offline, private === */
(function(){
  if(window.LocalAI){ return; } // avoid double-inject
  const log = (...a)=>console.debug("[LocalAI]", ...a);

  // ---------- Storage Layer (IndexedDB with localStorage fallback) ----------
  const AIMemory = {
    db: null,
    name: "LocalLifeOS_AI",
    async init(){
      try{
        AIMemory.db = await new Promise((resolve, reject)=>{
          const req = indexedDB.open(AIMemory.name, 1);
          req.onupgradeneeded = ()=>{
            const db = req.result;
            ["chats","tasks","places","links","moods","automations"].forEach(store=>{
              if(!db.objectStoreNames.contains(store)){
                db.createObjectStore(store, {keyPath:"id", autoIncrement:true});
              }
            });
          };
          req.onsuccess = ()=> resolve(req.result);
          req.onerror = ()=> reject(req.error);
        });
        log("IndexedDB ready");
      } catch(e){
        console.warn("IndexedDB unavailable, falling back to localStorage", e);
        AIMemory.db = null;
      }
    },
    async put(store, value){
      if(!AIMemory.db){
        const key = `mem:${store}`;
        const arr = JSON.parse(localStorage.getItem(key)||"[]");
        value.id = value.id || (arr.length? (arr[arr.length-1].id+1):1);
        arr.push(value); localStorage.setItem(key, JSON.stringify(arr)); return value.id;
      }
      return await new Promise((res, rej)=>{
        const tx = AIMemory.db.transaction(store, "readwrite");
        tx.objectStore(store).add(value).onsuccess = (e)=> res(e.target.result);
        tx.onerror = ()=> rej(tx.error);
      });
    },
    async all(store){
      if(!AIMemory.db){
        return JSON.parse(localStorage.getItem(`mem:${store}`)||"[]");
      }
      return await new Promise((res, rej)=>{
        const tx = AIMemory.db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = ()=> res(req.result||[]);
        req.onerror = ()=> rej(req.error);
      });
    },
    async del(store, id){
      if(!AIMemory.db){
        const key = `mem:${store}`;
        const arr = JSON.parse(localStorage.getItem(key)||"[]").filter(x=> x.id!==id);
        localStorage.setItem(key, JSON.stringify(arr)); return;
      }
      return await new Promise((res, rej)=>{
        const tx = AIMemory.db.transaction(store, "readwrite");
        tx.objectStore(store).delete(Number(id)); tx.oncomplete=()=>res();
        tx.onerror = ()=> rej(tx.error);
      });
    },
    async summary(){
      // light-weight, local summary for dashboard & EI
      const [tasks, moods] = await Promise.all([this.all("tasks"), this.all("moods")]);
      const pending = tasks.filter(t=> !t.done).slice(-10);
      const lastMood = moods.slice(-1)[0];
      // compute simple mood trend (last 5)
      const moodMap = {happy:2, calm:1, neutral:0, tired:-1, stressed:-2, sad:-2, angry:-2};
      const trendArr = moods.slice(-5).map(m=> moodMap[m.mood]||0);
      const trend = trendArr.reduce((a,b)=>a+b,0);
      return { pending, lastMood, trend };
    }
  };

  // ---------- Emotion: fast lexicon classifier (offline) ----------
  const AIEmotion = (function(){
    const lex = {
      stressed:["overwhelmed","stressed","anxious","worried","panic","deadline","tired","exhausted","burnout","pressure"],
      sad:["sad","down","upset","lonely","depressed","cry","heartbroken","regret"],
      angry:["angry","furious","annoyed","mad","irritated","frustrated"],
      happy:["happy","great","awesome","good","excited","grateful","love"],
      calm:["calm","relaxed","chill","peaceful","ok","fine"]
    };
    function score(text){
      text = (text||"").toLowerCase();
      const hit = (arr)=> arr.reduce((n,w)=> n + (text.includes(w)?1:0),0);
      const s = {
        stressed: hit(lex.stressed),
        sad: hit(lex.sad),
        angry: hit(lex.angry),
        happy: hit(lex.happy),
        calm: hit(lex.calm)
      };
      let label="neutral", max=0;
      Object.entries(s).forEach(([k,v])=>{ if(v>max){ max=v; label=k; } });
      if(max===0) label="neutral";
      return label;
    }
    return { score };
  })();

  // ---------- Suggestions: rank next actions (offline heuristics) ----------
  const AISuggestions = {
    async nextActions(){
      const {pending, lastMood} = await AIMemory.summary();
      // Score tasks by due date, category, and mood
      const now = Date.now();
      function dueScore(t){
        const d = t.due ? new Date(t.due).getTime() : NaN;
        if(!isFinite(d)) return 1;
        const hrs = (d-now)/36e5;
        if(hrs < -1) return 5; // overdue
        if(hrs < 2) return 4;  // urgent soon
        if(hrs < 24) return 3;
        return 2;
      }
      function catBonus(t){
        const map = {work:2, health:2, errands:1, learning:1, personal:1, general:0};
        return map[t.category||"general"]||0;
      }
      function moodBonus(t){
        const lm = (lastMood && lastMood.mood)||"neutral";
        if(lm==="stressed"||lm==="tired") return (t.category==="health"||/break|walk|breathe/i.test(t.title))?2:-1;
        if(lm==="happy"||lm==="calm") return (t.category==="work")?1:0;
        return 0;
      }
      const ranked = pending
        .map(t=> ({t, score: dueScore(t)+catBonus(t)+moodBonus(t)}))
        .sort((a,b)=> b.score - a.score)
        .slice(0,3)
        .map(x=> ({
          title: x.t.title,
          reason: `Score ${x.score} — ${x.t.due?`due ${new Date(x.t.due).toLocaleString()}`:"no due date"}; ${x.t.category||"general"}`,
          why: "Based on your recent tasks, due times, and mood.",
          data: x.t
        }));
      return ranked;
    },
    async explore(){
      // Lightweight personalized prompts
      const moods = await AIMemory.all("moods");
      const last = moods.slice(-1)[0]?.mood || "neutral";
      const base = [
        {text:"Try a 15‑min walk near you", why:"You logged stress recently; movement helps focus."},
        {text:"Discover a new café in Ezulwini", why:"Exploration boosts mood and local knowledge."},
        {text:"Plan a 30‑min learning sprint", why:"Short, focused sprints are easier to start."},
      ];
      if(last==="stressed") return [base[0], base[2]];
      if(last==="happy"||last==="calm") return [base[1], base[2]];
      return base.slice(0,2);
    }
  };

  // ---------- Automations: time / (optional) place triggers ----------
  const AIAutomation = {
    key:"ai.automations",
    get(){ return JSON.parse(localStorage.getItem(this.key)||"[]"); },
    set(v){ localStorage.setItem(this.key, JSON.stringify(v)); },
    toggle(id,on){
      const list = this.get(); const i = list.findIndex(a=>a.id===id);
      if(i>-1){ list[i].enabled = on; this.set(list); this.renderToggles(); }
    },
    add(a){
      const list = this.get();
      if(!a.id) a.id = `auto_${Date.now()}`;
      list.push(a); this.set(list); this.renderToggles();
    },
    remove(id){ this.set(this.get().filter(a=>a.id!==id)); this.renderToggles(); },
    start(){
      // interval tick every minute
      setInterval(()=> this.tick(), 60*1000);
      this.renderToggles();
    },
    async tick(){
      const now = new Date();
      const list = this.get().filter(a=> a.enabled!==false);
      for(const a of list){
        // Time trigger
        if(a.type==="time"){
          const [h,m] = a.at.split(":").map(Number);
          if(now.getHours()===h && now.getMinutes()===m){
            this.execute(a);
          }
        }
        // Simple place trigger (uses stored "lastPlace" key set elsewhere)
        if(a.type==="place"){
          const here = localStorage.getItem("geo.lastPlace");
          if(here && a.place && here===a.place){
            this.execute(a);
          }
        }
      }
    },
    async execute(a){
      // Side-effect: push proactive alert
      const msg = a.message || (a.type==="time" ? "It's time to begin your routine." : `You're at ${a.place}. Here's your reminder.`);
      LocalAI.pushAlert(msg, "Why: automation you enabled.");
      if(a.action==="prep_morning"){
        const sum = await AIMemory.summary();
        const top = (await AISuggestions.nextActions()).map(x=>`• ${x.title}`).join("\\n");
        LocalAI.pushAlert("Morning ready: top tasks queued.", "Why: 8AM routine you enabled.");
        if(top){ LocalAI.addChat("other", "I prepped your morning. Top tasks:\\n"+top); }
      }
    },
    renderToggles(){
      const host = document.getElementById("pinnedWidgetsContainer");
      if(!host) return;
      const list = this.get();
      host.querySelectorAll(".auto-toggle").forEach(n=> n.remove());
      const make = (a)=>{
        const div = document.createElement("div");
        div.className = "card auto-toggle";
        div.style.padding="10px";
        div.innerHTML = `
          <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span>${a.title}</span>
            <label class="toggle-switch">
              <input type="checkbox" ${a.enabled!==false?"checked":""} aria-label="Toggle ${a.title}">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="card-subtitle" style="margin-top:6px">${a.desc||""}</div>
        `;
        div.querySelector("input").addEventListener("change", (e)=> AIAutomation.toggle(a.id, e.target.checked));
        host.appendChild(div);
      };
      list.forEach(make);
      // Ensure defaults exist
      if(!list.length){
        this.add({id:"auto_morning", type:"time", at:"08:00", title:"Morning Prep (8AM)", desc:"At 08:00, prep your day overview.", action:"prep_morning", enabled:true});
        this.add({id:"auto_place_task", type:"place", place:"work", title:"At Work → Focus", desc:"When you arrive at work, nudge your top focus task.", action:"nudge_task", enabled:false});
      }
    }
  };

  // ---------- UI Bridge ----------
  const LocalAI = {
    async init(){
      await AIMemory.init();
      this.hookChat();
      this.refreshDashboard();
      this.refreshPlannerSuggestions();
      this.refreshExploreSuggestions();
      AIAutomation.start();
    },
    async refreshDashboard(){
      const el = document.getElementById("aiDashboardInsight");
      if(!el) return;
      const actions = await AISuggestions.nextActions();
      const moodSum = await AIMemory.summary();
      el.innerHTML = actions.map(a=>`
        <div class="setting-item ai-sparkle">
          <div>
            <div style="font-weight:600">${a.title}</div>
            <div class="card-subtitle">${a.reason}</div>
            <span class="why">Why am I seeing this? ${a.why}</span>
          </div>
          <button class="button button-secondary" aria-label="Add to today">Do</button>
        </div>
      `).join("") + (moodSum.lastMood? `<div class="mood-mini">Last mood: <strong>${moodSum.lastMood.mood}</strong> • trend ${moodSum.trend>=0? "↑":"↓"}</div>`:"");
    },
    async refreshPlannerSuggestions(){
      document.querySelectorAll(".ai-planner-suggestion").forEach(async (node)=>{
        const items = await AISuggestions.nextActions();
        node.innerHTML = items.map(a=> `<div class="chip" title="${a.reason}">${a.title}</div>`).join("");
      });
    },
    async refreshExploreSuggestions(){
      const node = document.getElementById("aiExploreSuggestion");
      if(!node) return;
      const sug = await AISuggestions.explore();
      node.innerHTML = sug.map(s=> `<div class="setting-item ai-sparkle"><div><div style="font-weight:600">${s.text}</div><span class="why">Why am I seeing this? ${s.why}</span></div></div>`).join("");
    },
    pushAlert(text, why){
      const n = document.getElementById("dynamicIslandAlert");
      if(!n) return;
      n.innerHTML = `<div>${text}<span class="why">${why||""}</span></div>`;
      n.classList.add("active"); setTimeout(()=> n.classList.remove("active"), 4500);
    },
    addChat(sender, text){ try{ if(typeof addMessageToAIChat==="function") addMessageToAIChat(sender, text); }catch(e){} },
    // Bottom sheet memory browser
    async renderMemoryPanel(){
      const bs = document.getElementById("aiBottomSheet");
      if(!bs) return;
      const mountId = "aiMemPanel";
      let mount = bs.querySelector("#"+mountId);
      if(!mount){
        const area = bs.querySelector(".ai-chat-area") || bs;
        mount = document.createElement("div");
        mount.id = mountId;
        mount.className = "memory-panel";
        area.appendChild(mount);
      }
      const [chats,tasks,moods] = await Promise.all([AIMemory.all("chats"), AIMemory.all("tasks"), AIMemory.all("moods")]);
      const chips = `<div class="memory-chips"><span class="chip">Chats ${chats.length}</span><span class="chip">Tasks ${tasks.length}</span><span class="chip">Moods ${moods.length}</span></div>`;
      function itemRow(type, it){
        const title = (type==="chats"? (it.text||"message"): it.title||it.mood||"item");
        const sub = (type==="chats"? new Date(it.ts).toLocaleString() : (it.due?("due "+new Date(it.due).toLocaleDateString()):""));
        const why = type==="tasks" ? "Saved when you created a task." : type==="moods" ? "Your mood logs help tailor replies." : "From recent conversation.";
        return `<div class="memory-item">
          <div><div style="font-weight:600">${title}</div><div class="card-subtitle">${sub||""}</div><span class="why">Why am I seeing this? ${why}</span></div>
          <button data-type="${type}" data-id="${it.id}" class="button danger">Forget</button>
        </div>`;
      }
      mount.innerHTML = `<h4>Memory</h4>${chips}<div class="memory-list">${[
        ...tasks.slice(-5).map(x=>itemRow("tasks", x)),
        ...moods.slice(-5).map(x=>itemRow("moods", x)),
        ...chats.slice(-5).map(x=>itemRow("chats", x))
      ].join("")}</div>
      <div class="mem-controls">
        <button class="button button-secondary" id="memExport">Export</button>
        <button class="button danger" id="memWipe">Erase All</button>
      </div>`;
      mount.querySelectorAll("button[data-id]").forEach(btn=> btn.addEventListener("click", async (e)=>{
        const t = e.currentTarget.dataset.type; const id = Number(e.currentTarget.dataset.id);
        await AIMemory.del(t, id); LocalAI.renderMemoryPanel();
      }));
      const wipe = mount.querySelector("#memWipe");
      wipe && wipe.addEventListener("click", async ()=>{
        ["chats","tasks","places","links","moods"].forEach(k=> localStorage.removeItem("mem:"+k));
        const db = AIMemory.db;
        if(db){
          await Promise.all(["chats","tasks","places","links","moods"].map(store=> new Promise((res)=>{
            const tx = db.transaction(store, "readwrite");
            const req = tx.objectStore(store).clear(); tx.oncomplete=()=>res(); tx.onerror=()=>res();
          })));
        }
        LocalAI.renderMemoryPanel();
      });
      const exp = mount.querySelector("#memExport");
      exp && exp.addEventListener("click", async ()=>{
        const data = {
          chats: await AIMemory.all("chats"),
          tasks: await AIMemory.all("tasks"),
          moods: await AIMemory.all("moods")
        };
        const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), {href:url, download:"locallife-memory.json"});
        a.click(); URL.revokeObjectURL(url);
      });
    },
    hookChat(){
      // capture chat sends + sentiment response style
      const input = document.getElementById("aiChatInputText") || document.querySelector("#aiBottomSheet textarea, #aiBottomSheet input[type='text']");
      const sendBtn = document.querySelector(".ai-send-button, #aiBottomSheet .button.send");
      const area = document.querySelector("#aiChatArea, .ai-chat-area");
      if(!area) return;
      area.classList.add("ai-chat-area");
      // monkey-patch global send if present
      const oldSend = window.sendAIChatMessage;
      window.sendAIChatMessage = async function(){
        const val = (input && input.value || "").trim();
        if(val){
          await AIMemory.put("chats", {ts:Date.now(), text: val, role:"user"});
          const mood = AIEmotion.score(val);
          await AIMemory.put("moods", {ts:Date.now(), mood, source:"chat"});
          const reply = LocalAI.generateReply(val, mood);
          LocalAI.addChat("other", reply);
          await AIMemory.put("chats", {ts:Date.now(), text: reply, role:"assistant", mood});
          LocalAI.renderMemoryPanel();
          LocalAI.refreshDashboard();
        }
        return oldSend ? oldSend.apply(this, arguments) : undefined;
      };
      // also render immediately
      LocalAI.renderMemoryPanel();
    },
    generateReply(text, mood){
      // solution-focused vs warm tone
      const base = {
        stressed: "I hear the pressure. Here's a quick next step to make it lighter: ",
        sad: "I'm with you. A gentle step forward: ",
        angry: "Noted. Let's channel that energy productively: ",
        happy: "Love the vibe! Here's something to build on: ",
        calm: "Nice and steady. Consider: ",
        neutral: "Got it. A practical next step: "
      }[mood||"neutral"];
      // turn into an actionable suggestion using heuristics
      const lower = text.toLowerCase();
      let action = "write down the smallest 2‑minute action and start it.";
      if(/meet|call|email|reply|follow up/.test(lower)) action = "draft a 2‑line message now and send it.";
      if(/workout|gym|run|walk|exercise|stretch/.test(lower)) action = "do a 5‑minute stretch or brisk walk to get momentum.";
      if(/study|learn|read|course|assignment/.test(lower)) action = "set a 20‑minute timer and focus on just the first section.";
      if(/errand|buy|shop|grocer|pick up/.test(lower)) action = "list the top 3 items and schedule a quick stop.";
      return `${base}${action}`;
    }
  };

  // Make modules globally reachable
  window.LocalAI = LocalAI;
  window.AIMemory = AIMemory;
  window.AISuggestions = AISuggestions;
  window.AIEmotion = AIEmotion;
  window.AIAutomation = AIAutomation;

  // Boot when DOM ready
  document.addEventListener("DOMContentLoaded", ()=>{
    LocalAI.init().then(()=> log("LocalAI ready"));
    // Proactive nudges: leave now / habit time
    setInterval(async ()=>{
      const hr = new Date().getHours();
      if(hr===17){ LocalAI.pushAlert("Wrap-up reminder: capture loose ends for tomorrow.", "Why: evening routine based on typical work hours."); }
      const sum = await AIMemory.summary();
      if(sum.lastMood && sum.lastMood.mood==="stressed"){
        LocalAI.pushAlert("Take 3 deep breaths. Want a 2‑min reset?", "Why: you sounded stressed recently.");
      }
    }, 5*60*1000);
  });
})();

