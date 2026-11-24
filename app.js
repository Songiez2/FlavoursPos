/* =========================================================
   FLAVOURS BUSINESS MANAGER V2.3 PROFESSIONAL EDITION
   Standalone POS and business manager
   - Works offline in a browser
   - Product photos stored as compressed data URLs
   - Editable company TPIN printed on receipts
   - Backup/restore includes all records and photos
   - Attempts migration from common V1.8 localStorage keys
   ========================================================= */
"use strict";

(() => {
  const APP_KEY = "flavoursBusinessManagerV20";
  const V19_KEY = "flavoursBusinessManagerV19";
  const LEGACY = {
    products: "flavoursProducts", sales: "flavoursSales",
    expenses: "flavoursExpenses", closings: "flavoursClosings",
    customers: "flavoursCustomers", suppliers: "flavoursSuppliers",
    settings: "flavoursSettings", logo: "flavoursLogo",
    staff: "flavoursStaff", purchases: "flavoursPurchases",
    returns: "flavoursPurchaseReturns"
  };
  const $ = (s, root=document) => root.querySelector(s);
  const money = n => `${state.settings.currency || "K"}${(Number(n)||0).toFixed(2)}`;
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

  function legacyState() {
    const get = (name, fallback) => read(LEGACY[name]) ?? fallback;
    const settings = get("settings", {});
    return {
      products:get("products",[]), sales:get("sales",[]), expenses:get("expenses",[]),
      closings:get("closings",[]), customers:get("customers",[]),
      suppliers:get("suppliers",[]), purchases:get("purchases",[]),
      returns:get("returns",[]), staff:get("staff",[]),
      settings:{...settings, tpin:settings.tpin || "1020565534"},
      logo:get("logo","")
    };
  }

  const defaults = {
    products:[], categories:["Bar Products","Groceries","Stationery","Cosmetics","Household Items","General"], sales:[], expenses:[], closings:[], customers:[],
    suppliers:[], purchases:[], returns:[], staff:[], customerPayments:[], supplierPayments:[], shifts:[], auditLogs:[], salesReturns:[],
    settings:{businessName:"FLAVOURS TECHS SOLUTIONS", phone:"0971603243",
      address:"Mongu, Zambia", currency:"K", tpin:"1020565534", cloudSyncEndpoint:"", cloudSyncToken:"", theme:"orange"},
    logo:"", cart:[]
  };
  let state = read(APP_KEY);
  if (!state || typeof state !== "object") state = read(V19_KEY);
  if (!state || typeof state !== "object") state = legacyState();
  state = {...defaults, ...state};
  for (const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff","customerPayments","supplierPayments","shifts","auditLogs","salesReturns","cart"])
    if (!Array.isArray(state[k])) state[k] = [];
  if (!Array.isArray(state.categories)) state.categories = defaults.categories.slice();
  state.categories = [...new Set([...state.categories, ...state.products.map(p=>String(p.type||"General").trim()).filter(Boolean)])];
  state.settings = {...defaults.settings, ...(state.settings||{})};
  if (!state.settings.tpin) state.settings.tpin = "1020565534";

  function save() {
    try {
      localStorage.setItem(APP_KEY, JSON.stringify(state));
      $("#save-status").textContent = "Saved";
      return true;
    } catch (e) {
      alert("Could not save. Storage may be full. Try smaller product photos or download a backup.");
      return false;
    }
  }
  function notice(msg) {
    const el=$("#notice"); el.textContent=msg; el.classList.add("show");
    setTimeout(()=>el.classList.remove("show"),2300);
  }

  const css = `
  :root{--accent:#f47721;--accent-soft:#fff0e6;--accent-deep:#bd4d0b;--navy:#172033}body[data-theme="ocean"]{--accent:#1688c9;--accent-soft:#e8f5fc;--accent-deep:#08649b}body[data-theme="emerald"]{--accent:#15966b;--accent-soft:#e7f7f0;--accent-deep:#08734f}body[data-theme="midnight"]{--accent:#a78bfa;--accent-soft:#29243c;--accent-deep:#c4b5fd}body[data-theme="navy-gold"]{--accent:#c59a35;--accent-soft:#f8f1df;--accent-deep:#876318}
  *{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#172033;font:14px Inter,Arial,sans-serif}
  button,input,select,textarea{font:inherit}button{cursor:pointer;border:0;border-radius:9px;padding:10px 13px;background:var(--accent);color:white;font-weight:600;box-shadow:0 3px 9px #17203318;transition:.18s}button:hover{filter:brightness(.96);transform:translateY(-1px)}
  button.secondary{background:#edf0f4;color:#26364d;box-shadow:none}button.danger{background:#b42318}
  .top{background:linear-gradient(110deg,#071a35,#102d55);border-bottom:4px solid var(--accent);color:white;padding:15px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:76px}.top h1{font-size:20px;letter-spacing:.2px}.top small{display:inline-block;margin-left:8px;padding:5px 9px;border-radius:7px;background:var(--accent);font-size:11px;letter-spacing:.6px}
  .top h1{font-size:19px;margin:0}.shell{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:calc(100vh - 76px)}
  nav{background:linear-gradient(180deg,#091d39,#102b50);padding:16px 12px;border-right:1px solid #0b2444;color:white}nav button{display:block;width:100%;text-align:left;margin:4px 0;background:transparent;color:#e7edf7;border-radius:9px;padding:12px 13px;box-shadow:none;font-weight:600}
  nav button.active,nav button:hover{background:var(--accent);color:white;box-shadow:0 5px 14px #f4772144}
  main{padding:22px 24px;min-width:0;background:#f5f7fb}.page-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:18px}
  h2{margin:0 0 5px;font-size:22px}.muted{color:#68758a}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:18px}
  .card,.panel{background:white;border:1px solid #e3e8f0;border-radius:15px;padding:17px;box-shadow:0 5px 20px #1720330a}
  .metric{font-size:25px;font-weight:800;margin-top:8px;color:#172033;letter-spacing:-.5px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  input,select,textarea{width:100%;padding:10px;border:1px solid #ccd4df;border-radius:8px;background:white;color:#172033}
  label{display:block;font-weight:600;margin:10px 0 5px}.formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:10px;border-bottom:1px solid #edf0f4;vertical-align:middle}
  th{background:var(--accent-soft);color:var(--accent-deep);font-size:12px} .tablewrap{overflow:auto;border:1px solid #e4e8ef;border-radius:10px}
  .thumb{width:42px;height:42px;object-fit:cover;border-radius:7px;background:#edf1f6;vertical-align:middle;margin-right:8px}
  .tilegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}
  .tile{background:white;color:#172033;border:1px solid #e0e5ed;text-align:left;padding:9px;min-height:145px}
  .tile img{width:100%;height:82px;object-fit:cover;border-radius:6px;margin-bottom:6px}
  .tile strong,.tile span{display:block}.tile span{color:#66748a;margin-top:4px}
  .posgrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(270px,.8fr);gap:15px}
  .cartline{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #edf0f4}
  .modalback{position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;padding:15px;z-index:5}
  .modal{background:white;border-radius:14px;padding:20px;width:min(570px,100%);max-height:92vh;overflow:auto}
  .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.hidden{display:none!important}
  .install-button{margin-left:14px;padding:7px 10px;font-size:12px;background:#15966b}
  .install-backdrop{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:18px;background:#07162dcc}
  .install-card{width:min(440px,100%);padding:24px;border-radius:16px;background:#fff;box-shadow:0 24px 70px #0005}
  .install-card h2{margin:0 0 10px;font-size:21px}.install-card p{color:#5d6b80;line-height:1.55}
  .install-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
  #notice{position:fixed;bottom:18px;right:18px;background:#172033;color:white;padding:12px 17px;border-radius:9px;opacity:0;pointer-events:none;transition:.2s;z-index:9}
  #notice.show{opacity:1}.badge{padding:4px 7px;border-radius:20px;background:#e9eff8;font-size:12px}
  .page-title h2{letter-spacing:-.4px}.dash-welcome{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:17px}.dash-welcome h2{font-size:24px}.dash-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,.95fr) minmax(250px,.8fr);gap:14px;margin-bottom:14px}.dash-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:15px}.kpi{position:relative;overflow:hidden;color:#fff;border:0;min-height:112px;padding:17px 18px}.kpi:nth-child(1){background:linear-gradient(135deg,#123d75,#0b2345)}.kpi:nth-child(2){background:linear-gradient(135deg,#ff8b24,#e85b00)}.kpi:nth-child(3){background:linear-gradient(135deg,#16a36c,#08784e)}.kpi:nth-child(4){background:linear-gradient(135deg,#7952c8,#4b2c91)}.kpi .metric{color:#fff;font-size:24px}.kpi-label{font-weight:700;opacity:.95}.kpi-icon{position:absolute;right:15px;top:20px;font-size:30px;opacity:.25}.dash-panel-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 13px;font-size:17px}.dash-panel-title span{color:var(--accent);font-size:19px;margin-right:7px}.trend-svg{width:100%;height:210px;display:block}.trend-svg text{font:11px Arial;fill:#66748a}.trend-svg .gridline{stroke:#e8edf4;stroke-dasharray:3 4}.trend-svg .line{fill:none;stroke:var(--accent);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.trend-svg .dot{fill:white;stroke:var(--accent);stroke-width:3}.top-product{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid #edf0f5}.top-product:last-child{border-bottom:0}.product-mini{width:36px;height:36px;border-radius:9px;object-fit:cover;background:#f0f2f6}.bar-track{height:6px;background:#e9edf3;border-radius:8px;margin-top:6px;overflow:hidden}.bar-fill{height:100%;background:var(--accent);border-radius:8px}.quick-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.quick-product{background:#fff;color:#172033;border:1px solid #e5e9f0;padding:8px;text-align:center;box-shadow:none;min-height:105px}.quick-product img{width:100%;height:48px;object-fit:contain}.quick-product strong,.quick-product small{display:block}.quick-product small{color:#69758a;margin-top:3px}.inventory-flex{display:flex;align-items:center;gap:16px}.stock-ring{width:112px;height:112px;flex:0 0 112px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#16a36c 0 68%,#ff9b21 68% 88%,#e5484d 88% 100%);position:relative}.stock-ring:after{content:"";position:absolute;inset:12px;background:white;border-radius:50%}.stock-ring strong{z-index:1;font-size:24px}.stock-legend{display:grid;gap:10px;flex:1}.stock-legend div{display:flex;justify-content:space-between;gap:10px}.dot-green{color:#16a36c}.dot-orange{color:#f28b19}.dot-red{color:#e5484d}.activity-row{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #edf0f5}.activity-row:last-child{border:0}.activity-row small{color:#718096;white-space:nowrap}.dash-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.dash-shortcuts button{min-height:58px}.quick-scan{display:flex;gap:7px;margin-bottom:10px}.quick-scan input{min-width:0}.dash-footer{margin-top:14px;padding:12px 15px;border-radius:12px;background:#0b2343;color:#e8edf5;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px}.badge{background:var(--accent-soft);color:var(--accent-deep)}
   @media(max-width:1100px){.dash-grid{grid-template-columns:1fr 1fr}.dash-grid>.panel:last-child{grid-column:1/-1}}@media(max-width:800px){.shell{grid-template-columns:1fr}nav{display:flex;overflow:auto;border-right:0;border-bottom:1px solid #ddd;padding:8px}nav button{white-space:nowrap;width:auto;flex:0 0 auto}.posgrid{grid-template-columns:1fr}main{padding:13px}.top{padding:13px}.dash-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-grid{grid-template-columns:1fr}.dash-grid>.panel:last-child{grid-column:auto}.dash-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-welcome{align-items:flex-start;flex-direction:column}}
  @media print{nav,.top,.no-print,.modalback{display:none!important}.shell{display:block}main{padding:0}.receipt{max-width:80mm;margin:auto}}
   /* Premium Flavours secure login */
   .auth-backdrop{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 15% 10%,#f4772138,transparent 34%),radial-gradient(ellipse at 90% 90%,#1b477c55,transparent 38%),linear-gradient(135deg,#07162d,#102b4d 58%,#07172e);overflow:auto}
   .auth-card{width:min(460px,100%);background:#fff;border:1px solid #ffffff35;border-radius:24px;overflow:hidden;box-shadow:0 28px 90px #0008}
   .auth-brand{padding:28px 30px 24px;background:linear-gradient(135deg,#0a1e3a,#123761);color:#fff;position:relative;overflow:hidden}
   .auth-brand:after{content:"";position:absolute;width:190px;height:190px;border:1px solid #ffffff20;border-radius:50%;right:-72px;top:-90px;box-shadow:0 0 0 22px #ffffff08,0 0 0 46px #ffffff05}
   .auth-brandline{display:flex;align-items:center;gap:13px;position:relative;z-index:1}
   .auth-logo{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#ff9a42,#ed650c);font-size:25px;box-shadow:0 8px 22px #f4772150}
   .auth-brand h2{margin:0;font-size:19px;letter-spacing:.35px;color:#fff}
   .auth-brand p{margin:5px 0 0;color:#c8d7e9;font-size:11px;letter-spacing:1.4px;text-transform:uppercase}
   .auth-version{display:inline-block;margin-top:21px;padding:6px 10px;border:1px solid #ffffff26;border-radius:30px;color:#ffd0a8;font-size:10px;letter-spacing:1.2px;text-transform:uppercase}
   .auth-body{padding:29px 30px 30px}
   .auth-heading{font-size:23px;margin:0 0 7px;color:#14243b;letter-spacing:-.5px}
   .auth-description{color:#748196;margin:0 0 22px;line-height:1.5}
   .auth-body label{font-size:12px;color:#34445c;margin:15px 0 7px}
   .auth-body input{height:48px;border:1px solid #d9e0e9;border-radius:11px;padding:0 14px;font-size:16px;letter-spacing:2px}
   .auth-body input:focus{outline:none;border-color:#f47721;box-shadow:0 0 0 3px #f477211c}
   .auth-submit{width:100%;height:48px;margin-top:22px;border-radius:11px;background:linear-gradient(100deg,#f47721,#e95f0b);font-size:14px;box-shadow:0 8px 18px #f4772133}
   .auth-foot{padding-top:19px;margin-top:20px;border-top:1px solid #edf0f4;text-align:center;color:#8994a5;font-size:11px}
   .auth-foot strong{color:#516078}
   @media(max-width:520px){.auth-backdrop{padding:14px}.auth-brand{padding:23px}.auth-body{padding:24px}.auth-heading{font-size:21px}}
  `;

  const style=document.createElement("style"); style.textContent=css; document.head.appendChild(style);
  document.body.innerHTML = `
    <header class="top"><h1>🛒 FLAVOURS TECHS SOLUTIONS <small>V2.3 PROFESSIONAL EDITION</small></h1><span>Manage&nbsp; • &nbsp;Sell&nbsp; • &nbsp;Grow Your Business <button id="install-app" type="button" class="install-button">Install app</button><span style="margin-left:12px" id="save-status">Ready</span></span></header>
    <div class="shell"><nav id="nav"></nav><main id="app"></main></div>
    <div id="modal-root"></div><div id="notice"></div>
    <div class="install-backdrop hidden" id="install-prompt" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <section class="install-card"><h2 id="install-title">Install Flavours Business Manager</h2>
        <p id="install-message"></p><div class="install-actions">
          <button type="button" id="confirm-install">Install app</button>
          <button type="button" class="secondary" id="close-install">Not now</button>
        </div>
      </section>
    </div>`;
  let deferredInstallPrompt=null;
  const installPrompt=$("#install-prompt");
  const installButton=$("#install-app");
  const installMessage=$("#install-message");
  const installAction=$("#confirm-install");
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
  const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  function updateInstallPrompt(){
    if(isIOS){
      installMessage.textContent="On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen. iOS does not allow websites to open its install prompt automatically.";
      installAction.textContent="Show iOS steps";
    }else if(deferredInstallPrompt){
      installMessage.textContent="Install the app on this device for quick access and offline use.";
      installAction.textContent="Install app";
    }else if(!window.isSecureContext||!("serviceWorker" in navigator)){
      installMessage.textContent="For real installation, open this app from an HTTPS website (or localhost). Opening index.html directly from a file does not support app installation.";
      installAction.textContent="Installation requirements";
    }else{
      installMessage.textContent="Use your browser’s Install app option or install icon in the address bar. On Android, open the browser menu and choose Install app or Add to Home screen.";
      installAction.textContent="How to install";
    }
  }
  function openInstallPrompt(){
    if(isInstalled())return;
    updateInstallPrompt();
    installPrompt.classList.remove("hidden");
  }
  function closeInstallPrompt(){installPrompt.classList.add("hidden");}
  async function requestInstall(){
    if(isInstalled())return;
    if(!deferredInstallPrompt){openInstallPrompt();return;}
    const promptEvent=deferredInstallPrompt;
    deferredInstallPrompt=null;
    try{
      await promptEvent.prompt();
      const choice=await promptEvent.userChoice;
      if(choice.outcome==="accepted")closeInstallPrompt();
      else updateInstallPrompt();
    }catch(error){
      console.error("Could not open the browser install prompt:",error);
      notice("The browser could not open its install prompt. Use the install option in the browser menu.");
      openInstallPrompt();
    }
  }
  installButton.addEventListener("click",requestInstall);
  $("#close-install").addEventListener("click",closeInstallPrompt);
  installAction.addEventListener("click",requestInstall);
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    deferredInstallPrompt=event;
    updateInstallPrompt();
  });
  window.addEventListener("appinstalled",()=>{
    deferredInstallPrompt=null;
    closeInstallPrompt();
    installButton.classList.add("hidden");
    notice("Flavours Business Manager installed");
  });
  if(isInstalled())installButton.classList.add("hidden");
  if(window.isSecureContext&&"serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js").catch(error=>{
      console.error("Could not register the app service worker:",error);
    });
  }
  window.setTimeout(openInstallPrompt,500);
  const pages=["Dashboard","Point of Sale","Inventory","Barcode Manager","Customers","Suppliers","Purchases","Expenses","Reports","Cash Closing","Staff","Stock Alerts","Customer Payments","Supplier Accounts","Cash Shifts","Sales Returns","Activity Log","Settings","Backup & Restore"];
  let current="Dashboard";
  let sessionUser=null;
  const SUPABASE=window.FLAVOURS_SUPABASE||{};
  let supabaseSession=null;
  try{supabaseSession=JSON.parse(sessionStorage.getItem("flavoursSupabaseSession")||"null");}catch{}
  if(supabaseSession?.expires_at&&supabaseSession.expires_at*1000<Date.now())supabaseSession=null;
  function supabaseHeaders(extra={}){
    if(!SUPABASE.url||!SUPABASE.publishableKey)throw new Error("Supabase client configuration is missing");
    return {apikey:SUPABASE.publishableKey,Authorization:`Bearer ${supabaseSession?.access_token||SUPABASE.publishableKey}`,...extra};
  }
  async function supabaseAuth(email,password){
    const response=await fetch(`${SUPABASE.url}/auth/v1/token?grant_type=password`,{method:"POST",headers:supabaseHeaders({"Content-Type":"application/json"}),body:JSON.stringify({email,password})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.msg||data.message||data.error_description||"Supabase sign in failed");
    supabaseSession={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
    sessionStorage.setItem("flavoursSupabaseSession",JSON.stringify(supabaseSession));
    return data;
  }
  async function ensureSupabaseSession(){
    if(!supabaseSession?.access_token)throw new Error("Connect a Supabase account in Settings first");
    if(supabaseSession.expires_at*1000>Date.now()+60000)return;
    if(!supabaseSession.refresh_token)throw new Error("Supabase session expired. Sign in again in Settings.");
    const response=await fetch(`${SUPABASE.url}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:supabaseHeaders({"Content-Type":"application/json"}),body:JSON.stringify({refresh_token:supabaseSession.refresh_token})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){supabaseSession=null;sessionStorage.removeItem("flavoursSupabaseSession");throw new Error("Supabase session expired. Sign in again in Settings.");}
    supabaseSession={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
    sessionStorage.setItem("flavoursSupabaseSession",JSON.stringify(supabaseSession));
  }
  const CASHIER_PAGES=new Set(["Point of Sale","Customers","Cash Closing","Cash Shifts"]);
  function authHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return "fnv1a-"+(h>>>0).toString(16);}
  function security(){state.security=state.security&&typeof state.security==="object"?state.security:{admin:null};return state.security;}
  function isAdmin(){return !!sessionUser&&sessionUser.role==="Admin";}
  function showAuth(mode){
    const first=mode==="setup";
    $("#modal-root").innerHTML=`<div class="auth-backdrop"><section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <header class="auth-brand"><div class="auth-brandline"><div class="auth-logo">F</div><div><h2>FLAVOURS BUSINESS MANAGER</h2><p>Flavours Techs Solutions</p></div></div><span class="auth-version">Secure access · V2.3 Professional Edition</span></header>
      <div class="auth-body"><h2 class="auth-heading" id="auth-title">${first?"Set up administrator":"Welcome back"}</h2>
      <p class="auth-description">${first?"Create the owner account to secure your business workspace.":"Sign in with your administrator or cashier PIN to continue."}</p>
      <form id="auth-form">${first?'<label>Administrator name</label><input name="name" required value="Administrator" autocomplete="name">':''}
      <label>${first?"Administrator PIN":"Staff PIN"}</label><input name="pin" type="password" inputmode="numeric" minlength="4" required autocomplete="off" placeholder="Enter your PIN">
      ${first?'<label>Confirm administrator PIN</label><input name="confirm" type="password" inputmode="numeric" minlength="4" required autocomplete="off" placeholder="Confirm your PIN">':''}
      <button class="auth-submit">${first?"Create administrator account":"Sign in securely"}</button></form>
      <div class="auth-foot"><strong>FLAVOURS TECHS SOLUTIONS</strong><br>Business management made simple</div></div>
    </section></div>`;
    $("#auth-form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),pin=String(f.get("pin")||"");if(first){if(pin!==String(f.get("confirm"))){alert("PINs do not match.");return;}if(pin.length<4){alert("Use at least 4 digits.");return;}security().admin={name:String(f.get("name")||"Administrator"),pinHash:authHash(pin)};save();sessionUser={name:security().admin.name,role:"Admin"};$("#modal-root").innerHTML="";render();notice("Administrator account created");}else{const hash=authHash(pin),admin=security().admin,staff=state.staff.find(x=>x.pinHash===hash||(x.pin&&authHash(x.pin)===hash));if(admin&&admin.pinHash===hash){sessionUser={name:admin.name,role:"Admin"};}else if(staff){sessionUser={name:staff.name,role:(staff.role||"Cashier").toLowerCase()==="admin"?"Admin":"Cashier",staffId:staff.id};}else{alert("Incorrect PIN.");return;}$("#modal-root").innerHTML="";current=sessionUser.role==="Admin"?"Dashboard":"Point of Sale";render();audit("Login",`${sessionUser.name} signed in`);save();notice(`Welcome, ${sessionUser.name}`);}};
  }
  function requireAdmin(action="perform this action") {if(isAdmin())return true;alert(`Administrator permission is required to ${action}.`);return false;}
  function logout(){sessionUser=null;state.cart=[];save();showAuth("login");}


  function persistAndRender(){save();render();}
  function audit(action,details=""){
    state.auditLogs=Array.isArray(state.auditLogs)?state.auditLogs:[];
    state.auditLogs.push({id:id(),date:today(),time:new Date().toLocaleTimeString(),user:sessionUser?.name||"System",role:sessionUser?.role||"System",action,details:String(details||"")});
    if(state.auditLogs.length>2000)state.auditLogs=state.auditLogs.slice(-2000);
  }
  function activeShift(){return (state.shifts||[]).find(x=>x.status==="Open"&&(!x.userId||x.userId===sessionUser?.staffId||x.userId===sessionUser?.name));}
  function pageHeader(title, actions=""){return `<div class="page-title"><div><h2>${esc(title)}</h2><div class="muted">Flavours Techs Solutions</div></div><div class="toolbar no-print">${actions}</div></div>`;}
  function table(headers, rows){return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="muted">No records yet</td></tr>`}</tbody></table></div>`;}
  function renderNav(){
    const icons={"Dashboard":"▦","Point of Sale":"🛒","Inventory":"▣","Barcode Manager":"▥","Customers":"♟","Suppliers":"▰","Purchases":"🛍","Expenses":"▤","Reports":"▥","Cash Closing":"▣","Staff":"♟","Stock Alerts":"🔔","Customer Payments":"💳","Supplier Accounts":"🏦","Cash Shifts":"🧮","Sales Returns":"↩","Activity Log":"📋","Settings":"⚙","Backup & Restore":"◉"};
    const brand=`<div style="padding:10px 12px 20px;border-bottom:1px solid #ffffff20;margin-bottom:12px"><div style="font-size:18px;font-weight:800;line-height:1.2">🛒 FLAVOURS</div><div style="font-size:12px;letter-spacing:1px;color:#c8d4e5">TECHS SOLUTIONS</div><div style="font-size:11px;color:#ffad70;margin-top:5px">Smarter Business, Greater Profits</div></div>`;
    const footer=`<div style="margin:18px 7px 5px;padding:12px 9px;border-radius:10px;background:#f47721;color:#10233f;font-weight:700;font-size:11px">FLAVOURS BUSINESS MANAGER<br><span style="font-weight:400">V2.3 · Complete Professional Edition</span></div>`;
    const visiblePages=isAdmin()?pages:pages.filter(p=>CASHIER_PAGES.has(p));
    const account=`<div style="padding:10px;color:#dce6f5;font-size:12px">Signed in: <b>${esc(sessionUser?.name||"")}</b><br>${esc(sessionUser?.role||"")}<button id="logout" class="secondary" style="width:100%;margin-top:9px">Sign out</button></div>`;
    $("#nav").innerHTML=brand+visiblePages.map(p=>`<button data-page="${esc(p)}" class="${p===current?"active":""}"><span style="display:inline-block;width:25px">${icons[p]||"•"}</span>${esc(p)}</button>`).join("")+account+footer;
  }
  function render(){
    if(!sessionUser){showAuth(security().admin?"login":"setup");return;}
    if(!isAdmin()&&!CASHIER_PAGES.has(current))current="Point of Sale";
    document.body.dataset.theme=state.settings.theme||"orange";
    renderNav();
    const target=$("#app");
    const map={
      "Dashboard":renderDashboard,"Point of Sale":renderPOS,"Inventory":renderInventory,"Barcode Manager":renderInventory,
      "Customers":renderCustomers,"Suppliers":renderSuppliers,"Purchases":renderPurchases,
      "Expenses":renderExpenses,"Reports":renderReports,"Cash Closing":renderClosing,
      "Staff":renderStaff,"Stock Alerts":renderStockAlerts,"Customer Payments":renderCustomerPayments,"Supplier Accounts":renderSupplierAccounts,"Cash Shifts":renderCashShifts,"Sales Returns":renderSalesReturns,"Activity Log":renderActivityLog,"Settings":renderSettings,"Backup & Restore":renderBackup
    };
    target.innerHTML=(map[current]||renderDashboard)();
  }
  function showPage(p){current=p;render();}

  function renderDashboard(){
    const salesToday=state.sales.filter(s=>s.date===today()&&!s.refunded).reduce((n,s)=>n+Number(s.total||0),0);
    const expensesToday=state.expenses.filter(x=>x.date===today()).reduce((n,x)=>n+Number(x.amount||0),0);
    const stockValue=state.products.reduce((n,p)=>n+Number(p.stock||0)*Number(p.cost||0),0);
    const low=state.products.filter(p=>Number(p.stock)<=5&&Number(p.stock)>0).length;
    const out=state.products.filter(p=>Number(p.stock)<=0).length;
    const salesTotal=state.sales.filter(s=>!s.refunded).reduce((n,s)=>n+Number(s.total||0),0);
    const profitToday=salesToday-expensesToday;
    const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;return {key,label:d.toLocaleDateString(undefined,{weekday:"short"}),value:state.sales.filter(x=>x.date===key).reduce((n,x)=>n+Number(x.total||0),0)};});
    const max=Math.max(1,...last7.map(x=>x.value));
    const pts=last7.map((x,i)=>`${42+i*78},${174-(x.value/max)*132}`).join(" ");
    const topMap={};state.sales.filter(s=>!s.refunded).forEach(s=>(s.items||[]).forEach(x=>{const k=x.productId||x.name;topMap[k]??={name:x.name,qty:0,image:state.products.find(p=>String(p.id)===String(x.productId))?.image||""};topMap[k].qty+=Number(x.qty||0);}));
    const top=Object.values(topMap).sort((a,b)=>b.qty-a.qty).slice(0,5);
    const maxQty=Math.max(1,...top.map(x=>x.qty));
    const recent=[...state.sales.slice(-4).reverse().map(x=>({icon:"🛒",text:`Sale ${x.receiptNo||"recorded"} · ${money(x.total)}`,date:x.date||""})),...state.purchases.slice(-2).reverse().map(x=>({icon:"📦",text:`Purchase recorded · ${money(x.total)}`,date:x.date||""})),...state.expenses.slice(-2).reverse().map(x=>({icon:"🧾",text:`Expense · ${esc(x.description||"Business expense")}`,date:x.date||""}))].slice(0,5);
    const quick=state.products.filter(p=>Number(p.stock)>0).slice(0,4);
    return `<div class="dash-welcome"><div><h2>Welcome Back, Manager!</h2><div class="muted">Here's what's happening in your business today.</div></div><div class="muted">📅 ${new Date().toLocaleDateString()} · ${esc(state.settings.address||"Business dashboard")}</div></div>
      <div class="dash-kpis">
        <div class="card kpi"><div class="kpi-label">Total Sales (Today)</div><div class="metric">${money(salesToday)}</div><div style="font-size:12px;margin-top:5px">↗ Daily revenue</div><span class="kpi-icon">▥</span></div>
        <div class="card kpi"><div class="kpi-label">Total Transactions</div><div class="metric">${state.sales.filter(s=>s.date===today()).length}</div><div style="font-size:12px;margin-top:5px">Sales recorded today</div><span class="kpi-icon">🛒</span></div>
        <div class="card kpi"><div class="kpi-label">Sales Less Expenses (Today)</div><div class="metric">${money(profitToday)}</div><div style="font-size:12px;margin-top:5px">Sales less recorded expenses</div><span class="kpi-icon">▤</span></div>
        <div class="card kpi"><div class="kpi-label">Stock Items</div><div class="metric">${state.products.length}</div><div style="font-size:12px;margin-top:5px">${low} low · ${out} out of stock</div><span class="kpi-icon">▣</span></div>
      </div>
      <div class="dash-grid">
        <section class="panel"><h3 class="dash-panel-title"><span>▥</span>Sales Trend <small class="muted">Last 7 days</small></h3>
          <svg class="trend-svg" viewBox="0 0 520 215" role="img" aria-label="Sales trend for the last seven days"><line class="gridline" x1="38" y1="42" x2="500" y2="42"/><line class="gridline" x1="38" y1="86" x2="500" y2="86"/><line class="gridline" x1="38" y1="130" x2="500" y2="130"/><line class="gridline" x1="38" y1="174" x2="500" y2="174"/><polyline class="line" points="${pts}"/>${last7.map((x,i)=>`<circle class="dot" cx="${42+i*78}" cy="${174-(x.value/max)*132}" r="4"/><text x="${42+i*78}" y="198" text-anchor="middle">${x.label}</text>`).join("")}<text x="4" y="46">${money(max).replace(/\.00$/,"")}</text><text x="4" y="177">0</text></svg>
          <div class="muted" style="font-size:12px">7-day sales total: <strong>${money(last7.reduce((n,x)=>n+x.value,0))}</strong> · All-time sales: <strong>${money(salesTotal)}</strong></div>
        </section>
        <section class="panel"><h3 class="dash-panel-title"><span>🏆</span>Top Selling Products <button class="secondary" data-page="Reports" style="padding:6px 9px;font-size:11px">View reports</button></h3>
          ${top.length?top.map(x=>`<div class="top-product">${x.image?`<img class="product-mini" src="${esc(x.image)}">`:`<div class="product-mini" style="display:grid;place-items:center">📦</div>`}<div><strong>${esc(x.name)}</strong><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,x.qty/maxQty*100)}%"></div></div></div><small>${x.qty} sold</small></div>`).join(""):`<p class="muted">Sales product rankings will appear here after your first transactions.</p>`}
        </section>
        <section class="panel"><h3 class="dash-panel-title"><span>🛒</span>Quick POS</h3><div class="quick-scan"><input id="dash-pos-search" placeholder="Scan barcode or search product..."/><button id="dash-open-pos">Open</button></div><div class="quick-products">${quick.length?quick.map(p=>`<button class="quick-product" data-add-cart="${esc(p.id)}">${p.image?`<img src="${esc(p.image)}">`:`<div style="height:48px;font-size:27px">📦</div>`}<strong>${esc(p.name)}</strong><small>${money(p.price)}</small></button>`).join(""):`<p class="muted">Add products to start selling.</p>`}</div></section>
      </div>
      <div class="dash-grid" style="grid-template-columns:1fr 1fr 1fr">
        <section class="panel"><h3 class="dash-panel-title"><span>📦</span>Inventory Overview <button class="secondary" data-page="Inventory" style="padding:6px 9px;font-size:11px">View stock</button></h3><div class="inventory-flex"><div class="stock-ring"><strong>${state.products.length}</strong></div><div class="stock-legend"><div><span class="dot-green">● In stock</span><strong>${state.products.filter(p=>Number(p.stock)>5).length}</strong></div><div><span class="dot-orange">● Low stock</span><strong>${low}</strong></div><div><span class="dot-red">● Out of stock</span><strong>${out}</strong></div><div><span class="muted">Stock value</span><strong>${money(stockValue)}</strong></div></div></div></section>
        <section class="panel"><h3 class="dash-panel-title"><span>💰</span>Financial Summary</h3><div class="activity-row"><span>Total Sales</span><strong>${money(salesTotal)}</strong></div><div class="activity-row"><span>Total Expenses</span><strong>${money(state.expenses.reduce((n,x)=>n+Number(x.amount||0),0))}</strong></div><div class="activity-row"><span>Estimated Net</span><strong style="color:#15966b">${money(salesTotal-state.expenses.reduce((n,x)=>n+Number(x.amount||0),0))}</strong></div><div class="muted" style="font-size:11px;margin-top:8px">Estimate excludes cost of goods sold and tax.</div></section>
        <section class="panel"><h3 class="dash-panel-title"><span>🔔</span>Recent Activities</h3>${recent.length?recent.map(x=>`<div class="activity-row"><span>${x.icon} &nbsp;${x.text}</span><small>${esc(x.date)}</small></div>`).join(""):`<p class="muted">Recent sales and business activity will appear here.</p>`}</section>
      </div>
      <div class="dash-shortcuts"><button data-page="Point of Sale">🛒 &nbsp; New Sale</button><button data-page="Inventory">📦 &nbsp; Add / Manage Stock</button><button data-page="Barcode Manager">▥ &nbsp; Barcode Manager</button><button data-page="Backup & Restore">◉ &nbsp; Backup Data</button></div>
      <div class="dash-footer"><span>● System ready · Local storage active</span><span>${esc(state.settings.businessName)} · TPIN: ${esc(state.settings.tpin)}</span></div>`;
  }

  function renderPOS(){
    const cartTotal=state.cart.reduce((n,x)=>n+x.qty*x.price,0);
    return pageHeader("Point of Sale")+`<div class="posgrid"><section>
      <input id="pos-search" placeholder="Search products..." />
      <div class="tilegrid" id="pos-products">${posTiles()}</div>
    </section><section class="panel"><h3>Current sale</h3>
      <label>Customer</label><select id="sale-customer"><option value="">Walk-in customer</option>${state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select>
      <div id="cart-lines">${cartHTML()}</div><hr><p>Subtotal: <strong id="sale-subtotal">${money(cartTotal)}</strong></p>
      <label>Discount (%)</label><input id="sale-discount" type="number" min="0" max="100" step="0.01" value="0">
      <h2 id="sale-total">Total: ${money(cartTotal)}</h2>
      <label>Payment method</label><select id="sale-payment"><option>Cash</option><option>Mobile Money</option><option>Bank transfer</option><option>Card</option><option>Credit</option></select>
      <button id="complete-sale" style="width:100%;margin-top:12px">Complete sale & print receipt</button>
      <button class="secondary" id="clear-cart" style="width:100%;margin-top:7px">Clear cart</button>
    </section></div>`;
  }
  function posTiles(filter=""){
    const q=filter.toLowerCase().trim();const list=state.products.filter(p=>(p.name.toLowerCase().includes(q)||String(p.barcode||"").toLowerCase().includes(q)) && Number(p.stock)>0);
    return list.map(p=>`<button class="tile" data-add-cart="${esc(p.id)}">${p.image?`<img src="${esc(p.image)}">`:`<div style="height:82px;background:#eef1f6;border-radius:6px;display:grid;place-items:center">No photo</div>`}
      <strong>${esc(p.name)}</strong><span>${money(p.price)} · Stock ${Number(p.stock)||0}</span></button>`).join("")||`<p class="muted">No available products.</p>`;
  }
  function cartHTML(){
    return state.cart.map(x=>`<div class="cartline"><div><strong>${esc(x.name)}</strong><br><small>${money(x.price)} × ${x.qty}</small></div>
      <div><strong>${money(x.price*x.qty)}</strong><br><button class="secondary" data-cart-minus="${esc(x.productId)}">−</button> <button class="secondary" data-cart-plus="${esc(x.productId)}">+</button> <button class="danger" data-cart-remove="${esc(x.productId)}">×</button></div></div>`).join("")||`<p class="muted">Cart is empty.</p>`;
  }
  function refreshCart(){save();$("#cart-lines").innerHTML=cartHTML();updateSaleTotals();}
  function updateSaleTotals(){const sub=state.cart.reduce((n,x)=>n+x.qty*x.price,0);const d=Math.min(100,Math.max(0,Number($("#sale-discount")?.value)||0));const total=sub*(1-d/100);if($("#sale-subtotal"))$("#sale-subtotal").textContent=money(sub);if($("#sale-total"))$("#sale-total").textContent="Total: "+money(total);return {subtotal:sub,discountPercent:d,discountAmount:sub-total,total};}
  function addToCart(pid){
    const p=state.products.find(x=>String(x.id)===String(pid));if(!p)return;
    const line=state.cart.find(x=>String(x.productId)===String(pid));
    if(line){if(line.qty>=Number(p.stock)){notice("Not enough stock");return;}line.qty++;}
    else state.cart.push({productId:p.id,name:p.name,price:Number(p.price)||0,qty:1});
    refreshCart();
  }

  function productCategories(){
    return [...new Set([...(state.categories||[]), ...state.products.map(p=>String(p.type||"General").trim()).filter(Boolean)])].sort((a,b)=>a.localeCompare(b));
  }
  function categoryOptions(selected=""){
    return `<option value="">Choose category</option>${productCategories().map(c=>`<option value="${esc(c)}" ${c===selected?"selected":""}>${esc(c)}</option>`).join("")}`;
  }
  function openCategoryManager(){
    const cats=productCategories();
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>Manage product categories</h2><p class="muted">Create categories such as Bar Products, Groceries and Stationery. Existing products keep their current category.</p>
      <form id="category-form"><label>New category name</label><input name="category" required maxlength="40" placeholder="e.g. Bakery"><div class="actions"><button type="button" class="secondary" id="cancel-modal">Close</button><button>Add category</button></div></form>
      <hr><h3>Available categories</h3><div id="category-list">${cats.map(c=>`<div class="activity-row"><span>${esc(c)}</span><span class="badge">${state.products.filter(p=>String(p.type||"General")===c).length} products</span></div>`).join("")}</div>
      </div></div>`;
    $("#cancel-modal").onclick=()=>$("#modal-root").innerHTML="";
    $("#category-form").onsubmit=e=>{e.preventDefault();const name=String(new FormData(e.target).get("category")||"").trim();if(!name)return;if(productCategories().some(c=>c.toLowerCase()===name.toLowerCase())){alert("That category already exists.");return;}state.categories.push(name);save();openCategoryManager();notice("Category added");};
  }

  function renderInventory(filter=""){
    const selected=filter||"";
    const allProducts=state.products;
    const categories=selected?[selected]:productCategories();
    const visible=allProducts.filter(p=>!selected||String(p.type||"General")===selected);
    const headers=["Product","Cost","Selling price","Stock","Actions"];
    const totalStock=visible.reduce((sum,p)=>sum+(Number(p.stock)||0),0);
    const totalCostValue=visible.reduce((sum,p)=>sum+(Number(p.stock)||0)*(Number(p.cost)||0),0);
    const totalSellingValue=visible.reduce((sum,p)=>sum+(Number(p.stock)||0)*(Number(p.price)||0),0);
    const sections=categories.map(category=>{
      const items=visible.filter(p=>String(p.type||"General")===category);
      const categoryStock=items.reduce((sum,p)=>sum+(Number(p.stock)||0),0);
      const categoryCostValue=items.reduce((sum,p)=>sum+(Number(p.stock)||0)*(Number(p.cost)||0),0);
      const categorySellingValue=items.reduce((sum,p)=>sum+(Number(p.stock)||0)*(Number(p.price)||0),0);
      const rows=items.map(p=>`<tr><td>${p.image?`<img class="thumb" src="${esc(p.image)}">`:`<span class="thumb" style="display:inline-block"></span>`}${esc(p.name)}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${Number(p.stock)||0}</td><td><button class="secondary" data-edit-product="${esc(p.id)}">Edit</button> <button class="secondary" data-print-barcode="${esc(p.id)}">Print label</button> <button class="danger" data-delete-product="${esc(p.id)}">Delete</button></td></tr>`).join("");
      return `<section class="panel" style="margin:0 0 18px;padding:0;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:15px 18px;background:linear-gradient(100deg,#102b4d,#173d65);color:#fff"><div style="font-weight:800;letter-spacing:.7px;text-transform:uppercase">${esc(category)}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><span style="background:#ffffff20;border:1px solid #ffffff35;border-radius:20px;padding:4px 10px;font-size:12px">${items.length} product(s)</span><span style="background:#f47721;border:1px solid #ffffff35;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700">${categoryStock} units in stock</span><span style="background:#ffffff20;border:1px solid #ffffff35;border-radius:20px;padding:4px 10px;font-size:12px">Cost value: ${money(categoryCostValue)}</span><span style="background:#ffffff20;border:1px solid #ffffff35;border-radius:20px;padding:4px 10px;font-size:12px">Selling value: ${money(categorySellingValue)}</span></div></div><div style="padding:12px">${items.length?table(headers,rows):`<p class="muted" style="margin:8px 4px">No products in this category yet. Use Add product and select <strong>${esc(category)}</strong>.</p>`}</div></section>`;
    }).join("");
    return pageHeader("Inventory",`<button class="secondary" id="manage-categories">Manage categories</button><button id="add-product">Add product</button>`)+
      `<div class="cards" style="margin-bottom:14px"><div class="card"><div class="muted">Total products</div><div class="metric">${visible.length}</div><div class="muted" style="font-size:12px">${selected?`In ${esc(selected)}`:"Across all categories"}</div></div><div class="card"><div class="muted">Total stock quantity</div><div class="metric">${totalStock}</div><div class="muted" style="font-size:12px">Units currently in stock</div></div><div class="card"><div class="muted">Inventory cost value</div><div class="metric">${money(totalCostValue)}</div><div class="muted" style="font-size:12px">Current stock × cost price</div></div><div class="card"><div class="muted">Potential selling value</div><div class="metric">${money(totalSellingValue)}</div><div class="muted" style="font-size:12px">Current stock × selling price</div></div></div>`+
      `<div class="panel" style="margin-bottom:14px"><div class="formgrid"><div><label>View category</label><select id="inventory-category"><option value="">All categories (${state.products.length})</option>${productCategories().map(c=>`<option value="${esc(c)}" ${selected===c?"selected":""}>${esc(c)} (${state.products.filter(p=>String(p.type||"General")===c).length})</option>`).join("")}</select></div><div><label>Products shown</label><div style="padding:11px 0;font-weight:700">${visible.length} product(s)</div></div></div></div>`+
      (sections||`<div class="panel"><p class="muted">No product categories yet. Add a category, then add products to it.</p></div>`);
  }
  function openProductModal(product=null){
    const p=product||{name:"",type:"General",barcode:"",cost:0,price:0,stock:0,image:""};
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>${product?"Edit":"Add"} product</h2>
      <form id="product-form"><input type="hidden" name="id" value="${esc(p.id||"")}">
      <label>Product name</label><input name="name" required value="${esc(p.name)}">
      <div class="formgrid"><div><label>Barcode / SKU</label><input name="barcode" value="${esc(p.barcode||"")}" placeholder="Scan or enter barcode"></div><div><label>Product category</label><select name="type" required>${categoryOptions(p.type||"General")}</select></div><div><label>Quantity in stock</label><input name="stock" type="number" min="0" step="1" required value="${Number(p.stock)||0}"></div>
      <div><label>Cost price</label><input name="cost" type="number" min="0" step=".01" required value="${Number(p.cost)||0}"></div><div><label>Selling price</label><input name="price" type="number" min="0" step=".01" required value="${Number(p.price)||0}"></div><div><label>Low-stock alert level</label><input name="reorderLevel" type="number" min="0" step="1" value="${Number(p.reorderLevel??5)}"></div><div><label>Expiry date (optional)</label><input name="expiryDate" type="date" value="${esc(p.expiryDate||"")}"></div></div>
      <label>Product photo</label><input id="product-photo" type="file" accept="image/*">
      <div style="margin-top:9px">${p.image?`<img id="photo-preview" src="${esc(p.image)}" style="max-width:130px;max-height:110px;object-fit:contain">`:`<img id="photo-preview" class="hidden" style="max-width:130px;max-height:110px;object-fit:contain">`}</div>
      <button type="button" class="secondary" id="remove-photo">Remove photo</button>
      <div class="actions"><button type="button" class="secondary" id="cancel-modal">Cancel</button><button>Save product</button></div></form></div></div>`;
    let image=p.image||"";
    $("#product-photo").addEventListener("change",async e=>{
      const file=e.target.files[0];if(!file)return;
      try{image=await compressImage(file);const img=$("#photo-preview");img.src=image;img.classList.remove("hidden");}
      catch(err){alert("Could not process this image.");}
    });
    $("#remove-photo").onclick=()=>{image="";$("#photo-preview").classList.add("hidden");$("#product-photo").value="";};
    $("#cancel-modal").onclick=()=>$("#modal-root").innerHTML="";
    $("#product-form").onsubmit=e=>{
      e.preventDefault();const f=new FormData(e.target), old=state.products.find(x=>String(x.id)===String(f.get("id")));
      const barcode=String(f.get("barcode")||"").trim();
      if(barcode&&state.products.some(x=>String(x.barcode||"")===barcode&&String(x.id)!==String(old?.id||""))){alert("That barcode is already assigned to another product.");return;}
      const record={id:old?.id||id(),name:String(f.get("name")).trim(),barcode,type:String(f.get("type")).trim(),
        cost:Number(f.get("cost")),price:Number(f.get("price")),stock:Number(f.get("stock")),reorderLevel:Number(f.get("reorderLevel")||5),expiryDate:String(f.get("expiryDate")||""),image};
      if(old)Object.assign(old,record);else state.products.push(record);
      audit(old?"Product updated":"Product created",`${record.name} · stock ${record.stock}`);
      $("#modal-root").innerHTML="";persistAndRender();notice("Product saved");
    };
  }
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();img.onerror=reject;
        img.onload=()=>{
          const max=650,scale=Math.min(1,max/Math.max(img.width,img.height));
          const canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
          canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL("image/jpeg",.76));
        };img.src=reader.result;
      };reader.readAsDataURL(file);
    });
  }

  function renderCustomers(){
    const rows=state.customers.map(c=>{const buys=state.sales.filter(x=>!x.refunded&&String(x.customerId)===String(c.id));const spent=buys.reduce((n,x)=>n+Number(x.total||0),0);return `<tr><td>${esc(c.name)}</td><td>${esc(c.phone||"")}</td><td>${esc(c.email||"")}</td><td>${buys.length}</td><td>${money(spent)}</td><td>${money(c.balance||0)}</td><td><button class="secondary" data-customer-payment="${esc(c.id)}">Record payment</button> <button class="danger" data-delete-customer="${esc(c.id)}">Delete</button></td></tr>`;}).join("");
    const debt=state.customers.reduce((n,c)=>n+Number(c.balance||0),0);
    return pageHeader("Customers",`<button id="add-customer">Add customer</button><button class="secondary" data-page="Customer Payments">Payment history</button>`)+`<div class="cards"><div class="card"><div class="muted">Customers</div><div class="metric">${state.customers.length}</div></div><div class="card"><div class="muted">Outstanding customer debt</div><div class="metric">${money(debt)}</div></div></div>`+table(["Name","Phone","Email","Purchases","Total spent","Balance due","Actions"],rows);
  }
  function renderSuppliers(){
    const rows=state.suppliers.map(s=>{const bought=state.purchases.filter(p=>String(p.supplierId)===String(s.id)).reduce((n,p)=>n+Number(p.total||0),0);const paid=state.supplierPayments.filter(p=>String(p.supplierId)===String(s.id)).reduce((n,p)=>n+Number(p.amount||0),0);return `<tr><td>${esc(s.name)}</td><td>${esc(s.phone||"")}</td><td>${esc(s.address||"")}</td><td>${money(bought-paid)}</td><td><button class="secondary" data-supplier-payment="${esc(s.id)}">Record payment</button> <button class="danger" data-delete-supplier="${esc(s.id)}">Delete</button></td></tr>`;}).join("");
    return pageHeader("Suppliers",`<button id="add-supplier">Add supplier</button><button class="secondary" data-page="Supplier Accounts">Account history</button>`)+table(["Supplier","Phone","Address","Balance due","Actions"],rows);
  }
  function renderPurchases(){
    const rows=state.purchases.slice().reverse().map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(state.suppliers.find(s=>String(s.id)===String(p.supplierId))?.name||"—")}</td><td>${money(p.total)}</td><td>${esc(p.status||"Recorded")}</td></tr>`).join("");
    return pageHeader("Purchases",`<button id="add-purchase">Record purchase</button>`)+table(["Date","Supplier","Total","Status"],rows);
  }
  function renderExpenses(){
    const rows=state.expenses.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td>${esc(x.category||"")}</td><td>${money(x.amount)}</td><td>${esc(x.payment||"")}</td></tr>`).join("");
    return pageHeader("Expenses",`<button id="add-expense">Add expense</button>`)+table(["Date","Description","Category","Amount","Payment"],rows);
  }
  function renderReports(){
    const from=window.reportFrom||"",to=window.reportTo||"";
    const sales=state.sales.filter(s=>(!from||s.date>=from)&&(!to||s.date<=to));
    const activeSales=sales.filter(s=>!s.refunded);
    const total=activeSales.reduce((n,s)=>n+Number(s.total||0),0);
    const paid=activeSales.filter(s=>s.payment!=="Credit").reduce((n,s)=>n+Number(s.total||0),0);
    const expenses=state.expenses.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to)).reduce((n,x)=>n+Number(x.amount||0),0);
    const profitSales=activeSales.filter(s=>(s.items||[]).length>0&&(s.items||[]).every(x=>x.costAtSale!==undefined));
    const profitRevenue=profitSales.reduce((n,s)=>n+Number(s.total||0),0);
    const cogs=profitSales.reduce((n,s)=>n+(s.items||[]).reduce((m,x)=>m+Number(x.costAtSale||0)*Number(x.qty||0),0),0);
    const known=profitSales.length>0;
    const gross=profitRevenue-cogs;
    const paymentTypes=["Cash","Mobile Money","Bank transfer","Card","Credit"];
    const paymentRows=paymentTypes.map(method=>`<tr><td>${method}</td><td>${money(activeSales.filter(s=>s.payment===method).reduce((n,s)=>n+Number(s.total||0),0))}</td><td>${activeSales.filter(s=>s.payment===method).length}</td></tr>`).join("");
    const rows=sales.slice().reverse().map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.receiptNo)}</td><td>${esc(state.customers.find(c=>String(c.id)===String(s.customerId))?.name||"Walk-in")}</td><td>${esc(s.cashierName||"—")}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td><td>${s.refunded?"Refunded":`<button class="danger" data-refund-sale="${esc(s.id)}">Refund / void</button>`}</td></tr>`).join("");
    return pageHeader("Reports & Business Intelligence",`<button id="export-sales-csv">Export sales CSV</button><button class="secondary" id="export-products-csv">Export inventory CSV</button>`)+
      `<div class="panel" style="margin-bottom:14px"><div class="formgrid"><div><label>From date</label><input id="report-from" type="date" value="${esc(from)}"></div><div><label>To date</label><input id="report-to" type="date" value="${esc(to)}"></div></div><button id="apply-report-range" style="margin-top:10px">Apply date range</button> <button class="secondary" id="reset-report-range">All dates</button></div>`+
      `<div class="cards"><div class="card"><div class="muted">Sales revenue</div><div class="metric">${money(total)}</div></div><div class="card"><div class="muted">Paid sales</div><div class="metric">${money(paid)}</div></div><div class="card"><div class="muted">Cost of goods sold</div><div class="metric">${known?money(cogs):"Not available"}</div></div><div class="card"><div class="muted">Gross profit</div><div class="metric">${known?money(gross):"Not available"}</div></div><div class="card"><div class="muted">Expenses</div><div class="metric">${money(expenses)}</div></div><div class="card"><div class="muted">Net after expenses</div><div class="metric">${known?money(gross-expenses):"Not available"}</div></div></div>`+
      `<div class="panel" style="margin-bottom:14px"><h3>Sales by payment method</h3>${table(["Payment method","Total","Transactions"],paymentRows)}</div><h3>Sales transactions</h3>${table(["Date","Receipt","Customer","Cashier","Payment","Total","Action"],rows)}<p class="muted">Gross profit is calculated only from transactions with a saved cost-price snapshot (V2.3 onward). Older sales are excluded from gross-profit calculations. Expenses shown are for the selected date range; net-after-expenses is an estimate when older sales are present.</p>`;
  }
  function renderClosing(){
    const date=today(), sales=state.sales.filter(s=>s.date===date&&!s.refunded).reduce((n,s)=>n+Number(s.total||0),0);
    const expenses=state.expenses.filter(x=>x.date===date).reduce((n,x)=>n+Number(x.amount||0),0);
    const paymentTotals=["Cash","Mobile Money","Bank transfer","Card","Credit"].map(m=>({m,v:state.sales.filter(x=>x.date===date&&!x.refunded&&x.payment===m).reduce((n,x)=>n+Number(x.total||0),0)}));
    const refundsToday=state.salesReturns.filter(x=>x.date===date).reduce((n,x)=>n+Number(x.amount||0),0);
    const old=state.closings.find(x=>x.date===date);
    return pageHeader("Daily Cash Closing")+`<div class="panel"><h3>${date}</h3><p>Sales: <strong>${money(sales)}</strong></p><p>Expenses: <strong>${money(expenses)}</strong></p><p>Expected balance (all sales less expenses): <strong>${money(sales-expenses)}</strong></p><p>Refunds / voids: <strong>${money(refundsToday)}</strong></p><div>${paymentTotals.map(x=>`<p>${x.m}: <strong>${money(x.v)}</strong></p>`).join("")}</div><label>Actual cash counted</label><input id="closing-cash" type="number" min="0" step=".01" value="${old?.cash??""}"><label>Notes</label><textarea id="closing-notes">${esc(old?.notes||"")}</textarea><button id="save-closing" style="margin-top:12px">Save daily closing</button></div>`;
  }
  function renderStaff(){
    const rows=state.staff.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.role||"Staff")}</td><td>••••••</td><td><button class="danger" data-delete-staff="${esc(s.id)}">Delete</button></td></tr>`).join("");
    return pageHeader("Staff & Access",`<button id="add-staff">Add staff member</button>`)+table(["Name","Role","PIN",""],rows)+`<p class="muted">PINs are stored as hashes for normal app login. Offline browser security is not tamper-proof if someone has access to the computer and app files.</p>`;
  }
  function renderStockAlerts(){
    const low=state.products.filter(p=>Number(p.stock)>0&&Number(p.stock)<=Number(p.reorderLevel??5));
    const out=state.products.filter(p=>Number(p.stock)<=0);
    const soon=state.products.filter(p=>p.expiryDate&&p.expiryDate<=new Date(Date.now()+30*86400000).toISOString().slice(0,10)).sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate));
    const rows=list=>list.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.type||"General")}</td><td>${Number(p.stock)||0}</td><td>${Number(p.reorderLevel??5)}</td><td>${esc(p.expiryDate||"—")}</td><td><button class="secondary" data-stock-adjust="${esc(p.id)}">Adjust stock</button></td></tr>`).join("");
    return pageHeader("Smart Stock Alerts",`<button class="secondary" data-page="Inventory">Manage inventory</button>`)+`<div class="cards"><div class="card"><div class="muted">Low stock</div><div class="metric">${low.length}</div></div><div class="card"><div class="muted">Out of stock</div><div class="metric">${out.length}</div></div><div class="card"><div class="muted">Expiring within 30 days / expired</div><div class="metric">${soon.length}</div></div></div><h3>Low stock products</h3>${table(["Product","Category","Stock","Alert at","Expiry","Action"],rows(low))}<h3 style="margin-top:18px">Out of stock</h3>${table(["Product","Category","Stock","Alert at","Expiry","Action"],rows(out))}<h3 style="margin-top:18px">Expiry watch</h3>${table(["Product","Category","Stock","Alert at","Expiry","Action"],rows(soon))}`;
  }
  function renderCustomerPayments(){const rows=state.customerPayments.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(state.customers.find(c=>String(c.id)===String(x.customerId))?.name||"Unknown")}</td><td>${money(x.amount)}</td><td>${esc(x.method||"Cash")}</td><td>${esc(x.note||"")}</td></tr>`).join("");return pageHeader("Customer Payment History")+table(["Date","Customer","Amount","Method","Note"],rows);}
  function renderSupplierAccounts(){const rows=state.suppliers.map(s=>{const bought=state.purchases.filter(p=>String(p.supplierId)===String(s.id)).reduce((n,p)=>n+Number(p.total||0),0);const paid=state.supplierPayments.filter(p=>String(p.supplierId)===String(s.id)).reduce((n,p)=>n+Number(p.amount||0),0);return `<tr><td>${esc(s.name)}</td><td>${money(bought)}</td><td>${money(paid)}</td><td>${money(bought-paid)}</td></tr>`;}).join("");const hist=state.supplierPayments.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(state.suppliers.find(s=>String(s.id)===String(x.supplierId))?.name||"Unknown")}</td><td>${money(x.amount)}</td><td>${esc(x.method||"Cash")}</td></tr>`).join("");return pageHeader("Supplier Accounts")+`<h3>Supplier balances</h3>${table(["Supplier","Purchases","Payments made","Balance due"],rows)}<h3 style="margin-top:18px">Payment history</h3>${table(["Date","Supplier","Amount","Method"],hist)}`;}
  function renderCashShifts(){const open=activeShift();const shifts=state.shifts.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.userName||"Staff")}</td><td>${money(x.openingCash)}</td><td>${x.status==="Closed"?money(x.countedCash):"Open"}</td><td>${esc(x.status)}</td><td>${esc(x.closedAt||"")}</td></tr>`).join("");const shiftSales=open?state.sales.filter(s=>s.shiftId===open.id):[];const cash=shiftSales.filter(s=>s.payment==="Cash").reduce((n,s)=>n+Number(s.total||0),0)-state.salesReturns.filter(r=>r.method==="Cash"&&state.sales.find(s=>s.id===r.saleId)?.shiftId===open?.id).reduce((n,r)=>n+Number(r.amount||0),0);const expected=Number(open?.openingCash||0)+cash;return pageHeader("Cashier Shifts & Reconciliation")+(open?`<div class="panel"><h3>Active shift · ${esc(open.userName||"")}</h3><p>Opening float: <strong>${money(open.openingCash)}</strong></p><p>Cash sales in shift: <strong>${money(cash)}</strong></p><p>Expected cash: <strong>${money(expected)}</strong></p><label>Actual cash counted</label><input id="shift-counted" type="number" min="0" step=".01"><label>Closing notes</label><textarea id="shift-notes"></textarea><button id="close-shift" style="margin-top:10px">Close shift & reconcile</button></div>`:`<div class="panel"><h3>No active shift</h3><label>Opening cash float</label><input id="shift-opening" type="number" min="0" step=".01" value="0"><button id="start-shift" style="margin-top:10px">Start cashier shift</button></div>`)+`<h3 style="margin-top:18px">Shift history</h3>${table(["Date","Cashier","Opening float","Counted cash","Status","Closed at"],shifts)}`;}
  function renderSalesReturns(){const rows=state.salesReturns.slice().reverse().map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.receiptNo)}</td><td>${esc(r.customerName||"Walk-in")}</td><td>${money(r.amount)}</td><td>${esc(r.method||"")}</td><td>${esc(r.authorizedBy||"")}</td><td>${esc(r.reason||"")}</td></tr>`).join("");return pageHeader("Sales Returns & Voids")+`<p class="muted">Full-sale refunds only. Each refund requires administrator authorization, restores returned stock and is recorded in the audit history.</p>`+table(["Date","Receipt","Customer","Refund amount","Method","Authorized by","Reason"],rows);}
  function renderActivityLog(){const rows=state.auditLogs.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.user)}</td><td>${esc(x.role)}</td><td>${esc(x.action)}</td><td>${esc(x.details)}</td></tr>`).join("");return pageHeader("Activity & Audit Log",`<button class="secondary" id="export-activity">Export log CSV</button>`)+table(["Date","Time","User","Role","Action","Details"],rows);}
  function renderSettings(){
    const s=state.settings;
    return pageHeader("Settings")+`<div class="panel"><form id="settings-form">
      <label>Business name</label><input name="businessName" required value="${esc(s.businessName)}">
      <div class="formgrid"><div><label>Phone</label><input name="phone" value="${esc(s.phone)}"></div><div><label>Currency symbol</label><input name="currency" value="${esc(s.currency)}"></div></div>
      <label>Business address</label><input name="address" value="${esc(s.address)}">
      <label>POS theme</label><select name="theme"><option value="orange" ${s.theme==="orange"?"selected":""}>Orange & Navy</option><option value="navy-gold" ${s.theme==="navy-gold"?"selected":""}>Navy & Gold</option><option value="ocean" ${s.theme==="ocean"?"selected":""}>Ocean Blue</option><option value="emerald" ${s.theme==="emerald"?"selected":""}>Emerald Green</option><option value="midnight" ${s.theme==="midnight"?"selected":""}>Midnight</option></select>
      <label>Cloud sync API endpoint (optional)</label><input name="cloudSyncEndpoint" type="url" placeholder="https://your-domain.com/api/sync" value="${esc(s.cloudSyncEndpoint||"")}"><label>Cloud sync access token</label><input name="cloudSyncToken" type="password" autocomplete="new-password" placeholder="API key supplied by your server" value="${esc(s.cloudSyncToken||"")}"><p class="muted">Offline-first: records remain on this device. Supabase sign-in below enables private cloud backup using your Supabase Auth account.</p>
      <label>Company TPIN (10 digits)</label><input name="tpin" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" required value="${esc(s.tpin)}">
      <p class="muted">The TPIN entered here will be printed on customer receipts. This does not connect the app to ZRA Smart Invoice.</p>
      <button style="margin-top:12px">Save settings</button></form><hr><h3>Supabase secure sign-in</h3><p class="muted">Sign in with an account created in Supabase Authentication. Your cloud backup is private to that signed-in account. Staff continue to use their existing POS PINs.</p>${supabaseSession?.user?`<p>Connected as <strong>${esc(supabaseSession.user.email||"Supabase user")}</strong>.</p><button type="button" class="secondary" id="supabase-signout">Disconnect Supabase</button>`:`<form id="supabase-login-form"><label>Supabase account email</label><input name="email" type="email" autocomplete="username" required><label>Supabase account password</label><input name="password" type="password" autocomplete="current-password" required><button style="margin-top:10px">Connect Supabase account</button></form>`}<hr><h3>Cloud synchronisation</h3><p class="muted">Cloud upload stores the complete business backup, including staff PIN hashes and TPIN. Only sync to your own Supabase account.</p><div class="toolbar"><button id="cloud-upload">Upload to cloud</button><button class="secondary" id="cloud-download">Restore from cloud</button></div><p class="muted" id="cloud-status">${supabaseSession?.user?"Supabase connected":"Supabase not connected"}</p></div>`;
  }
  function renderBackup(){
    const last=state.settings.lastBackupAt?new Date(state.settings.lastBackupAt).toLocaleString():"No backup recorded on this device";const backupDue=!state.settings.lastBackupAt||(Date.now()-new Date(state.settings.lastBackupAt).getTime()>7*86400000);return pageHeader("Backup & Restore")+`<div class="panel"><h3>Download a backup</h3><p class="muted">Last local backup: ${esc(last)}. Download a fresh backup regularly and store a copy outside this computer.</p>${backupDue?`<p style="padding:10px;border-radius:9px;background:#fff2e8;color:#9a3e08;font-weight:700">Backup reminder: no recent backup is recorded. Create one now to protect your business records.</p>`:`<p style="color:#16845a;font-weight:700">Backup reminder: a recent backup is recorded.</p>`}<p class="muted">Includes products, photos, categories, sales, customers and payment history, suppliers and payments, purchases, expenses, cash shifts, activity logs, staff, settings and TPIN.</p><button id="download-backup">Download backup JSON</button><hr><h3>Restore a backup</h3><p class="muted">Restoring replaces the records currently in this app. Download a backup first.</p><input id="restore-file" type="file" accept="application/json"><button id="restore-backup" style="margin-top:10px">Restore selected backup</button></div>`;
  }

  function openSimpleForm(title, fields, onSave){
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>${title}</h2><form id="simple-form">${fields.map(f=>`<label>${esc(f.label)}</label><input name="${esc(f.name)}" type="${f.type||"text"}" ${f.required?"required":""} value="${esc(f.value||"")}">`).join("")}<div class="actions"><button type="button" class="secondary" id="cancel-modal">Cancel</button><button>Save</button></div></form></div></div>`;
    $("#cancel-modal").onclick=()=>$("#modal-root").innerHTML="";
    $("#simple-form").onsubmit=e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(e.target)));$("#modal-root").innerHTML="";persistAndRender();};
  }
  function printReceipt(s){
    const lines=s.items.map(x=>`<tr><td>${esc(x.name)} × ${x.qty}</td><td>${money(x.price*x.qty)}</td></tr>`).join("");
    const w=window.open("","_blank","width=420,height=650");if(!w){alert("Allow pop-ups to print receipts.");return;}
    w.document.write(`<!doctype html><html><head><title>Receipt ${esc(s.receiptNo)}</title><style>body{font:13px Arial;padding:18px}h2{text-align:center}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px dashed #aaa}.right{text-align:right}</style></head><body><div class="receipt"><h2>${esc(state.settings.businessName)}</h2><p style="text-align:center">${esc(state.settings.address)}<br>${esc(state.settings.phone)}<br>TPIN: ${esc(state.settings.tpin)}</p><hr><p>Receipt: ${esc(s.receiptNo)}<br>Date: ${esc(s.date)}<br>Payment: ${esc(s.payment)}</p><table>${lines}</table>${s.discountAmount?`<p>Subtotal: ${money(s.subtotal)}<br>Discount (${s.discountPercent}%): -${money(s.discountAmount)}</p>`:""}<h3 class="right">TOTAL: ${money(s.total)}</h3><p style="text-align:center">Thank you for shopping with us!</p></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  document.addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.id==="supabase-signout"){
      if(!confirm("Disconnect this browser from Supabase? Local business data remains on this device."))return;
      supabaseSession=null;sessionStorage.removeItem("flavoursSupabaseSession");showPage("Settings");notice("Supabase disconnected");return;
    }
    if(b.id==="logout"){audit("Logout");save();logout();return;}
    if(b.dataset.customerPayment){const c=state.customers.find(x=>String(x.id)===b.dataset.customerPayment);if(c)openSimpleForm(`Customer payment · ${c.name}`,[{name:"amount",label:`Amount due: ${money(c.balance||0)}`,type:"number",required:true},{name:"method",label:"Payment method",value:"Cash"},{name:"note",label:"Reference / note"}],v=>{const amount=Number(v.amount);if(amount<=0||amount>Number(c.balance||0)){alert("Enter a payment greater than zero and not more than the outstanding balance.");return;}c.balance=Math.max(0,Number(c.balance||0)-amount);state.customerPayments.push({id:id(),date:today(),customerId:c.id,amount,method:v.method||"Cash",note:v.note||""});audit("Customer payment",`${c.name} · ${money(amount)}`);});return;}
    if(b.dataset.supplierPayment){const sup=state.suppliers.find(x=>String(x.id)===b.dataset.supplierPayment);if(sup)openSimpleForm(`Supplier payment · ${sup.name}`,[{name:"amount",label:"Payment amount",type:"number",required:true},{name:"method",label:"Payment method",value:"Cash"},{name:"note",label:"Reference / note"}],v=>{const amount=Number(v.amount);const due=state.purchases.filter(p=>String(p.supplierId)===String(sup.id)).reduce((n,p)=>n+Number(p.total||0),0)-state.supplierPayments.filter(p=>String(p.supplierId)===String(sup.id)).reduce((n,p)=>n+Number(p.amount||0),0);if(amount<=0||amount>Math.max(0,due)){alert(`Enter a payment greater than zero and no more than the outstanding balance (${money(Math.max(0,due))}).`);return;}state.supplierPayments.push({id:id(),date:today(),supplierId:sup.id,amount,method:v.method||"Cash",note:v.note||""});audit("Supplier payment",`${sup.name} · ${money(amount)}`);});return;}
    if(b.dataset.refundSale){if(!requireAdmin("authorize a sale refund or void"))return;const sale=state.sales.find(x=>String(x.id)===b.dataset.refundSale);if(!sale||sale.refunded){notice("Sale already refunded or not found");return;}const reason=prompt(`Full refund for receipt ${sale.receiptNo} (${money(sale.total)}). Enter reason:`);if(reason===null)return;const method=prompt("Refund method (Cash / Mobile Money / Bank transfer):","Cash");if(method===null)return;if(!confirm(`Confirm FULL refund of ${money(sale.total)} for receipt ${sale.receiptNo}? Stock will be returned to inventory.`))return;sale.refunded=true;sale.refundedAt=today();sale.refundedBy=sessionUser?.name||"Administrator";sale.refundReason=reason;for(const line of sale.items||[]){const product=state.products.find(p=>String(p.id)===String(line.productId));if(product)product.stock=Number(product.stock||0)+Number(line.qty||0);}if(sale.payment==="Credit"&&sale.customerId){const customer=state.customers.find(c=>String(c.id)===String(sale.customerId));if(customer)customer.balance=Math.max(0,Number(customer.balance||0)-Number(sale.total||0));}state.salesReturns.push({id:id(),date:today(),saleId:sale.id,receiptNo:sale.receiptNo,customerName:state.customers.find(c=>String(c.id)===String(sale.customerId))?.name||"Walk-in",amount:Number(sale.total||0),method,reason,authorizedBy:sessionUser?.name||"Administrator"});audit("Sale refunded / voided",`${sale.receiptNo} · ${money(sale.total)} · ${method} · ${reason}`);persistAndRender();notice("Refund recorded and stock restored");return;}
    if(b.dataset.stockAdjust){const p=state.products.find(x=>String(x.id)===b.dataset.stockAdjust);if(p){const value=prompt(`Current stock: ${p.stock}\nEnter the new stock quantity:`,String(p.stock));if(value!==null){const qty=Number(value);if(!Number.isInteger(qty)||qty<0){alert("Enter a whole number zero or higher.");return;}const old=p.stock;p.stock=qty;audit("Stock adjusted",`${p.name}: ${old} → ${qty}`);persistAndRender();}}return;}
    if(b.id==="start-shift"){if(activeShift()){alert("A shift is already open for this account.");return;}const opening=Number($("#shift-opening").value)||0;const sh={id:id(),date:today(),userId:sessionUser?.staffId||sessionUser?.name,userName:sessionUser?.name||"Staff",openingCash:opening,status:"Open",startedAt:new Date().toLocaleString()};state.shifts.push(sh);audit("Shift opened",`Opening float ${money(opening)}`);persistAndRender();notice("Shift started");return;}
    if(b.id==="close-shift"){const sh=activeShift();if(!sh)return;const counted=Number($("#shift-counted").value);if(!Number.isFinite(counted)||counted<0){alert("Enter the cash counted.");return;}const cashSales=state.sales.filter(x=>x.shiftId===sh.id&&x.payment==="Cash").reduce((n,x)=>n+Number(x.total||0),0)-state.salesReturns.filter(r=>r.method==="Cash"&&state.sales.find(x=>x.id===r.saleId)?.shiftId===sh.id).reduce((n,r)=>n+Number(r.amount||0),0);sh.countedCash=counted;sh.expectedCash=Number(sh.openingCash||0)+cashSales;sh.variance=counted-sh.expectedCash;sh.notes=$("#shift-notes").value;sh.status="Closed";sh.closedAt=new Date().toLocaleString();audit("Shift closed",`Expected ${money(sh.expectedCash)}, counted ${money(counted)}, variance ${money(sh.variance)}`);persistAndRender();notice("Shift closed");return;}
    if(b.id==="apply-report-range"){window.reportFrom=$("#report-from").value;window.reportTo=$("#report-to").value;showPage("Reports");return;}
    if(b.id==="reset-report-range"){window.reportFrom="";window.reportTo="";showPage("Reports");return;}
    if(b.id==="export-activity"){const csv=[["Date","Time","User","Role","Action","Details"],...state.auditLogs.map(x=>[x.date,x.time,x.user,x.role,x.action,x.details])].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`flavours-activity-${today()}.csv`;a.click();URL.revokeObjectURL(a.href);return;}
    if(b.dataset.page){if(!isAdmin()&&!CASHIER_PAGES.has(b.dataset.page)){requireAdmin("open this section");return;}showPage(b.dataset.page);return;}
    if(b.dataset.addCart){addToCart(b.dataset.addCart);if(current!=="Point of Sale")showPage("Point of Sale");return;}
    if(b.dataset.cartPlus||b.dataset.cartMinus||b.dataset.cartRemove){
      const pid=b.dataset.cartPlus||b.dataset.cartMinus||b.dataset.cartRemove;
      const line=state.cart.find(x=>String(x.productId)===String(pid));
      const product=state.products.find(x=>String(x.id)===String(pid));
      if(line){if(b.dataset.cartPlus){if(line.qty<Number(product?.stock))line.qty++;else notice("Not enough stock");}
        if(b.dataset.cartMinus)line.qty--;if(b.dataset.cartRemove)line.qty=0;}
      state.cart=state.cart.filter(x=>x.qty>0);refreshCart();return;
    }
    if(b.id==="manage-categories"){if(!requireAdmin("manage product categories"))return;openCategoryManager();}
    if(b.id==="add-product"){if(!requireAdmin("add products"))return;openProductModal();}
    if(b.dataset.editProduct){if(!requireAdmin("edit products"))return;openProductModal(state.products.find(x=>String(x.id)===b.dataset.editProduct));}
    if(b.dataset.printBarcode){if(!requireAdmin("manage product barcodes"))return;printBarcodeLabel(state.products.find(x=>String(x.id)===b.dataset.printBarcode));}
    if(b.dataset.deleteProduct&&!requireAdmin("delete products"))return;
    if(b.dataset.deleteProduct&&confirm("Delete this product?")){const deleted=state.products.find(x=>String(x.id)===b.dataset.deleteProduct);state.products=state.products.filter(x=>String(x.id)!==b.dataset.deleteProduct);audit("Product deleted",deleted?.name||b.dataset.deleteProduct);persistAndRender();}
    if(b.id==="dash-open-pos"){showPage("Point of Sale");return;}
    if(b.id==="clear-cart"){state.cart=[];refreshCart();}
    if(b.id==="complete-sale")completeSale();
    if(b.id==="add-customer")openSimpleForm("Add customer",[{name:"name",label:"Customer name",required:true},{name:"phone",label:"Phone"},{name:"email",label:"Email"}],v=>{state.customers.push({id:id(),...v,balance:0});audit("Customer created",v.name);});
    if(b.id==="add-supplier"&&!requireAdmin("manage suppliers"))return;
    if(b.id==="add-supplier")openSimpleForm("Add supplier",[{name:"name",label:"Supplier name",required:true},{name:"phone",label:"Phone"},{name:"address",label:"Address"}],v=>{state.suppliers.push({id:id(),...v});audit("Supplier created",v.name);});
    if(b.dataset.deleteCustomer&&!requireAdmin("delete customers"))return;
    if(b.dataset.deleteCustomer&&confirm("Delete customer?")){state.customers=state.customers.filter(x=>String(x.id)!==b.dataset.deleteCustomer);persistAndRender();}
    if(b.dataset.deleteSupplier&&!requireAdmin("delete suppliers"))return;
    if(b.dataset.deleteSupplier&&confirm("Delete supplier?")){state.suppliers=state.suppliers.filter(x=>String(x.id)!==b.dataset.deleteSupplier);persistAndRender();}
    if(b.id==="add-expense"&&!requireAdmin("record business expenses"))return;
    if(b.id==="add-expense")openSimpleForm("Record expense",[{name:"description",label:"Description",required:true},{name:"category",label:"Category"},{name:"amount",label:"Amount",type:"number",required:true},{name:"payment",label:"Payment method"}],v=>{state.expenses.push({id:id(),date:today(),...v,amount:Number(v.amount)});audit("Expense recorded",`${v.description} · ${money(v.amount)}`);});
    if(b.id==="add-purchase"&&!requireAdmin("record purchases"))return;
    if(b.id==="add-purchase")openPurchaseForm();
    if(b.id==="save-closing"){const old=state.closings.find(x=>x.date===today());const rec={date:today(),cash:Number($("#closing-cash").value)||0,notes:$("#closing-notes").value};if(old)Object.assign(old,rec);else state.closings.push(rec);audit("Daily cash closing saved",`Counted ${money(rec.cash)}`);persistAndRender();notice("Closing saved");}
    if(b.id==="add-staff"){if(!requireAdmin("manage staff"))return;openSimpleForm("Add staff member",[{name:"name",label:"Name",required:true},{name:"role",label:"Role (Cashier or Admin)",value:"Cashier"},{name:"pin",label:"Login PIN (minimum 4 digits)",required:true,type:"password"}],v=>{if(String(v.pin).length<4){alert("PIN must be at least 4 characters.");return;}state.staff.push({id:id(),name:v.name,role:v.role||"Cashier",pinHash:authHash(v.pin)});audit("Staff account created",`${v.name} · ${v.role||"Cashier"}`);});}
    if(b.dataset.deleteStaff&&!requireAdmin("delete staff accounts"))return;
    if(b.dataset.deleteStaff&&confirm("Delete staff member?")){state.staff=state.staff.filter(x=>String(x.id)!==b.dataset.deleteStaff);persistAndRender();}
    if(b.id==="download-backup"){if(!requireAdmin("download backups"))return;downloadBackup();}
    if(b.id==="export-sales-csv")exportCSV("sales");
    if(b.id==="export-products-csv")exportCSV("products");
    if(b.id==="cloud-upload"){if(!requireAdmin("upload cloud backups"))return;cloudSync("upload");}
    if(b.id==="cloud-download"){if(!requireAdmin("restore cloud backups"))return;cloudSync("download");}
    if(b.id==="restore-backup"){if(!requireAdmin("restore backups"))return;restoreBackup();}
  });
  document.addEventListener("change",e=>{
    if(e.target.id==="inventory-category"){$("#app").innerHTML=renderInventory(e.target.value);}
  });
  document.addEventListener("input",e=>{
    if(e.target.id==="sale-discount")updateSaleTotals();
    if(e.target.id==="pos-search")$("#pos-products").innerHTML=posTiles(e.target.value);
    if(e.target.id==="dash-pos-search"){const q=e.target.value.trim().toLowerCase();const p=state.products.find(x=>String(x.barcode||x.sku||"").toLowerCase()===q||String(x.name||"").toLowerCase().includes(q));if(e.target.value.endsWith("\n")&&p){addToCart(p.id);showPage("Point of Sale");}}
  });
  document.addEventListener("keydown",e=>{if((e.target.id==="pos-search"||e.target.id==="dash-pos-search")&&e.key==="Enter"){e.preventDefault();const code=e.target.value.trim();const product=state.products.find(p=>(String(p.barcode||"").toLowerCase()===code.toLowerCase()||String(p.name||"").toLowerCase()===code.toLowerCase())&&Number(p.stock)>0);if(product){addToCart(product.id);if(e.target.id==="dash-pos-search")showPage("Point of Sale");else{e.target.value="";$("#pos-products").innerHTML=posTiles();}}else notice("No matching product or barcode in stock");}});
  $("#app").addEventListener("submit",e=>{
    if(e.target.id==="supabase-login-form"){
      e.preventDefault();
      const form=e.target,submit=form.querySelector("button[type=submit],button:not([type])");
      if(submit)submit.disabled=true;
      const values=Object.fromEntries(new FormData(form));
      supabaseAuth(String(values.email||"").trim(),String(values.password||""))
        .then(()=>{audit("Supabase connected",String(values.email||""));save();showPage("Settings");notice("Supabase connected");})
        .catch(error=>alert(`Could not connect to Supabase: ${error.message}`))
        .finally(()=>{if(submit)submit.disabled=false;});
    }else if(e.target.id==="settings-form"){
      e.preventDefault();if(!requireAdmin("change business settings"))return;const v=Object.fromEntries(new FormData(e.target));
      if(!/^\d{10}$/.test(v.tpin)){alert("TPIN must contain exactly 10 digits.");return;}
      state.settings={...state.settings,...v};persistAndRender();notice("Settings saved");
    }
  });
  function completeSale(){
    const requestedDiscount=Number($("#sale-discount")?.value)||0;
    if(requestedDiscount>0&&!isAdmin()){
      const approval=prompt("Administrator approval required for discounts. Enter administrator PIN:");
      if(!approval||!security().admin||authHash(approval)!==security().admin.pinHash){alert("Discount not approved. Ask an administrator to approve it.");return;}
    }
    if(!state.cart.length){notice("Cart is empty");return;}
    if($("#sale-payment")?.value==="Credit"&&!$("#sale-customer")?.value){alert("Select a customer before completing a credit sale.");return;}
    for(const line of state.cart){const p=state.products.find(x=>String(x.id)===String(line.productId));if(!p||Number(p.stock)<line.qty){alert(`Insufficient stock for ${line.name}`);return;}}
    const totals=updateSaleTotals();const total=totals.total;
    const sale={id:id(),receiptNo:"F"+Date.now().toString().slice(-8),date:today(),
      customerId:$("#sale-customer").value||"",payment:$("#sale-payment").value,
      items:state.cart.map(x=>{const p=state.products.find(y=>String(y.id)===String(x.productId));return {...x,costAtSale:Number(p?.cost||0)};}),subtotal:totals.subtotal,discountPercent:totals.discountPercent,discountAmount:totals.discountAmount,total,cashierName:sessionUser?.name||"",shiftId:activeShift()?.id||""};
    sale.items.forEach(x=>{const p=state.products.find(y=>String(y.id)===String(x.productId));p.stock-=x.qty;});
    if(sale.payment==="Credit"&&sale.customerId){const c=state.customers.find(x=>String(x.id)===String(sale.customerId));if(c)c.balance=(Number(c.balance)||0)+total;}
    state.sales.push(sale);audit("Sale completed",`${sale.receiptNo} · ${money(total)} · ${sale.payment}`);state.cart=[];save();printReceipt(sale);showPage("Point of Sale");notice("Sale recorded");
  }
  function openPurchaseForm(){
    if(!state.suppliers.length){alert("Add a supplier first.");return;}
    if(!state.products.length){alert("Add products to inventory first.");return;}
    const supplierOptions=state.suppliers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
    const productOptions=state.products.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} (Current stock: ${Number(x.stock)||0})</option>`).join("");
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>Receive stock purchase</h2><form id="purchase-form">
      <label>Supplier</label><select name="supplierId" required>${supplierOptions}</select>
      <label>Product</label><select name="productId" required>${productOptions}</select>
      <div class="formgrid"><div><label>Quantity received</label><input name="quantity" type="number" min="1" step="1" required></div><div><label>Total purchase cost</label><input name="total" type="number" min="0" step=".01" required></div></div>
      <div class="actions"><button type="button" class="secondary" id="cancel-modal">Cancel</button><button>Save purchase & update stock</button></div></form></div></div>`;
    $("#cancel-modal").onclick=()=>$("#modal-root").innerHTML="";
    $("#purchase-form").onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const supplier=state.suppliers.find(x=>String(x.id)===String(v.supplierId));const product=state.products.find(x=>String(x.id)===String(v.productId));const qty=Math.floor(Number(v.quantity));const total=Number(v.total);
      if(!supplier||!product||qty<1||!Number.isFinite(total)||total<0){alert("Please check the purchase details.");return;}
      product.stock=Number(product.stock||0)+qty;state.purchases.push({id:id(),date:today(),supplierId:supplier.id,productId:product.id,description:product.name,quantity:qty,total,status:"Received"});audit("Stock purchase received",`${product.name} +${qty} · ${money(total)}`);
      $("#modal-root").innerHTML="";persistAndRender();notice("Purchase recorded and stock updated");};
  }
  function code39Svg(value){
    const map={"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn","K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn","U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnnwnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn"," ":"nwwnnwnnn"};
    const chars=`*${String(value).toUpperCase()}*`;let x=4,rects="";for(const ch of chars){const pat=map[ch];if(!pat)return "";for(let i=0;i<pat.length;i++){const width=pat[i]==="w"?3:1;if(i%2===0)rects+=`<rect x="${x}" y="0" width="${width}" height="54"/>`;x+=width;}x+=1;}return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x+4} 54" role="img" aria-label="Code 39 barcode"><g fill="#111">${rects}</g></svg>`;
  }
  function printBarcodeLabel(product){
    if(!product){return;}if(!product.barcode){alert("Add a barcode/SKU to this product first.");return;}
    const svg=code39Svg(product.barcode);if(!svg){alert("This offline label printer supports Code 39 characters: A–Z, 0–9, space and - . $ / + %.");return;}
    const w=window.open("","_blank","width=420,height=320");if(!w){alert("Allow pop-ups to print labels.");return;}
    w.document.write(`<!doctype html><html><head><title>Barcode label</title><style>body{font:14px Arial;text-align:center;padding:20px}.label{border:1px solid #ddd;padding:18px;max-width:320px;margin:auto}svg{width:100%;height:75px}h3{margin:0 0 8px}</style></head><body><div class="label"><h3>${esc(product.name)}</h3>${svg}<p>${esc(product.barcode)}</p><strong>${money(product.price)}</strong></div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  }
  function downloadBackup(){
    state.settings.lastBackupAt=new Date().toISOString();save();
    const blob=new Blob([JSON.stringify({...state,backupVersion:"2.3",backupDate:new Date().toISOString()},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`flavours-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  }
  function restoreBackup(){
    const file=$("#restore-file").files[0];if(!file){alert("Choose a backup file first.");return;}
    if(!confirm("This will replace the current app records. Continue?"))return;
    const reader=new FileReader();reader.onload=()=>{
      try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.products)||!Array.isArray(data.sales))throw Error("Invalid backup");
        const keepCart=[];state={...defaults,...data,cart:keepCart};state.settings={...defaults.settings,...(data.settings||{})};
        if(!state.settings.tpin)state.settings.tpin="1020565534";
        for(const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff","customerPayments","supplierPayments","shifts","auditLogs","salesReturns"])if(!Array.isArray(state[k]))state[k]=[];
        save();showPage("Dashboard");notice("Backup restored");
      }catch(err){alert("Could not restore: this file is not a recognised Flavours backup.");}
    };reader.readAsText(file);
  }


  function exportCSV(kind){
    const rows=kind==="sales"?[["Date","Receipt","Customer","Payment","Total"],...state.sales.map(x=>[x.date,x.receiptNo,state.customers.find(c=>String(c.id)===String(x.customerId))?.name||"Walk-in",x.payment,x.total])]:[["Name","Barcode/SKU","Category","Cost","Price","Stock"],...state.products.map(x=>[x.name,x.barcode||"",x.type||"",x.cost,x.price,x.stock])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`flavours-${kind}-${today()}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  async function cloudSync(mode){
    if(supabaseSession?.access_token){
      const status=$("#cloud-status");if(status)status.textContent="Connecting to Supabase…";
      try{
        await ensureSupabaseSession();
        const base=`${SUPABASE.url}/rest/v1/flavours_backups`;
        if(mode==="upload"){
          const backup={...state,cart:[],backupVersion:"2.3",backupDate:new Date().toISOString()};
          const response=await fetch(`${base}?on_conflict=user_id`,{method:"POST",headers:supabaseHeaders({"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify({user_id:supabaseSession.user.id,backup})});
          if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||`Supabase returned ${response.status}`);}
          if(status)status.textContent=`Supabase upload: ${new Date().toLocaleString()}`;notice("Business backup uploaded to Supabase");return;
        }
        const response=await fetch(`${base}?select=backup&user_id=eq.${encodeURIComponent(supabaseSession.user.id)}&limit=1`,{headers:supabaseHeaders({Accept:"application/json"})});
        const rows=await response.json().catch(()=>[]);
        if(!response.ok)throw new Error(rows.message||`Supabase returned ${response.status}`);
        const payload=rows[0]?.backup;
        if(!payload||!Array.isArray(payload.products)||!Array.isArray(payload.sales))throw new Error("No valid Flavours backup exists for this Supabase account");
        if(!confirm("Supabase restore will replace the records on this device. Download a local backup first. Continue?"))return;
        state={...defaults,...payload,cart:[]};state.settings={...defaults.settings,...(payload.settings||{})};
        for(const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff","customerPayments","supplierPayments","shifts","auditLogs","salesReturns"])if(!Array.isArray(state[k]))state[k]=[];
        save();showPage("Dashboard");if(status)status.textContent=`Supabase restore: ${new Date().toLocaleString()}`;notice("Supabase backup restored");return;
      }catch(error){if(status)status.textContent=`Supabase sync failed: ${error.message}`;notice(`Supabase sync failed: ${error.message}`);return;}
    }
    const endpoint=String(state.settings.cloudSyncEndpoint||"").trim();
    if(!endpoint){notice("Add your cloud sync API endpoint in Settings first");return;}
    const status=$("#cloud-status");if(status)status.textContent="Connecting…";
    try{
      const url=new URL(endpoint);if(url.protocol!=="https:"&&url.hostname!=="localhost"){throw new Error("Use a secure HTTPS endpoint")}
      let response,data;
      if(mode==="upload"){
        response=await fetch(url.href,{method:"POST",headers:{"Content-Type":"application/json",...(state.settings.cloudSyncToken?{"Authorization":`Bearer ${state.settings.cloudSyncToken}`}:{})},body:JSON.stringify({...state,backupVersion:"2.3",backupDate:new Date().toISOString()})});
      }else{
        url.searchParams.set("action","download");response=await fetch(url.href,{method:"GET",headers:{"Accept":"application/json",...(state.settings.cloudSyncToken?{"Authorization":`Bearer ${state.settings.cloudSyncToken}`}:{})}});
      }
      if(!response.ok)throw new Error(`Server returned ${response.status}`);
      data=await response.json();
      if(mode==="download"){
        const payload=data.data||data;
        if(!payload||!Array.isArray(payload.products)||!Array.isArray(payload.sales))throw new Error("Server response is not a recognised Flavours backup");
        if(!confirm("Cloud restore will replace the records on this device. Download a local backup first. Continue?"))return;
        state={...defaults,...payload,cart:[]};state.settings={...defaults.settings,...(payload.settings||{})};
        for(const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff","customerPayments","supplierPayments","shifts","auditLogs","salesReturns"])if(!Array.isArray(state[k]))state[k]=[];
        save();showPage("Dashboard");notice("Cloud data restored");
      }else{notice("Cloud backup uploaded");}
      if(status)status.textContent=`Last ${mode}: ${new Date().toLocaleString()}`;
    }catch(err){if(status)status.textContent=`Sync failed: ${err.message}`;notice(`Cloud sync failed: ${err.message}`);}
  }

  save();
  if(security().admin){showAuth("login");}else{showAuth("setup");}
  render();
})();
