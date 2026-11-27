const root = document.querySelector("#app");
const dialog = document.querySelector("#cart-dialog");
const money = cents => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);
const CART_KEY = "estoqueweb.cart.v1";
let settings = {};
let products = [];
let categories = [];
let cart = readCart();

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body?.error || "Não foi possível concluir a solicitação.");
  return body;
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function priceNode(cents) { return el("strong", money(cents)); }

function renderCatalog() {
  root.replaceChildren();
  const hero = el("section", null, "hero");
  const copy = el("div", null, "hero-copy");
  copy.append(el("p", "Um carinho para você", "eyebrow"));
  const title = el("h1");
  title.append(document.createTextNode("Beleza que combina "));
  const emphasis = el("em", "com você.");
  title.append(emphasis);
  copy.append(title, el("p", settings.presentation || "Conheça nossos produtos e fale com a loja para confirmar seu pedido."));
  const actions = el("div", null, "hero-actions");
  const explore = el("a", "Explorar produtos", "button button-dark");
  explore.href = "#catalogo";
  actions.append(explore);
  if (settings.whatsapp) {
    const contact = el("a", "Conversar pelo WhatsApp ↗", "text-link");
    contact.href = "https://wa.me/" + settings.whatsapp.replace(/\D/g, "");
    contact.target = "_blank";
    contact.rel = "noopener noreferrer";
    actions.append(contact);
  }
  copy.append(actions);
  const art = el("div", null, "hero-art");
  art.setAttribute("aria-hidden", "true");
  art.append(el("span", null, "sun"), el("div", null, "bottle bottle-one"), el("div", null, "bottle bottle-two"), el("span", "✳", "flower"), el("p", "seu momento de cuidado"));
  hero.append(copy, art);

  const section = el("section", null, "catalog-section");
  section.id = "catalogo";
  const heading = el("div", null, "section-heading");
  const headingCopy = el("div");
  headingCopy.append(el("p", "Escolhidos com carinho", "eyebrow"), el("h2", "Encontre seu próximo favorito"));
  heading.append(headingCopy, el("p", "Consulte disponibilidade e detalhes com a loja."));
  const filters = el("form", null, "filters");
  filters.id = "filters";
  filters.method = "get";
  const search = el("label", null, "search-field");
  const input = el("input");
  input.type = "search"; input.name = "search"; input.placeholder = "O que você procura?";
  input.setAttribute("aria-label", "Pesquisar produto");
  input.value = new URL(location.href).searchParams.get("search") || "";
  const submitSearch = el("button", "⌕"); submitSearch.type = "submit"; submitSearch.setAttribute("aria-label", "Pesquisar");
  search.append(input, submitSearch);
  const select = el("select"); select.name = "category"; select.setAttribute("aria-label", "Filtrar categoria");
  const all = el("option", "Todas as categorias"); all.value = "";
  select.append(all);
  for (const name of categories) {
    const option = el("option", name); option.value = name;
    if (new URL(location.href).searchParams.get("category") === name) option.selected = true;
    select.append(option);
  }
  const submit = el("button", "Buscar", "filter-submit"); submit.type = "submit";
  filters.append(search, select, submit);
  filters.addEventListener("submit", event => {
    event.preventDefault();
    const query = new URLSearchParams(new FormData(filters));
    history.replaceState({}, "", "/?" + query.toString() + "#catalogo");
    loadCatalog();
  });
  select.addEventListener("change", () => filters.requestSubmit());
  const grid = el("div", null, "product-grid");
  grid.id = "product-grid";
  if (!products.length) {
    const empty = el("div", null, "empty-state");
    empty.append(el("span", "✿"), el("h3", "Nenhum produto encontrado"), el("p", "Tente outro termo ou categoria."));
    section.append(heading, filters, empty);
  } else {
    for (const product of products) grid.append(productCard(product));
    section.append(heading, filters, grid);
  }
  const services = el("section", null, "service-note");
  const blocks = [
    ["♡", "Atendimento próximo", "Fale diretamente com a loja para tirar dúvidas."],
    ["✦", "Pedido simples", "Monte sua sacola e envie a seleção pelo WhatsApp."],
    ["✓", "Compra confirmada pela loja", "Preço, estoque e entrega são confirmados antes do envio."]
  ];
  for (const [icon, name, description] of blocks) {
    const block = el("div"); block.append(el("span", icon), el("h3", name), el("p", description)); services.append(block);
  }
  root.append(hero, section, services);
  document.querySelector(".brand").firstChild.textContent = settings.storeName || "Minha loja";
  updateCart();
}

