/**
 * @module ai-super-core
 * On-device super-assistant core: AIUtil, local AIMemory store, suggestions engine,
 * emotion analysis, automation ticks and boot sequence.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
/* =====================================================
   LocalLife OS — Super-Intelligent Personal Assistant
   All logic runs locally, inline, single-file.
   Sections: AIMemory, AISuggestions, AIEmotion, AIAutomation
   ===================================================== */

/* --- Utilities (tiny, inline) --- */
const AIUtil = (()=>{
  const clamp = (n, a, b)=> Math.min(Math.max(n,a),b);
  const nowISO = ()=> new Date().toISOString();
  const uid = (p='id') => p+'_'+Math.random().toString(36).slice(2,10);
  const safeJSON = {
    get(k, fallback){
      try{ return JSON.parse(localStorage.getItem(k)) ?? fallback }catch(e){ return fallback }
    },
    set(k, v){
      try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){ /* ignore */ }
    }
  };
  function el(sel, root=document){ return root.querySelector(sel) }
  function els(sel, root=document){ return Array.from(root.querySelectorAll(sel)) }
  function humanTime(dtStr){
    if(!dtStr) return '';
    const dt = new Date(dtStr);
    const pad = n=> String(n).padStart(2,'0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
  function showIsland(msg, icon='fa-solid fa-bell', actionLabel=null, actionFn=null){
    const island = el('#dynamicIslandAlert');
    if(!island) return;
    island.innerHTML = `<i class="icon ${icon}"></i><span class="text">${msg}</span>` + (actionLabel? `<button class="action-button">${actionLabel}</button>`:'');
    island.classList.add('show');
    if(actionLabel && actionFn){
      const btn = island.querySelector('.action-button');
      btn.onclick = (e)=>{ e.stopPropagation(); actionFn() };
    }
    setTimeout(()=> island.classList.remove('show'), 5000);
  }
  return { clamp, nowISO, uid, safeJSON, el, els, humanTime, showIsland }
})();

/* --- AIMemory: local, persistent, with forget controls --- */
const AIMemory = (()=>{
  const KEY = 'll.memory.v1';
  const state = AIUtil.safeJSON.get(KEY, {
    tasks: [], /* {id,title,due,placeId,category,done:false} */
    places: [], /* {id,name,coords:{lat,lng},tags:[]} */
    chats: [],  /* {id, text, ts, mood} */
    moodTrend: [], /* [{ts,score}] */
    routines: [], /* {id,name,enabled:true, time:'08:00', type:'time'|'place', placeId?, taskRef?} */
    links: []   /* {fromType, fromId, toType, toId, reason} */
  });

  function save(){ AIUtil.safeJSON.set(KEY, state) }

  /* Public API */
  function addTask(task){
    const t = { id: AIUtil.uid('task'), done:false, ...task };
    state.tasks.push(t); save(); linkify(t); return t;
  }
  function toggleTask(id, done){
    const t = state.tasks.find(x=>x.id===id); if(t){ t.done = (done ?? !t.done); save() } return t;
  }
  function addPlace(place){ const p = { id: AIUtil.uid('place'), ...place }; state.places.push(p); save(); return p }
  function addChat(text, mood){ const c = { id: AIUtil.uid('chat'), text, mood, ts: AIUtil.nowISO() }; state.chats.push(c); state.moodTrend.push({ts:c.ts, score:mood.score}); trimMood(); save(); return c }
  function addRoutine(r){ const rr = { id: AIUtil.uid('routine'), enabled:true, ...r }; state.routines.push(rr); save(); return rr }
  function updateRoutine(id, patch){ const r = state.routines.find(x=>x.id===id); if(r){ Object.assign(r, patch); save() } return r }
  function forget(entity, id){
    if(!state[entity]) return false;
    const idx = state[entity].findIndex(x=>x.id===id);
    if(idx>-1){ state[entity].splice(idx,1); save(); return true }
    return false;
  }
  function all(){ return state }
  function linkify(task){ // naive linking between task and places by keyword
    if(!task || !task.title) return;
    const lower = task.title.toLowerCase();
    const place = state.places.find(p => lower.includes((p.name||'').toLowerCase()));
    if(place){
      task.placeId = task.placeId || place.id;
      state.links.push({fromType:'task', fromId:task.id, toType:'place', toId:place.id, reason:'keyword-match'});
      save();
    }
  }
  function trimMood(){ // keep last 200
    if(state.moodTrend.length>200){ state.moodTrend.splice(0, state.moodTrend.length-200) }
  }

  /* Boot: ensure some defaults exist */
  if(state.routines.length===0){
    // Morning routine 08:00
    state.routines.push({id:AIUtil.uid('routine'), name:'Morning prep', enabled:true, type:'time', time:'08:00', taskRef:null, desc:'Prepares your day at 8AM'});
    save();
  }

  return { addTask, toggleTask, addPlace, addChat, addRoutine, updateRoutine, forget, all }
})();

/* --- AIEmotion: lightweight sentiment + tone --- */
const AIEmotion = (()=>{
  const positive = ['great','good','happy','love','excited','awesome','relaxed','chill','fun'];
  const negative = ['stressed','anxious','tired','angry','annoyed','sad','overwhelmed','frustrated','worried','panic'];
  function analyze(text){
    const t = (text||'').toLowerCase();
    let score = 0;
    positive.forEach(w=>{ if(t.includes(w)) score += 1 });
    negative.forEach(w=>{ if(t.includes(w)) score -= 1 });
    // quick heuristics
    score -= (t.match(/!/g)||[]).length>=3 ? 1 : 0;
    score += (t.match(/\b(thanks|thank you|yay)\b/g)||[]).length>0 ? 1 : 0;
    score = AIUtil.clamp(score, -3, 3);
    const mood = score>1?'positive': score<-1?'negative':'neutral';
    return { score, mood, label: mood };
  }
  function summarizeTrend(){
    const mt = AIMemory.all().moodTrend;
    if(mt.length<3) return 'Not enough data yet';
    const last3 = mt.slice(-3).map(x=>x.score).reduce((a,b)=>a+b,0)/3;
    const avg = mt.reduce((a,b)=>a+b.score,0)/mt.length;
    if(last3 > avg+0.2) return 'Mood trending up recently';
    if(last3 < avg-0.2) return 'Mood dipped a bit; be kind to yourself';
    return 'Mood steady';
  }
  return { analyze, summarizeTrend }
})();

/* --- AISuggestions: build next-actions / explore ideas --- */
const AISuggestions = (()=>{
  function computeNextActions(){
    const {tasks, routines} = AIMemory.all();
    const now = new Date();
    const soon = new Date(now.getTime()+2*60*60*1000);
    const actionable = tasks
      .filter(t=>!t.done)
      .map(t=>{
        const due = t.due? new Date(t.due): null;
        let score = 0;
        if(due){ // urgency
          if(due < soon) score += 3;
          else if(due.toDateString()===now.toDateString()) score += 2;
          else score += 1;
        }
        // category bonus
        if(t.category==='health' || t.category==='learning') score += 0.5;
        return {...t, _score: score};
      })
      .sort((a,b)=>b._score-a._score)
      .slice(0,3)
      .map(t=>({type:'task', id:t.id, title:t.title, reason: t.due?`due ${AIUtil.humanTime(t.due)}`:'quick win', icon:'fa-solid fa-check-circle'}));

    const routineTip = (routines||[]).filter(r=>r.enabled).slice(0,1).map(r=>({
      type:'routine', id:r.id, title:`Prep for ${r.name}`, reason:`scheduled ${r.time}`, icon:'fa-solid fa-robot'
    }));

    return [...actionable, ...routineTip].slice(0,3);
  }

  function computePlannerList(){
    const {tasks} = AIMemory.all();
    return tasks
      .filter(t=>!t.done)
      .sort((a,b)=> (a.due?new Date(a.due):Infinity) - (b.due?new Date(b.due):Infinity))
      .slice(0,5)
      .map(t=> ({ title:t.title, meta: t.due?`Due ${AIUtil.humanTime(t.due)}`:'No due date', why:'Soonest deadlines first' }));
  }

  function computeExploreIdeas(){
    const {places, tasks} = AIMemory.all();
    const hasCoffeeTask = tasks.some(t=>/coffee|meet/i.test(t.title||''));
    let idea = hasCoffeeTask ? 'Try a local café nearby for your meeting' : 'Explore a park close by for a quick reset';
    return [{ idea, why: hasCoffeeTask?'You mentioned a coffee-related task.':'You’ve been active for a while; breaks help focus.' }];
  }

  /* DOM updaters */
  function updateDashboardInsights(){
    const container = AIUtil.el('#aiDashboardInsight');
    if(!container) return;
    const items = computeNextActions();
    container.innerHTML = items.map(i=>`
      <div class="ai-fade-in"><i class="${i.icon}"></i><strong>Next:</strong> ${i.title}
        <span class="ai-explainer">Why am I seeing this? ${i.reason}.</span>
      </div>
    `).join('');
  }
  function updatePlannerSuggestions(){
    const nodes = AIUtil.els('.ai-planner-suggestion');
    const list = computePlannerList();
    nodes.forEach((n, idx)=>{
      const item = list[idx%list.length];
      if(item){
        n.innerHTML = `<i class="fa-solid fa-lightbulb"></i><strong>${item.title}</strong> — ${item.meta}
        <span class="ai-explainer">Why am I seeing this? ${item.why}.</span>`;
        n.classList.add('ai-fade-in');
      }
    });
  }
  function updateExplore(){
    const card = AIUtil.el('#aiExploreSuggestion');
    if(!card) return;
    const ideas = computeExploreIdeas();
    const first = ideas[0];
    card.querySelector('.card-subtitle')?.remove();
    const titleEl = card.querySelector('.card-title');
    if(titleEl) titleEl.textContent = 'Personalized ideas nearby';
    const body = card.querySelector('.card-body') || card;
    body.innerHTML += `<div class="ai-fade-in" style="margin-top:6px">${first.idea}
    <span class="ai-explainer">Why am I seeing this? ${first.why}</span></div>`;
  }

  return { updateDashboardInsights, updatePlannerSuggestions, updateExplore }
})();

/* --- AIAutomation: proactive nudges (time/place) --- */
const AIAutomation = (()=>{
  let geoWatchId = null;

  function timeMatches(timeStr){
    const [h,m] = (timeStr||'').split(':').map(x=>parseInt(x,10));
    const d = new Date();
    return d.getHours()===h && d.getMinutes()===m;
  }

  function tick(){
    const {routines, tasks, places} = AIMemory.all();
    const d = new Date();
    // Time-based
    routines.filter(r=>r.enabled && r.type==='time').forEach(r=>{
      if(timeMatches(r.time)){
        AIUtil.showIsland(`It's ${r.time}. ${r.name}: want me to line up your priorities?`, 'fa-solid fa-clock', 'Open Planner', ()=>{
          document.querySelector('[data-screen="planner"]')?.click();
        });
      }
    });
    // Habit nudge at common evening time
    if(d.getHours()===18 && d.getMinutes()===0){
      AIUtil.showIsland(`It's your usual wind-down hour. A 10‑minute stretch?`, 'fa-solid fa-person-running');
    }
  }

  function startGeo(){
    if(!navigator.geolocation) return;
    if(geoWatchId!==null) return;
    geoWatchId = navigator.geolocation.watchPosition(pos=>{
      const {latitude, longitude} = pos.coords;
      const {places, tasks} = AIMemory.all();
      places.forEach(p=>{
        if(!p.coords) return;
        const dist = haversine(latitude, longitude, p.coords.lat, p.coords.lng);
        if(dist < 0.2){ // within 200m
          const related = tasks.find(t=>t.placeId===p.id && !t.done);
          if(related){
            AIUtil.showIsland(`Near ${p.name}. Do "${related.title}" now?`, 'fa-solid fa-location-dot', 'Mark done', ()=>{
              AIMemory.toggleTask(related.id, true);
              AISuggestions.updateDashboardInsights();
              AISuggestions.updatePlannerSuggestions();
            });
          }
        }
      });
    }, ()=>{}, {enableHighAccuracy:false, maximumAge:60000, timeout:5000});
  }

  function haversine(lat1, lon1, lat2, lon2){
    function toRad(x){ return x*Math.PI/180 }
    const R = 6371;
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  function renderAutomationToggles(){
    const wrap = AIUtil.el('#pinnedWidgetsContainer');
    if(!wrap) return;
    const {routines} = AIMemory.all();
    // Clear previous AI tiles (by marker attr)
    AIUtil.els('.automation-tile', wrap).forEach(n=>n.remove());
    routines.forEach(r=>{
      const tile = document.createElement('div');
      tile.className = 'pinned-widget-item automation-tile';
      tile.innerHTML = `
        <div class="widget-icon"><i class="fa-solid fa-robot"></i></div>
        <div class="widget-title title">\${r.name}</div>
        <div class="widget-value desc">\${r.type==='time' ? 'Runs at '+r.time : 'Location-based'}</div>
        <div class="automation-toggle" style="margin-top:6px">
          <input type="checkbox" \${r.enabled?'checked':''} aria-label="Enable \${r.name}"/>
          <span>\${r.enabled?'On':'Off'}</span>
        </div>`;
      const chk = tile.querySelector('input');
      chk.addEventListener('change', ()=>{
        AIMemory.updateRoutine(r.id, {enabled: chk.checked});
        tile.querySelector('span').textContent = chk.checked?'On':'Off';
      });
      wrap.prepend(tile);
    });
  }

  function boot(){
    setInterval(tick, 30000); // check every 30s
    startGeo();
    renderAutomationToggles();
  }

  return { boot, renderAutomationToggles }
})();

/* --- Bottom Sheet Enhancements: chat + memory panel --- */
function enhanceBottomSheet(){
  const sheet = AIUtil.el('#aiBottomSheet');
  if(!sheet) return;
  const content = sheet.querySelector('.ai-chat-content') || sheet;
  // Add memory browser panel once
  if(!content.querySelector('.ai-memory-panel')){
    const panel = document.createElement('div');
    panel.className = 'ai-memory-panel';
    panel.innerHTML = `
      <div class="screen-header" style="position:sticky; top:0; background:transparent;">
        <div class="title-group"><div class="title">Your private memory</div></div>
      </div>
      <div class="memory-list"></div>
    `;
    content.appendChild(panel);
  }
  renderMemoryList();
}

function renderMemoryList(){
  const listEl = AIUtil.el('#aiBottomSheet .ai-memory-panel .memory-list');
  if(!listEl) return;
  const mem = AIMemory.all();
  const rows = [];
  mem.tasks.forEach(t=> rows.push({type:'Task', id:t.id, title:t.title, meta: t.due?('Due '+AIUtil.humanTime(t.due)):'', entity:'tasks'}));
  mem.places.forEach(p=> rows.push({type:'Place', id:p.id, title:p.name, meta: p.coords?JSON.stringify(p.coords):'', entity:'places'}));
  mem.chats.slice(-10).reverse().forEach(c=> rows.push({type:'Chat', id:c.id, title:c.text.slice(0,80), meta: AIUtil.humanTime(c.ts)+' • mood '+c.mood.label, entity:'chats'}));
  listEl.innerHTML = rows.map(r=> `
    <div class="memory-row">
      <div><strong>\${r.type}</strong><br/>\${r.title}<div class="meta">\${r.meta}</div></div>
      <button class="forget-btn" data-entity="\${r.entity}" data-id="\${r.id}"><i class="fa-solid fa-trash-can"></i> Forget</button>
    </div>`
  ).join('') || '<div class="memory-row">No stored data yet.</div>';
  listEl.querySelectorAll('.forget-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      AIMemory.forget(btn.dataset.entity, btn.dataset.id);
      renderMemoryList();
      AISuggestions.updateDashboardInsights();
      AISuggestions.updatePlannerSuggestions();
      AIAutomation.renderAutomationToggles();
    });
  });
}

