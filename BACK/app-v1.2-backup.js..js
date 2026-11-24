
/* ==========================================
   FLAVOURS BUSINESS MANAGER
   VERSION 1.2
   POS + INVENTORY + SALES HISTORY + REPORTS
   ========================================== */

console.log("FLAVOURS BUSINESS MANAGER STARTED");

/* ==========================================
   1. PRODUCT DATABASE
   ========================================== */

const defaultProducts = [
    { id: 1, name: "A4 Paper Ream", price: 120, stock: 50 },
    { id: 2, name: "Exercise Book", price: 25, stock: 100 },
    { id: 3, name: "Blue Pen", price: 5, stock: 200 },
    { id: 4, name: "Photocopying", price: 1, stock: 1000 },
    { id: 5, name: "Printing", price: 2, stock: 1000 },
    { id: 6, name: "Typing Service", price: 30, stock: 100 },
    { id: 7, name: "Lamination", price: 10, stock: 100 },
    { id: 8, name: "Computer Services", price: 50, stock: 50 }
];

function loadProducts() {
    try {
        const saved = localStorage.getItem("flavoursProducts");

        if (!saved) return defaultProducts.map(p => ({ ...p }));

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return defaultProducts.map(p => ({ ...p }));
        }

        return parsed.map((p, index) => ({
            ...p,
            id: Number(p.id) || Date.now() + index,
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0
        }));
    } catch (error) {
        console.error("Product loading error:", error);
        return defaultProducts.map(p => ({ ...p }));
    }
}

let products = loadProducts();

function saveProducts() {
    localStorage.setItem("flavoursProducts", JSON.stringify(products));
}

if (!localStorage.getItem("flavoursProducts")) {
    saveProducts();
}

/* ==========================================
   2. SALES DATABASE
   ========================================== */

function loadSales() {
    try {
        const saved = localStorage.getItem("flavoursSales");
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Sales loading error:", error);
        return [];
    }
}

let salesRecords = loadSales();
let cart = [];

/* ==========================================
   3. GENERAL HELPERS
   ========================================== */

function money(amount) {
    return "K " + Number(amount || 0).toFixed(2);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function saveSales() {
    localStorage.setItem("flavoursSales", JSON.stringify(salesRecords));
}

function formatDate(date) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Invalid date";

    return parsed.toLocaleString();
}

/* ==========================================
   4. DASHBOARD
   ========================================== */

function updateDashboard() {
    const totalSales = salesRecords.reduce(
        (sum, sale) => sum + Number(sale.total || 0), 0
    );

    const salesElement = document.getElementById("sales");
    const balanceElement = document.getElementById("balance");
    const productsElement = document.getElementById("products");

    if (salesElement) salesElement.textContent = money(totalSales);
    if (balanceElement) balanceElement.textContent = money(totalSales);
    if (productsElement) productsElement.textContent = products.length;

    const transactions = document.getElementById("transactions");

    if (transactions) {
        if (!salesRecords.length) {
            transactions.innerHTML = `
                <tr><td colspan="4" class="empty">
                    No transactions recorded yet.
                </td></tr>`;
        } else {
            transactions.innerHTML = salesRecords.slice(-5).reverse()
                .map(sale => `
                    <tr>
                        <td>${escapeHTML(sale.id)}</td>
                        <td>Sale</td>
                        <td>${money(sale.total)}</td>
                        <td>Paid</td>
                    </tr>
                `).join("");
        }
    }
}

/* ==========================================
   5. NAVIGATION
   ========================================== */

function addSalesNavigation() {
    const existing = [...document.querySelectorAll(".nav-link")]
        .find(button =>
            button.dataset.page === "Sales History & Reports"
        );

    if (existing) return;

    const firstLink = document.querySelector(".nav-link");

    if (!firstLink || !firstLink.parentElement) {
        console.warn("Navigation container not found.");
        return;
    }

    const button = document.createElement("button");
    button.className = firstLink.className;
    button.dataset.page = "Sales History & Reports";
    button.textContent = "Sales History & Reports";
    button.type = "button";

    firstLink.parentElement.appendChild(button);
}

