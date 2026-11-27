import test from "node:test";
import assert from "node:assert/strict";
import worker, { escapeHtml, parseMoneyCents, publicProduct, slugify, validateProductInput } from "../src/worker.js";

test("slugify removes accents and normalizes separators", () => {
  assert.equal(slugify("  Proteção Solar & Corpo  "), "protecao-solar-corpo");
});

test("HTML metadata escapes user supplied text", () => {
  assert.equal(escapeHtml(`<script a='"'>&`), "&lt;script a=&#39;&quot;&#39;&gt;&amp;");
});

test("prices convert to integer cents without floating point", () => {
  assert.equal(parseMoneyCents("19,90"), 1990);
  assert.equal(parseMoneyCents("0", { allowZero: true }), 0);
  assert.equal(parseMoneyCents("0"), null);
  assert.equal(parseMoneyCents("1000000.00", { allowZero: true }), null);
  assert.equal(parseMoneyCents("1.999"), null);
});

test("product validation enforces public/admin field bounds", () => {
  const valid = validateProductInput({
    name: "Hidratante", description: "Toque suave", category: "Cuidados",
    quantity: "2", purchasePrice: "10,00", salePrice: "19,90", isActive: "true", isFeatured: "false"
  });
  assert.equal(valid.value.salePriceCents, 1990);
  assert.equal(valid.value.purchasePriceCents, 1000);
  assert.equal(validateProductInput({ name: "", category: "Cuidados", quantity: 0, purchasePrice: "0", salePrice: "2" }).error !== undefined, true);
});

test("public product contract hides purchase cost and exact stock", () => {
  const product = publicProduct({
    id: 7, name: "Creme", description: "", category: "Cuidados", quantity: 18,
    purchase_price_cents: 550, sale_price_cents: 1299, image_key: "aa-bb.jpg", is_featured: 1
  });
  assert.deepEqual(product, {
    id: 7, name: "Creme", description: "", category: "Cuidados", priceCents: 1299,
    imageUrl: "/media/aa-bb.jpg", available: true, featured: true
  });
  assert.equal("quantity" in product, false);
  assert.equal("purchasePriceCents" in product, false);
});

test("admin route serves the storefront shell for client-side administration", async () => {
  let requestedPath = "";
  const env = { ASSETS: { fetch: async request => {
    requestedPath = new URL(request.url).pathname;
    return new Response("store shell", { headers: { "Content-Type": "text/html" } });
  } } };
  const response = await worker.fetch(new Request("https://shop.example/admin"), env, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.equal(requestedPath, "/");
  assert.equal(await response.text(), "store shell");
});
