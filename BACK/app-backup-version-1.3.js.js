
/* ==================================================
   FLAVOURS BUSINESS MANAGER
   VERSION 1.3
   POS + INVENTORY + SALES + EXPENSES + PROFIT
   ================================================== */

console.log("FLAVOURS BUSINESS MANAGER V1.3 STARTED");

/* ==================================================
   1. PRODUCT DATABASE
   ================================================== */

const defaultProducts = [
    { id: 1, name: "A4 Paper Ream", price: 120, costPrice: 85, stock: 50, trackStock: true },
    { id: 2, name: "Exercise Book", price: 25, costPrice: 15, stock: 100, trackStock: true },
    { id: 3, name: "Blue Pen", price: 5, costPrice: 2.5, stock: 200, trackStock: true },
    { id: 4, name: "Photocopying", price: 1, costPrice: 0.2, stock: 1000, trackStock: false },
    { id: 5, name: "Printing", price: 2, costPrice: 0.5, stock: 1000, trackStock: false },
    { id: 6, name: "Typing Service", price: 30, costPrice: 0, stock: 100, trackStock: false },
    { id: 7, name: "Lamination", price: 10, costPrice: 3, stock: 100, trackStock: false },
    { id: 8, name: "Computer Services", price: 50, costPrice: 0, stock: 50, trackStock: false }
];

function isServiceName(name) {
    const services = [
        "photocopying",
        "printing",
        "typing service",
        "lamination",
        "computer services"
    ];

    return services.includes(String(name || "").toLowerCase());
}

function loadProducts() {
    try {
        const saved = localStorage.getItem("flavoursProducts");

        if (!saved) {
            return defaultProducts.map(p => ({ ...p }));
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return defaultProducts.map(p => ({ ...p }));
        }

        return parsed.map((p, index) => ({
            ...p,
            id: Number(p.id) || Date.now() + index,
            name: String(p.name || "Unnamed product"),
            price: Number(p.price) || 0,
            costPrice: Number(p.costPrice) || 0,
            stock: Number(p.stock) || 0,
            trackStock: typeof p.trackStock === "boolean"
                ? p.trackStock
                : !isServiceName(p.name)
        }));
    } catch (error) {
        console.error("Product loading error:", error);
        return defaultProducts.map(p => ({ ...p }));
    }
}

let products = loadProducts();

function saveProducts() {
    localStorage.setItem(
        "flavoursProducts",
        JSON.stringify(products)
    );
}

if (!localStorage.getItem("flavoursProducts")) {
    saveProducts();
}

/* ==================================================
   2. SALES DATABASE
   ================================================== */

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

/* ==================================================
   3. EXPENSE DATABASE
   ================================================== */

function loadExpenses() {
    try {
        const saved = localStorage.getItem("flavoursExpenses");
        const parsed = saved ? JSON.parse(saved) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Expense loading error:", error);
        return [];
    }
}

let expenseRecords = loadExpenses();

const expenseCategories = [
    "Rent",
    "Electricity",
    "Water",
    "Internet",
    "Transport",
    "Salaries",
    "Stationery",
    "Repairs and Maintenance",
    "Marketing",
    "Bank Charges",
    "Other"
];

function saveSales() {
    localStorage.setItem(
        "flavoursSales",
        JSON.stringify(salesRecords)
    );
}

function saveExpenses() {
    localStorage.setItem(
        "flavoursExpenses",
        JSON.stringify(expenseRecords)
    );
}

/* ==================================================
   4. GENERAL HELPERS
   ================================================== */

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

function formatDate(date) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Invalid date";
    }

    return parsed.toLocaleString();
}