function showPage(page) {
    const title = document.getElementById("page-title");
    const content = document.querySelector(".content");

    if (!title || !content) {
        console.error("Page title or content area not found.");
        return;
    }

    title.textContent = page;

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    const sections = [
        ".welcome", ".stats", ".section-heading",
        ".actions", ".table-wrap", "footer"
    ];

    sections.forEach(selector => {
        content.querySelectorAll(selector).forEach(element => {
            element.style.display = page === "Dashboard" ? "" : "none";
        });
    });

    const previous = document.getElementById("module-view");
    if (previous) previous.remove();

    if (page === "Dashboard") {
        updateDashboard();
        return;
    }

    const module = document.createElement("div");
    module.id = "module-view";
    content.appendChild(module);

    if (page === "Point of Sale") {
        renderPOS();
    } else if (page === "Inventory") {
        renderInventory();
    } else if (page === "Sales History & Reports") {
        renderSalesReports();
    } else {
        module.innerHTML = `
            <div class="stat-card">
                <h2>${escapeHTML(page)}</h2>
                <p>This module will be developed next.</p>
            </div>`;
    }
}

/* ==========================================
   6. POINT OF SALE
   ========================================== */

function renderPOS() {
    const module = document.getElementById("module-view");
    if (!module) return;

    module.innerHTML = `
        <div class="section-heading">
            <h2>New Sale</h2>
            <span>Flavours Techs Solutions</span>
        </div>

        <div class="pos-layout">
            <section>
                <h3>Products & Services</h3>
                <div class="product-grid">
                    ${products.map(product => `
                        <button class="pos-product"
                            data-product="${product.id}"
                            ${product.stock <= 0 ? "disabled" : ""}>
                            <strong>${escapeHTML(product.name)}</strong>
                            <span>${money(product.price)}</span>
                            <small>Available stock: ${product.stock}</small>
                            <small>${product.stock <= 0
                                ? "OUT OF STOCK" : "+ Add to cart"}</small>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="cart-panel">
                <h3>Shopping Cart</h3>
                <div id="cart-items">Your cart is empty.</div>

                <div class="cart-total">
                    <strong>Total</strong>
                    <strong id="cart-total">K 0.00</strong>
                </div>

                <label for="customer-name">Customer Name</label>
                <input id="customer-name" type="text"
                    placeholder="Walk-in customer">

                <label for="payment-method">Payment Method</label>
                <select id="payment-method">
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>

                <button id="checkout-button" class="checkout">
                    COMPLETE SALE
                </button>

                <button id="clear-cart" class="clear-cart">
                    CLEAR CART
                </button>
            </section>
        </div>
    `;

    module.querySelectorAll("[data-product]").forEach(button => {
        button.addEventListener("click", () => {
            addToCart(Number(button.dataset.product));
        });
    });

    document.getElementById("checkout-button")
        .addEventListener("click", completeSale);

    document.getElementById("clear-cart")
        .addEventListener("click", () => {
            cart = [];
            renderCart();
        });

    renderCart();
}

/* ==========================================
   7. ADD PRODUCTS TO CART
   ========================================== */

function addToCart(id) {
    const product = products.find(item => item.id === id);

    if (!product || product.stock <= 0) {
        alert("This product is out of stock.");
        return;
    }

    const existing = cart.find(item => item.id === id);
    const quantity = existing ? existing.quantity : 0;

    if (quantity >= product.stock) {
        alert("You cannot add more than the available stock.");
        return;
    }

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    renderCart();
}

/* ==========================================
   8. SHOPPING CART
   ========================================== */

function renderCart() {
    const container = document.getElementById("cart-items");
    if (!container) return;

    if (!cart.length) {
        container.textContent = "Your cart is empty.";
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <small>${money(item.price)} each</small>
                </div>
                <div class="quantity-controls">
                    <button data-minus="${item.id}">−</button>
                    <span>${item.quantity}</span>
                    <button data-plus="${item.id}">+</button>
                    <button data-remove="${item.id}">×</button>
                </div>
                <strong>${money(item.price * item.quantity)}</strong>
            </div>
        `).join("");
    }

    container.querySelectorAll("[data-plus]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.plus);
            const item = cart.find(p => p.id === id);
            const product = products.find(p => p.id === id);

            if (!item || !product) return;

            if (item.quantity >= product.stock) {
                alert("Available stock limit reached.");
                return;
            }

            item.quantity++;
            renderCart();
        });
    });

    container.querySelectorAll("[data-minus]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.minus);
            const item = cart.find(p => p.id === id);
            if (!item) return;

            item.quantity--;

            if (item.quantity <= 0) {
                cart = cart.filter(p => p.id !== id);
            }

            renderCart();
        });
    });

    container.querySelectorAll("[data-remove]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.remove);
            cart = cart.filter(p => p.id !== id);
            renderCart();
        });
    });

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const totalElement = document.getElementById("cart-total");
    if (totalElement) totalElement.textContent = money(total);
}

