const names = [];

function saveName() {
  const input = document.getElementById('nameInput');
  const newNames = input.value.split(/[,，]\s*/).map(n => n.trim()).filter(Boolean);
  if (!newNames.length) return;
  names.push(...newNames);
  input.value = '';
  document.getElementById('namesList').innerHTML = names.map(n => `<span class="name-tag">${n}</span>`).join('');
  document.querySelectorAll('.item').forEach(renderChecks);
}

document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveName();
});

function renderChecks(item) {
  let checks = item.querySelector('.checks');
  const prev = {};
  if (checks) {
    checks.querySelectorAll('input').forEach(cb => { prev[cb.value] = cb.checked; });
  } else {
    checks = document.createElement('div');
    checks.className = 'checks';
    item.appendChild(checks);
  }
  checks.innerHTML = names.map(n =>
    `<label><input type="checkbox" value="${n}"${prev[n] ? ' checked' : ''}> ${n}</label>`
  ).join('');
  checks.querySelectorAll('input').forEach(cb => cb.addEventListener('change', updateSummary));
}

function addRow() {
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `<div class="row">
    <input type="text" placeholder="Item name">
    <span class="dollar-input"><input type="text" class="amount" placeholder="0.00"></span>
  </div>`;
  constrainAmount(item.querySelector('.amount'));
  item.querySelector('.amount').addEventListener('input', updateSummary);
  renderChecks(item);
  document.getElementById('list').appendChild(item);
}

function constrainAmount(el) {
  el.addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9.]/g, '');
    const parts = this.value.split('.');
    if (parts.length > 2) this.value = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]?.length > 2) this.value = parts[0] + '.' + parts[1].slice(0, 2);
  });
}

let total = null;

function saveTotal() {
  const input = document.getElementById('totalInput');
  const val = parseFloat(input.value);
  if (isNaN(val)) return;
  total = val;
  document.getElementById('savedTotal').innerHTML = `<span class="name-tag">$${total.toFixed(2)}</span>`;
  updateSummary();
}

constrainAmount(document.getElementById('totalInput'));
document.getElementById('totalInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveTotal();
});

function updateSummary() {
  const totals = {};
  names.forEach(n => { totals[n] = 0; });
  let rawTotal = 0;

  document.querySelectorAll('.item').forEach(item => {
    const cents = Math.round((parseFloat(item.querySelector('.amount').value) || 0) * 100);
    rawTotal += cents;
    const checked = [...item.querySelectorAll('.checks input:checked')].map(cb => cb.value);
    if (!checked.length) return;
    const base = Math.floor(cents / checked.length);
    let remainder = cents - base * checked.length;
    checked.forEach(n => {
      totals[n] += base + (remainder > 0 ? 1 : 0);
      remainder--;
    });
  });

  const rawDollars = (rawTotal / 100).toFixed(2);
  let html = `<p>Raw total: <strong>$${rawDollars}</strong></p>`;
  if (names.length && rawTotal > 0) {
    html += '<table><tr><th>Name</th><th>Raw Amount</th><th>% of Raw Total</th>';
    if (total !== null) html += '<th>Amount after tax/tip/discount</th>';
    html += '</tr>';
    const multiplier = (total !== null && rawTotal > 0) ? (total * 100) / rawTotal : null;

    // Calculate adjusted amounts with penny distribution
    let adjustedCents = null;    if (multiplier !== null) {
      const totalCents = Math.round(total * 100);
      adjustedCents = {};
      let assigned = 0;
      const rawAmts = names.map(n => ({ n, raw: totals[n], adj: totals[n] * multiplier }));
      rawAmts.forEach(r => {
        r.floor = Math.floor(r.adj);
        r.frac = r.adj - r.floor;
        assigned += r.floor;
      });
      let leftover = totalCents - assigned;
      rawAmts.sort((a, b) => b.frac - a.frac);
      rawAmts.forEach(r => {
        adjustedCents[r.n] = r.floor + (leftover > 0 ? 1 : 0);
        leftover--;
      });
    }

    names.forEach(n => {
      const amt = (totals[n] / 100).toFixed(2);
      const pct = ((totals[n] / rawTotal) * 100).toFixed(1);
      html += `<tr><td>${n}</td><td>$${amt}</td><td>${pct}%</td>`;
      if (adjustedCents !== null) html += `<td>$${(adjustedCents[n] / 100).toFixed(2)}</td>`;
      html += '</tr>';
    });
    html += '</table>';
  }
  document.getElementById('summary').innerHTML = html;
}
