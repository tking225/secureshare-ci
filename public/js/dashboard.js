(function () {
  const $ = (id) => document.getElementById(id);

  function setAlert(msg, type) {
    const el = $('alert');
    if (!el) return;
    if (!msg) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="alert alert-${type || 'error'}">${msg}</div>`;
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function timeLeft(expiresAt) {
    if (!expiresAt) return null;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'expiré';
    const h = Math.floor(diff / 3600000);
    if (h < 1) return Math.ceil(diff / 60000) + ' min';
    if (h < 24) return h + ' h';
    return Math.floor(h / 24) + ' j';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  async function guard() {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = '/login.html';
      return null;
    }
    const { user } = await res.json();
    $('who').textContent = user.name + ' · ' + user.email;
    return user;
  }

  async function loadFiles() {
    const el = $('list');
    try {
      const res = await fetch('/api/files', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Impossible de charger la liste.');
      const { files } = await res.json();

      if (!files.length) {
        el.innerHTML =
          '<div class="empty">Aucun fichier pour l\'instant. Le premier que vous enverrez apparaîtra ici.</div>';
        return;
      }

      const ul = document.createElement('ul');
      ul.className = 'file-list';

      for (const f of files) {
        const li = document.createElement('li');
        li.className = 'file-item';

        const left = timeLeft(f.expires_at);
        const badges = [];

        if (f.protected) badges.push('<span class="badge">protégé</span>');

        if (left === 'expiré') {
          badges.push('<span class="badge badge-exp">expiré</span>');
        } else if (left) {
          badges.push(`<span class="badge">expire dans ${left}</span>`);
        }

        if (f.max_downloads) {
          badges.push(`<span class="badge">${f.downloads}/${f.max_downloads} téléchargements</span>`);
        } else {
          badges.push(`<span class="badge">${f.downloads} téléchargements</span>`);
        }

        li.innerHTML = `
          <div>
            <div class="name">${escapeHtml(f.original_name)}</div>
            <div class="meta">
              <span>${fmtSize(f.size)}</span>
              <span>déposé le ${fmtDate(f.created_at)}</span>
              <span class="mono">/d/${f.id}</span>
            </div>
            <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap">${badges.join('')}</div>
          </div>
          <div class="actions">
            <button class="btn btn-ghost" data-copy="${f.id}">Copier le lien</button>
            <button class="btn btn-danger" data-del="${f.id}">Supprimer</button>
          </div>
        `;
        ul.appendChild(li);
      }

      el.innerHTML = '';
      el.appendChild(ul);

      el.querySelectorAll('[data-copy]').forEach((b) => {
        b.addEventListener('click', async () => {
          const url = location.origin + '/d/' + b.dataset.copy;
          try {
            await navigator.clipboard.writeText(url);
            b.textContent = 'Copié';
            setTimeout(() => (b.textContent = 'Copier le lien'), 1500);
          } catch {
            prompt('Copiez le lien :', url);
          }
        });
      });

      el.querySelectorAll('[data-del]').forEach((b) => {
        b.addEventListener('click', async () => {
          if (!confirm('Supprimer définitivement ce fichier ?')) return;
          const res = await fetch('/api/files/' + b.dataset.del, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (res.ok) {
            loadFiles();
          } else {
            setAlert('Suppression impossible.');
          }
        });
      });
    } catch (e) {
      el.innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
    }
  }

  function initUpload() {
    const form = $('uploadForm');
    const btn = $('uploadBtn');
    const prog = $('progress');
    const bar = $('bar');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setAlert('');

      const fileInput = $('file');
      if (!fileInput.files.length) {
        setAlert('Choisissez un fichier.');
        return;
      }

      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('expiresIn', $('expiresIn').value);
      if ($('maxDownloads').value) fd.append('maxDownloads', $('maxDownloads').value);
      if ($('password').value) fd.append('password', $('password').value);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files');
      xhr.withCredentials = true;

      btn.disabled = true;
      const prev = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Envoi…';
      prog.hidden = false;
      bar.style.width = '0%';

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          bar.style.width = Math.round((ev.loaded / ev.total) * 100) + '%';
        }
      };

      xhr.onload = () => {
        btn.disabled = false;
        btn.textContent = prev;
        prog.hidden = true;

        if (xhr.status >= 200 && xhr.status < 300) {
          let data = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch {}

          const url = location.origin + (data.url || '/d/' + data.id);

          $('result').innerHTML = `
            <div class="alert alert-ok" style="margin-top:1rem">
              Lien prêt : <a href="${url}">${url}</a>
              <div style="margin-top:.5rem">
                <button class="btn btn-ghost" id="copyRes" type="button">Copier</button>
              </div>
            </div>
          `;

          $('copyRes').addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(url);
              $('copyRes').textContent = 'Copié';
            } catch {
              prompt('Copiez le lien :', url);
            }
          });

          form.reset();
          loadFiles();
        } else {
          let msg = "Échec de l'envoi.";
          try {
            msg = JSON.parse(xhr.responseText).error || msg;
          } catch {}
          setAlert(msg);
        }
      };

      xhr.onerror = () => {
        btn.disabled = false;
        btn.textContent = prev;
        prog.hidden = true;
        setAlert("Erreur réseau pendant l'envoi.");
      };

      xhr.send(fd);
    });
  }

  $('logout').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/';
  });

  (async () => {
    const u = await guard();
    if (!u) return;
    initUpload();
    loadFiles();
  })();
})();