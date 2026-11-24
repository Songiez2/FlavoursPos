
"use strict";

/* =========================================================
   FLAVOURS BUSINESS MANAGER V1.7
   POS • INVENTORY • CUSTOMERS • SUPPLIERS
   STOCK PURCHASES • SUPPLIER PAYMENTS • CREDIT
   EXPENSES • REPORTS • CASH CLOSING • STAFF
   RECEIPTS • BACKUP AND RESTORE
   ========================================================= */

(() => {
  /* Private scope prevents STORAGE redeclaration errors. */

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
    session:"flavoursSession",
    purchases:"flavoursPurchases"
  };

  const PERMISSIONS = [
    ["dashboard","Dashboard"],
    ["pos","Point of Sale"],
    ["inventory","Inventory"],
    ["inventoryEdit","Add/Edit Products"],
    ["customers","Customers"],
    ["credit","Receive Credit Payments"],
    ["suppliers","Suppliers"],
    ["purchases","Stock Purchases"],
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
    manager:["dashboard","pos","inventory","inventoryEdit","customers","credit","suppliers","purchases","sales","expenses","reports","cash"],
    salesperson:["dashboard","pos","customers","sales"]
  };

  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const money=value=>(settings.currency||"K")+" "+(Number(value)||0).toFixed(2);

  function read(key,fallback) {
    try {
      const value=localStorage.getItem(key);
      return value===null?fallback:JSON.parse(value);
    } catch(error) {
      console.error("Storage read error:",key,error);
      return fallback;
    }
  }

  function save(key,value) {
    try {
      localStorage.setItem(key,JSON.stringify(value));
      return true;
    } catch(error) {
      console.error("Storage save error:",key,error);
      alert("Could not save data. Check available browser storage.");
      return false;
    }
  }

  function safe(value) {
    return String(value??"").replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }

  let products=read(STORAGE.products,[]);
  let sales=read(STORAGE.sales,[]);
  let expenses=read(STORAGE.expenses,[]);
  let closings=read(STORAGE.closings,[]);
  let customers=read(STORAGE.customers,[]);
  let suppliers=read(STORAGE.suppliers,[]);
  let purchases=read(STORAGE.purchases,[]);
  let staff=read(STORAGE.staff,[]);
  let companyLogo=read(STORAGE.logo,"");
  let currentUser=null;
  let cart=[];
  let currentPage="Dashboard";
  let analyticsStart="";
  let analyticsEnd="";

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

  if(!settings||typeof settings!=="object") settings={};
  settings.receipt={
    defaultPrinter:"58mm",
    footer:"Thank you for shopping with us!",
    showLogo:true,
    showAddress:true,
    ...(settings.receipt||{})
  };

  function notify(message) {
    const el=$("toast");
    if(el) {
      el.textContent=message;
      el.classList.add("show");
      setTimeout(()=>el.classList.remove("show"),2600);
    } else console.log(message);
  }

  function persistAll() {
    save(STORAGE.products,products);
    save(STORAGE.sales,sales);
    save(STORAGE.expenses,expenses);
    save(STORAGE.closings,closings);
    save(STORAGE.customers,customers);
    save(STORAGE.suppliers,suppliers);
    save(STORAGE.purchases,purchases);
    save(STORAGE.settings,settings);
    save(STORAGE.logo,companyLogo);
    save(STORAGE.staff,staff);
  }

  function validPin(pin) {
    return /^\d{4,6}$/.test(String(pin));
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
      "Stock Purchases":"purchases",
      "Sales":"sales",
      "Expenses":"expenses",
      "Reports":"reports",
      "Cash Closing":"cash",
      "Staff":"staff",
      "Settings":"settings"
    })[page];
  }

  function currentStaffName() {
    return currentUser?.name||"Unknown";
  }

  /* =======================================================
     LOGIN
     ======================================================= */

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
      ?"Set up your first owner account."
      :"Sign in with your individual staff PIN.";
    $("login-submit").textContent=needsOwner?"Create Owner Account":"Sign In";
    $("login-error").textContent="";

    if(companyLogo) $("login-logo").innerHTML=`<img src="${companyLogo}" alt="Logo">`;
  }

  function signIn(user) {
    currentUser=user;
    cart=[];
    $("login-screen").hidden=true;
    $("app-shell").hidden=false;
    $("signed-in-user").textContent=user.name+" ("+user.role+")";
    $("today-date").textContent=new Date().toLocaleDateString(undefined,{
      weekday:"long",year:"numeric",month:"long",day:"numeric"
    });

    applySettings();
    updateNavigation();

    const first=hasPermission("dashboard")?"Dashboard":
      hasPermission("pos")?"Point of Sale":"Inventory";
    showPage(first);
  }

  function logout() {
    currentUser=null;
    cart=[];
    if($("login-pin")) $("login-pin").value="";
    showLogin();
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
      if(!save(STORAGE.staff,staff)) {
        staff=staff.filter(s=>s.id!==owner.id);
        return error.textContent="Could not save owner account.";
      }
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

  $("logout-button").addEventListener("click",logout);

  /* =======================================================
     NAVIGATION
     ======================================================= */

  function updateNavigation() {
    document.querySelectorAll(".nav-link").forEach(button=>{
      const permission=pagePermission(button.dataset.page);
      button.hidden=!hasPermission(permission);
    });
  }

  function showPage(page) {
    if(!hasPermission(pagePermission(page))) {
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
      "Stock Purchases":renderPurchases,
      "Sales":renderSales,
      "Expenses":renderExpenses,
      "Reports":renderReports,
      "Cash Closing":renderCashClosing,
      "Staff":renderStaff,
      "Settings":renderSettings
    };

    (renderers[page]||renderDashboard)();
  }

  /* =======================================================
     DASHBOARD
     ======================================================= */

  function statCard(label,value,color="") {
    return `<div class="card"><div class="stat-label">${label}</div><div class="stat-value ${color}">${value}</div></div>`;
  }

  function renderDashboard() {
    const date=today();
    const todays=sales.filter(s=>String(s.date||"").slice(0,10)===date);
    const revenue=todays.reduce((n,s)=>n+Number(s.total||0),0);
    const received=todays.reduce((n,s)=>n+paidAmount(s),0);
    const owing=sales.reduce((n,s)=>n+balanceDue(s),0);
    const expenseTotal=expenses.reduce((n,e)=>n+Number(e.amount||0),0);
    const supplierOwing=purchases.reduce((n,p)=>n+Number(p.balanceDue||0),0);

    $("page-content").innerHTML=`
      <div class="grid">
        ${statCard("Today's Sales",money(revenue))}
        ${statCard("Received Today",money(received),"green")}
        ${statCard("Total Sales",money(sales.reduce((n,s)=>n+Number(s.total||0),0)))}
        ${statCard("Customer Credit",money(owing),"gold")}
        ${statCard("Supplier Balances",money(supplierOwing),"red")}
        ${statCard("Expenses",money(expenseTotal),"red")}
        ${statCard("Products",products.length)}
        ${statCard("Customers",customers.length)}
      </div>
      <div class="section card">
        <h3>Quick Actions</h3>
        <div class="actions">
          ${hasPermission("pos")?'<button class="btn gold-btn" data-page="Point of Sale">New Sale</button>':""}
          ${hasPermission("inventory")?'<button class="btn" data-page="Inventory">Inventory</button>':""}
          ${hasPermission("purchases")?'<button class="btn" data-page="Stock Purchases">Stock Purchases</button>':""}
          ${hasPermission("customers")?'<button class="btn" data-action="add-customer">Add Customer</button>':""}
          ${hasPermission("expenses")?'<button class="btn" data-action="add-expense">Record Expense</button>':""}
        </div>
      </div>
      <div class="section card">
        <h3>Recent Sales</h3>
        ${sales.length?sales.slice().reverse().slice(0,7).map(s=>`
          <div class="cart-line"><span>${safe(s.customer||"Walk-in")}<br><small>${safe(String(s.date||"").slice(0,16))}</small></span><strong>${money(s.total)}</strong></div>
        `).join(""):'<div class="empty">No sales recorded yet.</div>'}
      </div>`;
  }

  /* =======================================================
     POINT OF SALE
     ======================================================= */

  function renderPOS() {
    $("page-content").innerHTML=`
      <div class="pos-layout">
        <div class="card">
          <div class="toolbar"><input class="search-input" id="product-search" placeholder="Search products..."></div>
          <div class="product-grid" id="pos-products"></div>
        </div>
        <div class="card">
          <h3>Current Sale</h3>
          <div id="cart-items"></div>
          <div class="total-line"><span>Total</span><strong id="cart-total">${money(0)}</strong></div>
          <div class="field"><label>Customer</label>
            <select id="pos-customer">
              <option value="">Walk-in Customer</option>
              ${customers.map(c=>`<option value="${safe(c.name)}">${safe(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Payment Method</label>
            <select id="payment-method">
              <option>Cash</option><option>Mobile Money</option><option>Bank Transfer</option><option>Credit</option>
            </select>
          </div>
          <div class="field"><label>Amount Received</label><input id="amount-received" type="number" min="0" step="0.01"></div>
          <button class="btn gold-btn" style="width:100%" data-action="checkout">Complete Sale</button>
          <button class="btn light-btn" style="width:100%;margin-top:8px" data-action="clear-cart">Clear Cart</button>
        </div>
      </div>`;
    renderPOSProducts();
    renderCart();
  }

  function renderPOSProducts() {
    const query=($("product-search")?.value||"").toLowerCase();
    const list=products.filter(p=>String(p.name||"").toLowerCase().includes(query)&&
      (p.type==="Service"||Number(p.stock)>0));
    $("pos-products").innerHTML=list.length?list.map(p=>`
      <button class="product-tile" data-add-product="${safe(p.id)}">
        <strong>${safe(p.name)}</strong>
        <small>${money(p.price)}<br>${p.type==="Service"?"Service":"Stock: "+Number(p.stock)}</small>
      </button>`).join(""):'<div class="empty">No available products.</div>';
  }

  function addToCart(id) {
    const p=products.find(x=>String(x.id)===String(id));
    if(!p) return notify("Product not found.");
    const line=cart.find(x=>String(x.id)===String(id));
    if(p.type!=="Service"&&(line?line.qty:0)+1>Number(p.stock)) return notify("Not enough stock.");
    if(line) line.qty++;
    else cart.push({id:p.id,name:p.name,price:Number(p.price),cost:Number(p.cost)||0,qty:1,type:p.type||"Product"});
    renderCart();
  }

  function renderCart() {
    const target=$("cart-items");
    if(!target) return;
    target.innerHTML=cart.length?cart.map((item,i)=>`
      <div class="cart-line">
        <span>${safe(item.name)}<br><small>${item.qty} × ${money(item.price)}</small></span>
        <span><strong>${money(item.qty*item.price)}</strong><br><button class="btn small danger-btn" data-remove-cart="${i}">Remove</button></span>
      </div>`).join(""):'<div class="empty">Your cart is empty.</div>';
    $("cart-total").textContent=money(cart.reduce((n,x)=>n+x.qty*x.price,0));
  }

  function checkout() {
    if(!cart.length) return notify("Your cart is empty.");
    for(const item of cart) {
      const p=products.find(x=>String(x.id)===String(item.id));
      if(!p) return notify("A cart product no longer exists.");
      if(p.type!=="Service"&&Number(p.stock)<item.qty) return notify("Insufficient stock: "+p.name);
    }

    const total=cart.reduce((n,x)=>n+x.qty*x.price,0);
    const method=$("payment-method").value;
    const customer=$("pos-customer").value||"Walk-in Customer";
    let received=Number($("amount-received").value||0);
    if(method!=="Credit"&&!$("amount-received").value) received=total;
    if(!Number.isFinite(received)||received<0||received>total) return notify("Invalid payment amount.");
    if(method!=="Credit"&&received<total) return notify("Choose Credit for a part-payment.");
    if(received<total&&customer==="Walk-in Customer") return notify("Choose a customer for a credit sale.");

    const timestamp=new Date().toISOString();
    const items=cart.map(x=>({...x}));
    const sale={
      id:makeId(),date:timestamp,customer,items,total,payment:method,
      amountPaid:received,balanceDue:total-received,
      payments:received>0?[{amount:received,method,date:timestamp}]:[],
      salespersonId:currentUser.id,salesperson:currentUser.name
    };

    items.forEach(item=>{
      const p=products.find(x=>String(x.id)===String(item.id));
      if(p&&p.type!=="Service") p.stock=Number(p.stock)-item.qty;
    });
    sales.push(sale);

    if(customer!=="Walk-in Customer"&&!customers.some(c=>String(c.name).toLowerCase()===customer.toLowerCase())) {
      customers.push({id:makeId(),name:customer,phone:"",email:""});
    }

    persistAll();
    cart=[];
    printReceipt(sale);
    showPage("Point of Sale");
    notify("Sale saved.");
  }

  /* =======================================================
     RECEIPTS
     ======================================================= */

  function getReceiptFormat() {
    const f=settings.receipt?.defaultPrinter||"58mm";
    return ["58mm","80mm","A4"].includes(f)?f:"58mm";
  }

  function receiptHTML(s,format) {
    const thermal=format!=="A4";
    const width=format==="58mm"?"54mm":format==="80mm"?"76mm":"190mm";
    const logo=settings.receipt?.showLogo&&companyLogo?`<img src="${companyLogo}" style="display:block;max-width:50mm;max-height:60px;margin:auto">`:"";
    const address=settings.receipt?.showAddress&&settings.address?`<p>${safe(settings.address)}</p>`:"";

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt</title>
    <style>
    body{font-family:Arial;width:${width};margin:auto;padding:3mm;font-size:${thermal?"11px":"14px"}}
    h2,p{text-align:center}hr{border:0;border-top:1px dashed #555}
    .line{display:flex;justify-content:space-between;gap:5px;margin:7px 0}
    .line span:first-child{overflow-wrap:anywhere}.line span:last-child{white-space:nowrap}
    .actions{display:flex;gap:8px;margin-bottom:15px}.actions button{padding:10px;flex:1}
    @media print{.actions{display:none}}
    </style></head><body>
    <div class="actions"><button onclick="window.print()">Print Receipt</button><button onclick="window.close()">Close</button></div>
    ${logo}<h2>${safe(settings.businessName)}</h2>${address}<p>${safe(settings.phone||"")}</p>
    <hr><p><b>SALES RECEIPT</b></p>
    <p>Receipt: ${safe(s.id)}</p><p>Date: ${safe(new Date(s.date).toLocaleString())}</p>
    <p>Customer: ${safe(s.customer)}</p><p>Served by: ${safe(s.salesperson||"Staff")}</p><hr>
    ${(s.items||[]).map(i=>`<div class="line"><span>${safe(i.name)} × ${Number(i.qty)}</span><span>${money(Number(i.qty)*Number(i.price))}</span></div>`).join("")}
    <hr><div class="line"><b>TOTAL</b><b>${money(s.total)}</b></div>
    <div class="line"><span>Paid</span><span>${money(paidAmount(s))}</span></div>
    <div class="line"><span>Balance</span><span>${money(balanceDue(s))}</span></div>
    <div class="line"><span>Payment</span><span>${safe(s.payment||"Cash")}</span></div>
    <hr><p>${safe(settings.receipt?.footer||"Thank you for shopping with us!")}</p>
    </body></html>`;
  }

  function printReceipt(s,format) {
    if(!s) return notify("Receipt not found.");
    const w=window.open("","_blank","width=550,height=750");
    if(!w) return notify("Allow pop-ups in Chrome to print receipts.");
    w.document.open();
    w.document.write(receiptHTML(s,format||getReceiptFormat()));
    w.document.close();
  }

  function previewTestReceipt() {
    const date=new Date().toISOString();
    printReceipt({
      id:"TEST-"+makeId(),date,customer:"Sample Customer",salesperson:currentStaffName(),
      items:[{name:"Sample Product",qty:2,price:25,cost:15}],
      total:50,amountPaid:50,balanceDue:0,payment:"Cash",
      payments:[{amount:50,method:"Cash",date}]
    });
  }

  /* =======================================================
     INVENTORY
     ======================================================= */

  function renderInventory() {
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Inventory Management</h2>
      ${hasPermission("inventoryEdit")?'<button class="btn gold-btn" data-action="add-product">Add Product / Service</button>':""}</div>
      <div class="card"><div class="toolbar"><input id="inventory-search" class="search-input" placeholder="Search inventory..."></div>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody id="inventory-rows"></tbody></table></div></div>`;
    renderInventoryRows();
  }

  function renderInventoryRows() {
    const q=($("inventory-search")?.value||"").toLowerCase();
    const list=products.filter(p=>String(p.name||"").toLowerCase().includes(q));
    $("inventory-rows").innerHTML=list.length?list.map(p=>`
      <tr><td>${safe(p.name)}</td><td>${safe(p.type||"Product")}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td>
      <td>${p.type==="Service"?"—":Number(p.stock)}</td><td>
      ${p.type!=="Service"&&hasPermission("inventoryEdit")?`<button class="btn small success-btn" data-restock="${safe(p.id)}">Restock</button>`:""}
      ${hasPermission("inventoryEdit")?`<button class="btn small light-btn" data-edit-product="${safe(p.id)}">Edit</button><button class="btn small danger-btn" data-delete-product="${safe(p.id)}">Delete</button>`:""}
      </td></tr>`).join(""):'<tr><td colspan="6" class="empty">No products found.</td></tr>';
  }

  function addProduct() {
    const name=prompt("Product or service name:");
    if(!name?.trim()) return;
    const type=(prompt("Enter Product or Service:","Product")||"Product").toLowerCase()==="service"?"Service":"Product";
    const cost=Number(prompt("Cost price:","0"));
    const price=Number(prompt("Selling price:","0"));
    const stock=type==="Service"?0:Number(prompt("Opening stock:","0"));
    if(![cost,price,stock].every(Number.isFinite)||cost<0||price<0||stock<0) return notify("Invalid numbers.");
    products.push({id:makeId(),name:name.trim(),type,cost,price,stock});
    persistAll();showPage("Inventory");notify("Item added.");
  }

  function editProduct(id) {
    const p=products.find(x=>String(x.id)===String(id));
    if(!p) return;
    const name=prompt("Item name:",p.name);
    if(!name?.trim()) return;
    const cost=Number(prompt("Cost price:",p.cost));
    const price=Number(prompt("Selling price:",p.price));
    if(![cost,price].every(Number.isFinite)||cost<0||price<0) return notify("Invalid price.");
    p.name=name.trim();p.cost=cost;p.price=price;
    persistAll();showPage("Inventory");notify("Product updated.");
  }

  function restock(id) {
    const p=products.find(x=>String(x.id)===String(id));
    if(!p) return;
    const qty=Number(prompt("Quantity to add:"));
    if(!Number.isFinite(qty)||qty<=0) return notify("Enter a positive quantity.");
    p.stock=Number(p.stock||0)+qty;
    persistAll();showPage("Inventory");notify("Stock updated.");
  }

  /* =======================================================
     CUSTOMERS AND CREDIT
     ======================================================= */

  function renderCustomers() {
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Customers</h2><button class="btn gold-btn" data-action="add-customer">Add Customer</button></div>
      <div class="card table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody>
      ${customers.length?customers.map(c=>{
        const owing=sales.filter(s=>s.customer===c.name).reduce((n,s)=>n+balanceDue(s),0);
        return `<tr><td>${safe(c.name)}</td><td>${safe(c.phone||"")}</td><td>${safe(c.email||"")}</td><td>${money(owing)}</td>
        <td>${hasPermission("credit")?`<button class="btn small success-btn" data-customer-payment="${safe(c.id)}">Receive Payment</button>`:""}
        <button class="btn small danger-btn" data-delete-customer="${safe(c.id)}">Delete</button></td></tr>`;
      }).join(""):'<tr><td colspan="5" class="empty">No customers.</td></tr>'}
      </tbody></table></div><div class="section card"><h3>Outstanding Credit Sales</h3>${creditTable()}</div>`;
  }

  function creditTable() {
    const list=sales.filter(s=>balanceDue(s)>0);
    return list.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>
    ${list.map(s=>`<tr><td>${safe(String(s.date).slice(0,10))}</td><td>${safe(s.customer)}</td><td>${money(s.total)}</td><td>${money(paidAmount(s))}</td><td>${money(balanceDue(s))}</td>
    <td>${hasPermission("credit")?`<button class="btn small success-btn" data-sale-payment="${safe(s.id)}">Receive Payment</button>`:""}</td></tr>`).join("")}
    </tbody></table></div>`:'<div class="empty">No outstanding credit sales.</div>';
  }

  function addCustomer() {
    const name=prompt("Customer name:");
    if(!name?.trim()) return;
    customers.push({id:makeId(),name:name.trim(),phone:prompt("Phone:","")||"",email:prompt("Email:","")||""});
    persistAll();showPage("Customers");notify("Customer added.");
  }

  function paymentMethodPrompt() {
    const method=prompt("Payment method: Cash, Mobile Money or Bank Transfer","Cash")||"Cash";
    const allowed=["cash","mobile money","bank transfer"];
    if(!allowed.includes(method.toLowerCase())) {
      notify("Choose Cash, Mobile Money or Bank Transfer.");
      return null;
    }
    return method;
  }

  function receiveSalePayment(id) {
    const s=sales.find(x=>String(x.id)===String(id));
    if(!s) return;
    const due=balanceDue(s);
    const amount=Number(prompt("Outstanding: "+money(due)+"\nPayment amount:"));
    if(!Number.isFinite(amount)||amount<=0||amount>due) return notify("Invalid payment amount.");
    const method=paymentMethodPrompt();if(!method)return;
    if(!Array.isArray(s.payments)) s.payments=s.amountPaid>0?[{amount:Number(s.amountPaid),method:s.payment||"Cash",date:s.date}]:[];
    s.payments.push({amount,method,date:new Date().toISOString()});
    s.amountPaid=paidAmount(s);s.balanceDue=Math.max(0,s.total-s.amountPaid);
    persistAll();showPage("Customers");notify("Payment received.");
  }

  function receiveCustomerPayment(id) {
    const c=customers.find(x=>String(x.id)===String(id));
    if(!c) return;
    const unpaid=sales.filter(s=>s.customer===c.name&&balanceDue(s)>0);
    const total=unpaid.reduce((n,s)=>n+balanceDue(s),0);
    const amount=Number(prompt("Outstanding: "+money(total)+"\nPayment amount:"));
    if(!Number.isFinite(amount)||amount<=0||amount>total) return notify("Invalid payment amount.");
    const method=paymentMethodPrompt();if(!method)return;
    let remaining=amount;
    unpaid.forEach(s=>{
      if(remaining<=0)return;
      const part=Math.min(remaining,balanceDue(s));
      if(!Array.isArray(s.payments)) s.payments=s.amountPaid>0?[{amount:Number(s.amountPaid),method:s.payment||"Cash",date:s.date}]:[];
      s.payments.push({amount:part,method,date:new Date().toISOString()});
      s.amountPaid=paidAmount(s);s.balanceDue=Math.max(0,s.total-s.amountPaid);
      remaining-=part;
    });
    persistAll();showPage("Customers");notify("Customer payment recorded.");
  }

  /* =======================================================
     SUPPLIERS
     ======================================================= */

  function supplierBalance(id) {
    return purchases.filter(p=>String(p.supplierId)===String(id))
      .reduce((n,p)=>n+Math.max(0,Number(p.balanceDue)||0),0);
  }

  function renderSuppliers() {
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Suppliers</h2><button class="btn gold-btn" data-action="add-supplier">Add Supplier</button></div>
      <div class="card table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Balance Due</th><th>Notes</th><th>Action</th></tr></thead><tbody>
      ${suppliers.length?suppliers.map(s=>`<tr><td>${safe(s.name)}</td><td>${safe(s.phone||"")}</td><td>${safe(s.email||"")}</td><td>${money(supplierBalance(s.id))}</td><td>${safe(s.notes||"")}</td>
      <td><button class="btn small danger-btn" data-delete-supplier="${safe(s.id)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty">No suppliers added.</td></tr>'}
      </tbody></table></div>`;
  }

  function addSupplier() {
    const name=prompt("Supplier name:");
    if(!name?.trim())return;
    suppliers.push({id:makeId(),name:name.trim(),phone:prompt("Phone:","")||"",email:prompt("Email:","")||"",notes:prompt("Notes:","")||""});
    persistAll();showPage("Suppliers");notify("Supplier added.");
  }

  /* =======================================================
     STOCK PURCHASES - V1.7
     ======================================================= */

  function renderPurchases() {
    const owing=purchases.reduce((n,p)=>n+(Number(p.balanceDue)||0),0);
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Stock Purchases</h2>
      <button class="btn gold-btn" data-action="new-purchase">Record Stock Purchase</button></div>
      <div class="grid">
        ${statCard("Total Purchases",money(purchases.reduce((n,p)=>n+Number(p.total||0),0)))}
        ${statCard("Supplier Balances",money(owing),"gold")}
        ${statCard("Purchase Records",purchases.length)}
      </div>
      <div class="section card"><h3>Purchase History</h3>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${purchases.slice().reverse().map(p=>`<tr>
        <td>${safe(p.date)}</td><td>${safe(p.supplierName)}</td>
        <td>${(p.items||[]).length}</td><td>${money(p.total)}</td><td>${money(p.amountPaid)}</td><td>${money(p.balanceDue)}</td>
        <td>${Number(p.balanceDue)>0?"Credit":"Paid"}</td>
        <td>${Number(p.balanceDue)>0?`<button class="btn small success-btn" data-supplier-payment="${safe(p.id)}">Pay Balance</button>`:"Paid"}</td>
      </tr>`).join("")||'<tr><td colspan="8" class="empty">No purchases recorded.</td></tr>'}
      </tbody></table></div></div>
      <div class="section card"><h3>Supplier Balances</h3>
      <div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Outstanding</th></tr></thead><tbody>
      ${suppliers.map(s=>`<tr><td>${safe(s.name)}</td><td>${money(supplierBalance(s.id))}</td></tr>`).join("")||'<tr><td colspan="2">No suppliers.</td></tr>'}
      </tbody></table></div></div>`;
  }

  function newPurchase() {
    if(!suppliers.length) return notify("Please add a supplier first.");
    const available=products.filter(p=>p.type!=="Service");
    if(!available.length) return notify("Add stock products to Inventory first.");

    const supplierList=suppliers.map((s,i)=>(i+1)+". "+s.name).join("\n");
    const choice=Number(prompt("Select supplier by number:\n"+supplierList));
    if(!Number.isInteger(choice)||choice<1||choice>suppliers.length) return;
    const supplier=suppliers[choice-1];

    const lines=[];
    let keepAdding=true;

    while(keepAdding) {
      const productList=available.map((p,i)=>(i+1)+". "+p.name+" (Cost: "+money(p.cost)+")").join("\n");
      const productChoice=Number(prompt("Choose product:\n"+productList));
      if(!Number.isInteger(productChoice)||productChoice<1||productChoice>available.length) {
        if(!lines.length)return;
        break;
      }
      const product=available[productChoice-1];
      const qty=Number(prompt("Quantity received for "+product.name+":"));
      const unitCost=Number(prompt("Purchase cost per unit:",String(product.cost||0)));
      if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(unitCost)||unitCost<=0) {
        notify("Quantity and unit cost must be greater than zero.");
        continue;
      }
      const existing=lines.find(x=>String(x.productId)===String(product.id));
      if(existing) {
        existing.qty+=qty;
        existing.total=existing.qty*existing.unitCost;
        existing.unitCost=unitCost;
        existing.total=existing.qty*unitCost;
      } else {
        lines.push({productId:product.id,name:product.name,qty,unitCost,total:qty*unitCost});
      }
      keepAdding=confirm("Add another product to this purchase?");
    }

    if(!lines.length)return;
    const total=lines.reduce((n,x)=>n+x.total,0);
    const amountPaid=Number(prompt("Purchase total: "+money(total)+"\nAmount paid now (enter 0 for supplier credit):","0"));
    if(!Number.isFinite(amountPaid)||amountPaid<0||amountPaid>total) return notify("Enter a valid payment amount.");

    const payments=[];
    if(amountPaid>0) {
      const method=paymentMethodPrompt();
      if(!method)return;
      payments.push({amount:amountPaid,method,date:new Date().toISOString()});
    }

    if(!confirm("Save this purchase and add the received quantities to inventory?"))return;

    const purchase={
      id:makeId(),
      date:today(),
      supplierId:supplier.id,
      supplierName:supplier.name,
      items:lines,
      subtotal:total,
      total,
      amountPaid,
      balanceDue:total-amountPaid,
      payments,
      status:"received"
    };

    /* Increase stock exactly once, only when saving this purchase. */
    lines.forEach(line=>{
      const p=products.find(x=>String(x.id)===String(line.productId));
      if(p) {
        p.stock=Number(p.stock||0)+Number(line.qty);
        p.cost=Number(line.unitCost);
      }
    });

    purchases.push(purchase);
    persistAll();
    showPage("Stock Purchases");
    notify("Purchase saved. Inventory stock updated.");
  }

  function recordSupplierPayment(id) {
    const p=purchases.find(x=>String(x.id)===String(id));
    if(!p)return;
    const due=Math.max(0,Number(p.balanceDue)||0);
    if(due<=0)return notify("This purchase is already paid.");
    const amount=Number(prompt("Outstanding supplier balance: "+money(due)+"\nPayment amount:"));
    if(!Number.isFinite(amount)||amount<=0||amount>due)return notify("Invalid payment amount.");
    const method=paymentMethodPrompt();if(!method)return;
    if(!Array.isArray(p.payments))p.payments=[];
    p.payments.push({amount,method,date:new Date().toISOString()});
    p.amountPaid=(Number(p.amountPaid)||0)+amount;
    p.balanceDue=Math.max(0,Number(p.total)-p.amountPaid);
    /* Payment does not increase stock again. */
    persistAll();showPage("Stock Purchases");notify("Supplier payment recorded.");
  }

  /* =======================================================
     SALES HISTORY
     ======================================================= */

  function renderSales() {
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Sales History</h2></div>
      <div class="card"><div class="toolbar"><input id="sales-search" class="search-input" placeholder="Search customer or salesperson...">
      ${hasPermission("backup")?'<button class="btn light-btn" data-action="export-sales">Export CSV</button>':""}</div>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Salesperson</th><th>Total</th><th>Paid</th><th>Balance</th><th>Method</th><th>Receipt</th></tr></thead><tbody id="sales-rows"></tbody></table></div></div>`;
    renderSalesRows();
  }

  function renderSalesRows() {
    const q=($("sales-search")?.value||"").toLowerCase();
    let list=sales.slice().reverse().filter(s=>(String(s.customer||"")+" "+String(s.salesperson||"")+" "+String(s.payment||"")).toLowerCase().includes(q));
    if(currentUser.role==="salesperson")list=list.filter(s=>s.salespersonId===currentUser.id);
    $("sales-rows").innerHTML=list.map(s=>`<tr><td>${safe(String(s.date||"").slice(0,16))}</td><td>${safe(s.customer||"Walk-in")}</td><td>${safe(s.salesperson||"Previous sale")}</td>
    <td>${money(s.total)}</td><td>${money(paidAmount(s))}</td><td>${money(balanceDue(s))}</td><td>${safe(s.payment||"—")}</td>
    <td><button class="btn small light-btn" data-preview-sale="${safe(s.id)}">Preview / Print</button></td></tr>`).join("")||'<tr><td colspan="8">No matching sales.</td></tr>';
  }

  /* =======================================================
     EXPENSES
     ======================================================= */

  function renderExpenses() {
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Expenses</h2><button class="btn gold-btn" data-action="add-expense">Add Expense</button></div>
      <div class="card"><h3>Total Expenses: ${money(expenses.reduce((n,e)=>n+Number(e.amount||0),0))}</h3>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Payment</th><th>Amount</th><th>Action</th></tr></thead><tbody>
      ${expenses.slice().reverse().map(e=>`<tr><td>${safe(e.date)}</td><td>${safe(e.description)}</td><td>${safe(e.category)}</td><td>${safe(e.payment||"Cash")}</td><td>${money(e.amount)}</td><td><button class="btn small danger-btn" data-delete-expense="${safe(e.id)}">Delete</button></td></tr>`).join("")||'<tr><td colspan="6">No expenses recorded.</td></tr>'}
      </tbody></table></div></div>`;
  }

  function addExpense() {
    const description=prompt("Expense description:");
    if(!description?.trim())return;
    const category=prompt("Category:","General")||"General";
    const amount=Number(prompt("Amount:"));
    if(!Number.isFinite(amount)||amount<=0)return notify("Enter a valid amount.");
    const payment=paymentMethodPrompt();if(!payment)return;
    expenses.push({id:makeId(),date:today(),description:description.trim(),category,amount,payment});
    persistAll();showPage("Expenses");notify("Expense recorded.");
  }

  /* =======================================================
     REPORTS
     ======================================================= */

  function inDateRange(date,start,end) {
    const d=String(date||"").slice(0,10);
    return (!start||d>=start)&&(!end||d<=end);
  }

  function analyticsSales() {
    let list=sales.filter(s=>inDateRange(s.date,analyticsStart,analyticsEnd));
    if(currentUser.role==="salesperson")list=list.filter(s=>s.salespersonId===currentUser.id);
    return list;
  }

  function groupTotals(items,keyFn,valueFn) {
    const map={};
    items.forEach(item=>{const key=keyFn(item);map[key]=(map[key]||0)+valueFn(item);});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  }

  function renderBars(entries) {
    if(!entries.length)return '<div class="empty">No data for this period.</div>';
    const max=Math.max(...entries.map(x=>x[1]),1);
    return `<div class="chart-bars">${entries.map(([label,value])=>`
      <div class="chart-bar"><span>${money(value)}</span><div class="chart-bar-fill" style="height:${Math.max(2,value/max*100)}%"></div><small>${safe(label)}</small></div>`).join("")}</div>`;
  }

  function renderReports() {
    const list=analyticsSales();
    const revenue=list.reduce((n,s)=>n+Number(s.total||0),0);
    const received=list.reduce((n,s)=>n+paidAmount(s),0);
    const owing=list.reduce((n,s)=>n+balanceDue(s),0);
    const costs=list.reduce((n,s)=>n+(s.items||[]).reduce((sum,i)=>sum+(Number(i.cost)||0)*(Number(i.qty)||0),0),0);
    const profit=revenue-costs;
    const monthly=groupTotals(list,s=>String(s.date||"").slice(0,7),s=>Number(s.total)||0).sort((a,b)=>a[0].localeCompare(b[0]));
    const payment=groupTotals(list,s=>s.payment||"Unknown",s=>Number(s.total)||0);

    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Sales Analytics</h2></div>
      <div class="card"><div class="analytics-filters">
        <div class="field"><label>From</label><input type="date" id="analytics-start" value="${safe(analyticsStart)}"></div>
        <div class="field"><label>To</label><input type="date" id="analytics-end" value="${safe(analyticsEnd)}"></div>
        <button class="btn gold-btn" data-action="apply-analytics">Apply Dates</button>
        <button class="btn light-btn" data-action="analytics-month">This Month</button>
        <button class="btn light-btn" data-action="analytics-all">All Time</button>
      </div></div>
      <div class="section grid">
        ${statCard("Total Sales",money(revenue))}
        ${statCard("Transactions",list.length)}
        ${statCard("Money Received",money(received),"green")}
        ${statCard("Customer Credit",money(owing),"gold")}
        ${statCard("Estimated Cost of Sales",money(costs))}
        ${statCard("Estimated Gross Profit",money(profit),profit<0?"red":"green")}
      </div>
      <div class="section card"><h3>Monthly Sales</h3>${renderBars(monthly)}</div>
      <div class="section card"><h3>Sales by Payment Method</h3>
      ${payment.map(x=>`<div class="cart-line"><span>${safe(x[0])}</span><strong>${money(x[1])}</strong></div>`).join("")||"No data"}</div>`;
  }

  /* =======================================================
     DAILY CASH CLOSING
     ======================================================= */

  function cashPaymentsForDay(date) {
    return sales.filter(s=>String(s.date||"").slice(0,10)===date).reduce((sum,s)=>{
      if(Array.isArray(s.payments))return sum+s.payments.filter(p=>String(p.date||s.date).slice(0,10)===date&&String(p.method||s.payment).toLowerCase()==="cash").reduce((n,p)=>n+(Number(p.amount)||0),0);
      return sum+(String(s.payment||"Cash").toLowerCase()==="cash"?paidAmount(s):0);
    },0);
  }

  function cashExpensesForDay(date) {
    return expenses.filter(e=>e.date===date&&String(e.payment||"Cash").toLowerCase()==="cash").reduce((n,e)=>n+Number(e.amount||0),0);
  }

  function renderCashClosing() {
    const date=today(),received=cashPaymentsForDay(date),spent=cashExpensesForDay(date);
    const saved=closings.find(c=>c.date===date);
    $("page-content").innerHTML=`
      <div class="grid">${statCard("Cash Received",money(received),"green")}${statCard("Cash Expenses",money(spent),"red")}${statCard("Expected Cash",money(received-spent))}${statCard("Status",saved?"Closed":"Open")}</div>
      <div class="section card"><h3>Record Today's Cash Count</h3>
      <div class="field"><label>Actual cash counted</label><input id="actual-cash" type="number" min="0" value="${saved?saved.actualCash:""}"></div>
      <div class="field"><label>Notes</label><input id="closing-notes" value="${safe(saved?.notes||"")}"></div>
      <button class="btn gold-btn" data-action="save-closing">Save Daily Closing</button>
      ${saved?`<p>Difference: ${money(Number(saved.actualCash)-(received-spent))}</p>`:""}</div>
      <div class="section card"><h3>Previous Closings</h3>${closings.slice().reverse().map(c=>`<div class="cart-line"><span>${safe(c.date)}</span><strong>${money(c.actualCash)}</strong></div>`).join("")||"No closing records."}</div>`;
  }

  function saveClosing() {
    const actual=Number($("actual-cash").value);
    if(!Number.isFinite(actual)||actual<0)return notify("Enter a valid cash count.");
    const date=today(),received=cashPaymentsForDay(date),spent=cashExpensesForDay(date);
    const record={date,cashReceived:received,cashExpenses:spent,expectedCash:received-spent,actualCash:actual,notes:$("closing-notes").value.trim()};
    const index=closings.findIndex(c=>c.date===date);
    if(index>=0)closings[index]=record;else closings.push(record);
    persistAll();showPage("Cash Closing");notify("Daily closing saved.");
  }

  /* =======================================================
     STAFF MANAGEMENT
     ======================================================= */

  function renderStaff() {
    if(currentUser.role!=="owner")return notify("Only the owner can manage staff.");
    $("page-content").innerHTML=`
      <div class="page-heading"><h2>Staff and User Management</h2><button class="btn gold-btn" data-action="add-staff">Add Staff Account</button></div>
      <div class="card table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Permissions</th><th>Actions</th></tr></thead><tbody>
      ${staff.map(s=>`<tr><td>${safe(s.name)}</td><td>${safe(s.username||"—")}</td><td>${safe(s.role)}</td><td>${s.active===false?"Inactive":"Active"}</td><td>${s.role==="owner"?"All permissions":(s.permissions||[]).length+" enabled"}</td>
      <td>${s.role!=="owner"?`<button class="btn small light-btn" data-edit-staff="${safe(s.id)}">Edit</button><button class="btn small danger-btn" data-toggle-staff="${safe(s.id)}">${s.active===false?"Activate":"Deactivate"}</button><button class="btn small danger-btn" data-delete-staff="${safe(s.id)}">Delete</button>`:"Owner account"}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  function staffForm(existing=null) {
    if(currentUser.role!=="owner")return notify("Only the owner can manage staff.");
    const perms=existing?.permissions||DEFAULT_PERMISSIONS.salesperson;
    $("modal-root").innerHTML=`
      <div class="modal-backdrop"><div class="modal"><h3>${existing?"Edit":"Create"} Staff Account</h3>
      <div class="field"><label>Employee name</label><input id="staff-name" value="${safe(existing?.name||"")}"></div>
      <div class="field"><label>Username</label><input id="staff-username" value="${safe(existing?.username||"")}"></div>
      <div class="field"><label>Role</label><select id="staff-role"><option value="salesperson" ${existing?.role==="salesperson"?"selected":""}>Salesperson</option><option value="manager" ${existing?.role==="manager"?"selected":""}>Manager</option></select></div>
      <div class="field"><label>PIN (4–6 digits)</label><input id="staff-pin" type="password" maxlength="6" placeholder="${existing?"Leave blank to keep current PIN":"Create PIN"}"></div>
      <h3>Permissions</h3><div class="permission-grid">
      ${PERMISSIONS.filter(p=>!["staff","settings","backup"].includes(p[0])).map(([key,label])=>`<label class="permission-option"><input type="checkbox" name="staff-permission" value="${key}" ${perms.includes(key)?"checked":""}>${label}</label>`).join("")}
      </div><div class="modal-actions"><button class="btn light-btn" data-action="close-modal">Cancel</button><button class="btn gold-btn" data-action="save-staff" data-staff-id="${safe(existing?.id||"")}">Save Staff</button></div></div></div>`;
  }

  function saveStaff(id) {
    if(currentUser.role!=="owner")return notify("Access denied.");
    const name=$("staff-name").value.trim(),username=$("staff-username").value.trim(),pin=$("staff-pin").value,role=$("staff-role").value;
    const permissions=[...document.querySelectorAll('input[name="staff-permission"]:checked')].map(x=>x.value);
    if(!name||!username)return notify("Enter name and username.");
    if(staff.some(s=>s.username?.toLowerCase()===username.toLowerCase()&&s.id!==id))return notify("Username already exists.");
    const old=staff.find(s=>s.id===id);
    if(!old&&!validPin(pin))return notify("PIN must be 4–6 digits.");
    if(pin&&!validPin(pin))return notify("PIN must be 4–6 digits.");
    if(pin&&staff.some(s=>String(s.pin)===pin&&s.id!==id))return notify("PIN already assigned.");
    if(old){old.name=name;old.username=username;old.role=role;old.permissions=permissions;if(pin)old.pin=pin;}
    else staff.push({id:makeId(),name,username,role,pin,permissions,active:true,createdAt:new Date().toISOString()});
    save(STORAGE.staff,staff);$("modal-root").innerHTML="";showPage("Staff");notify("Staff account saved.");
  }

  function toggleStaff(id) {
    const user=staff.find(s=>s.id===id);if(!user)return;
    if(user.id===currentUser.id)return notify("You cannot deactivate your own account.");
    user.active=user.active===false;save(STORAGE.staff,staff);showPage("Staff");
  }

  function deleteStaff(id) {
    const user=staff.find(s=>s.id===id);if(!user)return;
    if(!confirm("Delete this staff account? Historical sales will remain."))return;
    staff=staff.filter(s=>s.id!==id);save(STORAGE.staff,staff);showPage("Staff");
  }

  /* =======================================================
     SETTINGS
     ======================================================= */

  function applySettings() {
    document.body.classList.toggle("dark",settings.theme==="dark");
    $("business-name").textContent=settings.businessName||"Flavours Techs Solutions";
    $("brand-logo").innerHTML=companyLogo?`<img src="${companyLogo}" alt="Logo">`:"F";
  }

  function renderSettings() {
    const r=settings.receipt||{};
    $("page-content").innerHTML=`
      <div class="card"><h3>Business Settings</h3>
      <div class="field"><label>Business Name</label><input id="setting-name" value="${safe(settings.businessName||"")}"></div>
      <div class="field"><label>Phone</label><input id="setting-phone" value="${safe(settings.phone||"")}"></div>
      <div class="field"><label>Address</label><input id="setting-address" value="${safe(settings.address||"")}"></div>
      <div class="field"><label>Currency</label><input id="setting-currency" value="${safe(settings.currency||"K")}"></div>
      <div class="field"><label>Company Logo</label><input id="setting-logo" type="file" accept="image/*"></div>
      <div class="field"><label>Theme</label><select id="setting-theme"><option value="light" ${settings.theme==="light"?"selected":""}>Light</option><option value="dark" ${settings.theme==="dark"?"selected":""}>Dark</option></select></div></div>
      <div class="section card"><h3>Receipt Settings</h3>
      <div class="field"><label>Printer Format</label><select id="receipt-format"><option value="58mm" ${r.defaultPrinter==="58mm"?"selected":""}>58mm</option><option value="80mm" ${r.defaultPrinter==="80mm"?"selected":""}>80mm</option><option value="A4" ${r.defaultPrinter==="A4"?"selected":""}>A4</option></select></div>
      <div class="field"><label>Receipt Footer</label><input id="receipt-footer" value="${safe(r.footer||"Thank you for shopping with us!")}"></div>
      <label><input type="checkbox" id="receipt-show-logo" ${r.showLogo!==false?"checked":""}> Show logo</label>
      <label><input type="checkbox" id="receipt-show-address" ${r.showAddress!==false?"checked":""}> Show address</label>
      <div class="actions"><button class="btn gold-btn" data-action="save-settings">Save Settings</button><button class="btn light-btn" data-action="test-receipt">Test Receipt</button></div></div>
      ${hasPermission("backup")?`<div class="section card"><h3>Business Data Backup</h3><div class="actions"><button class="btn" data-action="export-backup">Download Backup</button><button class="btn light-btn" data-action="choose-import">Restore Backup</button></div><input id="backup-file" type="file" accept=".json,application/json" hidden></div>`:""}`;
  }

  function saveSettings() {
    settings.businessName=$("setting-name").value.trim()||"Flavours Techs Solutions";
    settings.phone=$("setting-phone").value.trim();
    settings.address=$("setting-address").value.trim();
    settings.currency=$("setting-currency").value.trim()||"K";
    settings.theme=$("setting-theme").value;
    settings.receipt={
      defaultPrinter:$("receipt-format").value,
      footer:$("receipt-footer").value.trim(),
      showLogo:$("receipt-show-logo").checked,
      showAddress:$("receipt-show-address").checked
    };

    const file=$("setting-logo").files[0];
    const done=()=>{persistAll();applySettings();showPage("Settings");notify("Settings saved.");};
    if(file) {
      const reader=new FileReader();
      reader.onload=()=>{companyLogo=reader.result;done();};
      reader.onerror=()=>notify("Could not read logo.");
      reader.readAsDataURL(file);
    } else done();
  }

  /* =======================================================
     BACKUP AND RESTORE
     ======================================================= */

  function downloadFile(name,content,type) {
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function exportBackup() {
    const data={
      version:"1.7",exportedAt:new Date().toISOString(),
      products,sales,expenses,closings,customers,suppliers,purchases,
      settings,companyLogo,staff
    };
    downloadFile("flavours-business-backup-"+today()+".json",JSON.stringify(data,null,2),"application/json");
    notify("Backup downloaded.");
  }

  function exportSalesCSV() {
    const rows=[["Date","Customer","Salesperson","Total","Paid","Balance","Payment"]];
    analyticsSales().forEach(s=>rows.push([s.date,s.customer,s.salesperson||"Previous sale",s.total,paidAmount(s),balanceDue(s),s.payment]));
    const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
    downloadFile("flavours-sales-"+today()+".csv",csv,"text/csv");
  }

  function importBackup(file) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const d=JSON.parse(reader.result);
        if(!Array.isArray(d.products)||!Array.isArray(d.sales))throw new Error("Not a valid Flavours backup.");
        if(!confirm("Restoring this backup replaces current browser records. Continue?"))return;
        products=d.products||[];sales=d.sales||[];expenses=d.expenses||[];closings=d.closings||[];
        customers=d.customers||[];suppliers=d.suppliers||[];purchases=d.purchases||[];
        settings=d.settings||settings;companyLogo=d.companyLogo||"";staff=d.staff||staff;
        settings.receipt={
          defaultPrinter:"58mm",footer:"Thank you for shopping with us!",showLogo:true,showAddress:true,
          ...(settings.receipt||{})
        };
        persistAll();applySettings();logout();notify("Backup restored. Sign in again.");
      } catch(error) {alert("Restore failed: "+error.message);}
    };
    reader.readAsText(file);
  }

  /* =======================================================
     RECORD DELETION
     ======================================================= */

  function deleteRecord(list,id,page) {
    const index=list.findIndex(x=>String(x.id)===String(id));
    if(index<0)return;
    if(!confirm("Are you sure you want to delete this record?"))return;
    list.splice(index,1);persistAll();showPage(page);notify("Record deleted.");
  }

  function deleteSupplier(id) {
    if(purchases.some(p=>String(p.supplierId)===String(id))) {
      return notify("This supplier has purchase history. Keep the supplier record.");
    }
    deleteRecord(suppliers,id,"Suppliers");
  }

  /* =======================================================
     BUTTON HANDLERS
     ======================================================= */

  document.addEventListener("click",event=>{
    const nav=event.target.closest(".nav-link,[data-page]");
    if(nav?.dataset.page) {
      event.preventDefault();
      showPage(nav.dataset.page);
      return;
    }

    const add=event.target.closest("[data-add-product]");
    if(add)return addToCart(add.dataset.addProduct);

    const remove=event.target.closest("[data-remove-cart]");
    if(remove){cart.splice(Number(remove.dataset.removeCart),1);return renderCart();}

    const preview=event.target.closest("[data-preview-sale]");
    if(preview){return printReceipt(sales.find(s=>String(s.id)===String(preview.dataset.previewSale)));}

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
        "new-purchase":newPurchase,
        "save-closing":saveClosing,
        "save-settings":saveSettings,
        "test-receipt":previewTestReceipt,
        "export-backup":exportBackup,
        "export-sales":exportSalesCSV,
        "add-staff":()=>staffForm(),
        "save-staff":()=>saveStaff(actionButton.dataset.staffId),
        "close-modal":()=>{$("modal-root").innerHTML="";},
        "choose-import":()=> $("backup-file")?.click(),
        "apply-analytics":()=>{analyticsStart=$("analytics-start").value;analyticsEnd=$("analytics-end").value;showPage("Reports");},
        "analytics-month":()=>{const d=new Date();analyticsStart=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";analyticsEnd=today();showPage("Reports");},
        "analytics-all":()=>{analyticsStart="";analyticsEnd="";showPage("Reports");}
      };
      if(actions[action])actions[action]();
      return;
    }

    const restockButton=event.target.closest("[data-restock]");
    if(restockButton)return restock(restockButton.dataset.restock);

    const editProductButton=event.target.closest("[data-edit-product]");
    if(editProductButton)return editProduct(editProductButton.dataset.editProduct);

    const deleteProductButton=event.target.closest("[data-delete-product]");
    if(deleteProductButton)return deleteRecord(products,deleteProductButton.dataset.deleteProduct,"Inventory");

    const deleteCustomerButton=event.target.closest("[data-delete-customer]");
    if(deleteCustomerButton)return deleteRecord(customers,deleteCustomerButton.dataset.deleteCustomer,"Customers");

    const deleteSupplierButton=event.target.closest("[data-delete-supplier]");
    if(deleteSupplierButton)return deleteSupplier(deleteSupplierButton.dataset.deleteSupplier);

    const deleteExpenseButton=event.target.closest("[data-delete-expense]");
    if(deleteExpenseButton)return deleteRecord(expenses,deleteExpenseButton.dataset.deleteExpense,"Expenses");

    const salePayment=event.target.closest("[data-sale-payment]");
    if(salePayment)return receiveSalePayment(salePayment.dataset.salePayment);

    const customerPayment=event.target.closest("[data-customer-payment]");
    if(customerPayment)return receiveCustomerPayment(customerPayment.dataset.customerPayment);

    const supplierPayment=event.target.closest("[data-supplier-payment]");
    if(supplierPayment)return recordSupplierPayment(supplierPayment.dataset.supplierPayment);

    const editUser=event.target.closest("[data-edit-staff]");
    if(editUser)return staffForm(staff.find(s=>s.id===editUser.dataset.editStaff));

    const toggleUser=event.target.closest("[data-toggle-staff]");
    if(toggleUser)return toggleStaff(toggleUser.dataset.toggleStaff);

    const deleteUser=event.target.closest("[data-delete-staff]");
    if(deleteUser)return deleteStaff(deleteUser.dataset.deleteStaff);
  });

  document.addEventListener("input",event=>{
    if(event.target.id==="product-search")renderPOSProducts();
    if(event.target.id==="inventory-search")renderInventoryRows();
    if(event.target.id==="sales-search")renderSalesRows();
  });

  document.addEventListener("change",event=>{
    if(event.target.id==="backup-file") {
      importBackup(event.target.files[0]);
      event.target.value="";
    }
  });

  $("theme-toggle").addEventListener("click",()=>{
    if(!hasPermission("settings"))return notify("Only authorised users can change settings.");
    settings.theme=settings.theme==="dark"?"light":"dark";
    save(STORAGE.settings,settings);applySettings();
  });

  /* =======================================================
     INITIALISE
     ======================================================= */

  function initialiseApp() {
    products=Array.isArray(products)?products:[];
    sales=Array.isArray(sales)?sales:[];
    expenses=Array.isArray(expenses)?expenses:[];
    closings=Array.isArray(closings)?closings:[];
    customers=Array.isArray(customers)?customers:[];
    suppliers=Array.isArray(suppliers)?suppliers:[];
    purchases=Array.isArray(purchases)?purchases:[];
    staff=Array.isArray(staff)?staff:[];

    /* Ensure the existing saved owner account is retained. */
    settings.receipt={
      defaultPrinter:"58mm",
      footer:"Thank you for shopping with us!",
      showLogo:true,
      showAddress:true,
      ...(settings.receipt||{})
    };

    $("today-date").textContent=new Date().toLocaleDateString();
    showLogin();

    console.log("Flavours Business Manager V1.7 loaded successfully.");
    console.log("Saved staff accounts:",staff.length);
    console.log("Saved purchases:",purchases.length);
  }

  if(document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded",initialiseApp,{once:true});
  } else {
    initialiseApp();
  }

})();
