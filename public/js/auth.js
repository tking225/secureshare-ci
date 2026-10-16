(function () {
  function setAlert(msg, type) {
    const el = document.getElementById('alert');
    if (!el) return;
    if (!msg) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="alert alert-${type || 'error'}">${msg}</div>`;
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> ' + (label || 'Patientez…');
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(data.error || 'Une erreur est survenue.');
    }
    return data;
  }

  function initRegister() {
    const form = document.getElementById('form');
    const btn = document.getElementById('submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setAlert('');

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;

      if (!name || !email || !password) {
        setAlert('Tous les champs sont requis.');
        return;
      }
      if (password.length < 8) {
        setAlert('Mot de passe trop court (8 caractères minimum).');
        return;
      }

      busy(btn, true, 'Création…');

      try {
        await post('/api/auth/register', { name, email, password });
        window.location.href = '/dashboard.html';
      } catch (err) {
        setAlert(err.message);
        busy(btn, false);
      }
    });
  }

  function initLogin() {
    const form = document.getElementById('form');
    const btn = document.getElementById('submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setAlert('');

      const email = form.email.value.trim();
      const password = form.password.value;

      if (!email || !password) {
        setAlert('Tous les champs sont requis.');
        return;
      }

      busy(btn, true, 'Connexion…');

      try {
        await post('/api/auth/login', { email, password });
        window.location.href = '/dashboard.html';
      } catch (err) {
        setAlert(err.message);
        busy(btn, false);
      }
    });
  }

  window.SSAuth = { initRegister, initLogin };
})();