/* ==========================================
   9. COMPLETE SALE
   ========================================== */

function completeSale() {
    if (!cart.length) {
        alert("Please add products before completing the sale.");
        return;
    }

    for (const item of cart) {
        const product = products.find(p => p.id === item.id);

        if (!product || product.stock < item.quantity) {
            alert("Insufficient stock for " + item.name);
            return;
        }
    }

    const customerInput =
        document.getElementById("customer-name").value.trim();

    const customer = customerInput || "Walk-in Customer";
    const payment = document.getElementById("payment-method").value;

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const sale = {
        id: "FTS-" + Date.now(),
        date: new Date().toISOString(),
        customer,
        payment,
        items: cart.map(item => ({ ...item })),
        total
    };

    const oldSales = [...salesRecords];
    const oldProducts = products.map(p => ({ ...p }));

    const oldSalesStorage = localStorage.getItem("flavoursSales");
    const oldProductsStorage = localStorage.getItem("flavoursProducts");

    salesRecords.push(sale);

    for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        product.stock -= item.quantity;
    }

    try {
        saveProducts();
        saveSales();
    } catch (error) {
        salesRecords = oldSales;
        products = oldProducts;

        try {
            if (oldSalesStorage === null) {
                localStorage.removeItem("flavoursSales");
            } else {
                localStorage.setItem("flavoursSales", oldSalesStorage);
            }

            if (oldProductsStorage === null) {
                localStorage.removeItem("flavoursProducts");
            } else {
                localStorage.setItem("flavoursProducts", oldProductsStorage);
            }
        } catch (restoreError) {
            console.error("Storage rollback failed:", restoreError);
        }

        alert("Sale could not be saved. No sale was completed.");
        console.error("Sale saving error:", error);
        return;
    }

    cart = [];

    alert(
        "SALE COMPLETED!\n\n" +
        "Receipt: " + sale.id + "\n" +
        "Customer: " + sale.customer + "\n" +
        "Payment: " + sale.payment + "\n" +
        "Total: " + money(sale.total)
    );

    updateDashboard();
    renderPOS();

    if (confirm("Would you like to print the receipt?")) {
        printReceipt(sale);
    }
}

/* ==========================================
   10. PRINT RECEIPT
   ========================================== */