function productCard(product) {
  const card = el("article", null, "product-card");
  const link = el("a", null, "product-image"); link.href = "/produto/" + product.id;
  if (product.imageUrl) {
    const image = document.createElement("img"); image.src = product.imageUrl; image.alt = product.name; image.loading = "lazy";
    link.append(image);
  } else {
    const placeholder = el("div", null, "image-placeholder"); placeholder.append(el("span", "✿"), el("small", "foto em breve")); link.append(placeholder);
  }
  if (product.featured) link.append(el("span", "Escolha da loja", "featured"));
  const info = el("div", null, "product-info");
  info.append(el("p", product.category, "product-category"));
  const name = el("h3");
  const nameLink = el("a", product.name); nameLink.href = "/produto/" + product.id; name.append(nameLink);
  const bottom = el("div", null, "product-bottom");
  const price = el("div"); price.append(priceNode(product.priceCents), el("span", product.available ? "Disponível para consultar" : "Esgotado no momento", product.available ? "availability" : "availability sold-out"));
  const add = el("button", "+", "add-to-cart"); add.type = "button"; add.disabled = !product.available; add.dataset.add = String(product.id); add.setAttribute("aria-label", "Adicionar " + product.name + " à sacola");
  bottom.append(price, add); info.append(name, bottom); card.append(link, info);
  return card;
}

async function loadCatalog() {
  const params = new URLSearchParams(location.search);
  const data = await request("/api/catalog?" + params.toString());
  products = data.products; categories = data.categories; settings = data.settings;
  if (document.body.dataset.productId) return loadDetail(document.body.dataset.productId);
  renderCatalog();
}

async function loadDetail(id) {
  const product = await request("/api/product/" + encodeURIComponent(id));
  if (!products.some(item => item.id === product.id)) products = [...products, product];
  root.replaceChildren();
  const section = el("section", null, "detail-wrap");
  const back = el("a", "← Voltar ao catálogo", "back-link"); back.href = "/#catalogo";
  const grid = el("div", null, "detail-grid");
  const picture = el("div", null, "detail-image");
  if (product.imageUrl) { const img = document.createElement("img"); img.src = product.imageUrl; img.alt = product.name; picture.append(img); }
  else { const placeholder = el("div", null, "image-placeholder"); placeholder.append(el("span", "✿"), el("small", "foto em breve")); picture.append(placeholder); }
  const copy = el("div", null, "detail-copy");
  copy.append(el("p", product.category, "eyebrow"), el("h1", product.name), el("p", product.description || "Consulte a loja para mais detalhes sobre este produto."), priceNode(product.priceCents), el("p", product.available ? "Disponível para consultar" : "Esgotado no momento", product.available ? "availability" : "availability sold-out"));
  const add = el("button", "Adicionar à sacola", "button button-dark"); add.type = "button"; add.dataset.add = String(product.id); add.disabled = !product.available;
  copy.append(add, el("p", "Preço e disponibilidade serão confirmados pela loja.", "muted"));
  grid.append(picture, copy); section.append(back, grid); root.append(section); updateCart();
}