/* --- Chat input hook: sentiment-aware replies --- */
function hookChat(){
  const sheet = AIUtil.el('#aiBottomSheet');
  if(!sheet) return;
  const input = sheet.querySelector('input, textarea');
  const messagesArea = sheet.querySelector('.ai-chat-area') || sheet.querySelector('.chat-messages-area');
  const sendBtn = sheet.querySelector('.action-button.send, .button.send, .button-primary');
  function send(text){
    if(!messagesArea) return;
    const mood = AIEmotion.analyze(text);
    AIMemory.addChat(text, mood);
    // user bubble
    const userWrap = document.createElement('div');
    userWrap.className = 'chat-message-wrapper user';
    userWrap.innerHTML = `<div class="chat-bubble" style="background: var(--chat-bubble-user-bg); color:#fff">${text}</div>`;
    messagesArea.appendChild(userWrap);
    // AI bubble
    const reply = mood.mood==='negative'
      ? 'I hear you. Let\'s tackle one step: what\'s the smallest action we can take right now?'
      : mood.mood==='positive'
        ? 'Love that energy! Want me to queue your top 3 next actions?'
        : 'Got it. I can line up your priorities or add this to your plan.';
    const aiWrap = document.createElement('div');
    aiWrap.className = 'chat-message-wrapper other';
    aiWrap.innerHTML = `<div class="chat-bubble">${reply}<div class="ai-explainer">Mood: ${mood.label}. Responses adapt to your tone, locally.</div></div>`;
    messagesArea.appendChild(aiWrap);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    AISuggestions.updateDashboardInsights();
    AISuggestions.updatePlannerSuggestions();
  }
  if(sendBtn && input){
    sendBtn.addEventListener('click', ()=>{ if(input.value.trim()){ send(input.value.trim()); input.value='' } });
  }
  if(input){
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        if(input.value.trim()){ send(input.value.trim()); input.value='' }
      }
    });
  }
}

