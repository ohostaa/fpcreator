const ENDPOINTS = {
  characters: './data/characters.json',
  remnants:   './data/remnants.json',
};

const mainSlotsEl = document.getElementById('mainSlots');
const extraSlotsEl = document.getElementById('extraSlots');
const slotTpl = document.getElementById('slotTemplate');
const dlg = document.getElementById('pickerDialog');
const grid = document.getElementById('optionGrid');
const searchBox = document.getElementById('searchBox');
const closeDlg = document.getElementById('closeDlg');

const resetBtn = document.getElementById('resetBtn');
const shareBtn = document.getElementById('shareBtn');
const importBtn = document.getElementById('importBtn');
const shotBtn = document.getElementById('shotBtn');
const themeBtn = document.getElementById('themeBtn');

let allCharacters = [];
let allRemnants = [];
let currentPickType = 'character';
let currentTargetSlot = null;
const STORAGE_KEY = 'fp_party_v1';

init();

async function init() {
  buildSlots(mainSlotsEl, 5, 'character');
  buildSlots(extraSlotsEl, 5, 'remnant');
  await loadOptions();
  wireEvents();
  restoreFromUrlOrStorage();
}

function buildSlots(root, count, type) {
  for (let i = 0; i < count; i++) {
    const n = slotTpl.content.firstElementChild.cloneNode(true);
    n.dataset.type = type;
    n.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) { clearSlot(n); persist(); e.stopPropagation(); return; }
      currentPickType = type; currentTargetSlot = n; openPicker(type);
    });
    n.draggable = true;
    n.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain','slot'); n.classList.add('dragging'); });
    n.addEventListener('dragend', ()=> n.classList.remove('dragging'));
    n.addEventListener('dragover', (e)=> e.preventDefault());
    n.addEventListener('drop', (e)=>{ e.preventDefault(); const d = root.querySelector('.dragging'); if(!d||d===n) return; if(d.dataset.type===n.dataset.type){ swapSlots(d,n); persist(); }});
    root.appendChild(n);
  }
}

async function loadOptions() {
  const [cRes, rRes] = await Promise.all([
    fetch(ENDPOINTS.characters).then(r=>r.json()),
    fetch(ENDPOINTS.remnants).then(r=>r.json())
  ]);
  allCharacters = cRes;
  allRemnants  = rRes;
}

function wireEvents() {
  closeDlg.addEventListener('click', ()=> dlg.close());
  searchBox.addEventListener('input', renderOptions);
  resetBtn.addEventListener('click', ()=>{ resetAll(); persist(); });
  shareBtn.addEventListener('click', shareParty);
  importBtn.addEventListener('click', importCode);
  shotBtn.addEventListener('click', takeShot);
  themeBtn.addEventListener('click', toggleTheme);
}

function openPicker() { renderOptions(); dlg.showModal(); }
function renderOptions() {
  const term = (searchBox.value||'').toLowerCase().trim();
  const pool = currentPickType==='character' ? allCharacters : allRemnants;
  const items = pool.filter(it => { const s = `${it.name||''} ${it.attr||''}`.toLowerCase(); return !term || s.includes(term); });
  grid.innerHTML=''; for(const it of items){ const card=document.createElement('button'); card.className='option'; card.type='button';
    card.innerHTML=`<img src="${it.url}" alt="${it.name||''}"><span class="name">${it.name||''}</span>`;
    card.addEventListener('click', ()=>{ fillSlot(currentTargetSlot,it); dlg.close(); persist(); });
    grid.appendChild(card);
  }
}

