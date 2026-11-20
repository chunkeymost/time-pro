/* Login page — Time Pro */
(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var usernameInput = document.getElementById('login-username');
  var passwordInput = document.getElementById('login-password');
  var submitBtn = document.getElementById('login-submit');
  var banner = document.getElementById('auth-banner');
  var rememberInput = document.getElementById('remember-me');
  var togglePasswordBtn = document.getElementById('toggle-password');
  var togglePasswordIcon = document.getElementById('toggle-password-icon');
  var capsWarning = document.getElementById('caps-warning');
  var themeToggle = document.getElementById('auth-theme-toggle');
  var themeIcon = document.getElementById('auth-theme-icon');
  var yearEl = document.getElementById('auth-year');

  var isSubmitting = false;

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Banner ---------- */

  function showBanner(message, type) {
    if (!banner) return;
    banner.className = 'auth-banner ' + (type || 'info');
    banner.textContent = message;
    banner.hidden = false;
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    banner.textContent = '';
  }

  (function initBannerFromUrl() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('expired')) {
      showBanner('Sesi Anda berakhir. Silakan login kembali.', 'info');
    } else if (params.has('logout')) {
      showBanner('Anda telah keluar dari aplikasi.', 'success');
    }
  })();

  /* ---------- Theme ---------- */

  function syncThemeIcon() {
    if (!themeIcon) return;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeIcon.className = isDark ? 'bi bi-sun' : 'bi bi-moon';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (_) {}
    syncThemeIcon();
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }
  syncThemeIcon();

  /* ---------- Password visibility ---------- */

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function () {
      var isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-pressed', String(isHidden));
      togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
      if (togglePasswordIcon) {
        togglePasswordIcon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
      }
      passwordInput.focus();
    });
  }

  /* ---------- Caps lock indicator ---------- */

  function updateCapsLock(event) {
    if (!capsWarning || !passwordInput) return;
    var isOn = false;
    if (event && typeof event.getModifierState === 'function') {
      isOn = event.getModifierState('CapsLock');
    }
    capsWarning.hidden = !(isOn && document.activeElement === passwordInput);
  }

  passwordInput.addEventListener('keydown', updateCapsLock);
  passwordInput.addEventListener('keyup', updateCapsLock);
  passwordInput.addEventListener('blur', function () {
    if (capsWarning) capsWarning.hidden = true;
  });

  /* ---------- Submit state ---------- */

  function setLoading(loading) {
    isSubmitting = loading;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.setAttribute('aria-busy', String(loading));
  }

  function redirectToApp() {
    window.location.replace('/');
  }

  /* ---------- Already logged in? ---------- */

  (function checkExistingSession() {
    fetch('/api/auth/me', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.ok) redirectToApp();
      })
      .catch(function () {
        /* offline / server belum siap: biarkan form tampil */
      });
  })();

  /* ---------- Login ---------- */

  function readErrorMessage(res, data) {
    if (res.status === 401) return 'Username atau password salah.';
    if (res.status === 429) {
      if (data && data.error) return data.error;
      return 'Terlalu banyak percobaan login. Coba lagi beberapa saat.';
    }
    if (data && data.error) return data.error;
    return 'Login gagal. Silakan coba lagi.';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    hideBanner();

    var username = usernameInput.value.trim();
    var password = passwordInput.value;

    if (!username) {
      showBanner('Username wajib diisi.', 'error');
      usernameInput.focus();
      return;
    }
    if (!password) {
      showBanner('Password wajib diisi.', 'error');
      passwordInput.focus();
      return;
    }

    setLoading(true);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: username,
        password: password,
        remember: !!(rememberInput && rememberInput.checked),
      }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var message = readErrorMessage(res, data);
              if (res.status === 429) {
                var retry = data && Number(data.retryAfterSeconds);
                if (retry > 0) {
                  message += ' (sekitar ' + Math.max(1, Math.ceil(retry / 60)) + ' menit)';
                }
              }
              var error = new Error(message);
              error.handled = true;
              throw error;
            }
            return data;
          });
      })
      .then(function () {
        redirectToApp();
      })
      .catch(function (error) {
        if (navigator.onLine === false) {
          showBanner('Tidak ada koneksi internet. Periksa jaringan Anda.', 'error');
        } else if (error && error.handled) {
          showBanner(error.message, 'error');
        } else {
          showBanner('Tidak dapat menghubungi server. Pastikan backend berjalan.', 'error');
        }
        setLoading(false);
        passwordInput.select();
      });
  });

  /* ---------- Small UX ---------- */

  usernameInput.addEventListener('input', function () {
    if (!banner.hidden) hideBanner();
  });
  passwordInput.addEventListener('input', function () {
    if (!banner.hidden) hideBanner();
  });
})();
