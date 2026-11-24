
/* ==========================================
   FLAVOURS BUSINESS MANAGER
   VERSION 1.1 - POS + INVENTORY
   ========================================== */

console.log("FLAVOURS BUSINESS MANAGER STARTED");

/* ==========================================
   1. PRODUCT AND INVENTORY DATABASE
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

        return parsed;
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
    return "K " + Number(amount).toFixed(2);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* ==========================================
   4. DASHBOARD
   ========================================== */

function updateDashboard() {
    const totalSales = salesRecords.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0
    );

    const salesElement = document.getElementById("sales");
    const balanceElement = document.getElementById("balance");
    const productsElement = document.getElementById("products");

    if (salesElement) {
        salesElement.textContent = money(totalSales);
    }

    if (balanceElement) {
        balanceElement.textContent = money(totalSales);
    }

    if (productsElement) {
        productsElement.textContent = products.length;
    }

    const transactions = document.getElementById("transactions");

    if (transactions) {
        if (salesRecords.length === 0) {
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

/* ==========================================
   5. PAGE NAVIGATION
   ========================================== */

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

    if (previous) {
        previous.remove();
    }

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
    } else {
        module.innerHTML = `
            <div class="stat-card">
                <h2>${escapeHTML(page)}</h2>
                <p>This module will be developed next.</p>
            </div>
        `;
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
                        <button
                            class="pos-product"
                            data-product="${product.id}"
                            ${product.stock <= 0 ? "disabled" : ""}>
                            <strong>${escapeHTML(product.name)}</strong>
                            <span>${money(product.price)}</span>
                            <small>Available stock: ${product.stock}</small>
                            <small>
                                ${product.stock <= 0
                                    ? "OUT OF STOCK"
                                    : "+ Add to cart"}
                            </small>
                        </button>
                    `).join("")}
                </div>
            </section>

            <section class="cart-panel">
                <h3>Shopping Cart</h3>

                <div id="cart-items">
                    Your cart is empty.
                </div>

                <div class="cart-total">
                    <strong>Total</strong>
                    <strong id="cart-total">K 0.00</strong>
                </div>

                <label for="customer-name">Customer Name</label>
                <input
                    id="customer-name"
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
    const quantityInCart = existing ? existing.quantity : 0;

    if (quantityInCart >= product.stock) {
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

/* ==========================================
   8. SHOPPING CART
   ========================================== */

function renderCart() {
    const container = document.getElementById("cart-items");

    if (!container) return;

    if (cart.length === 0) {
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

    // Increase quantity
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

    // Decrease quantity
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

    // Remove item
    container.querySelectorAll("[data-remove]").forEach(button => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.remove);

            cart = cart.filter(p => p.id !== id);

            renderCart();
        });
    });

    // Calculate total
    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const totalElement = document.getElementById("cart-total");

    if (totalElement) {
        totalElement.textContent = money(total);
    }
}

/* ==========================================
   9. COMPLETE SALE
   ========================================== */

function completeSale() {
    if (cart.length === 0) {
        alert("Please add products before completing the sale.");
        return;
    }

    // Verify stock before checkout
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
        items: cart.map(item => ({ ...item })),
        total
    };

    // Keep previous data so a failed save can be rolled back
    const oldSales = [...salesRecords];
    const oldProducts = products.map(product => ({ ...product }));
    const oldSalesStorage = localStorage.getItem("flavoursSales");
    const oldProductsStorage = localStorage.getItem("flavoursProducts");

    salesRecords.push(sale);

    // Deduct stock
    for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        product.stock -= item.quantity;
    }

    try {
        saveProducts();

        localStorage.setItem(
            "flavoursSales",
            JSON.stringify(salesRecords)
        );
    } catch (error) {
        // Restore in-memory data
        salesRecords = oldSales;
        products = oldProducts;

        // Attempt to restore previous browser data
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

                h2, p {
                    text-align: center;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                td {
                    padding: 8px 0;
                    border-bottom: 1px dashed #ccc;
                }

                td:last-child {
                    text-align: right;
                }

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
            <p>Date: ${escapeHTML(new Date(sale.date).toLocaleString())}</p>
            <hr>
            <table>${itemRows}</table>
            <hr>
            <p class="total">TOTAL: ${money(sale.total)}</p>
            <p>Thank you for shopping with us!</p>

            <script>
                window.onload = function() {
                    window.print();
                };
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
        (sum, product) => sum + Number(product.stock || 0),
        0
    );

    const lowStock = products.filter(
        product => product.stock <= 10
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
                <input
                    id="product-name"
                    placeholder="Product name"
                    required>

                <input
                    id="product-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Selling price (K)"
                    required>

                <input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Opening stock quantity"
                    required>

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
                            <td>
                                ${product.stock <= 10
                                    ? '<span class="stock-low">LOW STOCK</span>'
                                    : '<span class="stock-good">IN STOCK</span>'}
                            </td>
                            <td>
                                <button
                                    class="restock-button"
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

    // Add new product
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

            if (
                !name ||
                !Number.isFinite(price) ||
                price <= 0 ||
                !Number.isInteger(stock) ||
                stock < 0
            ) {
                alert("Please enter valid product information.");
                return;
            }

            const newProduct = {
                id: Date.now(),
                name,
                price,
                stock
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

    // Restock products
    module.querySelectorAll("[data-restock]")
        .forEach(button => {
            button.addEventListener("click", function() {
                const id = Number(this.dataset.restock);

                const product = products.find(
                    item => item.id === id
                );

                if (!product) return;

                const answer = prompt(
                    "How many units are you adding to " +
                    product.name + "?"
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
   12. CONNECT NAVIGATION
   ========================================== */

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

/* ==========================================
   13. START APPLICATION
   ========================================== */

updateDashboard();

console.log("Flavours Business Manager is ready.");
