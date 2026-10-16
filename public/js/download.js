(function () {
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  const id = location.pathname.split('/').pop();
  const body = document.getElementById('body');
  const alertBox = document.getElementById('alert');

  const fmtSize = (b) =>
    b < 1024 ? b + ' o'
    : b < 1048576 ? (b / 1024).toFixed(1) + ' Ko'
    : (b / 1048576).toFixed(1) + ' Mo';

  const fmtDate = (t) =>
    new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  async function load() {
    const res = await fetch('/api/files/meta/' + encodeURIComponent(id));
    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      body.innerHTML = '';
      alertBox.innerHTML =
        '<div class="alert alert-error">' +
        escapeHtml(data.error || 'Lien indisponible.') +
        '</div>';
      return;
    }

    const f = data.file;

    body.innerHTML = `
      <div class="card">
        <h2 style="margin:0 0 .35rem">${escapeHtml(f.original_name)}</h2>
        <p class="muted" style="font-family:var(--font-mono);font-size:.85rem;margin:0 0 1rem">
          ${fmtSize(f.size)} · ${escapeHtml(f.mime || 'application/octet-stream')}
          ${f.expires_at ? ' · expire le ' + fmtDate(f.expires_at) : ''}
        </p>
        ${
          f.protected
            ? `
              <div class="form-group">
                <label for="pw">Mot de passe du fichier</label>
                <input type="password" id="pw" autocomplete="off">
              </div>`
            : ''
        }
        <button class="btn btn-accent" id="dl">Télécharger</button>
      </div>
    `;

    document.getElementById('dl').addEventListener('click', download);
  }

  async function download() {
    const pwEl = document.getElementById('pw');
    const payload = pwEl ? { password: pwEl.value } : {};

    alertBox.innerHTML = '';

    const btn = document.getElementById('dl');
    const prev = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Préparation…';

    const res = await fetch('/api/files/download/' + encodeURIComponent(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let msg = 'Téléchargement impossible.';
      try {
        msg = (await res.json()).error || msg;
      } catch {}
      alertBox.innerHTML = '<div class="alert alert-error">' + escapeHtml(msg) + '</div>';
      btn.disabled = false;
      btn.textContent = prev;
      return;
    }

    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const name = m ? decodeURIComponent(m[1]) : 'fichier';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();

    btn.disabled = false;
    btn.textContent = 'Télécharger à nouveau';
  }

  load();
})();