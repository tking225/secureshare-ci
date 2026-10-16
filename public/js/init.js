(function () {
  const y = document.getElementById('y');
  if (y) {
    y.textContent = new Date().getFullYear();
  }

  const page = document.body.dataset.page;
  if (!page) return;

  if (page === 'login' && window.SSAuth) {
    window.SSAuth.initLogin();
  } else if (page === 'register' && window.SSAuth) {
    window.SSAuth.initRegister();
  }
})();