/* --- Boot sequence --- */

// Robust boot: run now if DOMContentLoaded already occurred, otherwise wait for it.
function LL_AIBoot(){
  try{
    console.log('[LL-AI] booting...');
    // Initial demo data only if completely empty (no tasks/places)
    const mem = AIMemory.all();
    if((mem.tasks||[]).length===0){
      AIMemory.addTask({title:'Buy groceries', due:new Date(Date.now()+60*60*1000).toISOString(), category:'errands'});
      AIMemory.addTask({title:'30-min workout', due:new Date(Date.now()+3*60*60*1000).toISOString(), category:'health'});
      AIMemory.addPlace({name:'Central Park', coords:{lat:-26.305, lng:31.136}});
    }

    AISuggestions.updateDashboardInsights();
    AISuggestions.updatePlannerSuggestions();
    AISuggestions.updateExplore();
    AIAutomation.boot();
    enhanceBottomSheet();
    hookChat();

    // Make .ai-fab open the AI bottom sheet if not already wired
    const fab = AIUtil.el('.ai-fab');
    const sheet = AIUtil.el('#aiBottomSheet');
    if(fab && sheet){
      fab.addEventListener('click', ()=>{
        sheet.classList.add('active');
        setTimeout(()=>{ enhanceBottomSheet(); }, 50);
      });
    }

    // Also try to wire a fallback opening if a different button exists
    if(!fab){
      const alt = AIUtil.el('[data-ai="open"]') || AIUtil.el('.fab') || AIUtil.el('.floating-action');
      if(alt && sheet){
        alt.addEventListener('click', ()=>{ sheet.classList.toggle('active'); enhanceBottomSheet(); });
      }
    }

    // Mood trend hint on dashboard, if there is a container to show
    const insight = AIUtil.el('#aiDashboardInsight');
    if(insight){
      const hint = document.createElement('div');
      hint.className = 'ai-fade-in';
      hint.innerHTML = '<i class="fa-solid fa-heart-pulse"></i> '+AIEmotion.summarizeTrend();
      insight.appendChild(hint);
    }
  }catch(e){
    console.error('AI boot error', e);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', LL_AIBoot);
} else {
  LL_AIBoot();
}