function updateCart() {
  const count = Object.values(cart).reduce((sum, value) => sum + Number(value || 0), 0);
  const node = document.querySelector("#cart-count"); if (node) node.textContent = String(count);
  const lines = document.querySelector("#cart-lines"); if (!lines) return;
  lines.replaceChildren();
  let total = 0;
  for (const [id, quantity] of Object.entries(cart)) {
    const product = products.find(item => item.id === Number(id));
    if (!product) continue;
    const row = el("div", null, "cart-line");
    const info = el("div"); info.append(el("span", product.name, "cart-line-name"), el("div", Number(quantity) + " × " + money(product.priceCents), "cart-line-meta"));
    const actions = el("div", null, "cart-line-actions");
    const minus = el("button", "−"); minus.type = "button"; minus.dataset.change = id; minus.dataset.delta = "-1"; minus.setAttribute("aria-label", "Diminuir quantidade");
    const amount = el("span", String(quantity));
    const plus = el("button", "+"); plus.type = "button"; plus.dataset.change = id; plus.dataset.delta = "1"; plus.setAttribute("aria-label", "Aumentar quantidade");
    actions.append(minus, amount, plus); row.append(info, actions); lines.append(row);
    total += product.priceCents * Number(quantity);
  }
  const empty = document.querySelector("#cart-empty"); if (empty) empty.hidden = count > 0;
  const totalNode = document.querySelector("#cart-total"); if (totalNode) totalNode.textContent = money(total);
  const checkout = document.querySelector("#checkout"); if (checkout) checkout.disabled = !count || !settings.whatsapp;
}
function changeCart(id, delta) {
  const current = Number(cart[id] || 0) + delta;
  if (current <= 0) delete cart[id]; else cart[id] = Math.min(99, current);
  saveCart(); updateCart();
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  if (add) { changeCart(add.dataset.add, 1); if (dialog && !dialog.open) dialog.showModal(); }
  const change = event.target.closest("[data-change]");
  if (change) changeCart(change.dataset.change, Number(change.dataset.delta));
});
document.querySelector("#open-cart")?.addEventListener("click", () => dialog?.showModal());
document.querySelector("#close-cart")?.addEventListener("click", () => dialog?.close());
dialog?.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
document.querySelector("#checkout")?.addEventListener("click", async () => {
  const message = document.querySelector("#cart-message"); message.textContent = "Conferindo disponibilidade…";
  try {
    const current = await request("/api/cart/validate", { method: "POST", body: JSON.stringify(Object.entries(cart).map(([id, quantity]) => ({ id: Number(id), quantity: Number(quantity) }))) });
    const available = new Map(current.map(item => [item.id, item]));
    let removed = false, insufficient = false;
    for (const id of Object.keys(cart)) {
      const item = available.get(Number(id));
      if (!item || !item.active || !item.available) { delete cart[id]; products = products.filter(p => p.id !== Number(id)); removed = true; }
      else {
        if (!item.enoughQuantity) insufficient = true;
        products = products.map(p => p.id === item.id ? { ...p, name: item.name, priceCents: item.priceCents } : p);
      }
    }
    saveCart(); updateCart();
    if (removed) { message.textContent = "Um ou mais itens ficaram indisponíveis e foram removidos. Revise a sacola."; return; }
    if (insufficient) { message.textContent = "A quantidade pedida excede o estoque disponível. Reduza a quantidade na sacola e tente novamente."; return; }
    const lines = Object.entries(cart).map(([id, qty]) => { const p = products.find(x => x.id === Number(id)); return "• " + p.name + " — " + qty + " × " + money(p.priceCents) + " = " + money(p.priceCents * qty); });
    const total = Object.entries(cart).reduce((sum, [id, qty]) => sum + products.find(p => p.id === Number(id)).priceCents * Number(qty), 0);
    const text = "Olá! Gostaria de consultar este pedido:\n\n" + lines.join("\n") + "\n\nTotal estimado: " + money(total) + "\n\nPor favor, confirme disponibilidade, preço final e entrega. Sei que esta mensagem não reserva os produtos.";
    location.href = "https://wa.me/" + settings.whatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
  } catch (error) { message.textContent = error.message; }
});

