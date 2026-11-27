(() => {
  const CART_KEY = 'estoqueweb-cart-v1';
  const catalogNode = document.getElementById('cart-catalog');
  let catalog = [];
  try { catalog = catalogNode ? JSON.parse(catalogNode.textContent) : []; } catch { catalog = []; }
  const productMap = new Map(catalog.map(p => [Number(p.id), { ...p, id: Number(p.id), available: Boolean(p.disponivel), price: Number(p.precoVenda) }]));
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch { cart = {}; }
  let removedStaleItem = false;
  Object.keys(cart).forEach(id => { if (!productMap.has(Number(id))) { delete cart[id]; removedStaleItem = true; } });
  if (removedStaleItem) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const dialog = document.getElementById('cart-dialog');
  const lines = document.getElementById('cart-lines');
  const message = document.getElementById('cart-message');
  const emptyState = document.getElementById('cart-empty');
  const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const persist = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  function render() {
    let count = 0, total = 0;
    if (!lines) return;
    if (removedStaleItem && message) { message.textContent = 'Um produto removido ou desativado foi retirado da sacola.'; removedStaleItem = false; }
    lines.replaceChildren();
    Object.entries(cart).forEach(([rawId, rawQty]) => {
      const p = productMap.get(Number(rawId)), qty = Math.max(1, Math.min(99, Number(rawQty) || 1));
      if (!p) return;
      count += qty; total += p.price * qty;
      const row = document.createElement('div'); row.className = 'cart-line';
      const info = document.createElement('div'); const name = document.createElement('div'); name.className = 'cart-line-name'; name.textContent = p.nome;
      const meta = document.createElement('div'); meta.className = 'cart-line-meta'; meta.textContent = `${money(p.price)} cada · subtotal ${money(p.price * qty)}`; info.append(name, meta);
      const controls = document.createElement('div'); controls.className = 'cart-line-actions';
      [[-1, '−'], [1, '+']].forEach(([delta, label]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', `${delta < 0 ? 'Diminuir' : 'Aumentar'} ${p.nome}`); b.onclick = () => change(p.id, delta); controls.append(b); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remover ${p.nome}`); remove.onclick = () => { delete cart[p.id]; persist(); render(); }; controls.append(remove); row.append(info, controls); lines.append(row);
    });
    const countNode = document.getElementById('cart-count'); if (countNode) countNode.textContent = String(count);
    if (emptyState) emptyState.hidden = count > 0;
    const totalNode = document.getElementById('cart-total'); if (totalNode) totalNode.textContent = money(total);
    const checkout = document.getElementById('checkout'); if (checkout) checkout.disabled = !count || !window.storeSettings?.phone;
  }
  function change(id, delta) { const p = productMap.get(id); if (!p) return; const qty = Number(cart[id] || 0) + delta; if (delta > 0 && !p.available) { message.textContent = 'Este produto está esgotado.'; return; } if (qty <= 0) delete cart[id]; else cart[id] = Math.min(99, qty); persist(); render(); }
  document.querySelectorAll('.add-to-cart').forEach(button => button.addEventListener('click', event => { const id = Number(event.currentTarget.closest('[data-product-id]').dataset.productId); change(id, 1); if (dialog && !dialog.open) dialog.showModal(); }));
  document.getElementById('open-cart')?.addEventListener('click', () => dialog?.showModal());
  document.getElementById('close-cart')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  document.getElementById('checkout')?.addEventListener('click', async () => {
    const status = message; status.textContent = 'Conferindo disponibilidade…';
    try {
      const token = document.querySelector('#cart-token input[name="__RequestVerificationToken"]')?.value;
      const response = await fetch('/Home/ValidarCarrinho', { method: 'POST', headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': token }, body: JSON.stringify(Object.keys(cart).map(Number)) });
      if (!response.ok) throw new Error();
      const current = await response.json();
      let unavailableRemoved = false;
      for (const id of Object.keys(cart)) { const p = current.find(x => x.id === Number(id)); if (!p || !p.isActive || !p.disponivel) { delete cart[id]; productMap.delete(Number(id)); unavailableRemoved = true; } else { const local = productMap.get(Number(id)); local.price = p.precoVenda; local.nome = p.nome; } }
      persist(); render();
      if (unavailableRemoved) { status.textContent = 'Um ou mais itens ficaram indisponíveis e foram removidos. Revise a sacola antes de continuar.'; return; }
      if (!Object.keys(cart).length) { status.textContent = 'Um ou mais itens ficaram indisponíveis. Revise sua sacola.'; return; }
      const fmt = n => money(n);
      const entries = Object.entries(cart).map(([id, qty]) => { const p = productMap.get(Number(id)); return `• ${p.nome} — ${qty} × ${fmt(p.price)} = ${fmt(p.price * qty)}`; });
      const total = Object.entries(cart).reduce((sum, [id, qty]) => sum + productMap.get(Number(id)).price * qty, 0);
      const text = `Olá! Gostaria de consultar este pedido:\n\n${entries.join('\n')}\n\nTotal estimado: ${fmt(total)}\n\nPor favor, confirme disponibilidade, preço final e opções de entrega. Sei que o envio desta mensagem não reserva os produtos.`;
      const phone = String(window.storeSettings.phone).replace(/\D/g, ''); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); status.textContent = 'Seu WhatsApp foi aberto. Revise e envie a mensagem por lá.';
    } catch { status.textContent = 'Não foi possível conferir agora. Tente novamente em instantes.'; }
  });
  render();
})();
