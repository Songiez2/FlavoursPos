/* =========================================================
   FLAVOURS BUSINESS MANAGER V1.9
   Standalone POS and business manager
   - Works offline in a browser
   - Product photos stored as compressed data URLs
   - Editable company TPIN printed on receipts
   - Backup/restore includes all records and photos
   - Attempts migration from common V1.8 localStorage keys
   ========================================================= */
"use strict";

(() => {
  const APP_KEY = "flavoursBusinessManagerV19";
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
  const today = () => new Date().toISOString().slice(0,10);
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
    products:[], sales:[], expenses:[], closings:[], customers:[],
    suppliers:[], purchases:[], returns:[], staff:[],
    settings:{businessName:"FLAVOURS TECHS SOLUTIONS", phone:"0971603243",
      address:"Mongu, Zambia", currency:"K", tpin:"1020565534"},
    logo:"", cart:[]
  };
  let state = read(APP_KEY);
  if (!state || typeof state !== "object") state = legacyState();
  state = {...defaults, ...state};
  for (const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff","cart"])
    if (!Array.isArray(state[k])) state[k] = [];
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
  *{box-sizing:border-box}body{margin:0;background:#f3f5f9;color:#172033;font:14px Arial,sans-serif}
  button,input,select,textarea{font:inherit}button{cursor:pointer;border:0;border-radius:8px;padding:10px 13px;background:#102b52;color:white}
  button.secondary{background:#e8edf5;color:#172033}button.danger{background:#b42318}
  .top{background:#102b52;color:white;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px}
  .top h1{font-size:19px;margin:0}.shell{display:grid;grid-template-columns:215px 1fr;min-height:calc(100vh - 58px)}
  nav{background:#fff;padding:14px;border-right:1px solid #e2e6ee}nav button{display:block;width:100%;text-align:left;margin:3px 0;background:transparent;color:#26364d}
  nav button.active,nav button:hover{background:#eaf0fa;color:#102b52}
  main{padding:22px;min-width:0}.page-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:18px}
  h2{margin:0 0 5px;font-size:22px}.muted{color:#68758a}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:18px}
  .card,.panel{background:white;border:1px solid #e4e8ef;border-radius:12px;padding:16px}
  .metric{font-size:23px;font-weight:bold;margin-top:8px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  input,select,textarea{width:100%;padding:10px;border:1px solid #ccd4df;border-radius:8px;background:white;color:#172033}
  label{display:block;font-weight:600;margin:10px 0 5px}.formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:10px;border-bottom:1px solid #edf0f4;vertical-align:middle}
  th{background:#f7f9fc;color:#536176;font-size:12px} .tablewrap{overflow:auto;border:1px solid #e4e8ef;border-radius:10px}
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
  #notice{position:fixed;bottom:18px;right:18px;background:#172033;color:white;padding:12px 17px;border-radius:9px;opacity:0;pointer-events:none;transition:.2s;z-index:9}
  #notice.show{opacity:1}.badge{padding:4px 7px;border-radius:20px;background:#e9eff8;font-size:12px}
  @media(max-width:800px){.shell{grid-template-columns:1fr}nav{display:flex;overflow:auto;border-right:0;border-bottom:1px solid #ddd}nav button{white-space:nowrap;width:auto}.posgrid{grid-template-columns:1fr}main{padding:13px}.top{padding:13px}}
  @media print{nav,.top,.no-print,.modalback{display:none!important}.shell{display:block}main{padding:0}.receipt{max-width:80mm;margin:auto}}
  `;
  const style=document.createElement("style"); style.textContent=css; document.head.appendChild(style);
  document.body.innerHTML = `
    <header class="top"><h1>FLAVOURS BUSINESS MANAGER <small>V1.9</small></h1><span id="save-status">Ready</span></header>
    <div class="shell"><nav id="nav"></nav><main id="app"></main></div>
    <div id="modal-root"></div><div id="notice"></div>`;
  const pages=["Dashboard","Point of Sale","Inventory","Customers","Suppliers","Purchases","Expenses","Reports","Cash Closing","Staff","Settings","Backup & Restore"];
  let current="Dashboard";

  function persistAndRender(){save();render();}
  function pageHeader(title, actions=""){return `<div class="page-title"><div><h2>${esc(title)}</h2><div class="muted">Flavours Techs Solutions</div></div><div class="toolbar no-print">${actions}</div></div>`;}
  function table(headers, rows){return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="muted">No records yet</td></tr>`}</tbody></table></div>`;}
  function renderNav(){
    $("#nav").innerHTML=pages.map(p=>`<button data-page="${esc(p)}" class="${p===current?"active":""}">${esc(p)}</button>`).join("");
  }
  function render(){
    renderNav();
    const target=$("#app");
    const map={
      "Dashboard":renderDashboard,"Point of Sale":renderPOS,"Inventory":renderInventory,
      "Customers":renderCustomers,"Suppliers":renderSuppliers,"Purchases":renderPurchases,
      "Expenses":renderExpenses,"Reports":renderReports,"Cash Closing":renderClosing,
      "Staff":renderStaff,"Settings":renderSettings,"Backup & Restore":renderBackup
    };
    target.innerHTML=(map[current]||renderDashboard)();
  }
  function showPage(p){current=p;render();}

  function renderDashboard(){
    const salesToday=state.sales.filter(s=>s.date===today()).reduce((n,s)=>n+Number(s.total||0),0);
    const stockValue=state.products.reduce((n,p)=>n+Number(p.stock||0)*Number(p.cost||0),0);
    const low=state.products.filter(p=>Number(p.stock)<=5).length;
    return pageHeader("Dashboard")+`<div class="cards">
      <div class="card">Sales today<div class="metric">${money(salesToday)}</div></div>
      <div class="card">Products<div class="metric">${state.products.length}</div></div>
      <div class="card">Low stock items<div class="metric">${low}</div></div>
      <div class="card">Stock value<div class="metric">${money(stockValue)}</div></div>
      <div class="card">Total sales<div class="metric">${money(state.sales.reduce((n,s)=>n+Number(s.total||0),0))}</div></div>
    </div><div class="panel"><h3>Quick actions</h3><div class="toolbar">
      <button data-page="Point of Sale">Open POS</button><button data-page="Inventory">Manage inventory</button>
      <button data-page="Backup & Restore">Backup data</button></div><p class="muted">Your records are saved in this browser. Download backups regularly.</p></div>`;
  }

  function renderPOS(){
    const cartTotal=state.cart.reduce((n,x)=>n+x.qty*x.price,0);
    return pageHeader("Point of Sale")+`<div class="posgrid"><section>
      <input id="pos-search" placeholder="Search products..." />
      <div class="tilegrid" id="pos-products">${posTiles()}</div>
    </section><section class="panel"><h3>Current sale</h3>
      <label>Customer</label><select id="sale-customer"><option value="">Walk-in customer</option>${state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select>
      <div id="cart-lines">${cartHTML()}</div><hr><h2>Total: ${money(cartTotal)}</h2>
      <label>Payment method</label><select id="sale-payment"><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Credit</option></select>
      <button id="complete-sale" style="width:100%;margin-top:12px">Complete sale & print receipt</button>
      <button class="secondary" id="clear-cart" style="width:100%;margin-top:7px">Clear cart</button>
    </section></div>`;
  }
  function posTiles(filter=""){
    const list=state.products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase()) && Number(p.stock)>0);
    return list.map(p=>`<button class="tile" data-add-cart="${esc(p.id)}">${p.image?`<img src="${esc(p.image)}">`:`<div style="height:82px;background:#eef1f6;border-radius:6px;display:grid;place-items:center">No photo</div>`}
      <strong>${esc(p.name)}</strong><span>${money(p.price)} · Stock ${Number(p.stock)||0}</span></button>`).join("")||`<p class="muted">No available products.</p>`;
  }
  function cartHTML(){
    return state.cart.map(x=>`<div class="cartline"><div><strong>${esc(x.name)}</strong><br><small>${money(x.price)} × ${x.qty}</small></div>
      <div><strong>${money(x.price*x.qty)}</strong><br><button class="secondary" data-cart-minus="${esc(x.productId)}">−</button> <button class="secondary" data-cart-plus="${esc(x.productId)}">+</button> <button class="danger" data-cart-remove="${esc(x.productId)}">×</button></div></div>`).join("")||`<p class="muted">Cart is empty.</p>`;
  }
  function refreshCart(){save();$("#cart-lines").innerHTML=cartHTML();const h=$("#cart-lines").parentElement.querySelector("h2");h.textContent="Total: "+money(state.cart.reduce((n,x)=>n+x.qty*x.price,0));}
  function addToCart(pid){
    const p=state.products.find(x=>String(x.id)===String(pid));if(!p)return;
    const line=state.cart.find(x=>String(x.productId)===String(pid));
    if(line){if(line.qty>=Number(p.stock)){notice("Not enough stock");return;}line.qty++;}
    else state.cart.push({productId:p.id,name:p.name,price:Number(p.price)||0,qty:1});
    refreshCart();
  }

  function renderInventory(){
    const rows=state.products.map(p=>`<tr><td>${p.image?`<img class="thumb" src="${esc(p.image)}">`:`<span class="thumb" style="display:inline-block"></span>`}${esc(p.name)}</td><td>${esc(p.type||"")}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${Number(p.stock)||0}</td><td><button class="secondary" data-edit-product="${esc(p.id)}">Edit</button> <button class="danger" data-delete-product="${esc(p.id)}">Delete</button></td></tr>`).join("");
    return pageHeader("Inventory",`<button id="add-product">Add product</button>`)+table(["Product","Type","Cost","Selling price","Stock","Actions"],rows);
  }
  function openProductModal(product=null){
    const p=product||{name:"",type:"General",cost:0,price:0,stock:0,image:""};
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>${product?"Edit":"Add"} product</h2>
      <form id="product-form"><input type="hidden" name="id" value="${esc(p.id||"")}">
      <label>Product name</label><input name="name" required value="${esc(p.name)}">
      <div class="formgrid"><div><label>Category / type</label><input name="type" value="${esc(p.type||"General")}"></div><div><label>Quantity in stock</label><input name="stock" type="number" min="0" step="1" required value="${Number(p.stock)||0}"></div>
      <div><label>Cost price</label><input name="cost" type="number" min="0" step=".01" required value="${Number(p.cost)||0}"></div><div><label>Selling price</label><input name="price" type="number" min="0" step=".01" required value="${Number(p.price)||0}"></div></div>
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
      const record={id:old?.id||id(),name:String(f.get("name")).trim(),type:String(f.get("type")).trim(),
        cost:Number(f.get("cost")),price:Number(f.get("price")),stock:Number(f.get("stock")),image};
      if(old)Object.assign(old,record);else state.products.push(record);
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
    const rows=state.customers.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||"")}</td><td>${esc(c.email||"")}</td><td>${money(c.balance||0)}</td><td><button class="danger" data-delete-customer="${esc(c.id)}">Delete</button></td></tr>`).join("");
    return pageHeader("Customers",`<button id="add-customer">Add customer</button>`)+table(["Name","Phone","Email","Balance",""],rows);
  }
  function renderSuppliers(){
    const rows=state.suppliers.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.phone||"")}</td><td>${esc(s.address||"")}</td><td><button class="danger" data-delete-supplier="${esc(s.id)}">Delete</button></td></tr>`).join("");
    return pageHeader("Suppliers",`<button id="add-supplier">Add supplier</button>`)+table(["Supplier","Phone","Address",""],rows);
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
    const total=state.sales.reduce((n,s)=>n+Number(s.total||0),0);
    const paid=state.sales.filter(s=>s.payment!=="Credit").reduce((n,s)=>n+Number(s.total||0),0);
    const expenses=state.expenses.reduce((n,x)=>n+Number(x.amount||0),0);
    const rows=state.sales.slice().reverse().map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.receiptNo)}</td><td>${money(s.total)}</td><td>${esc(s.payment)}</td></tr>`).join("");
    return pageHeader("Reports")+`<div class="cards"><div class="card">Sales<div class="metric">${money(total)}</div></div><div class="card">Non-credit sales<div class="metric">${money(paid)}</div></div><div class="card">Expenses<div class="metric">${money(expenses)}</div></div><div class="card">Net after expenses<div class="metric">${money(total-expenses)}</div></div></div>`+table(["Date","Receipt","Total","Payment"],rows);
  }
  function renderClosing(){
    const date=today(), sales=state.sales.filter(s=>s.date===date).reduce((n,s)=>n+Number(s.total||0),0);
    const expenses=state.expenses.filter(x=>x.date===date).reduce((n,x)=>n+Number(x.amount||0),0);
    const old=state.closings.find(x=>x.date===date);
    return pageHeader("Daily Cash Closing")+`<div class="panel"><h3>${date}</h3><p>Sales: <strong>${money(sales)}</strong></p><p>Expenses: <strong>${money(expenses)}</strong></p><p>Expected balance: <strong>${money(sales-expenses)}</strong></p><label>Actual cash counted</label><input id="closing-cash" type="number" min="0" step=".01" value="${old?.cash??""}"><label>Notes</label><textarea id="closing-notes">${esc(old?.notes||"")}</textarea><button id="save-closing" style="margin-top:12px">Save daily closing</button></div>`;
  }
  function renderStaff(){
    const rows=state.staff.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.role||"Staff")}</td><td>${esc(s.pin||"")}</td><td><button class="danger" data-delete-staff="${esc(s.id)}">Delete</button></td></tr>`).join("");
    return pageHeader("Staff",`<button id="add-staff">Add staff member</button>`)+table(["Name","Role","PIN",""],rows)+`<p class="muted">Staff records are for basic record keeping in this version; they are not a secure login system.</p>`;
  }
  function renderSettings(){
    const s=state.settings;
    return pageHeader("Settings")+`<div class="panel"><form id="settings-form">
      <label>Business name</label><input name="businessName" required value="${esc(s.businessName)}">
      <div class="formgrid"><div><label>Phone</label><input name="phone" value="${esc(s.phone)}"></div><div><label>Currency symbol</label><input name="currency" value="${esc(s.currency)}"></div></div>
      <label>Business address</label><input name="address" value="${esc(s.address)}">
      <label>Company TPIN (10 digits)</label><input name="tpin" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" required value="${esc(s.tpin)}">
      <p class="muted">The TPIN entered here will be printed on customer receipts. This does not connect the app to ZRA Smart Invoice.</p>
      <button style="margin-top:12px">Save settings</button></form></div>`;
  }
  function renderBackup(){
    return pageHeader("Backup & Restore")+`<div class="panel"><h3>Download a backup</h3><p class="muted">Includes products, photos, sales, customers, suppliers, purchases, expenses, settings and TPIN.</p><button id="download-backup">Download backup JSON</button><hr><h3>Restore a backup</h3><p class="muted">Restoring replaces the records currently in this app. Download a backup first.</p><input id="restore-file" type="file" accept="application/json"><button id="restore-backup" style="margin-top:10px">Restore selected backup</button></div>`;
  }

  function openSimpleForm(title, fields, onSave){
    $("#modal-root").innerHTML=`<div class="modalback"><div class="modal"><h2>${title}</h2><form id="simple-form">${fields.map(f=>`<label>${esc(f.label)}</label><input name="${esc(f.name)}" type="${f.type||"text"}" ${f.required?"required":""} value="${esc(f.value||"")}">`).join("")}<div class="actions"><button type="button" class="secondary" id="cancel-modal">Cancel</button><button>Save</button></div></form></div></div>`;
    $("#cancel-modal").onclick=()=>$("#modal-root").innerHTML="";
    $("#simple-form").onsubmit=e=>{e.preventDefault();onSave(Object.fromEntries(new FormData(e.target)));$("#modal-root").innerHTML="";persistAndRender();};
  }
  function printReceipt(s){
    const lines=s.items.map(x=>`<tr><td>${esc(x.name)} × ${x.qty}</td><td>${money(x.price*x.qty)}</td></tr>`).join("");
    const w=window.open("","_blank","width=420,height=650");if(!w){alert("Allow pop-ups to print receipts.");return;}
    w.document.write(`<!doctype html><html><head><title>Receipt ${esc(s.receiptNo)}</title><style>body{font:13px Arial;padding:18px}h2{text-align:center}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px dashed #aaa}.right{text-align:right}</style></head><body><div class="receipt"><h2>${esc(state.settings.businessName)}</h2><p style="text-align:center">${esc(state.settings.address)}<br>${esc(state.settings.phone)}<br>TPIN: ${esc(state.settings.tpin)}</p><hr><p>Receipt: ${esc(s.receiptNo)}<br>Date: ${esc(s.date)}<br>Payment: ${esc(s.payment)}</p><table>${lines}</table><h3 class="right">TOTAL: ${money(s.total)}</h3><p style="text-align:center">Thank you for shopping with us!</p></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  document.addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.dataset.page){showPage(b.dataset.page);return;}
    if(b.dataset.addCart){addToCart(b.dataset.addCart);return;}
    if(b.dataset.cartPlus||b.dataset.cartMinus||b.dataset.cartRemove){
      const pid=b.dataset.cartPlus||b.dataset.cartMinus||b.dataset.cartRemove;
      const line=state.cart.find(x=>String(x.productId)===String(pid));
      const product=state.products.find(x=>String(x.id)===String(pid));
      if(line){if(b.dataset.cartPlus){if(line.qty<Number(product?.stock))line.qty++;else notice("Not enough stock");}
        if(b.dataset.cartMinus)line.qty--;if(b.dataset.cartRemove)line.qty=0;}
      state.cart=state.cart.filter(x=>x.qty>0);refreshCart();return;
    }
    if(b.id==="add-product")openProductModal();
    if(b.dataset.editProduct)openProductModal(state.products.find(x=>String(x.id)===b.dataset.editProduct));
    if(b.dataset.deleteProduct&&confirm("Delete this product?")){state.products=state.products.filter(x=>String(x.id)!==b.dataset.deleteProduct);persistAndRender();}
    if(b.id==="clear-cart"){state.cart=[];refreshCart();}
    if(b.id==="complete-sale")completeSale();
    if(b.id==="add-customer")openSimpleForm("Add customer",[{name:"name",label:"Customer name",required:true},{name:"phone",label:"Phone"},{name:"email",label:"Email"}],v=>state.customers.push({id:id(),...v,balance:0}));
    if(b.id==="add-supplier")openSimpleForm("Add supplier",[{name:"name",label:"Supplier name",required:true},{name:"phone",label:"Phone"},{name:"address",label:"Address"}],v=>state.suppliers.push({id:id(),...v}));
    if(b.dataset.deleteCustomer&&confirm("Delete customer?")){state.customers=state.customers.filter(x=>String(x.id)!==b.dataset.deleteCustomer);persistAndRender();}
    if(b.dataset.deleteSupplier&&confirm("Delete supplier?")){state.suppliers=state.suppliers.filter(x=>String(x.id)!==b.dataset.deleteSupplier);persistAndRender();}
    if(b.id==="add-expense")openSimpleForm("Record expense",[{name:"description",label:"Description",required:true},{name:"category",label:"Category"},{name:"amount",label:"Amount",type:"number",required:true},{name:"payment",label:"Payment method"}],v=>state.expenses.push({id:id(),date:today(),...v,amount:Number(v.amount)}));
    if(b.id==="add-purchase")openPurchaseForm();
    if(b.id==="save-closing"){const old=state.closings.find(x=>x.date===today());const rec={date:today(),cash:Number($("#closing-cash").value)||0,notes:$("#closing-notes").value};if(old)Object.assign(old,rec);else state.closings.push(rec);persistAndRender();notice("Closing saved");}
    if(b.id==="add-staff")openSimpleForm("Add staff member",[{name:"name",label:"Name",required:true},{name:"role",label:"Role"},{name:"pin",label:"PIN"}],v=>state.staff.push({id:id(),...v}));
    if(b.dataset.deleteStaff&&confirm("Delete staff member?")){state.staff=state.staff.filter(x=>String(x.id)!==b.dataset.deleteStaff);persistAndRender();}
    if(b.id==="download-backup")downloadBackup();
    if(b.id==="restore-backup")restoreBackup();
  });
  document.addEventListener("input",e=>{
    if(e.target.id==="pos-search")$("#pos-products").innerHTML=posTiles(e.target.value);
  });
  $("#app").addEventListener("submit",e=>{
    if(e.target.id==="settings-form"){
      e.preventDefault();const v=Object.fromEntries(new FormData(e.target));
      if(!/^\d{10}$/.test(v.tpin)){alert("TPIN must contain exactly 10 digits.");return;}
      state.settings={...state.settings,...v};persistAndRender();notice("Settings saved");
    }
  });
  function completeSale(){
    if(!state.cart.length){notice("Cart is empty");return;}
    for(const line of state.cart){const p=state.products.find(x=>String(x.id)===String(line.productId));if(!p||Number(p.stock)<line.qty){alert(`Insufficient stock for ${line.name}`);return;}}
    const total=state.cart.reduce((n,x)=>n+x.qty*x.price,0);
    const sale={id:id(),receiptNo:"F"+Date.now().toString().slice(-8),date:today(),
      customerId:$("#sale-customer").value||"",payment:$("#sale-payment").value,
      items:state.cart.map(x=>({...x})),total};
    sale.items.forEach(x=>{const p=state.products.find(y=>String(y.id)===String(x.productId));p.stock-=x.qty;});
    if(sale.payment==="Credit"&&sale.customerId){const c=state.customers.find(x=>String(x.id)===String(sale.customerId));if(c)c.balance=(Number(c.balance)||0)+total;}
    state.sales.push(sale);state.cart=[];save();printReceipt(sale);showPage("Point of Sale");notice("Sale recorded");
  }
  function openPurchaseForm(){
    if(!state.suppliers.length){alert("Add a supplier first.");return;}
    openSimpleForm("Record stock purchase",[{name:"supplierId",label:"Supplier ID (from Suppliers list)",required:true},{name:"description",label:"Items purchased",required:true},{name:"total",label:"Total cost",type:"number",required:true}],v=>{
      const supplier=state.suppliers.find(s=>String(s.id)===String(v.supplierId));
      if(!supplier){alert("Supplier ID not found; purchase was not saved.");return;}
      state.purchases.push({id:id(),date:today(),supplierId:supplier.id,description:v.description,total:Number(v.total),status:"Recorded"});
    });
  }
  function downloadBackup(){
    const blob=new Blob([JSON.stringify({...state,backupVersion:"1.9",backupDate:new Date().toISOString()},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`flavours-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  }
  function restoreBackup(){
    const file=$("#restore-file").files[0];if(!file){alert("Choose a backup file first.");return;}
    if(!confirm("This will replace the current app records. Continue?"))return;
    const reader=new FileReader();reader.onload=()=>{
      try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.products)||!Array.isArray(data.sales))throw Error("Invalid backup");
        const keepCart=[];state={...defaults,...data,cart:keepCart};state.settings={...defaults.settings,...(data.settings||{})};
        if(!state.settings.tpin)state.settings.tpin="1020565534";
        for(const k of ["products","sales","expenses","closings","customers","suppliers","purchases","returns","staff"])if(!Array.isArray(state[k]))state[k]=[];
        save();showPage("Dashboard");notice("Backup restored");
      }catch(err){alert("Could not restore: this file is not a recognised Flavours backup.");}
    };reader.readAsText(file);
  }

  save();render();
})();
