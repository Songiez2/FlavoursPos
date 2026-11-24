
"use strict";

/* =========================================================
   FLAVOURS BUSINESS MANAGER V1.6
   POS • INVENTORY • CUSTOMERS • SUPPLIERS
   CREDIT • PAYMENTS • EXPENSES • PROFIT
   CASH FLOW • DAILY CLOSING • STAFF
   RECEIPT PREVIEW • 58MM • 80MM • A4 PRINTING
   ========================================================= */

const STORAGE = {
  products:"flavoursProducts",
  sales:"flavoursSales",
  expenses:"flavoursExpenses",
  closings:"flavoursDailyClosings",
  customers:"flavoursCustomers",
  suppliers:"flavoursSuppliers",
  settings:"flavoursSettings",
  logo:"flavoursLogo",
  staff:"flavoursStaff",
  session:"flavoursSession"
};

const PERMISSIONS = [
  ["dashboard","Dashboard"],
  ["pos","Point of Sale"],
  ["inventory","Inventory"],
  ["inventoryEdit","Add/Edit Products"],
  ["customers","Customers"],
  ["credit","Receive Credit Payments"],
  ["suppliers","Suppliers"],
  ["sales","Sales History"],
  ["expenses","Expenses"],
  ["reports","Sales Analytics"],
  ["cash","Daily Cash Closing"],
  ["staff","Staff Management"],
  ["settings","Business Settings"],
  ["backup","Backup and Restore"]
];

const DEFAULT_PERMISSIONS = {
  owner:PERMISSIONS.map(p=>p[0]),
  manager:["dashboard","pos","inventory","inventoryEdit","customers","credit","suppliers","sales","expenses","reports","cash"],
  salesperson:["dashboard","pos","customers","sales"]
};

function read(key,fallback) {
  try {
    const raw=localStorage.getItem(key);
    return raw===null?fallback:JSON.parse(raw);
  } catch(error) {
    console.warn("Storage read issue:",key,error);
    return fallback;
  }
}

function save(key,value) {
  try {
    localStorage.setItem(key,JSON.stringify(value));
  } catch(error) {
    alert("Unable to save. Browser storage may be full.");
    console.error(error);
  }
}

let products=read(STORAGE.products,[]);
let sales=read(STORAGE.sales,[]);
let expenses=read(STORAGE.expenses,[]);
let closings=read(STORAGE.closings,[]);
let customers=read(STORAGE.customers,[]);
let suppliers=read(STORAGE.suppliers,[]);

let settings=read(STORAGE.settings,{
  businessName:"Flavours Techs Solutions",
  phone:"0971603243",
  address:"",
  currency:"K",
  theme:"light",
  receipt:{
    defaultPrinter:"58mm",
    footer:"Thank you for shopping with us!",
    showLogo:true,
    showAddress:true
  }
});

/* Add receipt settings without deleting existing settings. */
settings.receipt={
  defaultPrinter:"58mm",
  footer:"Thank you for shopping with us!",
  showLogo:true,
  showAddress:true,
  ...(settings.receipt||{})
};

let companyLogo=read(STORAGE.logo,"");
let staff=read(STORAGE.staff,[]);
let currentUser=null;
let cart=[];
let currentPage="Dashboard";
let analyticsStart="";
let analyticsEnd="";

const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const money=value=>(settings.currency||"K")+" "+(Number(value)||0).toFixed(2);
const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function safe(value) {
  return String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function notify(message) {
  const el=$("toast");
  if(!el) {
    console.log(message);
    return;
  }
  el.textContent=message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2600);
}

function persistAll() {
  save(STORAGE.products,products);
  save(STORAGE.sales,sales);
  save(STORAGE.expenses,expenses);
  save(STORAGE.closings,closings);
  save(STORAGE.customers,customers);
  save(STORAGE.suppliers,suppliers);
  save(STORAGE.settings,settings);
  save(STORAGE.logo,companyLogo);
  save(STORAGE.staff,staff);
}

function paidAmount(sale) {
  if(Array.isArray(sale.payments)) {
    return sale.payments.reduce((n,p)=>n+(Number(p.amount)||0),0);
  }
  if(sale.amountPaid!==undefined) return Number(sale.amountPaid)||0;
  return Number(sale.total)||0;
}

function balanceDue(sale) {
  if(sale.balanceDue!==undefined) return Math.max(0,Number(sale.balanceDue)||0);
  return Math.max(0,(Number(sale.total)||0)-paidAmount(sale));
}

function hasPermission(permission) {
  if(!currentUser) return false;
  if(currentUser.role==="owner") return true;
  return Array.isArray(currentUser.permissions)&&currentUser.permissions.includes(permission);
}

function pagePermission(page) {
  return ({
    "Dashboard":"dashboard",
    "Point of Sale":"pos",
    "Inventory":"inventory",
    "Customers":"customers",
    "Suppliers":"suppliers",
    "Sales":"sales",
    "Expenses":"expenses",
    "Reports":"reports",
    "Cash Closing":"cash",
    "Staff":"staff",
    "Settings":"settings"
  })[page];
}

function currentStaffName() {
  return currentUser?currentUser.name:"Unknown";
}

/* =========================================================
   LOGIN AND FIRST OWNER SETUP
   ========================================================= */

function showLogin() {
  $("app-shell").hidden=true;
  $("login-screen").hidden=false;

  const needsOwner=staff.length===0;

  $("first-user-fields").hidden=!needsOwner;
  $("normal-login-fields").hidden=needsOwner;
  $("login-title").textContent=needsOwner
    ?"Create Owner Account"
    :(settings.businessName||"Flavours Business Manager");

  $("login-message").textContent=needsOwner
    ?"Set up your first owner account to protect your business workspace."
    :"Sign in with your individual staff PIN";

  $("login-submit").textContent=needsOwner?"Create Owner Account":"Sign In";
  $("login-error").textContent="";

  if(companyLogo) {
    $("login-logo").innerHTML=`<img src="${companyLogo}" alt="Logo">`;
  }
}

function validPin(pin) {
  return /^\d{4,6}$/.test(String(pin));
}

$("login-form").addEventListener("submit",event=>{
  event.preventDefault();

  const error=$("login-error");
  error.textContent="";

  if(staff.length===0) {
    const name=$("owner-name").value.trim();
    const pin=$("owner-pin").value;
    const confirmPin=$("owner-pin-confirm").value;

    if(!name) return error.textContent="Enter the owner's name.";
    if(!validPin(pin)) return error.textContent="PIN must contain 4 to 6 digits.";
    if(pin!==confirmPin) return error.textContent="PINs do not match.";

    const owner={
      id:makeId(),
      name,
      username:"owner",
      role:"owner",
      pin,
      active:true,
      permissions:DEFAULT_PERMISSIONS.owner.slice(),
      createdAt:new Date().toISOString()
    };

    staff.push(owner);
    save(STORAGE.staff,staff);
    signIn(owner);
    return;
  }

  const pin=$("login-pin").value;

  if(!validPin(pin)) return error.textContent="Enter your 4–6 digit PIN.";

  const user=staff.find(s=>s.active!==false&&String(s.pin)===String(pin));

  if(!user) {
    error.textContent="Incorrect PIN or inactive account.";
    $("login-pin").value="";
    return;
  }

  signIn(user);
});

function signIn(user) {
  currentUser=user;
  cart=[];

  $("login-screen").hidden=true;
  $("app-shell").hidden=false;
  $("signed-in-user").textContent=user.name+" ("+user.role+")";

  $("today-date").textContent=new Date().toLocaleDateString(undefined,{
    weekday:"long",
    year:"numeric",
    month:"long",
    day:"numeric"
  });

  applySettings();
  updateNavigation();

  const firstPage=hasPermission("dashboard")
    ?"Dashboard"
    :(hasPermission("pos")?"Point of Sale":"Inventory");

  showPage(firstPage);
}