function fillSlot(slot,item){ if(!slot) return; const img=slot.querySelector('img'); const badge=slot.querySelector('.badge');
  img.src=item.url; img.alt=item.name||''; slot.classList.add('filled'); badge.textContent=item.attr?`#${item.attr}`:''; slot.dataset.name=item.name||''; slot.dataset.attr=item.attr||''; slot.dataset.url=item.url||'';
}
function clearSlot(slot){ const img=slot.querySelector('img'); const badge=slot.querySelector('.badge'); img.removeAttribute('src'); img.alt=''; badge.textContent=''; slot.classList.remove('filled'); delete slot.dataset.name; delete slot.dataset.attr; delete slot.dataset.url; }
function swapSlots(a,b){ const da={name:a.dataset.name,attr:a.dataset.attr,url:a.dataset.url}; const db={name:b.dataset.name,attr:b.dataset.attr,url:b.dataset.url}; if(da.url) fillSlot(b,da); else clearSlot(b); if(db.url) fillSlot(a,db); else clearSlot(a); }

function snapshot(){ const snap=root=>[...root.children].map(el=>({type:el.dataset.type,name:el.dataset.name||null,attr:el.dataset.attr||null,url:el.dataset.url||null})); return { main:snap(mainSlotsEl), extra:snap(extraSlotsEl), theme:document.documentElement.dataset.theme||'dark' }; }
function persist(){ const data=snapshot(); localStorage.setItem('fp_party_v1', JSON.stringify(data)); history.replaceState({},'', makeUrlWithPayload(encodePayload(data))); }
function restoreFromUrlOrStorage(){ const p=new URLSearchParams(location.search).get('p'); if(p){ try{ return applyPayload(decodePayload(p)); }catch{} } const raw=localStorage.getItem('fp_party_v1'); if(raw){ try{ applyPayload(JSON.parse(raw)); }catch{} } }
function applyPayload(data){ const applyList=(root,list)=>{ [...root.children].forEach((el,i)=>{ const it=list?.[i]; if(it?.url) fillSlot(el,{name:it.name,attr:it.attr,url:it.url}); else clearSlot(el); }); }; applyList(mainSlotsEl,data.main); applyList(extraSlotsEl,data.extra); setTheme(data.theme||'dark'); }

function encodePayload(obj){ const json=JSON.stringify(obj); return btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function decodePayload(code){ const pad=code+'==='.slice((code.length+3)%4); const b64=pad.replace(/-/g,'+').replace(/_/g,'/'); const json=decodeURIComponent(escape(atob(b64))); return JSON.parse(json); }
function makeUrlWithPayload(code){ const u=new URL(location.href); u.searchParams.set('p',code); return u.toString(); }
async function shareParty(){ const code=encodePayload(snapshot()); const url=makeUrlWithPayload(code); await navigator.clipboard.writeText(url); alert('共有URLをコピーしました！'); }
async function importCode(){ const code=prompt('共有コード / URL の?p= 以降を貼り付け'); if(!code) return; const parsed=code.includes('?p=')?new URL(code).searchParams.get('p'):code; const data=decodePayload(parsed); applyPayload(data); persist(); }

async function takeShot(){ const main=document.querySelector('main'); const canvas=await html2canvas(main,{backgroundColor:'#0e1116',scale:devicePixelRatio}); const url=canvas.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='party.png'; a.click(); }

function toggleTheme(){ const cur=document.documentElement.dataset.theme==='light'?'dark':'light'; setTheme(cur); persist(); }
function setTheme(mode){ document.documentElement.dataset.theme=mode;
  if(mode==='light'){ document.documentElement.style.setProperty('--bg','#f6f7fb'); document.documentElement.style.setProperty('--text','#1c2430'); document.documentElement.style.setProperty('--panel','rgba(255,255,255,.9)'); document.documentElement.style.setProperty('--border','rgba(0,0,0,.08)'); }
  else{ document.documentElement.style.setProperty('--bg','#0e1116'); document.documentElement.style.setProperty('--text','#e9eef4'); document.documentElement.style.setProperty('--panel','rgba(255,255,255,.06)'); document.documentElement.style.setProperty('--border','rgba(255,255,255,.12)'); }
}
function resetAll(){ [...mainSlotsEl.children,...extraSlotsEl.children].forEach(clearSlot); }