const admin = { tab: "products", product: null, category: null };
function adminShell(title = "Painel da loja") {
  root.replaceChildren();
  const shell = el("section", null, "admin-shell");
  const header = el("header", null, "admin-header");
  header.append(el("h1", title));
  const nav = el("div", null, "admin-nav");
  const back = el("a", "Abrir vitrine"); back.href = "/";
  const logout = el("button", "Sair"); logout.type = "button"; logout.dataset.logout = "true";
  nav.append(back, logout); header.append(nav); shell.append(header);
  const tabs = el("div", null, "admin-tabs");
  for (const [key, label] of [["products","Produtos"],["categories","Categorias"],["settings","Configurações"]]) {
    const button = el("button", label); button.type = "button"; button.dataset.tab = key; button.setAttribute("aria-pressed", String(admin.tab === key)); tabs.append(button);
  }
  shell.append(tabs);
  root.append(shell);
  return shell;
}
async function ensureAdmin() {
  try { await request("/api/admin/session"); renderAdmin(); }
  catch { renderLogin(); }
}
function renderLogin(error = "") {
  root.replaceChildren();
  const panel = el("section", null, "admin-panel");
  panel.append(el("p", "Área restrita", "eyebrow"), el("h1", "Acesso da loja"), el("p", "Entre com a conta administrativa configurada para este site.", "muted"));
  const form = el("form", null, "admin-form"); form.id = "login-form";
  const emailLabel = el("label", "E-mail"); const email = document.createElement("input"); email.type = "email"; email.name = "email"; email.required = true; email.autocomplete = "username"; emailLabel.append(email);
  const passLabel = el("label", "Senha"); const password = document.createElement("input"); password.type = "password"; password.name = "password"; password.required = true; password.autocomplete = "current-password"; passLabel.append(password);
  const message = el("p", error, "error"); message.id = "login-message"; message.setAttribute("role", "alert");
  const submit = el("button", "Entrar", "button button-dark"); submit.type = "submit";
  form.append(emailLabel, passLabel, message, submit); form.addEventListener("submit", loginSubmit);
  const back = el("a", "← Voltar para a loja", "back-link"); back.href = "/";
  panel.append(form, back); root.append(panel);
}
async function loginSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.querySelector("#login-message");
  try { await request("/api/admin/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) }); renderAdmin(); }
  catch (error) { message.textContent = error.message; }
}
async function renderAdmin() {
  const shell = adminShell();
  const content = el("section", null, "admin-content"); shell.append(content);
  if (admin.tab === "products") await renderProducts(content);
  if (admin.tab === "categories") await renderCategories(content);
  if (admin.tab === "settings") await renderSettings(content);
}
async function renderProducts(content) {
  const toolbar = el("div", null, "section-heading");
  toolbar.append(el("h2", "Produtos"));
  const add = el("button", "Novo produto", "button button-dark"); add.type = "button"; add.dataset.newProduct = "true"; toolbar.append(add); content.append(toolbar);
  const rows = await request("/api/admin/products");
  const wrap = el("div", null, "admin-table-wrap"); const table = el("table", null, "admin-table");
  const head = el("thead"); const tr = el("tr");
  for (const label of ["Produto","Categoria","Qtd.","Compra","Venda","Status","Ações"]) tr.append(el("th",label));
  head.append(tr); table.append(head); const body = el("tbody");
  for (const p of rows) {
    const row = el("tr");
    row.append(el("td",p.name),el("td",p.category),el("td",String(p.quantity)),el("td",money(p.purchasePriceCents)),el("td",money(p.priceCents)),el("td",p.active?"Ativo":"Oculto"));
    const actions=el("td",null,"admin-actions");
    const edit=el("button","Editar"); edit.type="button"; edit.dataset.editProduct=String(p.id);
    const toggle=el("button",p.active?"Ocultar":"Ativar"); toggle.type="button"; toggle.dataset.toggleProduct=String(p.id);
    actions.append(edit,toggle); row.append(actions); body.append(row);
  }
  table.append(body); wrap.append(table); content.append(wrap);
  if(admin.product) productEditor(content,admin.product);
}
async function productEditor(content, product = null) {
  const panel=el("section",null,"admin-panel"); panel.append(el("h2",product?"Editar produto":"Novo produto"));
  const form=el("form",null,"admin-form"); form.id="product-form"; form.enctype="multipart/form-data";
  const fields=[
    ["name","Nome","text",product?.name ?? ""],["description","Descrição","textarea",product?.description ?? ""],
    ["category","Categoria","text",product?.category ?? ""],["quantity","Quantidade","number",String(product?.quantity ?? 0)],
    ["purchasePrice","Preço de compra (interno)","number",product?(product.purchasePriceCents/100).toFixed(2):"0.00"],
    ["salePrice","Preço de venda","number",product?(product.priceCents/100).toFixed(2):""]
  ];
  for(const [name,label,type,value] of fields) {
    const wrapper=el("label",label); let input;
    if(type==="textarea") input=document.createElement("textarea");
    else {input=document.createElement("input");input.type=type;if(type==="number"){input.step="1";if(name.includes("Price"))input.step="0.01";if(name==="quantity")input.min="0";}}
    input.name=name; input.value=value; input.required=["name","category","salePrice"].includes(name);
    if(name==="description") input.maxLength=2000;
    wrapper.append(input);form.append(wrapper);
  }
  const imageLabel=el("label","Foto do produto (JPEG, PNG ou WebP; até 5 MB)");
  const image=document.createElement("input");image.type="file";image.name="image";image.accept="image/jpeg,image/png,image/webp";imageLabel.append(image);form.append(imageLabel);
  for(const [name,label,checked] of [["isActive","Visível na loja",product?.active ?? true],["isFeatured","Destacar",product?.featured ?? false]]) {
    const wrapper=el("label",null,"check");const input=document.createElement("input");input.type="checkbox";input.name=name;input.value="true";input.checked=checked;
    wrapper.append(input,document.createTextNode(label));form.append(wrapper);
  }
  const status=el("p","","form-message");status.id="product-message";
  const actions=el("div",null,"admin-actions");const save=el("button","Salvar","button button-dark");save.type="submit";
  const cancel=el("button","Cancelar");cancel.type="button";cancel.dataset.cancelEditor="true";actions.append(save,cancel);
  form.append(status,actions);form.addEventListener("submit",saveProduct);panel.append(form);content.append(panel);
}
async function saveProduct(event) {
  event.preventDefault();
  const form=event.currentTarget;const data=new FormData(form);
  for(const key of ["isActive","isFeatured"]) if(!form.elements[key].checked)data.set(key,"false");
  const id=admin.product?.id;
  try { await request(id?"/api/admin/products/"+id:"/api/admin/products",{method:id?"PUT":"POST",body:data});admin.product=null;await renderAdmin(); }
  catch(error){document.querySelector("#product-message").textContent=error.message;}
}
async function renderCategories(content) {
  const panel=el("section",null,"admin-panel");panel.append(el("h2","Categorias"));
  const form=el("form",null,"admin-form");form.id="category-form";
  const label=el("label","Nome da categoria");const input=document.createElement("input");input.name="name";input.required=true;input.maxLength=80;label.append(input);
  const status=el("p","","form-message");status.id="category-message";
  const save=el("button","Adicionar categoria","button button-dark");save.type="submit";
  form.append(label,status,save);form.addEventListener("submit",addCategory);panel.append(form);content.append(panel);
  const items=await request("/api/admin/categories");const wrap=el("div",null,"admin-table-wrap");const table=el("table",null,"admin-table");
  const body=el("tbody");
  for(const c of items){const row=el("tr");row.append(el("td",c.name),el("td",c.active?"Ativa":"Oculta"));
    const cell=el("td",null,"admin-actions");const toggle=el("button",c.active?"Ocultar":"Ativar");toggle.type="button";toggle.dataset.toggleCategory=String(c.id);cell.append(toggle);row.append(cell);body.append(row);}
  table.append(body);wrap.append(table);content.append(wrap);
}
async function addCategory(event) {
  event.preventDefault();const data=new FormData(event.currentTarget);
  try{await request("/api/admin/categories",{method:"POST",body:JSON.stringify({name:data.get("name")})});admin.tab="categories";await renderAdmin();}
  catch(error){document.querySelector("#category-message").textContent=error.message;}
}
async function renderSettings(content) {
  const settings=await request("/api/admin/settings");const panel=el("section",null,"admin-panel");panel.append(el("h2","Identidade da loja"));
  const form=el("form",null,"admin-form");form.id="settings-form";
  const fields=[["storeName","Nome da loja"],["whatsapp","WhatsApp (+5511999999999)"],["instagramUrl","Instagram (URL HTTPS)"],["serviceRegion","Região atendida"],["presentation","Apresentação"],["deliveryMethods","Formas de entrega"],["paymentMethods","Formas de pagamento"]];
  for(const [key,label] of fields){const wrapper=el("label",label);let input;
    if(["presentation","deliveryMethods","paymentMethods"].includes(key))input=document.createElement("textarea");else input=document.createElement("input");
    input.name=key;input.value=settings[key]||"";if(key==="storeName")input.required=true;wrapper.append(input);form.append(wrapper);}
  const message=el("p","","form-message");message.id="settings-message";const save=el("button","Salvar configurações","button button-dark");save.type="submit";
  form.append(message,save);form.addEventListener("submit",saveSettings);panel.append(form);content.append(panel);
}
async function saveSettings(event) {
  event.preventDefault();const data=new FormData(event.currentTarget);const values=Object.fromEntries(data.entries());
  try{await request("/api/admin/settings",{method:"PUT",body:JSON.stringify(values)});document.querySelector("#settings-message").textContent="Configurações salvas.";}
  catch(error){document.querySelector("#settings-message").textContent=error.message;}
}

document.addEventListener("click",async event=>{
  const tab=event.target.closest("[data-tab]");
  if(tab){admin.tab=tab.dataset.tab;admin.product=null;await renderAdmin();return;}
  if(event.target.closest("[data-logout]")){await request("/api/admin/logout",{method:"POST"});renderLogin();return;}
  if(event.target.closest("[data-new-product]")){admin.product=null;await renderAdmin();await productEditor(document.querySelector(".admin-content"));return;}
  const edit=event.target.closest("[data-edit-product]");
  if(edit){const rows=await request("/api/admin/products");admin.product=rows.find(p=>p.id===Number(edit.dataset.editProduct));await renderAdmin();return;}
  if(event.target.closest("[data-cancel-editor]")){admin.product=null;await renderAdmin();return;}
  const toggle=event.target.closest("[data-toggle-product]");
  if(toggle){await request("/api/admin/products/"+toggle.dataset.toggleProduct+"/status",{method:"POST"});await renderAdmin();return;}
  const category=event.target.closest("[data-toggle-category]");
  if(category){await request("/api/admin/categories/"+category.dataset.toggleCategory,{method:"POST"});await renderAdmin();}
});

async function start() {
  if(location.pathname.startsWith("/admin")) return ensureAdmin();
  try { await loadCatalog(); }
  catch(error) { root.replaceChildren(el("p",error.message,"error")); }
}
start();