function logout() {
  currentUser=null;
  cart=[];
  $("login-pin").value="";
  showLogin();
}

$("logout-button").addEventListener("click",logout);

/* =========================================================
   NAVIGATION AND PERMISSIONS
   ========================================================= */

function updateNavigation() {
  document.querySelectorAll(".nav-link").forEach(button=>{
    const permission=pagePermission(button.dataset.page);
    button.hidden=!hasPermission(permission);
  });
}

function showPage(page) {
  const permission=pagePermission(page);

  if(!hasPermission(permission)) {
    notify("You do not have permission to open "+page+".");
    return;
  }

  currentPage=page;

  document.querySelectorAll(".nav-link").forEach(button=>{
    button.classList.toggle("active",button.dataset.page===page);
  });

  $("page-title").textContent=page;

  const renderers={
    "Dashboard":renderDashboard,
    "Point of Sale":renderPOS,
    "Inventory":renderInventory,
    "Customers":renderCustomers,
    "Suppliers":renderSuppliers,
    "Sales":renderSales,
    "Expenses":renderExpenses,
    "Reports":renderReports,
    "Cash Closing":renderCashClosing,
    "Staff":renderStaff,
    "Settings":renderSettings
  };

  (renderers[page]||renderDashboard)();
}

document.addEventListener("click",event=>{
  const nav=event.target.closest(".nav-link,[data-page]");

  if(nav&&nav.dataset.page) {
    event.preventDefault();
    showPage(nav.dataset.page);
  }
});

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const date=today();

  const todays=sales.filter(s=>String(s.date||"").slice(0,10)===date);
  const todayRevenue=todays.reduce((n,s)=>n+Number(s.total||0),0);
  const todayReceived=todays.reduce((n,s)=>n+paidAmount(s),0);
  const expenseTotal=expenses.reduce((n,e)=>n+Number(e.amount||0),0);
  const owing=sales.reduce((n,s)=>n+balanceDue(s),0);

  $("page-content").innerHTML=`
    <div class="grid">
      ${statCard("Today's Sales",money(todayRevenue))}
      ${statCard("Money Received Today",money(todayReceived),"green")}
      ${statCard("Total Sales",money(sales.reduce((n,s)=>n+Number(s.total||0),0)))}
      ${statCard("Outstanding Credit",money(owing),"gold")}
      ${statCard("Total Expenses",money(expenseTotal),"red")}
      ${statCard("Products",products.length)}
      ${statCard("Customers",customers.length)}
      ${statCard("Staff Accounts",staff.filter(s=>s.active!==false).length)}
    </div>

    <div class="section card">
      <h3>Quick Actions</h3>
      <div class="actions">
        ${hasPermission("pos")?'<button class="btn gold-btn" data-page="Point of Sale">New Sale</button>':""}
        ${hasPermission("inventory")?'<button class="btn" data-page="Inventory">Inventory</button>':""}
        ${hasPermission("customers")?'<button class="btn" data-action="add-customer">Add Customer</button>':""}
        ${hasPermission("expenses")?'<button class="btn" data-action="add-expense">Record Expense</button>':""}
        ${hasPermission("reports")?'<button class="btn" data-page="Reports">View Analytics</button>':""}
      </div>
    </div>

    <div class="section card">
      <h3>Recent Sales</h3>
      ${sales.length?sales.slice().reverse().slice(0,7).map(s=>`
        <div class="cart-line">
          <span>${safe(s.customer||"Walk-in Customer")}<br>
          <small>${safe(String(s.date||"").slice(0,16).replace("T"," "))}</small></span>
          <strong>${money(s.total)}</strong>
        </div>`).join(""):'<div class="empty">No sales recorded yet.</div>'}
    </div>`;
}

function statCard(label,value,color="") {
  return `<div class="card"><div class="stat-label">${label}</div><div class="stat-value ${color}">${value}</div></div>`;
}

/* =========================================================
   POINT OF SALE
   ========================================================= */