function localDateKey(date) {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function todayKey() {
    return localDateKey(new Date());
}

function monthKey(date) {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "";

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function downloadCSV(filename, rows) {
    if (!rows.length) {
        alert("There are no records to export.");
        return;
    }

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
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/* ==================================================
   5. DASHBOARD
   ================================================== */

function updateDashboard() {
    const totalSales = salesRecords.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0
    );

    const totalExpenses = expenseRecords.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
    );

    const salesElement = document.getElementById("sales");
    const balanceElement = document.getElementById("balance");
    const productsElement = document.getElementById("products");

    if (salesElement) {
        salesElement.textContent = money(totalSales);
    }

    if (balanceElement) {
        balanceElement.textContent = money(totalSales - totalExpenses);
    }

    if (productsElement) {
        productsElement.textContent = products.length;
    }

    const transactions = document.getElementById("transactions");

    if (transactions) {
        if (!salesRecords.length) {
            transactions.innerHTML = `
                <tr>
                    <td colspan="4" class="empty">
                        No transactions recorded yet.
                    </td>
                </tr>
            `;
        } else {
            transactions.innerHTML = salesRecords
                .slice(-5)
                .reverse()
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

/* ==================================================
   6. NAVIGATION
   ================================================== */

function addNavigationButton(page) {
    const existing = [...document.querySelectorAll(".nav-link")]
        .find(button => button.dataset.page === page);

    if (existing) return;

    const firstLink = document.querySelector(".nav-link");

    if (!firstLink || !firstLink.parentElement) {
        console.warn("Navigation container not found.");
        return;
    }

    const button = document.createElement("button");

    button.type = "button";
    button.className = firstLink.className;
    button.dataset.page = page;
    button.textContent = page;

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
        ".welcome",
        ".stats",
        ".section-heading",
        ".actions",
        ".table-wrap",
        "footer"
    ];

    sections.forEach(selector => {
        content.querySelectorAll(selector).forEach(element => {
            element.style.display =
                page === "Dashboard" ? "" : "none";
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
    } else if (page === "Expenses") {
        renderExpenses();
    } else if (page === "Profit Reports") {
        renderProfitReports();
    } else {
        module.innerHTML = `
            <div class="stat-card">
                <h2>${escapeHTML(page)}</h2>
                <p>This module will be developed next.</p>
            </div>
        `;
    }
}

/* ==================================================
   7. POINT OF SALE
   ================================================== */

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
                    ${products.map(product => {
                        const unavailable =
                            product.trackStock && product.stock <= 0;

                        return `
                            <button
                                class="pos-product"
                                data-product="${product.id}"
                                ${unavailable ? "disabled" : ""}>

                                <strong>${escapeHTML(product.name)}</strong>
                                <span>${money(product.price)}</span>

                                <small>
                                    ${product.trackStock
                                        ? "Available stock: " + product.stock
                                        : "Service"}
                                </small>

                                <small>
                                    ${unavailable
                                        ? "OUT OF STOCK"
                                        : "+ Add to cart"}
                                </small>
                            </button>
                        `;
                    }).join("")}
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
                <input id="customer-name"
                    type="text"
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

/* ==================================================
   8. ADD TO CART
   ================================================== */

function addToCart(id) {
    const product = products.find(item => item.id === id);

    if (!product) {
        alert("Product not found.");
        return;
    }

    const existing = cart.find(item => item.id === id);
    const quantity = existing ? existing.quantity : 0;

    if (product.trackStock && quantity >= product.stock) {
        alert("You cannot add more than the available stock.");
        return;
    }

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    renderCart();
}

/* ==================================================
   9. SHOPPING CART
   ================================================== */

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

                <strong>
                    ${money(item.price * item.quantity)}
                </strong>
            </div>
        `).join("");
    }

    container.querySelectorAll("[data-plus]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.plus);
            const item = cart.find(p => p.id === id);
            const product = products.find(p => p.id === id);

            if (!item || !product) return;

            if (product.trackStock && item.quantity >= product.stock) {
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
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const totalElement = document.getElementById("cart-total");

    if (totalElement) {
        totalElement.textContent = money(total);
    }
}

/* ==================================================
   10. COMPLETE SALE
   ================================================== */

function completeSale() {
    if (!cart.length) {
        alert("Please add products before completing the sale.");
        return;
    }

    for (const item of cart) {
        const product = products.find(p => p.id === item.id);

        if (!product) {
            alert("Product not found: " + item.name);
            return;
        }

        if (product.trackStock && product.stock < item.quantity) {
            alert("Insufficient stock for " + item.name);
            return;
        }
    }

    const customerInput =
        document.getElementById("customer-name").value.trim();

    const customer = customerInput || "Walk-in Customer";

    const payment =
        document.getElementById("payment-method").value;

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const sale = {
        id: "FTS-" + Date.now(),
        date: new Date().toISOString(),
        customer,
        payment,
        items: cart.map(item => {
            const product = products.find(p => p.id === item.id);

            return {
                id: item.id,
                name: item.name,
                price: Number(item.price),
                costPrice: Number(product.costPrice || 0),
                quantity: item.quantity,
                trackStock: product.trackStock
            };
        }),
        total
    };

    const oldSales = [...salesRecords];
    const oldProducts = products.map(p => ({ ...p }));

    const oldSalesStorage = localStorage.getItem("flavoursSales");
    const oldProductsStorage = localStorage.getItem("flavoursProducts");

    salesRecords.push(sale);

    for (const item of cart) {
        const product = products.find(p => p.id === item.id);

        if (product.trackStock) {
            product.stock -= item.quantity;
        }
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

/* ==================================================
   11. PRINT RECEIPT
   ================================================== */

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
                td {
                    padding: 8px 0;
                    border-bottom: 1px dashed #ccc;
                }
                td:last-child { text-align: right; }
                .total {
                    font-size: 20px;
                    font-weight: bold;
                }
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

/* ==================================================
   12. INVENTORY MANAGEMENT
   ================================================== */

function renderInventory() {
    const module = document.getElementById("module-view");

    if (!module) return;

    const stockProducts = products.filter(p => p.trackStock);

    const totalUnits = stockProducts.reduce(
        (sum, p) => sum + Number(p.stock || 0),
        0
    );

    const lowStock = stockProducts.filter(
        p => p.stock <= 10
    ).length;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Inventory Management</h2>
            <span>Stock and purchase cost control</span>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span>Total Products & Services</span>
                <h2>${products.length}</h2>
            </div>
            <div class="stat-card">
                <span>Physical Stock Units</span>
                <h2>${totalUnits}</h2>
            </div>
            <div class="stat-card">
                <span>Low Stock Items</span>
                <h2>${lowStock}</h2>
            </div>
        </div>

        <div class="inventory-form">
            <h3>Add New Product or Service</h3>

            <form id="product-form">
                <input id="product-name"
                    placeholder="Product or service name" required>

                <input id="product-price"
                    type="number" min="0.01" step="0.01"
                    placeholder="Selling price (K)" required>

                <input id="product-cost"
                    type="number" min="0" step="0.01"
                    placeholder="Purchase cost per unit (K)" required>

                <label for="product-type">Item type</label>
                <select id="product-type">
                    <option value="stock">Physical stock item</option>
                    <option value="service">Service (no stock tracking)</option>
                </select>

                <input id="product-stock"
                    type="number" min="0" step="1"
                    placeholder="Opening stock quantity"
                    value="0">

                <button type="submit">ADD PRODUCT / SERVICE</button>
            </form>
        </div>

        <div class="section-heading">
            <h2>Available Products and Services</h2>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Purchase Cost</th>
                        <th>Selling Price</th>
                        <th>Stock</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${escapeHTML(product.name)}</td>
                            <td>${product.trackStock ? "Stock item" : "Service"}</td>
                            <td>${money(product.costPrice)}</td>
                            <td>${money(product.price)}</td>
                            <td>${product.trackStock ? product.stock : "N/A"}</td>
                            <td>
                                ${product.trackStock ? `
                                    <button class="restock-button"
                                        data-restock="${product.id}">
                                        + Restock
                                    </button>
                                ` : "—"}
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

            const costPrice = Number(
                document.getElementById("product-cost").value
            );

            const type = document.getElementById("product-type").value;

            const stock = Number(
                document.getElementById("product-stock").value
            );

            if (!name || !Number.isFinite(price) || price <= 0 ||
                !Number.isFinite(costPrice) || costPrice < 0) {
                alert("Please enter a valid name, selling price and purchase cost.");
                return;
            }

            if (type === "stock" &&
                (!Number.isInteger(stock) || stock < 0)) {
                alert("Please enter a valid whole stock quantity.");
                return;
            }

            const newProduct = {
                id: Date.now(),
                name,
                price,
                costPrice,
                stock: type === "stock" ? stock : 0,
                trackStock: type === "stock"
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

            alert("Product or service successfully added!");
        });

    module.querySelectorAll("[data-restock]")
        .forEach(button => {
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

                const costAnswer = prompt(
                    "Enter the purchase cost per unit in K.\n" +
                    "Current recorded cost: " + money(product.costPrice)
                );

                if (costAnswer === null) return;

                const newCost = Number(costAnswer);

                if (!Number.isFinite(newCost) || newCost < 0) {
                    alert("Please enter a valid purchase cost.");
                    return;
                }

                const oldStock = product.stock;
                const oldCost = product.costPrice;

                const totalOldCost = oldStock * oldCost;
                const totalNewCost = quantity * newCost;
                const combinedQuantity = oldStock + quantity;

                product.stock = combinedQuantity;

                if (combinedQuantity > 0) {
                    product.costPrice =
                        (totalOldCost + totalNewCost) / combinedQuantity;
                }

                try {
                    saveProducts();
                } catch (error) {
                    product.stock = oldStock;
                    product.costPrice = oldCost;

                    alert("Could not save the stock update.");
                    console.error(error);
                    return;
                }

                updateDashboard();
                renderInventory();

                alert(
                    "Stock updated successfully!\n" +
                    "New stock: " + product.stock + "\n" +
                    "Average purchase cost: " + money(product.costPrice)
                );
            });
        });
}

/* ==================================================
   13. SALES HISTORY AND REPORTS
   ================================================== */

function renderSalesReports() {
    const module = document.getElementById("module-view");

    if (!module) return;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Sales History & Reports</h2>
            <span>Transaction records</span>
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

            <input id="sales-search"
                placeholder="Search receipt or customer">

            <select id="sales-period">
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="month">This month</option>
            </select>

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

        return salesRecords.filter(sale => {
            const saleDate = new Date(sale.date);

            const matchesSearch =
                String(sale.id || "").toLowerCase().includes(search) ||
                String(sale.customer || "").toLowerCase().includes(search);

            const matchesPayment =
                payment === "all" || sale.payment === payment;

            let matchesPeriod = true;

            if (period === "today") {
                matchesPeriod = localDateKey(sale.date) === todayKey();
            }

            if (period === "month") {
                matchesPeriod = monthKey(sale.date) === monthKey(new Date());
            }

            return matchesSearch && matchesPayment && matchesPeriod;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function updateSalesTable() {
        const filtered = getFilteredSales();

        const total = filtered.reduce(
            (sum, sale) => sum + Number(sale.total || 0), 0
        );

        const count = filtered.length;

        document.getElementById("report-total").textContent = money(total);
        document.getElementById("report-count").textContent = count;
        document.getElementById("report-average").textContent =
            money(count ? total / count : 0);

        const body = document.getElementById("sales-history-body");

        if (!filtered.length) {
            body.innerHTML = `
                <tr><td colspan="6" class="empty">
                    No sales found.
                </td></tr>
            `;
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

            const rows = [[
                "Receipt Number",
                "Date",
                "Customer",
                "Payment Method",
                "Total (K)"
            ]];

            filtered.forEach(sale => {
                rows.push([
                    sale.id,
                    formatDate(sale.date),
                    sale.customer,
                    sale.payment,
                    Number(sale.total || 0).toFixed(2)
                ]);
            });

            downloadCSV("Flavours-Sales-Report.csv", rows);
        });

    updateSalesTable();
}

/* ==================================================
   14. EXPENSE MANAGEMENT
   ================================================== */

function renderExpenses() {
    const module = document.getElementById("module-view");

    if (!module) return;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Business Expenses</h2>
            <span>Record and monitor business spending</span>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span>Total Recorded Expenses</span>
                <h2 id="expense-total">K 0.00</h2>
            </div>
            <div class="stat-card">
                <span>Expense Records</span>
                <h2 id="expense-count">0</h2>
            </div>
        </div>

        <div class="inventory-form">
            <h3>Record a Business Expense</h3>

            <form id="expense-form">
                <label for="expense-description">Description</label>
                <input id="expense-description"
                    placeholder="e.g. Monthly internet bill"
                    required>

                <label for="expense-category">Expense category</label>
                <select id="expense-category">
                    ${expenseCategories.map(category => `
                        <option value="${escapeHTML(category)}">
                            ${escapeHTML(category)}
                        </option>
                    `).join("")}
                </select>

                <label for="expense-amount">Amount (K)</label>
                <input id="expense-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Expense amount"
                    required>

                <label for="expense-date">Expense date</label>
                <input id="expense-date"
                    type="date"
                    value="${todayKey()}"
                    required>

                <label for="expense-payment">Payment method</label>
                <select id="expense-payment">
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>

                <button type="submit">SAVE EXPENSE</button>
            </form>
        </div>

        <div class="section-heading">
            <h2>Expense Records</h2>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="expense-table-body"></tbody>
            </table>
        </div>

        <button id="export-expenses">EXPORT EXPENSES TO CSV</button>
    `;

    function updateExpenseTable() {
        const total = expenseRecords.reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0
        );

        document.getElementById("expense-total").textContent = money(total);
        document.getElementById("expense-count").textContent =
            expenseRecords.length;

        const body = document.getElementById("expense-table-body");

        if (!expenseRecords.length) {
            body.innerHTML = `
                <tr><td colspan="6" class="empty">
                    No expenses recorded yet.
                </td></tr>
            `;
            return;
        }

        body.innerHTML = [...expenseRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(expense => `
                <tr>
                    <td>${escapeHTML(expense.date)}</td>
                    <td>${escapeHTML(expense.description)}</td>
                    <td>${escapeHTML(expense.category)}</td>
                    <td>${escapeHTML(expense.payment)}</td>
                    <td>${money(expense.amount)}</td>
                    <td>
                        <button class="restock-button"
                            data-delete-expense="${escapeHTML(expense.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("");
    }

    document.getElementById("expense-form")
        .addEventListener("submit", function(event) {
            event.preventDefault();

            const description = document.getElementById("expense-description")
                .value.trim();

            const category = document.getElementById("expense-category").value;

            const amount = Number(
                document.getElementById("expense-amount").value
            );

            const date = document.getElementById("expense-date").value;
            const payment = document.getElementById("expense-payment").value;

            if (!description || !Number.isFinite(amount) ||
                amount <= 0 || !date) {
                alert("Please enter valid expense information.");
                return;
            }

            const expense = {
                id: "EXP-" + Date.now(),
                description,
                category,
                amount,
                date,
                payment,
                createdAt: new Date().toISOString()
            };

            expenseRecords.push(expense);

            try {
                saveExpenses();
            } catch (error) {
                expenseRecords.pop();
                alert("Expense could not be saved.");
                console.error(error);
                return;
            }

            updateDashboard();
            renderExpenses();

            alert("Business expense recorded successfully!");
        });

    document.getElementById("expense-table-body")
        .addEventListener("click", function(event) {
            const button = event.target.closest("[data-delete-expense]");

            if (!button) return;

            const id = button.dataset.deleteExpense;

            if (!confirm("Are you sure you want to delete this expense?")) {
                return;
            }

            const oldRecords = [...expenseRecords];

            expenseRecords = expenseRecords.filter(
                expense => expense.id !== id
            );

            try {
                saveExpenses();
            } catch (error) {
                expenseRecords = oldRecords;
                alert("Expense could not be deleted.");
                console.error(error);
                return;
            }

            updateDashboard();
            renderExpenses();

            alert("Expense deleted.");
        });

    document.getElementById("export-expenses")
        .addEventListener("click", function() {
            const rows = [[
                "Expense ID",
                "Date",
                "Description",
                "Category",
                "Payment Method",
                "Amount (K)"
            ]];

            expenseRecords.forEach(expense => {
                rows.push([
                    expense.id,
                    expense.date,
                    expense.description,
                    expense.category,
                    expense.payment,
                    Number(expense.amount).toFixed(2)
                ]);
            });

            downloadCSV("Flavours-Expenses-Report.csv", rows);
        });

    updateExpenseTable();
}

/* ==================================================
   15. PROFIT REPORTS
   ================================================== */

function renderProfitReports() {
    const module = document.getElementById("module-view");

    if (!module) return;

    module.innerHTML = `
        <div class="section-heading">
            <h2>Profit and Financial Reports</h2>
            <span>Business financial overview</span>
        </div>

        <div class="inventory-form">
            <label for="profit-period">Report period</label>
            <select id="profit-period">
                <option value="today">Today</option>
                <option value="month">This month</option>
                <option value="all">All time</option>
            </select>

            <button id="refresh-profit">UPDATE REPORT</button>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span>Sales Revenue</span>
                <h2 id="profit-revenue">K 0.00</h2>
            </div>

            <div class="stat-card">
                <span>Cost of Goods Sold</span>
                <h2 id="profit-cost">K 0.00</h2>
            </div>

            <div class="stat-card">
                <span>Gross Profit</span>
                <h2 id="profit-gross">K 0.00</h2>
            </div>

            <div class="stat-card">
                <span>Operating Expenses</span>
                <h2 id="profit-expenses">K 0.00</h2>
            </div>

            <div class="stat-card">
                <span>Estimated Net Profit</span>
                <h2 id="profit-net">K 0.00</h2>
            </div>
        </div>

        <div class="inventory-form">
            <h3>Financial Calculation</h3>
            <p>Sales Revenue minus Cost of Goods Sold equals Gross Profit.</p>
            <p>Gross Profit minus Operating Expenses equals Estimated Net Profit.</p>
            <p id="profit-note"></p>
        </div>

        <div class="section-heading">
            <h2>Expenses by Category</h2>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Expenses</th>
                    </tr>
                </thead>
                <tbody id="category-expenses-body"></tbody>
            </table>
        </div>
    `;

    function calculateReport() {
        const period = document.getElementById("profit-period").value;

        function matchesPeriod(date) {
            if (period === "all") return true;

            if (period === "today") {
                return localDateKey(date) === todayKey();
            }

            return monthKey(date) === monthKey(new Date());
        }

        const filteredSales = salesRecords.filter(
            sale => matchesPeriod(sale.date)
        );

        const filteredExpenses = expenseRecords.filter(
            expense => matchesPeriod(expense.date)
        );

        const revenue = filteredSales.reduce(
            (sum, sale) => sum + Number(sale.total || 0),
            0
        );

        let costOfGoods = 0;
        let unknownCostSales = 0;

        filteredSales.forEach(sale => {
            if (!Array.isArray(sale.items)) return;

            let saleHasUnknownCost = false;

            sale.items.forEach(item => {
                if (typeof item.costPrice !== "number" ||
                    !Number.isFinite(item.costPrice)) {
                    saleHasUnknownCost = true;
                    return;
                }

                costOfGoods +=
                    Number(item.costPrice) * Number(item.quantity || 0);
            });

            if (saleHasUnknownCost) {
                unknownCostSales++;
            }
        });

        const grossProfit = revenue - costOfGoods;

        const operatingExpenses = filteredExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0
        );

        const netProfit = grossProfit - operatingExpenses;

        document.getElementById("profit-revenue").textContent =
            money(revenue);

        document.getElementById("profit-cost").textContent =
            money(costOfGoods);

        document.getElementById("profit-gross").textContent =
            money(grossProfit);

        document.getElementById("profit-expenses").textContent =
            money(operatingExpenses);

        document.getElementById("profit-net").textContent =
            money(netProfit);

        const note = document.getElementById("profit-note");

        if (unknownCostSales > 0) {
            note.textContent =
                unknownCostSales +
                " older sale(s) contain items without recorded purchase costs. " +
                "Their missing costs are not included, so actual profit may be lower.";
        } else {
            note.textContent =
                "All recorded sales in this period have purchase cost information.";
        }

        const categoryTotals = {};

        filteredExpenses.forEach(expense => {
            const category = expense.category || "Other";

            categoryTotals[category] =
                (categoryTotals[category] || 0) +
                Number(expense.amount || 0);
        });

        const body = document.getElementById("category-expenses-body");

        const categories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);

        body.innerHTML = categories.length
            ? categories.map(([category, amount]) => `
                <tr>
                    <td>${escapeHTML(category)}</td>
                    <td>${money(amount)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="2" class="empty">
                No expenses in this period.
               </td></tr>`;
    }

    document.getElementById("refresh-profit")
        .addEventListener("click", calculateReport);

    calculateReport();
}

/* ==================================================
   16. CONNECT NAVIGATION
   ================================================== */

addNavigationButton("Sales History & Reports");
addNavigationButton("Expenses");
addNavigationButton("Profit Reports");

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

/* ==================================================
   17. START APPLICATION
   ================================================== */

updateDashboard();

console.log("Flavours Business Manager Version 1.3 is ready.");
