// ===== LocalLife OS 15 — Pro Aligned Enhancements =====
(function(){
  const LS = localStorage;
  const toast = (m)=>{ let x=document.getElementById("dynamicIslandAlert"); if(!x){x=document.createElement("div");x.id="dynamicIslandAlert";x.innerHTML='<i class="icon fa fa-circle-info"></i><div class="text"></div>';document.body.appendChild(x);} x.querySelector(".text").textContent=m; x.classList.add("show"); setTimeout(()=>x.classList.remove("show"),2200); };

  // Viewport-safe context menu
  function showCtxMenu(items, x, y){
    document.querySelectorAll(".ctx-menu").forEach(e=>e.remove());
    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    items.forEach(it=>{
      const b = document.createElement("button");
      b.innerHTML = (it.icon? `<i class="${it.icon}"></i> `:"") + it.label;
      if(it.className) b.classList.add(it.className);
      b.onclick = ()=>{ it.onClick?.(); menu.remove(); };
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const rect = { w: menu.offsetWidth, h: menu.offsetHeight };
    const maxX = window.innerWidth - rect.w - 8;
    const maxY = window.innerHeight - rect.h - 8;
    menu.style.left = Math.max(8, Math.min(x, maxX)) + "px";
    menu.style.top  = Math.max(8, Math.min(y, maxY)) + "px";
    setTimeout(()=>{
      const handler = (e)=>{ if(!menu.contains(e.target)) { menu.remove(); document.removeEventListener("pointerdown", handler); }};
      document.addEventListener("pointerdown", handler);
    });
  }

  // IndexedDB helpers (augment existing DB if present)
  const DB_NAME = "locallife-db";
  const DBX_NAME = "locallife-pro-v1";
  function openDB(name, upgrade){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = (e)=> upgrade?.(req.result);
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }
  const DB = {
    async put(store, item){
      const db = await openDB(DB_NAME, (db)=>{
        ["focusSessions","meditations","goals","nutritionLogs","posts","channels"].forEach(s=>{
          if(!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:"id"});
        });
      });
      return new Promise((res, rej)=>{
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(item);
        tx.oncomplete = ()=> res(item);
        tx.onerror = ()=> rej(tx.error);
      });
    },
    async getAll(store){
      const db = await openDB(DB_NAME, (db)=>{
        ["focusSessions","meditations","goals","nutritionLogs","posts","channels"].forEach(s=>{
          if(!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:"id"});
        });
      });
      return new Promise((res, rej)=>{
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = ()=> res(req.result||[]);
        req.onerror = ()=> rej(req.error);
      });
    },
    async del(store, id){
      const db = await openDB(DB_NAME);
      return new Promise((res, rej)=>{
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(id);
        tx.oncomplete = ()=> res(true);
        tx.onerror = ()=> rej(tx.error);
      });
    }
  };
  const DBX = {
    async put(store, item){
      const db = await openDB(DBX_NAME, (db)=>{
        ["claims","services","serviceRequests","civicActs","aiMemory"].forEach(s=>{
          if(!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:"id"});
        });
      });
      return new Promise((res, rej)=>{
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(item);
        tx.oncomplete = ()=> res(item);
        tx.onerror = ()=> rej(tx.error);
      });
    },
    async getAll(store){
      const db = await openDB(DBX_NAME, (db)=>{
        ["claims","services","serviceRequests","civicActs","aiMemory"].forEach(s=>{
          if(!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:"id"});
        });
      });
      return new Promise((res, rej)=>{
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = ()=> res(req.result||[]);
        req.onerror = ()=> rej(req.error);
      });
    }
  };
  window.DB_PRO = DB; window.DBX_PRO = DBX;

  const nowISO = ()=> new Date().toISOString();

  // ---------- 1) Nutrition Tracker (replace Log Meal flow) ----------
  (function nutrition(){
    const card = document.getElementById("mealLogCard"); if(!card) return;
    let modal = document.getElementById("nutritionModal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "nutritionModal";
      modal.className = "modal";
      modal.innerHTML = `<div class="modal-content">
        <h3 class="modal-title">Log Meal</h3>
        <div class="input-group">
          <input class="input-field" id="foodName" list="foodList" placeholder="Food (e.g., apple)">
          <datalist id="foodList">
            <option value="apple"></option><option value="banana"></option><option value="rice (white)"></option><option value="chicken breast"></option><option value="egg"></option><option value="spinach"></option><option value="salmon"></option><option value="avocado"></option>
          </datalist>
          <input class="input-field" id="foodQty" type="number" placeholder="Quantity" value="1" min="0" step="0.1">
          <select class="input-field" id="foodUnit">
            <option>serving</option><option>g</option><option>ml</option><option>piece</option>
          </select>
        </div>
        <div class="input-group">
          <input class="input-field" id="foodCalories" type="number" placeholder="Calories (kcal)">
          <input class="input-field" id="foodProtein" type="number" placeholder="Protein (g)">
          <input class="input-field" id="foodCarbs" type="number" placeholder="Carbs (g)">
          <input class="input-field" id="foodFat" type="number" placeholder="Fat (g)">
        </div>
        <div class="focus-controls">
          <button class="button" id="saveMeal">Save</button>
          <button class="button-secondary" id="closeMeal">Close</button>
        </div>
        <p class="card-subtitle">Tip: choose a food to auto-fill macros; adjust as needed.</p>
      </div>`;
      document.body.appendChild(modal);
    }
    const foodDB = {
      "apple": { kcal: 95, protein:0.5, carbs:25, fat:0.3, unit:"piece" },
      "banana": { kcal: 105, protein:1.3, carbs:27, fat:0.4, unit:"piece" },
      "rice (white)": { kcal: 130, protein:2.4, carbs:28, fat:0.3, unit:"serving" },
      "chicken breast": { kcal: 165, protein:31, carbs:0, fat:3.6, unit:"serving" },
      "egg": { kcal: 78, protein:6, carbs:0.6, fat:5, unit:"piece" },
      "spinach": { kcal: 23, protein:2.9, carbs:3.6, fat:0.4, unit:"serving" },
      "salmon": { kcal: 208, protein:20, carbs:0, fat:13, unit:"serving" },
      "avocado": { kcal: 240, protein:3, carbs:12.8, fat:22, unit:"piece" }
    };
    function openModal(){ modal.style.display="flex"; }
    function closeModal(){ modal.style.display="none"; }

    // hook existing "Log Meal" button in card
    const logBtn = card.querySelector("button, .button");
    if(logBtn){
      logBtn.addEventListener("click", openModal);
    }
    modal.querySelector("#closeMeal").onclick = closeModal;

    const foodName = modal.querySelector("#foodName");
    function autoFill(){
      const f = foodDB[foodName.value?.toLowerCase()]; if(!f) return;
      modal.querySelector("#foodCalories").value = f.kcal;
      modal.querySelector("#foodProtein").value = f.protein;
      modal.querySelector("#foodCarbs").value = f.carbs;
      modal.querySelector("#foodFat").value = f.fat;
      modal.querySelector("#foodUnit").value = f.unit;
    }
    foodName.addEventListener("change", autoFill);

    modal.querySelector("#saveMeal").onclick = async ()=>{
      const item = {
        id: crypto.randomUUID(),
        name: foodName.value.trim(),
        qty: parseFloat(modal.querySelector("#foodQty").value||"1"),
        unit: modal.querySelector("#foodUnit").value,
        kcal: parseFloat(modal.querySelector("#foodCalories").value||"0"),
        protein: parseFloat(modal.querySelector("#foodProtein").value||"0"),
        carbs: parseFloat(modal.querySelector("#foodCarbs").value||"0"),
        fat: parseFloat(modal.querySelector("#foodFat").value||"0"),
        at: new Date().toISOString()
      };
      await DB_PRO.put("nutritionLogs", item);
      closeModal();
      toast("Meal logged.");
      renderToday();
    };

    // inline rendering (inside mealLogCard) for today's totals
    const totalsEl = document.createElement("div");
    totalsEl.className = "card-subtitle";
    totalsEl.id = "nutritionTotals";
    card.appendChild(totalsEl);

    async function renderToday(){
      const logs = (await DB_PRO.getAll("nutritionLogs")).filter(x=> (new Date(x.at)).toDateString() === (new Date()).toDateString());
      const sums = logs.reduce((a,x)=>({ kcal:a.kcal+x.kcal, protein:a.protein+x.protein, carbs:a.carbs+x.carbs, fat:a.fat+x.fat }), {kcal:0, protein:0, carbs:0, fat:0});
      totalsEl.textContent = `Today • ${Math.round(sums.kcal)} kcal • P ${Math.round(sums.protein)}g • C ${Math.round(sums.carbs)}g • F ${Math.round(sums.fat)}g`;
    }
    renderToday();
  })();

  // ---------- 2) Mindful Focus Session (enhance existing modal) ----------
  (function focus(){
    const modal = document.getElementById("focusModeModal"); if(!modal) return;
    const content = modal.querySelector(".modal-content"); if(!content) return;
    content.innerHTML = `
      <h3 class="modal-title">Mindful Focus Session</h3>
      <div class="input-group">
        <label>Duration</label>
        <select class="input-field" id="focusDuration">
          <option value="15">15 min</option>
          <option value="25">25 min (Pomodoro)</option>
          <option value="45" selected>45 min</option>
          <option value="60">60 min</option>
        </select>
      </div>
      <div class="input-group">
        <label>Background sound</label>
        <select class="input-field" id="focusSound">
          <option value="none">None</option>
          <option value="rain">Rain</option>
          <option value="waves">Waves</option>
          <option value="brown">Brown Noise</option>
        </select>
      </div>
      <div class="focus-controls">
        <button class="button" id="startFocus">Start</button>
        <button class="button-secondary" id="endFocus">End</button>
      </div>
      <p class="card-subtitle" id="focusStatus">Ready.</p>
      <div id="focusStats" class="card-subtitle"></div>
      <div class="focus-controls"><button class="button-secondary" id="focusHistoryBtn">History</button></div>
    `;
    let timer=null, endAt=null, sound=null;
    function playSound(kind){
      if(sound){ sound.pause(); sound=null; }
      if(kind==="none") return;
      // Simple generated noise via WebAudio for waves/brown, fileless; rain uses oscillator too
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = kind==="waves" ? 220 : kind==="rain" ? 440 : 110;
      g.gain.value = 0.03;
      o.connect(g).connect(ctx.destination);
      o.start(); sound = { pause:()=>{ try{o.stop();ctx.close();}catch(e){} } };
    }
    function renderTick(){
      if(!endAt){ document.getElementById("focusStatus").textContent = "Ready."; return; }
      const remain = Math.max(0, Math.round((endAt - Date.now())/1000));
      const mm = String(Math.floor(remain/60)).padStart(2,'0');
      const ss = String(remain%60).padStart(2,'0');
      document.getElementById("focusStatus").textContent = `Focusing… ${mm}:${ss}`;
      if(remain<=0){ end(); }
    }
    function start(){
      const dur = parseInt(document.getElementById("focusDuration").value)*60;
      const snd = document.getElementById("focusSound").value;
      endAt = Date.now()+dur*1000;
      playSound(snd);
      timer = setInterval(renderTick, 250);
      renderTick();
    }
    async function end(){
      clearInterval(timer); timer=null;
      if(sound) sound.pause();
      const dur = Math.max(0, Math.round((endAt - (Date.now()))/1000)*-1);
      endAt = null;
      document.getElementById("focusStatus").textContent = "Session ended.";
      const rec = { id: crypto.randomUUID(), startedAt: new Date(Date.now()-dur*1000).toISOString(), seconds: dur, sound: document.getElementById("focusSound").value };
      await DB_PRO.put("focusSessions", rec);
      toast("Focus saved.");
    }
    content.querySelector("#startFocus").onclick = start;
    content.querySelector("#endFocus").onclick = end;
    content.querySelector("#focusHistoryBtn").onclick = async ()=>{
      const items = await DB_PRO.getAll("focusSessions");
      const sheet = document.createElement("div"); sheet.className="modal-sheet";
      sheet.innerHTML = `<div class="sheet">
        <div class="card-title">Focus History</div>
        <table class="table-like">
          <tr><th>When</th><th>Duration</th><th>Sound</th></tr>
          ${items.map(i=>`<tr><td>${new Date(i.startedAt).toLocaleString()}</td><td>${Math.round(i.seconds/60)} min</td><td>${i.sound}</td></tr>`).join("")}
        </table></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click", (e)=>{ if(e.target===sheet) sheet.remove(); });
    };
  })();

  // ---------- 3) Mindfulness Exercises (guided, feedback) ----------
  (function mindfulness(){
    const modal = document.getElementById("guidedExerciseModal"); if(!modal) return;
    const content = modal.querySelector(".modal-content"); if(!content) return;
    content.innerHTML = `
      <h3 class="modal-title">Mindfulness Exercises</h3>
      <div class="input-group">
        <label>Mode</label>
        <select class="input-field" id="mindMode">
          <option value="relax">Relax</option>
          <option value="focus">Focus</option>
          <option value="calm">Calm</option>
        </select>
      </div>
      <div class="input-group">
        <label>Length</label>
        <select class="input-field" id="mindLen">
          <option value="60">1 Min</option>
          <option value="180">3 Min</option>
          <option value="300">5 Min</option>
          <option value="600">10 Min</option>
        </select>
      </div>
      <div class="focus-controls">
        <button class="button" id="mindStart">Start</button>
        <button class="button-secondary" id="mindStop">End</button>
      </div>
      <p class="card-subtitle" id="mindStatus">Ready.</p>
    `;
    let timer=null, endAt=null;
    function tick(){
      if(!endAt){ content.querySelector("#mindStatus").textContent="Ready."; return; }
      const remain = Math.max(0, Math.round((endAt - Date.now())/1000));
      content.querySelector("#mindStatus").textContent = `In session… ${remain}s`;
      if(remain<=0){ stop(); }
    }
    async function stop(){
      clearInterval(timer); timer=null;
      if(!endAt) return;
      const dur = Math.round((endAt - Date.now())/1000)*-1;
      endAt=null;
      const planId = `mind-${Date.now()}`;
      const item = { id: planId, mode: document.getElementById("mindMode").value, seconds: dur, completedAt: new Date().toISOString() };
      await DB_PRO.put("meditations", item);
      // Ask for feedback
      const sheet = document.createElement("div");
      sheet.className = "modal-sheet";
      sheet.innerHTML = `<div class="sheet">
        <div class="card-title">How was your session?</div>
        <div class="focus-controls">
          <button class="button" data-rate="1">⭐</button>
          <button class="button" data-rate="2">⭐⭐</button>
          <button class="button" data-rate="3">⭐⭐⭐</button>
          <button class="button" data-rate="4">⭐⭐⭐⭐</button>
          <button class="button" data-rate="5">⭐⭐⭐⭐⭐</button>
        </div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click", (e)=>{ if(e.target===sheet) sheet.remove(); });
      sheet.querySelectorAll("[data-rate]").forEach(b=> b.addEventListener("click", async ()=>{
        const rating = parseInt(b.getAttribute("data-rate"));
        await DBX_PRO.put("aiMemory", { id: crypto.randomUUID(), type:"mindFeedback", rating, at: new Date().toISOString() });
        toast("Thanks for the feedback!");
        sheet.remove();
      }));
    }
    content.querySelector("#mindStart").onclick = ()=>{
      const len = parseInt(document.getElementById("mindLen").value);
      endAt = Date.now()+len*1000;
      timer = setInterval(tick, 500); tick();
    };
    content.querySelector("#mindStop").onclick = stop;
  })();

  // ---------- 4) Service Marketplace (into #servicesMarketContent) ----------
  (function marketplace(){
    const host = document.getElementById("servicesMarketContent"); if(!host) return;
    host.innerHTML = `
      <div class="input-group">
        <input class="input-field" id="svcSearch" placeholder="Search services">
        <select class="input-field" id="svcCategory">
          <option value="">All</option><option>Home Repair</option><option>Wellness</option><option>Education</option><option>Transport</option><option>Tech</option>
        </select>
        <select class="input-field" id="svcSort">
          <option value="rating">Sort by rating</option>
          <option value="price">Sort by price</option>
          <option value="new">Newest</option>
        </select>
      </div>
      <div id="svcList" class="task-list"></div>
    `;
    const list = host.querySelector("#svcList");
    const search = host.querySelector("#svcSearch");
    const cat = host.querySelector("#svcCategory");
    const sort = host.querySelector("#svcSort");
    const seed = [
      { id:"svc1", name:"Thabo M.", title:"Plumber • PipeFix Eswatini", category:"Home Repair", price:250, rating:4.9, jobs:128 },
      { id:"svc2", name:"Lerato K.", title:"Yoga Instructor", category:"Wellness", price:150, rating:4.8, jobs:92 },
      { id:"svc3", name:"Sibongile N.", title:"Maths Tutor", category:"Education", price:120, rating:4.7, jobs:61 },
      { id:"svc4", name:"Musa D.", title:"Ride Service (Town)", category:"Transport", price:50, rating:4.6, jobs:340 },
      { id:"svc5", name:"Nina P.", title:"Phone Repair & Data Transfer", category:"Tech", price:180, rating:4.8, jobs:76 }
    ];
    (async()=>{
      const have = await DBX_PRO.getAll("services");
      if(have.length===0){ for(const s of seed) await DBX_PRO.put("services", s); }
      render();
    })();
    async function render(){
      const items = await DBX_PRO.getAll("services");
      const q = (search.value||"").toLowerCase();
      const filtered = items.filter(s=> (!cat.value || s.category===cat.value) && (s.title.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)));
      const sorted = filtered.sort((a,b)=> sort.value==="price" ? a.price-b.price : sort.value==="new" ? b.jobs-a.jobs : b.rating-a.rating);
      list.innerHTML = sorted.map(s=>`
        <div class="bulletin-card" data-id="${s.id}">
          <div style="display:flex; gap:.6rem; align-items:center;">
            <div class="tag">${s.category}</div>
            <strong style="flex:1">${s.title}</strong>
            <span class="tag"><i class="fa fa-star"></i> ${s.rating}</span>
            <span class="tag">E${s.price}/hr</span>
            <button class="button" data-act="book">Book</button>
          </div>
          <div class="card-subtitle">by ${s.name} • ${s.jobs} jobs</div>
        </div>`).join("");
    }
    ["input","change"].forEach(ev=>{ search.addEventListener(ev,render); cat.addEventListener(ev,render); sort.addEventListener(ev,render); });
    list.addEventListener("click", (e)=>{
      const item = e.target.closest(".bulletin-card"); if(!item) return;
      if(e.target.matches("[data-act='book']")) openBooking(item.dataset.id);
    });
    async function openBooking(id){
      const s = (await DBX_PRO.getAll("services")).find(x=> x.id===id); if(!s) return;
      const sheet = document.createElement("div");
      sheet.className = "modal-sheet";
      sheet.innerHTML = `<div class="sheet">
        <div class="card-title">Book ${s.title}</div>
        <div class="input-group"><input class="input-field" id="bkName" placeholder="Your name"></div>
        <div class="input-group"><input class="input-field" id="bkDate" type="datetime-local"></div>
        <div class="input-group"><textarea class="input-field" id="bkNotes" rows="3" placeholder="Notes"></textarea></div>
        <div class="focus-controls"><button class="button" id="bkConfirm">Confirm</button></div>
      </div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click",(e)=>{ if(e.target===sheet) sheet.remove(); });
      sheet.querySelector("#bkConfirm").onclick = async ()=>{
        const req = { id: crypto.randomUUID(), serviceId:s.id, at: nowISO(), customer: sheet.querySelector("#bkName").value.trim(), when: sheet.querySelector("#bkDate").value, notes: sheet.querySelector("#bkNotes").value.trim(), price: s.price };
        await DBX_PRO.put("serviceRequests", req);
        // Show receipt modal
        showReceipt({ title:s.title, provider:s.name, when:req.when, price:req.price, id:req.id });
        sheet.remove();
        toast("Booking submitted!");
      };
    }
    function showReceipt({title,provider,when,price,id}){
      let m = document.getElementById("receiptModal");
      if(!m){
        m = document.createElement("div"); m.id="receiptModal"; m.className="modal";
        m.innerHTML = `<div class="modal-content">
          <h3 class="modal-title">Receipt</h3>
          <div class="receipt" id="receiptBody"></div>
          <div class="focus-controls"><button class="button-secondary" id="closeReceipt">Close</button></div>
        </div>`;
        document.body.appendChild(m);
        m.querySelector("#closeReceipt").onclick = ()=> m.style.display="none";
      }
      const body = m.querySelector("#receiptBody");
      const dt = new Date().toLocaleString();
      body.innerHTML = `
        <header><div><strong>LocalLife Services</strong><div class="branding">Booking Receipt</div></div><div>${dt}</div></header>
        <table class="items"><tr><th>Service</th><th>Provider</th><th>When</th><th>Total</th></tr>
        <tr><td>${title}</td><td>${provider}</td><td>${when||'-'}</td><td>E${price}</td></tr></table>
        <div class="totals"><div><strong>Grand Total: E${price}</strong></div>
        <div class="branding">Receipt #${id.slice(0,8)}</div></div>`;
      m.style.display="flex";
    }
  })();

  // ---------- 5) Civic Engagement Hub (into #governanceHubContent) ----------
  (function civic(){
    const host = document.getElementById("governanceHubContent"); if(!host) return;
    host.innerHTML = `
      <div class="input-group">
        <input class="input-field" id="civSearch" placeholder="Search actions">
        <select class="input-field" id="civFilter"><option value="">All</option><option value="report">Report</option><option value="petition">Petition</option><option value="volunteer">Volunteer</option><option value="meeting">Town Hall</option></select>
        <button class="button" id="civNew">New</button>
      </div>
      <div id="civList" class="task-list"></div>
    `;
    const list = host.querySelector("#civList");
    const search = host.querySelector("#civSearch");
    const filter = host.querySelector("#civFilter");
    const seed = [
      { id:"c1", type:"report", title:"Report pothole on Ngwane St", when:"ASAP", org:"Public Works", participants:12 },
      { id:"c2", type:"volunteer", title:"Park clean-up (Saturday)", when:"Sat 09:00", org:"Green Mdzimba", participants:34 },
      { id:"c3", type:"petition", title:"Safer crossings near schools", when:"Open", org:"Parent Assoc.", participants:210 },
      { id:"c4", type:"meeting", title:"Town hall: waste management", when:"Aug 28, 18:00", org:"City Council", participants:80 },
    ];
    (async()=>{
      if((await DBX_PRO.getAll("civicActs")).length===0) for(const s of seed) await DBX_PRO.put("civicActs", s);
      render();
    })();
    async function render(){
      const items = await DBX_PRO.getAll("civicActs");
      const q = (search.value||"").toLowerCase();
      const filtered = items.filter(a=> (!filter.value || a.type===filter.value) && a.title.toLowerCase().includes(q));
      list.innerHTML = filtered.map(a=>`
        <div class="bulletin-card" data-id="${a.id}">
          <div style="display:flex; gap:.6rem; align-items:center;">
            <div class="tag">${a.type}</div>
            <strong style="flex:1">${a.title}</strong>
            <span class="tag"><i class="fa fa-users"></i> ${a.participants}</span>
            <button class="button" data-act="open">Open</button>
          </div>
          <div class="card-subtitle">${a.org} • ${a.when}</div>
        </div>`).join("");
    }
    list.addEventListener("click", async (e)=>{
      const card = e.target.closest(".bulletin-card"); if(!card) return;
      const id = card.dataset.id;
      const a = (await DBX_PRO.getAll("civicActs")).find(x=> x.id===id);
      if(!a) return;
      const sheet = document.createElement("div");
      sheet.className = "modal-sheet";
      sheet.innerHTML = `<div class="sheet">
        <div class="card-title">${a.title}</div>
        <p class="card-subtitle">Type: ${a.type} • When: ${a.when} • By: ${a.org}</p>
        <div class="focus-controls"><button class="button" id="join">Join</button><button class="button-secondary" id="share">Share</button></div>
      </div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click",(e)=>{ if(e.target===sheet) sheet.remove(); });
      sheet.querySelector("#join").onclick = async ()=>{ a.participants+=1; await DBX_PRO.put("civicActs", a); toast("Joined!"); sheet.remove(); render(); };
      sheet.querySelector("#share").onclick = ()=>{ navigator.share?.({title:a.title,text:a.title,url:location.href}).catch(()=>{}); toast("Shared"); };
    });
    host.querySelector("#civNew").onclick = ()=>{
      const sheet = document.createElement("div");
      sheet.className="modal-sheet";
      sheet.innerHTML = `<div class="sheet">
        <div class="card-title">Create Action</div>
        <div class="input-group">
          <input class="input-field" id="naTitle" placeholder="Title">
          <select class="input-field" id="naType"><option value="report">Report</option><option value="petition">Petition</option><option value="volunteer">Volunteer</option><option value="meeting">Town Hall</option></select>
          <input class="input-field" id="naWhen" placeholder="When (e.g., Fri 14:00)">
          <input class="input-field" id="naOrg" placeholder="Organizer">
          <button class="button" id="naCreate">Create</button>
        </div>
      </div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click",(e)=>{ if(e.target===sheet) sheet.remove(); });
      sheet.querySelector("#naCreate").onclick = async ()=>{
        const act = { id: crypto.randomUUID(), type: sheet.querySelector("#naType").value, title: sheet.querySelector("#naTitle").value.trim(), when: sheet.querySelector("#naWhen").value.trim(), org: sheet.querySelector("#naOrg").value.trim(), participants:1 };
        await DBX_PRO.put("civicActs", act);
        toast("Created"); sheet.remove(); render();
      };
    };
  })();

  // ---------- 6) Claim This Listing (enhance within placeDetailModal) ----------
  (function claim(){
    const modal = document.getElementById("placeDetailModal"); if(!modal) return;
    const c = modal.querySelector(".modal-content"); if(!c) return;
    // Find "Claim this listing" area and replace with flow
    const textNode = Array.from(c.childNodes).find(n=> n.nodeType===3 && /claim this listing/i.test(n.textContent||""));
    if(textNode){
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <div class="card-subtitle">Verify ownership to manage business info and respond to reviews.</div>
        <div class="input-group">
          <input class="input-field" id="claimBizName" placeholder="Business name">
          <input class="input-field" id="claimEmail" type="email" placeholder="Work email">
          <input class="input-field" id="claimPhone" type="tel" placeholder="Phone (for OTP)">
          <button class="button" id="startClaim">Start Claim</button>
        </div>
        <div class="stepper"><div class="step">1</div><div class="step">2</div><div class="step">3</div></div>
        <div class="card-subtitle">Status: <span id="claimStatus">Not started</span></div>`;
      c.insertBefore(wrap, c.firstChild.nextSibling);
      textNode.textContent = ""; // remove old placeholder line
      const status = wrap.querySelector("#claimStatus");
      const steps = wrap.querySelectorAll(".stepper .step");
      let otp=null;
      function setStep(n){ steps.forEach((el,i)=> el.classList.toggle("active", i < n)); }
      wrap.querySelector("#startClaim").onclick = ()=>{
        setStep(1); status.textContent="Sending OTP…";
        otp = String(Math.floor(100000+Math.random()*900000));
        console.log("[Claim OTP]", otp);
        status.textContent="OTP sent. Verify.";
        // OTP sheet
        const sheet = document.createElement("div"); sheet.className="modal-sheet";
        sheet.innerHTML = `<div class="sheet">
          <div class="card-title">Enter OTP</div>
          <div class="input-group"><input class="input-field" id="otp" placeholder="6-digit code"></div>
          <div class="focus-controls"><button class="button" id="verify">Verify</button></div>
        </div>`;
        document.body.appendChild(sheet);
        sheet.addEventListener("click",(e)=>{ if(e.target===sheet) sheet.remove(); });
        sheet.querySelector("#verify").onclick = async ()=>{
          const code = sheet.querySelector("#otp").value.trim();
          if(code!==otp){ toast("Incorrect code"); return; }
          setStep(2); status.textContent="Verified. Submitting…";
          const rec = { id: crypto.randomUUID(), name: wrap.querySelector("#claimBizName").value.trim(), email: wrap.querySelector("#claimEmail").value.trim(), phone: wrap.querySelector("#claimPhone").value.trim(), submittedAt: new Date().toISOString(), status:"submitted" };
          await DBX_PRO.put("claims", rec);
          status.textContent="Submitted. Awaiting review."; setStep(3);
          sheet.remove(); toast("Claim submitted");
        };
      };
    }
  })();

  // ---------- 7) Set a New Goal (attach to Planner action) ----------
  (function goals(){
    // Find a button with text "Set a New Goal"
    const btn = Array.from(document.querySelectorAll("button, .button")).find(b=> /set a new goal/i.test(b.textContent||""));
    if(!btn) return;
    let modal = document.getElementById("goalModal");
    if(!modal){
      modal = document.createElement("div"); modal.id="goalModal"; modal.className="modal";
      modal.innerHTML = `<div class="modal-content">
        <h3 class="modal-title">New Goal</h3>
        <div class="input-group">
          <input class="input-field" id="goalTitle" placeholder="Goal title">
          <select class="input-field" id="goalHorizon"><option value="7">This week</option><option value="30">This month</option><option value="90">Next 3 months</option></select>
          <input class="input-field" id="goalTarget" type="number" placeholder="Target (e.g., 10 sessions)">
        </div>
        <div class="focus-controls"><button class="button" id="saveGoal">Save</button><button class="button-secondary" id="closeGoal">Close</button></div>
      </div>`;
      document.body.appendChild(modal);
      modal.querySelector("#closeGoal").onclick = ()=> modal.style.display="none";
      modal.querySelector("#saveGoal").onclick = async ()=>{
        const item = { id: crypto.randomUUID(), title: modal.querySelector("#goalTitle").value.trim(), horizonDays: parseInt(modal.querySelector("#goalHorizon").value), target: parseFloat(modal.querySelector("#goalTarget").value||"0"), progress:0, createdAt: nowISO(), completed:false };
        await DB_PRO.put("goals", item); toast("Goal saved"); modal.style.display="none"; renderGoals();
      };
    }
    btn.addEventListener("click", ()=> modal.style.display="flex");
    // Render goals under Planner if space exists
    function renderGoals(){
      // place under planner screen end
      const planner = document.getElementById("planner"); if(!planner) return;
      let holder = planner.querySelector("#goalsHolder");
      if(!holder){ holder = document.createElement("div"); holder.id="goalsHolder"; holder.className="card"; holder.innerHTML=`<h3 class="card-title">Your Goals</h3><div id="goalsList"></div>`; planner.appendChild(holder); }
      DB_PRO.getAll("goals").then(gs=>{
        const list = holder.querySelector("#goalsList");
        list.innerHTML = gs.map(g=>`
          <div class="bulletin-card" data-id="${g.id}">
            <strong>${g.title}</strong>
            <div class="card-subtitle">Progress: ${g.progress}/${g.target} • Horizon: ${g.horizonDays} days</div>
            <div class="focus-controls">
              <button class="button-secondary" data-inc="1">+1</button>
              <button class="button" data-done="1">Complete</button>
            </div>
          </div>`).join("");
      });
      holder.onclick = async (e)=>{
        const card = e.target.closest(".bulletin-card"); if(!card) return;
        if(e.target.matches("[data-inc]")){
          const id = card.dataset.id;
          const items = await DB_PRO.getAll("goals");
          const g = items.find(x=> x.id===id); g.progress+=1; await DB_PRO.put("goals", g); renderGoals();
        }
        if(e.target.matches("[data-done]")){
          const id = card.dataset.id;
          const items = await DB_PRO.getAll("goals");
          const g = items.find(x=> x.id===id); g.completed=true; await DB_PRO.put("goals", g); toast("Goal completed"); renderGoals();
        }
      };
    }
    renderGoals();
  })();

  // ---------- 8) Channels & AI Chat bubble polish ----------
  (function chat(){
    const screen = document.getElementById("chat"); if(!screen) return;
    // Add chips to last messages dynamically
    const area = screen.querySelector(".chat-messages-area") || screen;
    const observer = new MutationObserver(()=>{
      area.querySelectorAll(".chat-bubble:not(.has-chips)").forEach(b=>{
        const row = document.createElement("div");
        row.className = "chips-row";
        ["Summarize","Draft reply","Turn into todo"].forEach(t=>{
          const chip = document.createElement("span"); chip.className="chip"; chip.textContent=t; row.appendChild(chip);
        });
        b.appendChild(row); b.classList.add("has-chips");
      });
    });
    observer.observe(area, { childList:true, subtree:true });
    // Chip actions provided by AI in another module: see AIMemory below
  })();

  // ---------- 9) Local Community Page redesign: bulletin feed inside Explore ----------
  (function bulletin(){
    const explore = document.getElementById("explore"); if(!explore) return;
    const anchor = document.getElementById("exploreFilterBar") || explore;
    let feed = document.getElementById("bulletinsFeed");
    if(!feed){
      feed = document.createElement("div"); feed.id="bulletinsFeed"; feed.className="card";
      feed.innerHTML = `<h3 class="card-title">Bulletin Board</h3><div class="bulletin-grid" id="bulletinGrid"></div>`;
      anchor.insertAdjacentElement("afterend", feed);
    }
    function render(){
      DB_PRO.getAll("posts").then(items=>{
        const grid = document.getElementById("bulletinGrid");
        grid.innerHTML = (items||[]).map(p=>`
          <article class="bulletin-card" data-id="${p.id}" data-owner="1">
            <strong>${p.title}</strong>
            <div class="card-subtitle">${p.category} • <span class="sensitive">${p.author||"You"}</span> • ${new Date(p.at).toLocaleString()}</div>
            <p>${p.content}</p>
          </article>`).join("");
      });
    }
    render();
    // Hook create post modal submit (if present)
    const submit = document.querySelector(".create-bulletin-submit, #createBulletinSubmit, .bulletinPostSubmit");
    const title = document.getElementById("bulletinPostTitleInput");
    const content = document.getElementById("bulletinPostContentInput");
    const cat = document.getElementById("bulletinPostCategorySelect");
    if(submit && title && content && cat){
      submit.addEventListener("click", async ()=>{
        const post = { id: crypto.randomUUID(), title: title.value.trim(), content: content.value.trim(), category: cat.value, at: nowISO(), author:"You" };
        await DB_PRO.put("posts", post);
        toast("Posted to bulletin"); render();
      });
    }
    // Long-press: edit/delete
    let pressTimer=null;
    feed.addEventListener("pointerdown", (e)=>{
      const card = e.target.closest(".bulletin-card"); if(!card) return;
      pressTimer = setTimeout(()=>{
        showCtxMenu([
          { label:"Edit post", icon:"fa fa-pen", onClick:()=> editPost(card.dataset.id) },
          { label:"Delete post", icon:"fa fa-trash", className:"danger", onClick:()=> delPost(card.dataset.id) },
        ], e.clientX, e.clientY);
      }, 420);
    });
    ["pointerup","pointerleave","pointercancel"].forEach(ev=> feed.addEventListener(ev, ()=> clearTimeout(pressTimer)));
    async function editPost(id){
      const items = await DB_PRO.getAll("posts");
      const p = items.find(x=> x.id===id); if(!p) return;
      const sheet = document.createElement("div"); sheet.className="modal-sheet";
      sheet.innerHTML = `<div class="sheet"><div class="card-title">Edit Post</div>
        <div class="input-group"><input class="input-field" id="epTitle" value="${p.title}"></div>
        <div class="input-group"><textarea class="input-field" id="epContent" rows="4">${p.content}</textarea></div>
        <div class="focus-controls"><button class="button" id="save">Save</button></div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener("click",(e)=>{ if(e.target===sheet) sheet.remove(); });
      sheet.querySelector("#save").onclick = async ()=>{
        p.title = sheet.querySelector("#epTitle").value.trim();
        p.content = sheet.querySelector("#epContent").value.trim();
        await DB_PRO.put("posts", p); sheet.remove(); render(); toast("Post updated");
      };
    }
    async function delPost(id){
      await DB_PRO.del("posts", id); render(); toast("Post deleted");
    }
  })();

  // ---------- 10) Long-press on Tasks (edit/delete via existing modal) ----------
  (function tasks(){
    const ul = document.getElementById("taskList") || document.querySelector(".task-list"); if(!ul) return;
    let timer=null;
    ul.addEventListener("pointerdown", (e)=>{
      const li = e.target.closest("li"); if(!li) return;
      timer = setTimeout(()=>{
        const id = li.dataset.id || li.getAttribute("data-task-id") || "";
        showCtxMenu([
          { label:"Edit task", icon:"fa fa-pen", onClick:()=> document.getElementById("editTaskModal")?.classList.add("active") },
          { label:"Delete task", icon:"fa fa-trash", className:"danger", onClick:()=> { li.remove(); toast("Task removed"); } },
        ], e.clientX, e.clientY);
      }, 420);
    });
    ["pointerup","pointerleave","pointercancel"].forEach(ev=> ul.addEventListener(ev, ()=> clearTimeout(timer)));
  })();

  // ---------- 11) Privacy Sandbox Mode (real) & Export ----------
  (function privacy(){
    const modal = document.getElementById("privacySettingsModal"); if(!modal) return;
    const c = modal.querySelector(".modal-content"); if(!c) return;
    // Wire sandbox toggle
    const toggleBtn = Array.from(c.querySelectorAll(".toggle-row .toggle-switch-button, .toggle-switch-button")).find(b=> /sandbox/i.test(b.textContent||""));
    // If no dedicated control, add one
    if(!toggleBtn){
      const row = document.createElement("div");
      row.className="toggle-row";
      row.innerHTML = `<span>Privacy Sandbox Mode</span><button class="toggle-switch-button"><span class="toggle-switch"></span></button>`;
      c.appendChild(row);
      row.querySelector(".toggle-switch-button").onclick = ()=> row.querySelector(".toggle-switch").classList.toggle("active");
    }
    function setSandbox(on){
      document.body.classList.toggle("privacy-sandbox", !!on);
      LS.setItem("privacy-sandbox", on?"1":"0");
    }
    setSandbox(LS.getItem("privacy-sandbox")==="1");
    c.addEventListener("click", (e)=>{
      if(e.target.closest(".toggle-switch-button")){
        const sw = e.target.closest(".toggle-switch-button").querySelector(".toggle-switch");
        const on = sw.classList.toggle("active");
        setSandbox(on);
        toast(on? "Privacy Sandbox ON" : "Privacy Sandbox OFF");
      }
    });
    // Mask sensitive strings (emails/phones) when sandbox is ON
    const maskObserver = new MutationObserver(()=>{
      if(!document.body.classList.contains("privacy-sandbox")) return;
      document.querySelectorAll("span, p, div, a").forEach(el=>{
        if(el.dataset.masked==="1") return;
        const t = el.textContent||"";
        if(/\b[\w\.-]+@[\w\.-]+\.\w{2,}\b/.test(t) || /\+?\d[\d\s-]{6,}\d/.test(t)){
          el.textContent = t.replace(/\S/g, "•"); el.dataset.masked="1"; el.classList.add("sensitive");
        }
      });
    });
    maskObserver.observe(document.body, { childList:true, subtree:true, characterData:true });
    // Export buttons
    const exportRow = document.createElement("div");
    exportRow.className = "export-actions";
    exportRow.innerHTML = `<div class="focus-controls">
      <button class="button" id="exportJSON">Export JSON</button>
      <button class="button-secondary" id="exportCSV">Export CSV</button>
    </div>`;
    c.appendChild(exportRow);
    async function gather(){
      const data = {
        focusSessions: await DB_PRO.getAll("focusSessions"),
        meditations: await DB_PRO.getAll("meditations"),
        goals: await DB_PRO.getAll("goals"),
        nutritionLogs: await DB_PRO.getAll("nutritionLogs"),
        posts: await DB_PRO.getAll("posts"),
        claims: await DBX_PRO.getAll("claims"),
        services: await DBX_PRO.getAll("services"),
        serviceRequests: await DBX_PRO.getAll("serviceRequests"),
        civicActs: await DBX_PRO.getAll("civicActs"),
        aiMemory: await DBX_PRO.getAll("aiMemory"),
      };
      return data;
    }
    c.querySelector("#exportJSON").onclick = async ()=>{
      const data = await gather();
      const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href:url, download:`LocalLife-export-${new Date().toISOString().slice(0,10)}.json` });
      a.click(); URL.revokeObjectURL(url);
      toast("Exported JSON");
    };
    c.querySelector("#exportCSV").onclick = async ()=>{
      const data = await gather();
      const toCSV = (items)=>{
        if(!items || items.length===0) return "id\n";
        const keys = Array.from(new Set(items.flatMap(o=> Object.keys(o))));
        const lines = [keys.join(",")];
        for(const it of items){
          lines.push(keys.map(k=> JSON.stringify(it[k]) ).join(","));
        }
        return lines.join("\n");
      };
      for(const [name, items] of Object.entries(data)){
        const blob = new Blob([toCSV(items)], {type:"text/csv"});
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href:url, download:`${name}-${new Date().toISOString().slice(0,10)}.csv` });
        a.click(); URL.revokeObjectURL(url);
      }
      toast("Exported CSVs");
    };
  })();

  // ---------- 12) Long-press menus always in viewport & attach to general cards ----------
  (function longPressGeneric(){
    let timer=null;
    document.addEventListener("pointerdown", (e)=>{
      const targetCard = e.target.closest(".card, .bulletin-card");
      if(!targetCard) return;
      timer = setTimeout(()=>{
        const items = [];
        if(targetCard.matches(".bulletin-card")){
          const id = targetCard.dataset.id;
          items.push({ label:"Edit", icon:"fa fa-pen", onClick:()=> document.querySelector("#bulletinsFeed")?.dispatchEvent(new CustomEvent("edit-post",{detail:id})) });
          items.push({ label:"Delete", icon:"fa fa-trash", className:"danger", onClick:()=> document.querySelector("#bulletinsFeed")?.dispatchEvent(new CustomEvent("del-post",{detail:id})) });
        }else{
          items.push({ label:"Pin", icon:"fa fa-thumbtack", onClick:()=> toast("Pinned") });
          items.push({ label:"Share", icon:"fa fa-share", onClick:()=> { navigator.share?.({title:document.title,text:"Check this out",url:location.href}); toast("Shared"); }});
        }
        if(items.length) showCtxMenu(items, e.clientX, e.clientY);
      }, 500);
    });
    ["pointerup","pointerleave","pointercancel","scroll"].forEach(ev=> document.addEventListener(ev, ()=> clearTimeout(timer), {passive:true}));
  })();

  // ---------- 13) Service worker (inlined) ----------
  if("serviceWorker" in navigator){
    const swCode = `self.addEventListener('install',e=>self.skipWaiting()); self.addEventListener('activate',e=>clients.claim()); self.addEventListener('fetch',e=>{});`;
    const blob = new Blob([swCode], {type:"text/javascript"});
    const url = URL.createObjectURL(blob);
    navigator.serviceWorker.register(url).catch(()=>{});
  }

})();