function renderPOS() {
  $("page-content").innerHTML=`
    <div class="pos-layout">
      <div class="card">
        <div class="toolbar">
          <input class="search-input" id="product-search" placeholder="Search products...">
        </div>
        <div class="product-grid" id="pos-products"></div>
      </div>

      <div class="card">
        <h3>Current Sale</h3>
        <div id="cart-items"></div>

        <div class="total-line">
          <span>Total</span>
          <strong id="cart-total">${money(0)}</strong>
        </div>

        <div class="field">
          <label>Customer</label>
          <select id="pos-customer">
            <option value="">Walk-in Customer</option>
            ${customers.map(c=>`<option value="${safe(c.name)}">${safe(c.name)}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>Payment Method</label>
          <select id="payment-method">
            <option>Cash</option>
            <option>Mobile Money</option>
            <option>Bank Transfer</option>
            <option>Credit</option>
          </select>
        </div>

        <div class="field">
          <label>Amount Received</label>
          <input id="amount-received" type="number" min="0" step="0.01" placeholder="Enter amount received">
        </div>

        <button class="btn gold-btn" style="width:100%" data-action="checkout">Complete Sale</button>
        <button class="btn light-btn" style="width:100%;margin-top:8px" data-action="clear-cart">Clear Cart</button>
      </div>
    </div>`;

  renderPOSProducts();
  renderCart();
}

function renderPOSProducts() {
  const query=($("product-search")?.value||"").toLowerCase();

  const list=products.filter(p=>
    String(p.name||"").toLowerCase().includes(query)&&
    (p.type==="Service"||Number(p.stock)>0)
  );

  $("pos-products").innerHTML=list.length?list.map(p=>`
    <button class="product-tile" data-add-product="${safe(p.id)}">
      <strong>${safe(p.name)}</strong>
      <small>${money(p.price)}<br>${p.type==="Service"?"Service":"Stock: "+Number(p.stock)}</small>
    </button>`).join("")
    :'<div class="empty">No available products. Add them in Inventory.</div>';
}

function addToCart(id) {
  const p=products.find(x=>String(x.id)===String(id));

  if(!p) return notify("Product not found.");

  const line=cart.find(x=>String(x.id)===String(id));

  if(p.type!=="Service"&&(line?line.qty:0)+1>Number(p.stock)) {
    return notify("Not enough stock.");
  }

  if(line) line.qty++;
  else cart.push({
    id:p.id,
    name:p.name,
    price:Number(p.price),
    cost:Number(p.cost)||0,
    qty:1,
    type:p.type||"Product"
  });

  renderCart();
}

function renderCart() {
  const target=$("cart-items");
  if(!target) return;

  target.innerHTML=cart.length?cart.map((item,i)=>`
    <div class="cart-line">
      <span>${safe(item.name)}<br><small>${item.qty} × ${money(item.price)}</small></span>
      <span>
        <strong>${money(item.qty*item.price)}</strong><br>
        <button class="btn small danger-btn" data-remove-cart="${i}">Remove</button>
      </span>
    </div>`).join("")
    :'<div class="empty">Your cart is empty.</div>';

  $("cart-total").textContent=money(cart.reduce((n,x)=>n+x.qty*x.price,0));
}

function checkout() {
  if(!hasPermission("pos")) return notify("Access denied.");
  if(!cart.length) return notify("Your cart is empty.");

  for(const item of cart) {
    const p=products.find(x=>String(x.id)===String(item.id));

    if(!p) return notify("A cart product no longer exists.");

    if(p.type!=="Service"&&Number(p.stock)<item.qty) {
      return notify("Insufficient stock: "+p.name);
    }
  }

  const total=cart.reduce((n,x)=>n+x.qty*x.price,0);
  const method=$("payment-method").value;
  const customer=$("pos-customer").value||"Walk-in Customer";

  let received=Number($("amount-received").value||0);

  if(method!=="Credit"&&!$("amount-received").value) received=total;

  if(!Number.isFinite(received)||received<0||received>total) {
    return notify("Enter a valid payment amount.");
  }

  if(method!=="Credit"&&received<total) {
    return notify("Choose Credit for a part-payment.");
  }

  if(received<total&&customer==="Walk-in Customer") {
    return notify("Choose a customer for a credit sale.");
  }

  const timestamp=new Date().toISOString();
  const items=cart.map(x=>({...x}));

  const sale={
    id:makeId(),
    date:timestamp,
    customer,
    items,
    total,
    payment:method,
    amountPaid:received,
    balanceDue:total-received,
    payments:received>0?[{amount:received,method,date:timestamp}]:[],
    salespersonId:currentUser.id,
    salesperson:currentUser.name
  };

  items.forEach(item=>{
    const p=products.find(x=>String(x.id)===String(item.id));
    if(p&&p.type!=="Service") p.stock=Number(p.stock)-item.qty;
  });

  sales.push(sale);

  if(customer!=="Walk-in Customer"&&
    !customers.some(c=>String(c.name).toLowerCase()===customer.toLowerCase())) {
    customers.push({id:makeId(),name:customer,phone:"",email:""});
  }

  persistAll();
  cart=[];
  notify("Sale saved under "+currentUser.name+".");

  /* Open the receipt preview after saving the sale. */
  printReceipt(sale);
  showPage("Point of Sale");
}

/* =========================================================
   RECEIPT PREVIEW AND PRINTING
   Supports 58mm, 80mm and A4.
   ========================================================= */

function getReceiptFormat() {
  const format=settings.receipt?.defaultPrinter||"58mm";
  return ["58mm","80mm","A4"].includes(format)?format:"58mm";
}

function receiptHTML(s,format) {
  const receiptSettings=settings.receipt||{};
  const is58=format==="58mm";
  const is80=format==="80mm";
  const thermal=is58||is80;

  const pageWidth=is58?"58mm":is80?"80mm":"210mm";
  const contentWidth=is58?"54mm":is80?"76mm":"190mm";
  const fontSize=thermal?(is58?"10px":"12px"):"14px";
  const padding=thermal?"2mm":"10mm";

  const logo=receiptSettings.showLogo&&companyLogo
    ?`<img src="${companyLogo}" class="receipt-logo" alt="Business logo">`
    :"";

  const address=receiptSettings.showAddress&&settings.address
    ?`<p>${safe(settings.address)}</p>`
    :"";

  const items=Array.isArray(s.items)?s.items:[];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flavours Receipt - ${safe(s.id)}</title>
<style>
  * { box-sizing:border-box; }
  @page {
    size:${is58?"58mm auto":is80?"80mm auto":"A4"};
    margin:${thermal?"2mm":"10mm"};
  }
  body {
    font-family:Arial,Helvetica,sans-serif;
    width:${contentWidth};
    max-width:100%;
    margin:0 auto;
    padding:${padding};
    color:#111;
    background:#fff;
    font-size:${fontSize};
    line-height:1.4;
  }
  h2 {
    text-align:center;
    font-size:${thermal?"15px":"22px"};
    margin:5px 0;
    overflow-wrap:anywhere;
  }
  p { margin:4px 0;text-align:center;overflow-wrap:anywhere; }
  .receipt-logo {
    display:block;
    max-width:${thermal?"45mm":"55mm"};
    max-height:65px;
    object-fit:contain;
    margin:0 auto 8px;
  }
  .center { text-align:center; }
  .line {
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:5px;
    margin:6px 0;
  }
  .line span:first-child {
    flex:1;
    overflow-wrap:anywhere;
  }
  .line span:last-child {
    text-align:right;
    white-space:nowrap;
  }
  hr {
    border:0;
    border-top:1px dashed #555;
    margin:9px 0;
  }
  .total {
    font-size:${thermal?"13px":"18px"};
    font-weight:bold;
  }
  .footer {
    text-align:center;
    margin-top:14px;
    overflow-wrap:anywhere;
  }
  .preview-actions {
    display:flex;
    gap:8px;
    margin:0 0 15px;
  }
  .preview-actions button {
    flex:1;
    padding:10px 6px;
    border:0;
    border-radius:5px;
    background:#142b50;
    color:#fff;
    cursor:pointer;
    font-weight:bold;
  }
  .preview-actions button.close {
    background:#666;
  }
  .format-label {
    text-align:center;
    font-size:10px;
    color:#666;
    margin-bottom:8px;
  }
  @media print {
    .preview-actions,.format-label { display:none!important; }
    body { margin:0 auto; }
  }
</style>
</head>
<body>

<div class="preview-actions">
  <button onclick="window.print()">Print Receipt</button>
  <button class="close" onclick="window.close()">Close</button>
</div>

<div class="format-label">Preview format: ${safe(format)}</div>

${logo}

<h2>${safe(settings.businessName||"Flavours Techs Solutions")}</h2>
${address}
<p>${safe(settings.phone||"")}</p>

<hr>

<p><strong>SALES RECEIPT</strong></p>
<p>Receipt: ${safe(s.id)}</p>
<p>Date: ${safe(new Date(s.date||Date.now()).toLocaleString())}</p>
<p>Customer: ${safe(s.customer||"Walk-in Customer")}</p>
<p>Served by: ${safe(s.salesperson||"Staff")}</p>

<hr>

${items.map(i=>`
  <div class="line">
    <span>${safe(i.name)} × ${Number(i.qty)||0}</span>
    <span>${money((Number(i.qty)||0)*(Number(i.price)||0))}</span>
  </div>
`).join("")}

<hr>

<div class="line total">
  <span>TOTAL</span>
  <span>${money(s.total)}</span>
</div>

<div class="line">
  <span>Paid</span>
  <span>${money(paidAmount(s))}</span>
</div>

<div class="line">
  <span>Balance</span>
  <span>${money(balanceDue(s))}</span>
</div>

<div class="line">
  <span>Payment</span>
  <span>${safe(s.payment||"Cash")}</span>
</div>

<hr>

<div class="footer">${safe(receiptSettings.footer||"Thank you for your business!")}</div>

</body>
</html>`;
}

function printReceipt(s,format) {
  if(!s) return notify("Receipt information not found.");

  const selectedFormat=format||getReceiptFormat();

  const w=window.open("","_blank","width=550,height=750");

  if(!w) {
    notify("Allow pop-ups in Chrome to preview receipts.");
    return;
  }

  w.document.open();
  w.document.write(receiptHTML(s,selectedFormat));
  w.document.close();
}

function createTestReceipt() {
  const now=new Date().toISOString();

  return {
    id:"TEST-"+makeId().toUpperCase(),
    date:now,
    customer:"Sample Customer",
    salesperson:currentUser?.name||"Test User",
    items:[
      {name:"Sample Product",qty:2,price:25,cost:15},
      {name:"Sample Service",qty:1,price:50,cost:0}
    ],
    total:100,
    amountPaid:100,
    balanceDue:0,
    payments:[{amount:100,method:"Cash",date:now}],
    payment:"Cash"
  };
}

function previewTestReceipt() {
  printReceipt(createTestReceipt(),getReceiptFormat());
}

/* =========================================================
   INVENTORY
   ========================================================= */

function renderInventory() {
  $("page-content").innerHTML=`
    <div class="page-heading">
      <h2>Inventory Management</h2>
      ${hasPermission("inventoryEdit")?'<button class="btn gold-btn" data-action="add-product">Add Product / Service</button>':""}
    </div>

    <div class="card">
      <div class="toolbar">
        <input id="inventory-search" class="search-input" placeholder="Search inventory...">
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody id="inventory-rows"></tbody>
        </table>
      </div>
    </div>`;

  renderInventoryRows();
}