function printReceipt(sale) {
    const receiptWindow = window.open("", "_blank");

    if (!receiptWindow) {
        alert("Please allow pop-ups to print receipts.");
        return;
    }

    const itemRows = sale.items.map(item => `
        <tr>
            <td>${escapeHTML(item.name)} × ${item.quantity}</td>
            <td>${money(item.price * item.quantity)}</td>
        </tr>
    `).join("");

    receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt ${escapeHTML(sale.id)}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 320px;
                    margin: 20px auto;
                    padding: 10px;
                }
                h2, p { text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px 0; border-bottom: 1px dashed #ccc; }
                td:last-child { text-align: right; }
                .total { font-size: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>FLAVOURS TECHS SOLUTIONS</h2>
            <p>SALES RECEIPT</p>
            <hr>
            <p>Receipt: ${escapeHTML(sale.id)}</p>
            <p>Customer: ${escapeHTML(sale.customer)}</p>
            <p>Payment: ${escapeHTML(sale.payment)}</p>
            <p>Date: ${escapeHTML(formatDate(sale.date))}</p>
            <hr>
            <table>${itemRows}</table>
            <hr>
            <p class="total">TOTAL: ${money(sale.total)}</p>
            <p>Thank you for shopping with us!</p>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `);

    receiptWindow.document.close();
}

/* ==========================================
   11. INVENTORY MANAGEMENT
   ========================================== */

function renderInventory() {
    const module = document.getElementById("module-view");
    if (!module) return;

    const totalUnits = products.reduce(
        (sum, p) => sum + Number(p.stock || 0), 0
    );

    const lowStock = products.filter(
        p => p.stock <= 10
    ).length;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Inventory Management</h2>
            <span>Stock control centre</span>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span>Total Products</span>
                <h2>${products.length}</h2>
            </div>
            <div class="stat-card">
                <span>Total Stock Units</span>
                <h2>${totalUnits}</h2>
            </div>
            <div class="stat-card">
                <span>Low Stock Items</span>
                <h2>${lowStock}</h2>
            </div>
        </div>

        <div class="inventory-form">
            <h3>Add New Product</h3>
            <form id="product-form">
                <input id="product-name" placeholder="Product name" required>
                <input id="product-price" type="number" min="0.01"
                    step="0.01" placeholder="Selling price (K)" required>
                <input id="product-stock" type="number" min="0"
                    step="1" placeholder="Opening stock quantity" required>
                <button type="submit">ADD PRODUCT</button>
            </form>
        </div>

        <div class="section-heading">
            <h2>Available Products</h2>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${escapeHTML(product.name)}</td>
                            <td>${money(product.price)}</td>
                            <td>${product.stock}</td>
                            <td>${product.stock <= 10
                                ? '<span class="stock-low">LOW STOCK</span>'
                                : '<span class="stock-good">IN STOCK</span>'}</td>
                            <td>
                                <button class="restock-button"
                                    data-restock="${product.id}">
                                    + Restock
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById("product-form")
        .addEventListener("submit", function(event) {
            event.preventDefault();

            const name = document.getElementById("product-name")
                .value.trim();

            const price = Number(
                document.getElementById("product-price").value
            );

            const stock = Number(
                document.getElementById("product-stock").value
            );

            if (!name || !Number.isFinite(price) || price <= 0 ||
                !Number.isInteger(stock) || stock < 0) {
                alert("Please enter valid product information.");
                return;
            }

            const newProduct = {
                id: Date.now(), name, price, stock
            };

            products.push(newProduct);

            try {
                saveProducts();
            } catch (error) {
                products.pop();
                alert("Could not save the product. Check browser storage.");
                console.error(error);
                return;
            }

            updateDashboard();
            renderInventory();
            alert("Product successfully added!");
        });

    module.querySelectorAll("[data-restock]").forEach(button => {
        button.addEventListener("click", function() {
            const id = Number(this.dataset.restock);
            const product = products.find(p => p.id === id);
            if (!product) return;

            const answer = prompt(
                "How many units are you adding to " + product.name + "?"
            );

            if (answer === null) return;

            const quantity = Number(answer);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                alert("Please enter a valid whole quantity.");
                return;
            }

            const oldStock = product.stock;
            product.stock += quantity;

            try {
                saveProducts();
            } catch (error) {
                product.stock = oldStock;
                alert("Could not save the stock update.");
                console.error(error);
                return;
            }

            updateDashboard();
            renderInventory();
            alert("Stock successfully updated!");
        });
    });
}

/* ==========================================
   12. SALES HISTORY AND REPORTS
   ========================================== */

function renderSalesReports() {
    const module = document.getElementById("module-view");
    if (!module) return;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Sales History & Reports</h2>
            <span>Flavours Techs Solutions</span>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span>Total Sales</span>
                <h2 id="report-total">K 0.00</h2>
            </div>
            <div class="stat-card">
                <span>Transactions</span>
                <h2 id="report-count">0</h2>
            </div>
            <div class="stat-card">
                <span>Average Sale</span>
                <h2 id="report-average">K 0.00</h2>
            </div>
        </div>

        <div class="inventory-form">
            <h3>Search and Filter Sales</h3>

            <label for="sales-search">Receipt number or customer</label>
            <input id="sales-search"
                placeholder="Search sales...">

            <label for="sales-period">Report period</label>
            <select id="sales-period">
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="month">This month</option>
            </select>

            <label for="sales-payment">Payment method</label>
            <select id="sales-payment">
                <option value="all">All payment methods</option>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
            </select>

            <button id="apply-sales-filter">APPLY FILTERS</button>
            <button id="export-sales">EXPORT SALES TO CSV</button>
        </div>

        <div class="section-heading">
            <h2>Transaction Records</h2>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Receipt</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Payment</th>
                        <th>Total</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="sales-history-body"></tbody>
            </table>
        </div>

        <p id="sales-result-count"></p>
    `;

    function getFilteredSales() {
        const search = document.getElementById("sales-search")
            .value.trim().toLowerCase();

        const period = document.getElementById("sales-period").value;
        const payment = document.getElementById("sales-payment").value;

        const now = new Date();

        return salesRecords.filter(sale => {
            const saleDate = new Date(sale.date);

            const matchesSearch =
                String(sale.id || "").toLowerCase().includes(search) ||
                String(sale.customer || "").toLowerCase().includes(search);

            const matchesPayment =
                payment === "all" || sale.payment === payment;

            let matchesPeriod = true;

            if (period === "today") {
                matchesPeriod =
                    saleDate.getFullYear() === now.getFullYear() &&
                    saleDate.getMonth() === now.getMonth() &&
                    saleDate.getDate() === now.getDate();
            }

            if (period === "month") {
                matchesPeriod =
                    saleDate.getFullYear() === now.getFullYear() &&
                    saleDate.getMonth() === now.getMonth();
            }

            return matchesSearch && matchesPayment && matchesPeriod;
        }).sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );
    }

    function updateSalesTable() {
        const filtered = getFilteredSales();

        const total = filtered.reduce(
            (sum, sale) => sum + Number(sale.total || 0), 0
        );

        const count = filtered.length;
        const average = count ? total / count : 0;

        document.getElementById("report-total").textContent = money(total);
        document.getElementById("report-count").textContent = count;
        document.getElementById("report-average").textContent =
            money(average);

        const body = document.getElementById("sales-history-body");

        if (!filtered.length) {
            body.innerHTML = `
                <tr><td colspan="6" class="empty">
                    No sales found for these filters.
                </td></tr>`;
        } else {
            body.innerHTML = filtered.map(sale => `
                <tr>
                    <td>${escapeHTML(sale.id)}</td>
                    <td>${escapeHTML(formatDate(sale.date))}</td>
                    <td>${escapeHTML(sale.customer)}</td>
                    <td>${escapeHTML(sale.payment)}</td>
                    <td>${money(sale.total)}</td>
                    <td>
                        <button class="restock-button"
                            data-print-sale="${escapeHTML(sale.id)}">
                            Print
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        document.getElementById("sales-result-count").textContent =
            "Showing " + count + " transaction(s).";
    }

    document.getElementById("apply-sales-filter")
        .addEventListener("click", updateSalesTable);

    document.getElementById("sales-history-body")
        .addEventListener("click", function(event) {
            const button = event.target.closest("[data-print-sale]");
            if (!button) return;

            const sale = salesRecords.find(
                item => item.id === button.dataset.printSale
            );

            if (sale) printReceipt(sale);
        });

    document.getElementById("export-sales")
        .addEventListener("click", function() {
            const filtered = getFilteredSales();

            if (!filtered.length) {
                alert("There are no sales records to export.");
                return;
            }

            const rows = [
                ["Receipt Number", "Date", "Customer",
                 "Payment Method", "Total (K)"]
            ];

            filtered.forEach(sale => {
                rows.push([
                    sale.id,
                    formatDate(sale.date),
                    sale.customer,
                    sale.payment,
                    Number(sale.total || 0).toFixed(2)
                ]);
            });

            const csv = rows.map(row =>
                row.map(value =>
                    '"' + String(value ?? "").replace(/"/g, '""') + '"'
                ).join(",")
            ).join("\r\n");

            const blob = new Blob(
                ["\uFEFF" + csv],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "Flavours-Sales-Report.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        });

    updateSalesTable();
}

/* ==========================================
   13. CONNECT NAVIGATION
   ========================================== */

addSalesNavigation();

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

/* ==========================================
   14. START APPLICATION
   ========================================== */

updateDashboard();

console.log("Flavours Business Manager Version 1.2 is ready.");
