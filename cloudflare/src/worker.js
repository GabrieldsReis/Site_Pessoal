const PASSWORD_ITERATIONS = 120_000;
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const fail = (status, message) => json({ error: message }, status);
const bool = value => value === true || value === 1;
const integer = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0;

export function slugify(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
export function publicProduct(row) {
  return {
    id: Number(row.id), name: row.name, description: row.description, category: row.category,
    priceCents: Number(row.sale_price_cents), imageUrl: row.image_key ? "/media/" + encodeURIComponent(row.image_key) : null,
    available: Number(row.quantity) > 0, featured: bool(row.is_featured)
  };
}
export function parseMoneyCents(value, { allowZero = false } = {}) {
  const input = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 99_999_999 && (allowZero || cents > 0) ? cents : null;
}
export function validateProductInput(input) {
  const name = String(input?.name ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const category = String(input?.category ?? "").trim();
  const quantity = Number(input?.quantity);
  const purchasePriceCents = parseMoneyCents(input?.purchasePrice, { allowZero: true });
  const salePriceCents = parseMoneyCents(input?.salePrice);
  if (!name || name.length > 120) return { error: "Informe o nome do produto (até 120 caracteres)." };
  if (description.length > 2000) return { error: "A descrição pode ter até 2.000 caracteres." };
  if (!category || category.length > 80) return { error: "Informe uma categoria (até 80 caracteres)." };
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2_147_483_647) return { error: "A quantidade deve ser um inteiro não negativo." };
  if (purchasePriceCents === null) return { error: "Informe um preço de compra válido." };
  if (salePriceCents === null) return { error: "Informe um preço de venda válido maior que zero." };
  return { value: { name, description, category, quantity, purchasePriceCents, salePriceCents,
    isActive: input?.isActive !== false && input?.isActive !== "false",
    isFeatured: input?.isFeatured === true || input?.isFeatured === "true" } };
}

function headersFor(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}
function cookieValue(request, name) {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}
function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
const hex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
const fromHex = value => Uint8Array.from(value.match(/.{2}/g) ?? [], pair => Number.parseInt(pair, 16));

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return new Uint8Array(bits);
}
async function constantEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function signSession(email, env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET is not configured");
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    email, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    nonce: base64Url(crypto.getRandomValues(new Uint8Array(16)))
  })));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return payload + "." + base64Url(signature);
}
async function sessionEmail(request, env) {
  const [payload, signature, extra] = cookieValue(request, "estoqueweb_session").split(".");
  if (!payload || !signature || extra || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), new TextEncoder().encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return typeof data.email === "string" && data.exp >= Math.floor(Date.now() / 1000) ? data.email : null;
  } catch { return null; }
}
const sessionCookie = token => "estoqueweb_session=" + token + "; Path=/; Max-Age=" + SESSION_SECONDS + "; HttpOnly; Secure; SameSite=Strict";
const clearSessionCookie = () => "estoqueweb_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict";
async function requireAdmin(request, env) {
  const email = await sessionEmail(request, env);
  if (!email) return { response: fail(401, "Entre para acessar a administração.") };
  const user = await env.DB.prepare("SELECT email FROM admin_users WHERE id = 1 AND email = ?").bind(email).first();
  return user ? { email } : { response: fail(401, "Sessão administrativa inválida.") };
}
async function fingerprint(request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))));
}
async function loginLock(request, env) {
  const key = await fingerprint(request);
  const row = await env.DB.prepare("SELECT failures, window_started, locked_until FROM login_attempts WHERE fingerprint = ?").bind(key).first();
  const now = Math.floor(Date.now() / 1000);
  if (row && Number(row.locked_until) > now) return { key, locked: true };
  if (!row || now - Number(row.window_started) > 900 || Number(row.locked_until) > 0) {
    await env.DB.prepare("DELETE FROM login_attempts WHERE fingerprint = ?").bind(key).run();
    return { key, failures: 0, locked: false };
  }
  return { key, failures: Number(row.failures), locked: false };
}
async function recordFailure(key, env) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("INSERT INTO login_attempts (fingerprint, failures, window_started, locked_until) VALUES (?, 1, ?, 0) " +
    "ON CONFLICT(fingerprint) DO UPDATE SET failures = CASE WHEN ? - window_started > 900 THEN 1 ELSE failures + 1 END, " +
    "window_started = CASE WHEN ? - window_started > 900 THEN ? ELSE window_started END, " +
    "locked_until = CASE WHEN (CASE WHEN ? - window_started > 900 THEN 1 ELSE failures + 1 END) >= 5 THEN ? + 900 ELSE 0 END")
    .bind(key, now, now, now, now, now, now).run();
}
async function bootstrapAdmin(env) {
  if (await env.DB.prepare("SELECT id FROM admin_users WHERE id = 1").first()) return;
  const email = String(env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = String(env.BOOTSTRAP_ADMIN_PASSWORD ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await env.DB.prepare("INSERT OR IGNORE INTO admin_users (id, email, password_salt, password_hash) VALUES (1, ?, ?, ?)")
    .bind(email, hex(salt), hex(await passwordHash(password, salt))).run();
}
async function adminLogin(request, env) {
  if (!sameOrigin(request)) return fail(403, "Origem inválida.");
  const lock = await loginLock(request, env);
  if (lock.locked) return fail(429, "Muitas tentativas. Aguarde 15 minutos e tente novamente.");
  let body;
  try { body = await request.json(); } catch { return fail(400, "Dados de login inválidos."); }
  if (typeof body?.email !== "string" || typeof body?.password !== "string" || body.password.length > 256) return fail(400, "Informe e-mail e senha.");
  await bootstrapAdmin(env);
  const row = await env.DB.prepare("SELECT email, password_salt, password_hash FROM admin_users WHERE id = 1").first();
  let valid = false;
  if (row) {
    const hash = await passwordHash(body.password, fromHex(row.password_salt));
    valid = body.email.trim().toLowerCase() === row.email && await constantEqual(hash, fromHex(row.password_hash));
  }
  if (!valid) { await recordFailure(lock.key, env); return fail(401, "E-mail ou senha inválidos."); }
  await env.DB.prepare("DELETE FROM login_attempts WHERE fingerprint = ?").bind(lock.key).run();
  return json({ ok: true, email: row.email }, 200, { "Set-Cookie": sessionCookie(await signSession(row.email, env)) });
}

const PUBLIC_SQL = "SELECT id, name, description, category, quantity, sale_price_cents, image_key, is_featured FROM products WHERE is_active = 1";
const ADMIN_SQL = "SELECT id, name, description, category, category_id, quantity, purchase_price_cents, sale_price_cents, image_key, is_active, is_featured, updated_at FROM products";
function adminProduct(row) {
  return { ...publicProduct(row), quantity: Number(row.quantity), purchasePriceCents: Number(row.purchase_price_cents),
    active: bool(row.is_active), categoryId: row.category_id == null ? null : Number(row.category_id), updatedAt: row.updated_at };
}
async function publicSettings(env) {
  const row = await env.DB.prepare("SELECT store_name, whatsapp, instagram_url, service_region, presentation, delivery_methods, payment_methods FROM store_settings WHERE id = 1").first();
  return { storeName: row?.store_name ?? "Minha loja", whatsapp: row?.whatsapp ?? "", instagramUrl: row?.instagram_url ?? "",
    serviceRegion: row?.service_region ?? "", presentation: row?.presentation ?? "", deliveryMethods: row?.delivery_methods ?? "", paymentMethods: row?.payment_methods ?? "" };
}
async function publicCatalog(url, env) {
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
  const category = (url.searchParams.get("category") ?? "").trim().slice(0, 80);
  const clauses = [], values = [];
  if (search) { clauses.push("(name LIKE ? OR description LIKE ?)"); values.push("%" + search + "%", "%" + search + "%"); }
  if (category) { clauses.push("category = ?"); values.push(category); }
  const sql = PUBLIC_SQL + (clauses.length ? " AND " + clauses.join(" AND ") : "") + " ORDER BY is_featured DESC, name LIMIT 200";
  const [products, categoryRows, settings] = await Promise.all([
    env.DB.prepare(sql).bind(...values).all(),
    env.DB.prepare("SELECT name FROM categories WHERE is_active = 1 ORDER BY display_order, name").all(),
    publicSettings(env)
  ]);
  const used = await env.DB.prepare("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category").all();
  const categories = [...new Set([...(categoryRows.results ?? []).map(r => r.name), ...(used.results ?? []).map(r => r.category)])].sort((a,b) => a.localeCompare(b, "pt-BR"));
  return json({ products: (products.results ?? []).map(publicProduct), categories, settings });
}
function validateSettings(input) {
  const value = {
    storeName: String(input?.storeName ?? "").trim(), whatsapp: String(input?.whatsapp ?? "").trim(),
    instagramUrl: String(input?.instagramUrl ?? "").trim(), serviceRegion: String(input?.serviceRegion ?? "").trim(),
    presentation: String(input?.presentation ?? "").trim(), deliveryMethods: String(input?.deliveryMethods ?? "").trim(),
    paymentMethods: String(input?.paymentMethods ?? "").trim()
  };
  if (!value.storeName || value.storeName.length > 120) return { error: "Informe um nome de loja de até 120 caracteres." };
  if (value.whatsapp && !/^\+[1-9]\d{7,14}$/.test(value.whatsapp)) return { error: "Use WhatsApp em formato internacional." };
  if (value.instagramUrl && (!/^https:\/\//i.test(value.instagramUrl) || value.instagramUrl.length > 300)) return { error: "Informe uma URL HTTPS válida." };
  if (value.serviceRegion.length > 200 || value.presentation.length > 1000 || value.deliveryMethods.length > 300 || value.paymentMethods.length > 300) return { error: "Um campo excedeu o tamanho máximo." };
  return { value };
}
async function parseProduct(request) {
  let form;
  try { form = await request.formData(); } catch { return { error: "Formulário inválido." }; }
  const result = validateProductInput({
    name: form.get("name"), description: form.get("description"), category: form.get("category"),
    quantity: form.get("quantity"), purchasePrice: form.get("purchasePrice"), salePrice: form.get("salePrice"),
    isActive: form.get("isActive"), isFeatured: form.get("isFeatured")
  });
  if (result.error) return result;
  const image = form.get("image");
  return { value: result.value, image: image instanceof File && image.size ? image : null };
}
async function saveImage(file, env) {
  if (!env.IMAGES || file.size > MAX_UPLOAD_BYTES) throw new Error("Configure R2 e use uma imagem de até 5 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ext = file.name.toLowerCase().split(".").at(-1);
  let mime;
  if (["jpg","jpeg"].includes(ext) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = "image/jpeg";
  else if (ext === "png" && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) mime = "image/png";
  else if (ext === "webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") mime = "image/webp";
  if (!mime) throw new Error("Use JPEG, PNG ou WebP válida.");
  const key = crypto.randomUUID() + "." + ext;
  const max = Math.max(1, Math.min(Number(env.MAX_IMAGE_STORAGE_BYTES) || 8_589_934_592, 9_500_000_000));
  const reserved = await env.DB.prepare("INSERT INTO images (object_key,size_bytes,content_type) SELECT ?,?,? WHERE COALESCE((SELECT SUM(size_bytes) FROM images),0)+?<=?")
    .bind(key,file.size,mime,file.size,max).run();
  if (!reserved.meta?.changes) throw new Error("Limite gratuito de imagens atingido.");
  if (!await reserveR2Operation(env)) {
    await env.DB.prepare("DELETE FROM images WHERE object_key=?").bind(key).run();
    throw new Error("Limite mensal gratuito de operações de imagem atingido.");
  }
  try {
    await env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" } });
    return key;
  } catch (error) {
    await env.DB.prepare("DELETE FROM images WHERE object_key=?").bind(key).run();
    throw error;
  }
}
async function reserveR2Operation(env) {
  const result = await env.DB.prepare("INSERT INTO r2_monthly_operations(month,operations) VALUES(strftime('%Y-%m','now'),1) " +
    "ON CONFLICT(month) DO UPDATE SET operations=operations+1 WHERE operations<10000").run();
  return Boolean(result.meta?.changes);
}
async function removeImage(key, env) {
  if (!key) return;
  try {
    if (!await reserveR2Operation(env)) { console.warn("R2 monthly operation cap reached; keeping old image"); return; }
    await env.IMAGES.delete(key); await env.DB.prepare("DELETE FROM images WHERE object_key=?").bind(key).run();
  }
  catch (error) { console.error("R2 image cleanup failed", error?.name ?? "Error"); }
}
async function productList(request, env) {
  const q = new URL(request.url).searchParams.get("search") ?? "";
  const rows = q
    ? await env.DB.prepare(ADMIN_SQL + " WHERE name LIKE ? OR category LIKE ? ORDER BY name LIMIT 200").bind("%"+q.slice(0,120)+"%","%"+q.slice(0,120)+"%").all()
    : await env.DB.prepare(ADMIN_SQL + " ORDER BY name LIMIT 200").all();
  return json((rows.results ?? []).map(adminProduct));
}
async function categoryIdFor(name, env) {
  const slug = slugify(name);
  if (!slug) return null;
  await env.DB.prepare("INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)").bind(name,slug).run();
  await env.DB.prepare("UPDATE categories SET is_active=1 WHERE name=?").bind(name).run();
  return env.DB.prepare("SELECT id FROM categories WHERE name=?").bind(name).first();
}
async function createProduct(request, env) {
  const parsed = await parseProduct(request);
  if (parsed.error) return fail(400, parsed.error);
  const p = parsed.value;
  const category = await categoryIdFor(p.category,env);
  const result = await env.DB.prepare("INSERT INTO products(name,description,category,category_id,quantity,purchase_price_cents,sale_price_cents,is_active,is_featured) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(p.name,p.description,p.category,category?.id ?? null,p.quantity,p.purchasePriceCents,p.salePriceCents,Number(p.isActive),Number(p.isFeatured)).run();
  let key = null;
  try {
    if (parsed.image) key = await saveImage(parsed.image, env);
    if (key) await env.DB.prepare("UPDATE products SET image_key=? WHERE id=?").bind(key,result.meta.last_row_id).run();
  } catch(error) {
    await env.DB.prepare("DELETE FROM products WHERE id=?").bind(result.meta.last_row_id).run();
    if(key) await removeImage(key,env);
    return fail(400,error.message || "Não foi possível salvar.");
  }
  return json({ id: result.meta.last_row_id }, 201);
}
async function updateProduct(request, env, id) {
  const parsed = await parseProduct(request);
  if (parsed.error) return fail(400, parsed.error);
  const old = await env.DB.prepare("SELECT image_key FROM products WHERE id=?").bind(id).first();
  if (!old) return fail(404,"Produto não encontrado.");
  const p = parsed.value;
  const category = await categoryIdFor(p.category,env);
  let key = old.image_key;
  try {
    if(parsed.image) key = await saveImage(parsed.image,env);
    const r = await env.DB.prepare("UPDATE products SET name=?,description=?,category=?,category_id=?,quantity=?,purchase_price_cents=?,sale_price_cents=?,image_key=?,is_active=?,is_featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(p.name,p.description,p.category,category?.id ?? null,p.quantity,p.purchasePriceCents,p.salePriceCents,key,Number(p.isActive),Number(p.isFeatured),id).run();
    if(!r.meta?.changes) throw new Error("Produto não encontrado.");
  } catch(error) {
    if(parsed.image && key !== old.image_key) await removeImage(key,env);
    return fail(400,error.message || "Não foi possível atualizar.");
  }
  if(old.image_key && key !== old.image_key) await removeImage(old.image_key,env);
  return json({ok:true});
}
async function categories(env) {
  const rows = await env.DB.prepare("SELECT id,name,slug,is_active,display_order FROM categories ORDER BY display_order,name").all();
  return json((rows.results ?? []).map(r => ({id:Number(r.id),name:r.name,slug:r.slug,active:bool(r.is_active),order:Number(r.display_order)})));
}
async function saveCategory(request, env, id = null) {
  let body;
  try { body = await request.json(); } catch { return fail(400,"Dados de categoria inválidos."); }
  const name = String(body?.name ?? "").trim(), slug = slugify(name), order = Number(body?.order) || 0;
  if(!name || name.length>80 || !slug) return fail(400,"Informe uma categoria válida.");
  try {
    if(id === null) {
      const r = await env.DB.prepare("INSERT INTO categories(name,slug,display_order) VALUES(?,?,?)").bind(name,slug,order).run();
      return json({id:r.meta.last_row_id},201);
    }
    if(!await env.DB.prepare("SELECT id FROM categories WHERE id=?").bind(id).first()) return fail(404,"Categoria não encontrada.");
    await env.DB.batch([
      env.DB.prepare("UPDATE categories SET name=?,slug=?,display_order=? WHERE id=?").bind(name,slug,order,id),
      env.DB.prepare("UPDATE products SET category=?,updated_at=CURRENT_TIMESTAMP WHERE category_id=?").bind(name,id)
    ]);
    return json({ok:true});
  } catch(e) { return String(e?.message).includes("UNIQUE") ? fail(409,"Nome de categoria já usado.") : fail(400,"Não foi possível salvar."); }
}

async function validateCart(request, env) {
  let items;
  try { items = await request.json(); } catch { return fail(400,"Carrinho inválido."); }
  if(!Array.isArray(items) || items.length>100 || items.some(item => !item || !integer(item.id) || Number(item.id)<1 || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity)<1 || Number(item.quantity)>99)) return fail(400,"Carrinho inválido.");
  items = items.map(item => ({id:Number(item.id),quantity:Number(item.quantity)}));
  const uniqueIds = [...new Set(items.map(item => item.id))];
  if(uniqueIds.length!==items.length) return fail(400,"Carrinho inválido.");
  const quantities = new Map(items.map(item => [item.id,item.quantity]));
  if(!uniqueIds.length) return json([]);
  const rows = await env.DB.prepare("SELECT id,name,sale_price_cents,quantity,is_active FROM products WHERE id IN ("+uniqueIds.map(()=>"?").join(",")+")").bind(...uniqueIds).all();
  return json((rows.results ?? []).map(r => ({id:Number(r.id),name:r.name,priceCents:Number(r.sale_price_cents),available:Number(r.quantity)>0,enoughQuantity:Number(r.quantity)>=quantities.get(Number(r.id)),active:bool(r.is_active)})));
}
async function serveImage(request, env, ctx, key) {
  if(!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(key)) return fail(404,"Imagem não encontrada.");
  const cached = await caches.default.match(request);
  if(cached) return cached;
  const object = await env.IMAGES.get(key);
  if(!object) return fail(404,"Imagem não encontrada.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag",object.httpEtag);
  headers.set("Cache-Control","public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options","nosniff");
  headers.set("Content-Security-Policy","default-src 'none'; sandbox");
  const response = new Response(request.method==="HEAD" ? null : object.body,{headers});
  if(request.method==="GET") ctx.waitUntil(caches.default.put(request,response.clone()));
  return response;
}
async function detailPage(request, env, id) {
  const product = await env.DB.prepare(PUBLIC_SQL+" AND id=?").bind(id).first();
  if(!product) return fail(404,"Produto não encontrado.");
  const settings = await publicSettings(env), url = new URL(request.url);
  const canonical = url.origin+"/produto/"+id;
  const title = escapeHtml(product.name+" · "+settings.storeName);
  const description = escapeHtml(product.description || "Consulte preço e disponibilidade deste produto com a loja.");
  const image = product.image_key ? url.origin+"/media/"+encodeURIComponent(product.image_key) : url.origin+"/og-default.svg";
  const meta = '<link rel="canonical" href="'+escapeHtml(canonical)+'"><meta property="og:type" content="product">'+
    '<meta property="og:url" content="'+escapeHtml(canonical)+'"><meta property="og:title" content="'+title+'">'+
    '<meta property="og:description" content="'+description+'"><meta property="og:image" content="'+escapeHtml(image)+'">'+
    '<meta name="twitter:card" content="summary_large_image">';
  const template = await env.ASSETS.fetch(new Request(new URL("/",request.url)));
  const html = (await template.text()).replace(/<title>.*?<\/title>/,"<title>"+title+"</title>")
    .replace("<!-- PRODUCT_METADATA -->",meta).replace("<body>",'<body data-product-id="'+Number(id)+'">');
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
async function adminApi(request, env, path, method) {
  if(path==="/api/admin/login" && method==="POST") return adminLogin(request,env);
  if(path.startsWith("/api/admin/") && ["POST","PUT","PATCH","DELETE"].includes(method) && !sameOrigin(request)) return fail(403,"Origem inválida.");
  const auth = await requireAdmin(request,env);
  if(auth.response) return auth.response;
  if(path==="/api/admin/session" && method==="GET") return json({email:auth.email});
  if(path==="/api/admin/logout" && method==="POST") return json({ok:true},200,{"Set-Cookie":clearSessionCookie()});
  if(path==="/api/admin/settings" && method==="GET") return json(await publicSettings(env));
  if(path==="/api/admin/settings" && method==="PUT") {
    let body; try { body=await request.json(); } catch { return fail(400,"Configurações inválidas."); }
    const valid=validateSettings(body); if(valid.error) return fail(400,valid.error);
    const s=valid.value;
    await env.DB.prepare("UPDATE store_settings SET store_name=?,whatsapp=?,instagram_url=?,service_region=?,presentation=?,delivery_methods=?,payment_methods=?,updated_at=CURRENT_TIMESTAMP WHERE id=1")
      .bind(s.storeName,s.whatsapp,s.instagramUrl,s.serviceRegion,s.presentation,s.deliveryMethods,s.paymentMethods).run();
    return json({ok:true});
  }
  if(path==="/api/admin/products" && method==="GET") return productList(request,env);
  if(path==="/api/admin/products" && method==="POST") return createProduct(request,env);
  const product=path.match(/^\/api\/admin\/products\/(\d+)$/);
  if(product && method==="PUT") return updateProduct(request,env,Number(product[1]));
  const productStatus=path.match(/^\/api\/admin\/products\/(\d+)\/status$/);
  if(productStatus && method==="POST") {
    const result=await env.DB.prepare("UPDATE products SET is_active=CASE is_active WHEN 1 THEN 0 ELSE 1 END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(productStatus[1])).run();
    return result.meta?.changes ? json({ok:true}) : fail(404,"Produto não encontrado.");
  }
  if(path==="/api/admin/categories" && method==="GET") return categories(env);
  if(path==="/api/admin/categories" && method==="POST") return saveCategory(request,env);
  const cat=path.match(/^\/api\/admin\/categories\/(\d+)$/);
  if(cat && method==="PUT") return saveCategory(request,env,Number(cat[1]));
  if(cat && method==="POST") {
    const result=await env.DB.prepare("UPDATE categories SET is_active=CASE is_active WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(Number(cat[1])).run();
    return result.meta?.changes ? json({ok:true}) : fail(404,"Categoria não encontrada.");
  }
  return fail(404,"Rota da API não encontrada.");
}
async function api(request, env, ctx, url) {
  const path=url.pathname, method=request.method;
  if(path==="/api/health" && method==="GET") {
    await env.DB.prepare("SELECT 1 AS ok").first();
    return json({ok:true,imagesConnected:Boolean(env.IMAGES)});
  }
  if(path==="/api/catalog" && method==="GET") return publicCatalog(url,env);
  const publicDetail=path.match(/^\/api\/product\/(\d+)$/);
  if(publicDetail && method==="GET") {
    const product=await env.DB.prepare(PUBLIC_SQL+" AND id=?").bind(Number(publicDetail[1])).first();
    return product ? json(publicProduct(product)) : fail(404,"Produto não encontrado.");
  }
  if(path==="/api/cart/validate" && method==="POST") return validateCart(request,env);
  if(path.startsWith("/api/admin/")) return adminApi(request,env,path,method);
  return fail(404,"Rota da API não encontrada.");
}
export default {
  async fetch(request, env, ctx) {
    try {
      const url=new URL(request.url);
      let response;
      if(url.pathname.startsWith("/api/")) response=await api(request,env,ctx,url);
      else if(url.pathname.startsWith("/media/")) {
        response=(request.method==="GET" || request.method==="HEAD")
          ? await serveImage(request,env,ctx,decodeURIComponent(url.pathname.slice(7))) : fail(405,"Método não permitido.");
      } else {
        const match=url.pathname.match(/^\/produto\/(\d+)\/?$/);
        if(match && request.method==="GET") response=await detailPage(request,env,Number(match[1]));
        else if(/^\/admin\/?$/.test(url.pathname) && request.method==="GET") response=await env.ASSETS.fetch(new Request(new URL("/",request.url),request));
        else response=await env.ASSETS.fetch(request);
      }
      return headersFor(response);
    } catch(error) {
      console.error("Worker request failed",error?.name ?? "Error");
      return headersFor(fail(500,"Não foi possível concluir a solicitação agora."));
    }
  }
};