function renderInventoryRows() {
  const query=($("inventory-search")?.value||"").toLowerCase();
  const list=products.filter(p=>String(p.name||"").toLowerCase().includes(query));

  $("inventory-rows").innerHTML=list.length?list.map(p=>`
    <tr>
      <td>${safe(p.name)}</td>
      <td>${safe(p.type||"Product")}</td>
      <td>${money(p.cost)}</td>
      <td>${money(p.price)}</td>
      <td>${p.type==="Service"?"—":Number(p.stock)}</td>
      <td>
        ${p.type!=="Service"&&hasPermission("inventoryEdit")?`<button class="btn small success-btn" data-restock="${safe(p.id)}">Restock</button>`:""}
        ${hasPermission("inventoryEdit")?`
          <button class="btn small light-btn" data-edit-product="${safe(p.id)}">Edit</button>
          <button class="btn small danger-btn" data-delete-product="${safe(p.id)}">Delete</button>`:""}
      </td>
    </tr>`).join("")
    :'<tr><td colspan="6" class="empty">No products found.</td></tr>';
}

function addProduct() {
  if(!hasPermission("inventoryEdit")) return notify("Access denied.");

  const name=prompt("Product or service name:");
  if(!name?.trim()) return;

  const type=(prompt("Enter Product or Service:","Product")||"Product").toLowerCase()==="service"?"Service":"Product";

  const cost=Number(prompt("Cost price:","0"));
  const price=Number(prompt("Selling price:","0"));
  const stock=type==="Service"?0:Number(prompt("Opening stock:","0"));

  if(![cost,price,stock].every(Number.isFinite)||cost<0||price<0||stock<0) {
    return notify("Invalid numbers.");
  }

  products.push({id:makeId(),name:name.trim(),type,cost,price,stock});
  persistAll();
  renderInventory();
  notify("Item added.");
}

function editProduct(id) {
  if(!hasPermission("inventoryEdit")) return notify("Access denied.");

  const p=products.find(x=>String(x.id)===String(id));
  if(!p) return;

  const name=prompt("Item name:",p.name);
  if(!name?.trim()) return;

  const cost=Number(prompt("Cost price:",p.cost));
  const price=Number(prompt("Selling price:",p.price));

  if(![cost,price].every(Number.isFinite)||cost<0||price<0) {
    return notify("Invalid price.");
  }

  p.name=name.trim();
  p.cost=cost;
  p.price=price;

  persistAll();
  renderInventory();
  notify("Product updated.");
}

function restock(id) {
  if(!hasPermission("inventoryEdit")) return notify("Access denied.");

  const p=products.find(x=>String(x.id)===String(id));
  if(!p) return;

  const amount=Number(prompt("Quantity to add:"));

  if(!Number.isFinite(amount)||amount<=0) return notify("Enter a positive quantity.");

  p.stock=Number(p.stock||0)+amount;

  persistAll();
  renderInventory();
  notify("Stock updated.");
}

/* =========================================================
   CUSTOMERS AND CREDIT
   ========================================================= */

function renderCustomers() {
  $("page-content").innerHTML=`
    <div class="page-heading">
      <h2>Customers</h2>
      <button class="btn gold-btn" data-action="add-customer">Add Customer</button>
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Outstanding</th><th>Actions</th></tr></thead>
        <tbody>
        ${customers.length?customers.map(c=>{
          const owing=sales.filter(s=>s.customer===c.name).reduce((n,s)=>n+balanceDue(s),0);
          return `<tr>
            <td>${safe(c.name)}</td>
            <td>${safe(c.phone||"")}</td>
            <td>${safe(c.email||"")}</td>
            <td>${money(owing)}</td>
            <td>
              ${hasPermission("credit")?`<button class="btn small success-btn" data-customer-payment="${safe(c.id)}">Receive Payment</button>`:""}
              <button class="btn small danger-btn" data-delete-customer="${safe(c.id)}">Delete</button>
            </td>
          </tr>`;
        }).join(""):'<tr><td colspan="5" class="empty">No customers.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section card">
      <h3>Outstanding Credit Sales</h3>
      ${creditTable()}
    </div>`;
}

function creditTable() {
  const list=sales.filter(s=>balanceDue(s)>0);

  return list.length?`
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Customer</th><th>Sale</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead>
        <tbody>
        ${list.map(s=>`
          <tr>
            <td>${safe(String(s.date).slice(0,10))}</td>
            <td>${safe(s.customer)}</td>
            <td>${money(s.total)}</td>
            <td>${money(paidAmount(s))}</td>
            <td>${money(balanceDue(s))}</td>
            <td>${hasPermission("credit")?`<button class="btn small success-btn" data-sale-payment="${safe(s.id)}">Receive Payment</button>`:""}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`:'<div class="empty">No outstanding credit sales.</div>';
}

function addCustomer() {
  const name=prompt("Customer name:");
  if(!name?.trim()) return;

  customers.push({
    id:makeId(),
    name:name.trim(),
    phone:prompt("Phone number:","")||"",
    email:prompt("Email:","")||""
  });

  persistAll();
  showPage("Customers");
  notify("Customer added.");
}

function receiveSalePayment(id) {
  if(!hasPermission("credit")) return notify("Access denied.");

  const s=sales.find(x=>String(x.id)===String(id));
  if(!s) return;

  const due=balanceDue(s);
  const amount=Number(prompt("Outstanding: "+money(due)+"\nPayment amount:"));

  if(!Number.isFinite(amount)||amount<=0||amount>due) {
    return notify("Invalid payment amount.");
  }

  const method=prompt("Payment method: Cash, Mobile Money or Bank Transfer","Cash")||"Cash";

  if(!Array.isArray(s.payments)) {
    s.payments=s.amountPaid>0
      ?[{amount:Number(s.amountPaid),method:s.payment||"Cash",date:s.date}]
      :[];
  }

  s.payments.push({amount,method,date:new Date().toISOString()});
  s.amountPaid=paidAmount(s);
  s.balanceDue=Math.max(0,s.total-s.amountPaid);

  persistAll();
  showPage("Customers");
  notify("Payment received.");
}

function receiveCustomerPayment(id) {
  if(!hasPermission("credit")) return notify("Access denied.");

  const c=customers.find(x=>String(x.id)===String(id));
  if(!c) return;

  const unpaid=sales.filter(s=>s.customer===c.name&&balanceDue(s)>0);
  const total=unpaid.reduce((n,s)=>n+balanceDue(s),0);
  const amount=Number(prompt("Outstanding: "+money(total)+"\nPayment amount:"));

  if(!Number.isFinite(amount)||amount<=0||amount>total) {
    return notify("Enter a valid amount not exceeding the balance.");
  }

  const method=prompt("Payment method: Cash, Mobile Money or Bank Transfer","Cash")||"Cash";
  let remaining=amount;

  for(const s of unpaid) {
    if(remaining<=0) break;

    const part=Math.min(remaining,balanceDue(s));

    if(!Array.isArray(s.payments)) {
      s.payments=s.amountPaid>0
        ?[{amount:Number(s.amountPaid),method:s.payment||"Cash",date:s.date}]
        :[];
    }

    s.payments.push({amount:part,method,date:new Date().toISOString()});
    s.amountPaid=paidAmount(s);
    s.balanceDue=Math.max(0,s.total-s.amountPaid);
    remaining-=part;
  }

  persistAll();
  showPage("Customers");
  notify("Customer payment recorded.");
}

/* =========================================================
   SUPPLIERS
   ========================================================= */

function renderSuppliers() {
  $("page-content").innerHTML=`
    <div class="page-heading">
      <h2>Suppliers</h2>
      <button class="btn gold-btn" data-action="add-supplier">Add Supplier</button>
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Notes</th><th>Action</th></tr></thead>
        <tbody>
        ${suppliers.length?suppliers.map(s=>`
          <tr>
            <td>${safe(s.name)}</td>
            <td>${safe(s.phone||"")}</td>
            <td>${safe(s.email||"")}</td>
            <td>${safe(s.notes||"")}</td>
            <td><button class="btn small danger-btn" data-delete-supplier="${safe(s.id)}">Delete</button></td>
          </tr>`).join("")
          :'<tr><td colspan="5" class="empty">No suppliers added.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function addSupplier() {
  const name=prompt("Supplier name:");
  if(!name?.trim()) return;

  suppliers.push({
    id:makeId(),
    name:name.trim(),
    phone:prompt("Phone:","")||"",
    email:prompt("Email:","")||"",
    notes:prompt("Notes:","")||""
  });

  persistAll();
  showPage("Suppliers");
  notify("Supplier added.");
}

/* =========================================================
   SALES HISTORY
   ========================================================= */

function renderSales() {
  $("page-content").innerHTML=`
    <div class="page-heading"><h2>Sales History</h2></div>

    <div class="card">
      <div class="toolbar">
        <input id="sales-search" class="search-input" placeholder="Search customer or salesperson...">
        ${hasPermission("backup")?'<button class="btn light-btn" data-action="export-sales">Export CSV</button>':""}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Customer</th><th>Salesperson</th>
              <th>Total</th><th>Paid</th><th>Balance</th><th>Method</th><th>Receipt</th>
            </tr>
          </thead>
          <tbody id="sales-rows"></tbody>
        </table>
      </div>
    </div>`;
  renderSalesRows();
}

function renderSalesRows() {
  const q=($("sales-search")?.value||"").toLowerCase();

  let list=sales.slice().reverse().filter(s=>
    (String(s.customer||"")+" "+String(s.salesperson||"")+" "+String(s.payment||"")).toLowerCase().includes(q)
  );

  if(currentUser.role==="salesperson") {
    list=list.filter(s=>s.salespersonId===currentUser.id);
  }

  $("sales-rows").innerHTML=list.length?list.map(s=>`
    <tr>
      <td>${safe(String(s.date||"").slice(0,16).replace("T"," "))}</td>
      <td>${safe(s.customer||"Walk-in")}</td>
      <td>${safe(s.salesperson||"Previous sale")}</td>
      <td>${money(s.total)}</td>
      <td>${money(paidAmount(s))}</td>
      <td>${money(balanceDue(s))}</td>
      <td>${safe(s.payment||"—")}</td>
      <td><button class="btn small light-btn" data-preview-sale="${safe(s.id)}">Preview / Print</button></td>
    </tr>`).join("")
    :'<tr><td colspan="8" class="empty">No matching sales.</td></tr>';
}

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  $("page-content").innerHTML=`
    <div class="page-heading">
      <h2>Expenses</h2>
      <button class="btn gold-btn" data-action="add-expense">Add Expense</button>
    </div>

    <div class="card">
      <h3>Total Expenses: ${money(expenses.reduce((n,e)=>n+Number(e.amount||0),0))}</h3>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Payment</th><th>Amount</th><th>Action</th></tr></thead>
          <tbody>
          ${expenses.slice().reverse().map(e=>`
            <tr>
              <td>${safe(e.date)}</td>
              <td>${safe(e.description)}</td>
              <td>${safe(e.category)}</td>
              <td>${safe(e.payment||"Cash")}</td>
              <td>${money(e.amount)}</td>
              <td><button class="btn small danger-btn" data-delete-expense="${safe(e.id)}">Delete</button></td>
            </tr>`).join("")
            ||'<tr><td colspan="6" class="empty">No expenses recorded.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function addExpense() {
  const description=prompt("Expense description:");
  if(!description?.trim()) return;

  const category=prompt("Category:","General")||"General";
  const amount=Number(prompt("Amount:"));

  if(!Number.isFinite(amount)||amount<=0) return notify("Enter a valid amount.");

  const payment=prompt("Payment method: Cash, Mobile Money or Bank Transfer","Cash")||"Cash";

  expenses.push({
    id:makeId(),
    date:today(),
    description:description.trim(),
    category,
    amount,
    payment
  });

  persistAll();
  showPage("Expenses");
  notify("Expense recorded.");
}

/* =========================================================
   ADVANCED ANALYTICS
   ========================================================= */

function inDateRange(date,start,end) {
  const d=String(date||"").slice(0,10);
  return (!start||d>=start)&&(!end||d<=end);
}

function analyticsSales() {
  let list=sales.filter(s=>inDateRange(s.date,analyticsStart,analyticsEnd));

  if(currentUser.role==="salesperson") {
    list=list.filter(s=>s.salespersonId===currentUser.id);
  }

  return list;
}

function groupTotals(items,keyFn,valueFn) {
  const map={};

  items.forEach(item=>{
    const key=keyFn(item);
    map[key]=(map[key]||0)+valueFn(item);
  });

  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function topProductRows(list) {
  const map={};

  list.forEach(s=>(s.items||[]).forEach(i=>{
    const name=i.name||"Unknown item";
    map[name]=(map[name]||0)+(Number(i.qty)||0);
  }));

  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
}

function topCustomerRows(list) {
  return groupTotals(list,s=>s.customer||"Walk-in Customer",s=>Number(s.total)||0).slice(0,8);
}

function topStaffRows(list) {
  return groupTotals(list,s=>s.salesperson||"Previous sale",s=>Number(s.total)||0).slice(0,10);
}

function renderBars(entries,format="money") {
  if(!entries.length) return '<div class="empty">No data for this period.</div>';

  const max=Math.max(...entries.map(x=>x[1]),1);

  return `<div class="chart-bars">
    ${entries.map(([label,value])=>`
      <div class="chart-bar" title="${safe(label)}: ${format==="money"?money(value):value}">
        <span>${format==="money"?money(value):value}</span>
        <div class="chart-bar-fill" style="height:${Math.max(2,(value/max)*100)}%"></div>
        <small>${safe(label)}</small>
      </div>`).join("")}
  </div>`;
}

function renderAnalyticsTable(rows,heading,valueLabel) {
  return `<div class="card">
    <h3>${heading}</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Name</th><th>${valueLabel}</th></tr></thead>
        <tbody>
          ${rows.length?rows.map((r,i)=>`
            <tr>
              <td>${i+1}</td>
              <td>${safe(r[0])}</td>
              <td>${typeof r[1]==="number"&&valueLabel!=="Units Sold"?money(r[1]):r[1]}</td>
            </tr>`).join("")
            :'<tr><td colspan="3" class="empty">No data available.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderReports() {
  const list=analyticsSales();
  const revenue=list.reduce((n,s)=>n+Number(s.total||0),0);
  const received=list.reduce((n,s)=>n+paidAmount(s),0);
  const owing=list.reduce((n,s)=>n+balanceDue(s),0);

  const costs=list.reduce((n,s)=>n+(s.items||[]).reduce((sum,i)=>
    sum+(Number(i.cost)||Number(products.find(p=>String(p.id)===String(i.id))?.cost)||0)*(Number(i.qty)||0),0
  ),0);

  const monthly=groupTotals(list,s=>String(s.date||"").slice(0,7),s=>Number(s.total)||0)
    .sort((a,b)=>a[0].localeCompare(b[0]));

  const hourlyMap={};

  list.forEach(s=>{
    const date=new Date(s.date);
    const hour=Number.isNaN(date.getTime())?null:date.getHours();

    if(hour!==null) {
      const label=String(hour).padStart(2,"0")+":00";
      hourlyMap[label]=(hourlyMap[label]||0)+(Number(s.total)||0);
    }
  });

  const hourly=Object.entries(hourlyMap).sort((a,b)=>a[0].localeCompare(b[0]));
  const payment=groupTotals(list,s=>s.payment||"Unknown",s=>Number(s.total)||0);
  const salespeople=topStaffRows(list);
  const profit=revenue-costs;

  $("page-content").innerHTML=`
    <div class="page-heading"><h2>Advanced Sales Analytics</h2></div>

    <div class="card">
      <div class="analytics-filters">
        <div class="field"><label>From</label><input type="date" id="analytics-start" value="${safe(analyticsStart)}"></div>
        <div class="field"><label>To</label><input type="date" id="analytics-end" value="${safe(analyticsEnd)}"></div>
        <button class="btn gold-btn" data-action="apply-analytics">Apply Dates</button>
        <button class="btn light-btn" data-action="analytics-month">This Month</button>
        <button class="btn light-btn" data-action="analytics-all">All Time</button>
      </div>
      <small class="stat-note">Reports are calculated from saved sales transactions. Previous V1.5 sales are included, but older sales may not have salesperson or exact hourly information.</small>
    </div>

    <div class="section grid">
      ${statCard("Total Sales",money(revenue))}
      ${statCard("Sales Transactions",list.length)}
      ${statCard("Money Received",money(received),"green")}
      ${statCard("Outstanding Credit",money(owing),"gold")}
      ${statCard("Estimated Cost of Sales",money(costs))}
      ${statCard("Gross Profit Estimate",money(profit),profit<0?"red":"green")}
    </div>

    <div class="section card"><h3>Monthly Sales</h3>${renderBars(monthly,"money")}</div>

    <div class="section card">
      <h3>Hourly Sales</h3>
      ${renderBars(hourly,"money")}
      <p class="stat-note">Hourly figures use the transaction timestamp saved with each sale. Older sales without a time cannot be reliably included.</p>
    </div>

    <div class="section grid">
      <div>${renderAnalyticsTable(topProductRows(list),"Top Products and Services","Units Sold")}</div>
      <div>${renderAnalyticsTable(topCustomerRows(list),"Top Customers","Sales Value")}</div>
    </div>

    <div class="section grid">
      <div>${renderAnalyticsTable(salespeople,"Sales by Staff","Sales Value")}</div>
      <div>${renderAnalyticsTable(payment,"Sales by Payment Method","Sales Value")}</div>
    </div>`;
}

/* =========================================================
   DAILY CASH CLOSING
   ========================================================= */

function cashPaymentsForDay(date) {
  return sales.filter(s=>String(s.date||"").slice(0,10)===date).reduce((sum,s)=>{
    if(Array.isArray(s.payments)) {
      return sum+s.payments.filter(p=>
        String(p.date||s.date).slice(0,10)===date&&
        String(p.method||s.payment).toLowerCase()==="cash"
      ).reduce((n,p)=>n+(Number(p.amount)||0),0);
    }

    return sum+(String(s.payment||"Cash").toLowerCase()==="cash"?paidAmount(s):0);
  },0);
}

function cashExpensesForDay(date) {
  return expenses.filter(e=>e.date===date&&String(e.payment||"Cash").toLowerCase()==="cash")
    .reduce((n,e)=>n+Number(e.amount||0),0);
}

function renderCashClosing() {
  const date=today();
  const received=cashPaymentsForDay(date);
  const spent=cashExpensesForDay(date);
  const saved=closings.find(c=>c.date===date);

  $("page-content").innerHTML=`
    <div class="grid">
      ${statCard("Cash Received",money(received),"green")}
      ${statCard("Cash Expenses",money(spent),"red")}
      ${statCard("Expected Cash",money(received-spent))}
      ${statCard("Status",saved?"Closed":"Open")}
    </div>

    <div class="section card">
      <h3>Record Today's Cash Count</h3>
      <div class="field">
        <label>Actual cash counted</label>
        <input id="actual-cash" type="number" min="0" step="0.01" value="${saved?saved.actualCash:""}">
      </div>
      <div class="field">
        <label>Notes</label>
        <input id="closing-notes" value="${safe(saved?.notes||"")}">
      </div>
      <button class="btn gold-btn" data-action="save-closing">Save Daily Closing</button>
      ${saved?`<p class="stat-note">Difference: ${money(Number(saved.actualCash)-(received-spent))}</p>`:""}
    </div>

    <div class="section card">
      <h3>Previous Closings</h3>
      ${closings.slice().reverse().map(c=>`
        <div class="cart-line"><span>${safe(c.date)}</span><strong>${money(c.actualCash)}</strong></div>
      `).join("")||'<div class="empty">No closing records.</div>'}
    </div>`;
}

function saveClosing() {
  const actual=Number($("actual-cash").value);

  if(!Number.isFinite(actual)||actual<0) return notify("Enter a valid cash count.");

  const date=today();
  const received=cashPaymentsForDay(date);
  const spent=cashExpensesForDay(date);

  const record={
    date,
    cashReceived:received,
    cashExpenses:spent,
    expectedCash:received-spent,
    actualCash:actual,
    notes:$("closing-notes").value.trim()
  };

  const index=closings.findIndex(c=>c.date===date);

  if(index>=0) closings[index]=record;
  else closings.push(record);

  persistAll();
  showPage("Cash Closing");
  notify("Daily closing saved.");
}

/* =========================================================
   STAFF MANAGEMENT
   ========================================================= */

function renderStaff() {
  if(currentUser.role!=="owner") return notify("Only the owner can manage staff.");

  $("page-content").innerHTML=`
    <div class="page-heading">
      <h2>Staff and User Management</h2>
      <button class="btn gold-btn" data-action="add-staff">Add Staff Account</button>
    </div>

    <div class="card">
      <p class="stat-note">Create individual PIN accounts, assign a role and choose the exact pages and actions each employee can use.</p>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Permissions</th><th>Actions</th></tr></thead>
          <tbody>
            ${staff.map(s=>`
              <tr>
                <td>${safe(s.name)}</td>
                <td>${safe(s.username||"—")}</td>
                <td>${safe(s.role)}</td>
                <td><span class="badge ${s.active===false?"credit":"paid"}">${s.active===false?"Inactive":"Active"}</span></td>
                <td>${s.role==="owner"?"All permissions":(s.permissions||[]).length+" enabled"}</td>
                <td>
                  ${s.role!=="owner"?`
                    <button class="btn small light-btn" data-edit-staff="${safe(s.id)}">Edit</button>
                    <button class="btn small ${s.active===false?"success-btn":"danger-btn"}" data-toggle-staff="${safe(s.id)}">${s.active===false?"Activate":"Deactivate"}</button>
                    <button class="btn small danger-btn" data-delete-staff="${safe(s.id)}">Delete</button>
                  `:"Owner account"}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function staffForm(existing=null) {
  if(currentUser.role!=="owner") return notify("Only the owner can manage staff.");

  const isEdit=!!existing;
  const currentPerms=existing?.permissions||DEFAULT_PERMISSIONS.salesperson;

  $("modal-root").innerHTML=`
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${isEdit?"Edit Staff Account":"Create Staff Account"}</h3>

        <div class="field">
          <label>Employee name</label>
          <input id="staff-name" value="${safe(existing?.name||"")}">
        </div>

        <div class="field">
          <label>Username (for identification)</label>
          <input id="staff-username" value="${safe(existing?.username||"")}">
        </div>

        <div class="field">
          <label>Role</label>
          <select id="staff-role">
            <option value="salesperson" ${existing?.role==="salesperson"?"selected":""}>Salesperson</option>
            <option value="manager" ${existing?.role==="manager"?"selected":""}>Manager</option>
          </select>
        </div>

        <div class="field">
          <label>${isEdit?"New PIN (leave blank to keep current PIN)":"PIN (4–6 digits)"}</label>
          <input id="staff-pin" type="password" maxlength="6" inputmode="numeric" placeholder="${isEdit?"Leave blank to keep current PIN":"Create PIN"}">
        </div>

        <h3>Access Permissions</h3>

        <div class="permission-grid">
          ${PERMISSIONS.filter(p=>p[0]!=="staff"&&p[0]!=="settings"&&p[0]!=="backup").map(([key,label])=>`
            <label class="permission-option">
              <input type="checkbox" name="staff-permission" value="${key}" ${currentPerms.includes(key)?"checked":""}>
              ${label}
            </label>`).join("")}
        </div>

        <div class="modal-actions">
          <button class="btn light-btn" data-action="close-modal">Cancel</button>
          <button class="btn gold-btn" data-action="save-staff" data-staff-id="${safe(existing?.id||"")}">Save Staff</button>
        </div>
      </div>
    </div>`;
}

function saveStaff(id) {
  if(currentUser.role!=="owner") return notify("Access denied.");

  const name=$("staff-name").value.trim();
  const username=$("staff-username").value.trim();
  const pin=$("staff-pin").value;
  const role=$("staff-role").value;

  const permissions=[...document.querySelectorAll('input[name="staff-permission"]:checked')]
    .map(x=>x.value);

  if(!name) return notify("Enter employee name.");
  if(!username) return notify("Enter a username.");

  if(staff.some(s=>s.username?.toLowerCase()===username.toLowerCase()&&s.id!==id)) {
    return notify("That username is already in use.");
  }

  const old=staff.find(s=>s.id===id);

  if(!old&&!validPin(pin)) return notify("PIN must be 4–6 digits.");
  if(pin&&!validPin(pin)) return notify("PIN must be 4–6 digits.");

  if(staff.some(s=>s.pin===pin&&pin&&s.id!==id)) {
    return notify("That PIN is already assigned to another user.");
  }

  if(old) {
    old.name=name;
    old.username=username;
    old.role=role;
    old.permissions=permissions;
    if(pin) old.pin=pin;
  } else {
    staff.push({
      id:makeId(),
      name,
      username,
      role,
      pin,
      permissions,
      active:true,
      createdAt:new Date().toISOString()
    });
  }

  save(STORAGE.staff,staff);
  $("modal-root").innerHTML="";
  showPage("Staff");
  notify("Staff account saved.");
}

function editStaff(id) {
  if(currentUser.role!=="owner") return;

  const user=staff.find(s=>s.id===id);
  if(user) staffForm(user);
}

function toggleStaff(id) {
  if(currentUser.role!=="owner") return;

  const user=staff.find(s=>s.id===id);
  if(!user) return;

  if(user.id===currentUser.id) {
    return notify("You cannot deactivate the account you are currently using.");
  }

  user.active=user.active===false;
  save(STORAGE.staff,staff);
  renderStaff();
  notify(user.active?"Staff activated.":"Staff deactivated.");
}

function deleteStaff(id) {
  if(currentUser.role!=="owner") return;

  const user=staff.find(s=>s.id===id);
  if(!user) return;

  if(!confirm("Permanently delete this staff account? Historical sales will remain.")) return;

  staff=staff.filter(s=>s.id!==id);
  save(STORAGE.staff,staff);
  renderStaff();
  notify("Staff account deleted.");
}

/* =========================================================
   SETTINGS AND PRINTER CONFIGURATION
   ========================================================= */

function renderSettings() {
  const receipt=settings.receipt||{};

  $("page-content").innerHTML=`
    <div class="card">
      <h3>Business Settings</h3>

      <div class="field">
        <label>Business Name</label>
        <input id="setting-name" value="${safe(settings.businessName||"")}">
      </div>

      <div class="field">
        <label>Phone Number</label>
        <input id="setting-phone" value="${safe(settings.phone||"")}">
      </div>

      <div class="field">
        <label>Business Address</label>
        <input id="setting-address" value="${safe(settings.address||"")}" placeholder="Enter business address">
      </div>

      <div class="field">
        <label>Currency Symbol</label>
        <input id="setting-currency" value="${safe(settings.currency||"K")}">
      </div>

      <div class="field">
        <label>Company Logo</label>
        <input id="setting-logo" type="file" accept="image/*">
      </div>

      <div class="field">
        <label>Theme</label>
        <select id="setting-theme">
          <option value="light" ${settings.theme==="light"?"selected":""}>Light</option>
          <option value="dark" ${settings.theme==="dark"?"selected":""}>Dark</option>
        </select>
      </div>
    </div>

    <div class="section card">
      <h3>Receipt and Printer Settings</h3>

      <div class="field">
        <label>Default Receipt / Printer Format</label>
        <select id="receipt-format">
          <option value="58mm" ${receipt.defaultPrinter==="58mm"?"selected":""}>Thermal Printer - 58mm</option>
          <option value="80mm" ${receipt.defaultPrinter==="80mm"?"selected":""}>Thermal Printer - 80mm</option>
          <option value="A4" ${receipt.defaultPrinter==="A4"?"selected":""}>Normal Printer - A4</option>
        </select>
      </div>

      <div class="field">
        <label>Receipt Footer Message</label>
        <input id="receipt-footer" value="${safe(receipt.footer||"Thank you for shopping with us!")}" placeholder="Thank you for shopping with us!">
      </div>

      <div class="field">
        <label class="permission-option">
          <input type="checkbox" id="receipt-show-logo" ${receipt.showLogo!==false?"checked":""}>
          Show company logo on receipt
        </label>
      </div>

      <div class="field">
        <label class="permission-option">
          <input type="checkbox" id="receipt-show-address" ${receipt.showAddress!==false?"checked":""}>
          Show business address on receipt
        </label>
      </div>

      <div class="actions">
        <button class="btn gold-btn" data-action="save-settings">Save Settings</button>
        <button class="btn light-btn" data-action="test-receipt">Preview / Test Receipt</button>
      </div>

      <p class="stat-note">
        Select the matching format for your printer. Chrome's print window lets you choose the actual printer.
        For thermal printing, also select the correct paper size in the printer preferences.
      </p>
    </div>

    ${hasPermission("backup")?`
      <div class="section card">
        <h3>Business Data Backup</h3>
        <div class="actions">
          <button class="btn" data-action="export-backup">Download Backup</button>
          <button class="btn light-btn" data-action="choose-import">Restore Backup</button>
        </div>
        <input id="backup-file" type="file" accept=".json,application/json" hidden>
      </div>`:""}`;
}

function applySettings() {
  document.body.classList.toggle("dark",settings.theme==="dark");

  $("business-name").textContent=settings.businessName||"Flavours Techs Solutions";

  $("brand-logo").innerHTML=companyLogo
    ?`<img src="${companyLogo}" alt="Logo">`
    :"F";
}

function saveSettings() {
  if(!hasPermission("settings")) return notify("Access denied.");

  settings.businessName=$("setting-name").value.trim()||"Flavours Techs Solutions";
  settings.phone=$("setting-phone").value.trim();
  settings.address=$("setting-address").value.trim();
  settings.currency=$("setting-currency").value.trim()||"K";
  settings.theme=$("setting-theme").value;

  settings.receipt=settings.receipt||{};

  settings.receipt.defaultPrinter=$("receipt-format").value;
  settings.receipt.footer=$("receipt-footer").value.trim();
  settings.receipt.showLogo=$("receipt-show-logo").checked;
  settings.receipt.showAddress=$("receipt-show-address").checked;

  const file=$("setting-logo").files[0];

  const done=()=>{
    persistAll();
    applySettings();
    showPage("Settings");
    notify("Settings saved.");
  };

  if(file) {
    const reader=new FileReader();

    reader.onload=()=>{
      companyLogo=reader.result;
      done();
    };

    reader.onerror=()=>notify("Could not read logo.");
    reader.readAsDataURL(file);
  } else {
    done();
  }
}

/* =========================================================
   BACKUP AND EXPORT
   ========================================================= */

function downloadFile(name,content,type) {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");

  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportBackup() {
  if(!hasPermission("backup")) return notify("Access denied.");

  const data={
    version:"1.6",
    exportedAt:new Date().toISOString(),
    products,
    sales,
    expenses,
    closings,
    customers,
    suppliers,
    settings,
    companyLogo,
    staff
  };

  downloadFile(
    "flavours-business-backup-"+today()+".json",
    JSON.stringify(data,null,2),
    "application/json"
  );

  notify("Backup downloaded.");
}

function exportSalesCSV() {
  const rows=[["Date","Customer","Salesperson","Total","Paid","Balance","Payment"]];

  analyticsSales().forEach(s=>{
    rows.push([
      s.date,
      s.customer,
      s.salesperson||"Previous sale",
      s.total,
      paidAmount(s),
      balanceDue(s),
      s.payment
    ]);
  });

  const csv=rows.map(row=>
    row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")
  ).join("\n");

  downloadFile("flavours-sales-"+today()+".csv",csv,"text/csv");
}

function importBackup(file) {
  if(!file) return;

  const reader=new FileReader();

  reader.onload=()=>{
    try {
      const d=JSON.parse(reader.result);

      if(!Array.isArray(d.products)||!Array.isArray(d.sales)) {
        throw new Error("Not a valid Flavours backup.");
      }

      if(!confirm("Restoring this backup replaces the records currently stored in this browser. Continue?")) {
        return;
      }

      products=d.products||[];
      sales=d.sales||[];
      expenses=d.expenses||[];
      closings=d.closings||[];
      customers=d.customers||[];
      suppliers=d.suppliers||[];
      settings=d.settings||settings;
      companyLogo=d.companyLogo||"";
      staff=d.staff||staff;

      /* Add new receipt defaults to restored older settings. */
      settings.receipt={
        defaultPrinter:"58mm",
        footer:"Thank you for shopping with us!",
        showLogo:true,
        showAddress:true,
        ...(settings.receipt||{})
      };

      persistAll();
      applySettings();
      logout();
      notify("Backup restored. Sign in again.");

    } catch(e) {
      alert("Restore failed: "+e.message);
    }
  };

  reader.readAsText(file);
}

/* =========================================================
   DELETE RECORDS
   ========================================================= */

function deleteRecord(list,id,page) {
  const index=list.findIndex(x=>String(x.id)===String(id));

  if(index<0) return;

  if(!confirm("Are you sure you want to delete this record?")) return;

  list.splice(index,1);
  persistAll();
  showPage(page);
  notify("Record deleted.");
}

/* =========================================================
   GLOBAL BUTTON HANDLERS
   ========================================================= */

document.addEventListener("click",event=>{
  const add=event.target.closest("[data-add-product]");

  if(add) return addToCart(add.dataset.addProduct);

  const remove=event.target.closest("[data-remove-cart]");

  if(remove) {
    cart.splice(Number(remove.dataset.removeCart),1);
    return renderCart();
  }

  const previewSale=event.target.closest("[data-preview-sale]");

  if(previewSale) {
    const sale=sales.find(s=>String(s.id)===String(previewSale.dataset.previewSale));
    return printReceipt(sale);
  }

  const actionButton=event.target.closest("[data-action]");

  if(actionButton) {
    const action=actionButton.dataset.action;

    const actions={
      "add-product":addProduct,
      "add-customer":addCustomer,
      "add-supplier":addSupplier,
      "add-expense":addExpense,
      "checkout":checkout,
      "clear-cart":()=>{cart=[];renderCart();},
      "save-closing":saveClosing,
      "save-settings":saveSettings,
      "test-receipt":previewTestReceipt,
      "export-backup":exportBackup,
      "export-sales":exportSalesCSV,
      "add-staff":()=>staffForm(),
      "save-staff":()=>saveStaff(actionButton.dataset.staffId),
      "close-modal":()=>$("modal-root").innerHTML="",

      "apply-analytics":()=>{
        analyticsStart=$("analytics-start").value;
        analyticsEnd=$("analytics-end").value;
        showPage("Reports");
      },

      "analytics-month":()=>{
        const d=new Date();
        analyticsStart=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";
        analyticsEnd=today();
        showPage("Reports");
      },

      "analytics-all":()=>{
        analyticsStart="";
        analyticsEnd="";
        showPage("Reports");
      },

      "choose-import":()=>$("backup-file").click()
    };

    if(actions[action]) actions[action]();
    return;
  }

  const restockButton=event.target.closest("[data-restock]");
  if(restockButton) return restock(restockButton.dataset.restock);

  const editProductButton=event.target.closest("[data-edit-product]");
  if(editProductButton) return editProduct(editProductButton.dataset.editProduct);

  const deleteProductButton=event.target.closest("[data-delete-product]");
  if(deleteProductButton) return deleteRecord(products,deleteProductButton.dataset.deleteProduct,"Inventory");

  const deleteCustomerButton=event.target.closest("[data-delete-customer]");
  if(deleteCustomerButton) return deleteRecord(customers,deleteCustomerButton.dataset.deleteCustomer,"Customers");

  const deleteSupplierButton=event.target.closest("[data-delete-supplier]");
  if(deleteSupplierButton) return deleteRecord(suppliers,deleteSupplierButton.dataset.deleteSupplier,"Suppliers");

  const deleteExpenseButton=event.target.closest("[data-delete-expense]");
  if(deleteExpenseButton) return deleteRecord(expenses,deleteExpenseButton.dataset.deleteExpense,"Expenses");

  const salePayment=event.target.closest("[data-sale-payment]");
  if(salePayment) return receiveSalePayment(salePayment.dataset.salePayment);

  const customerPayment=event.target.closest("[data-customer-payment]");
  if(customerPayment) return receiveCustomerPayment(customerPayment.dataset.customerPayment);

  const editUser=event.target.closest("[data-edit-staff]");
  if(editUser) return editStaff(editUser.dataset.editStaff);

  const toggleUser=event.target.closest("[data-toggle-staff]");
  if(toggleUser) return toggleStaff(toggleUser.dataset.toggleStaff);

  const deleteUser=event.target.closest("[data-delete-staff]");
  if(deleteUser) return deleteStaff(deleteUser.dataset.deleteStaff);
});

/* =========================================================
   SEARCH AND FILE INPUT EVENTS
   ========================================================= */

document.addEventListener("input",event=>{
  if(event.target.id==="product-search") renderPOSProducts();
  if(event.target.id==="inventory-search") renderInventoryRows();
  if(event.target.id==="sales-search") renderSalesRows();
});

document.addEventListener("change",event=>{
  if(event.target.id==="backup-file") {
    importBackup(event.target.files[0]);
    event.target.value="";
  }
});

$("theme-toggle").addEventListener("click",()=>{
  if(!hasPermission("settings")) {
    return notify("Only authorised users can change business settings.");
  }

  settings.theme=settings.theme==="dark"?"light":"dark";
  save(STORAGE.settings,settings);
  applySettings();
});

/* =========================================================
   START APPLICATION
   ========================================================= */

function initialiseApp() {
  if(!Array.isArray(products)) products=[];
  if(!Array.isArray(sales)) sales=[];
  if(!Array.isArray(expenses)) expenses=[];
  if(!Array.isArray(closings)) closings=[];
  if(!Array.isArray(customers)) customers=[];
  if(!Array.isArray(suppliers)) suppliers=[];
  if(!Array.isArray(staff)) staff=[];

  /* Ensure receipt settings exist even for older saved data. */
  settings.receipt={
    defaultPrinter:"58mm",
    footer:"Thank you for shopping with us!",
    showLogo:true,
    showAddress:true,
    ...(settings.receipt||{})
  };

  $("today-date").textContent=new Date().toLocaleDateString();

  showLogin();

  console.log("Flavours Business Manager V1.6 loaded successfully.");
}

document.addEventListener("DOMContentLoaded",initialiseApp);
