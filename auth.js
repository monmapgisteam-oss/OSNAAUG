(function () {
  var PORTAL_URL = "https://arcgis.ubhub.mn/arcgis";
  var SHARING_URL = PORTAL_URL + "/sharing";
  var SHARING_REST_URL = SHARING_URL + "/rest";
  var APP_ID = "53Ux12bg81g14CfE";
  var KEY = "gis_session";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function save(u) {
    localStorage.setItem(KEY, JSON.stringify(u));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = value || "";
  }

  function getDisplayName(u) {
    u = u || {};
    return [u.lastName, u.firstName].filter(Boolean).join(" ") || u.name || u.username || "";
  }

  function splitName(name) {
    var parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      return { lastName: "", firstName: parts[0] || "" };
    }

    return {
      lastName: parts[0],
      firstName: parts.slice(1).join(" ")
    };
  }

  function setUser(u) {
    u = u || {};
    setText("user-name", getDisplayName(u) || "ArcGIS хэрэглэгч");
    setText("user-position", u.position || "ArcGIS Enterprise");

    var img = byId("user-photo");
    var fb = byId("user-photo-fallback");
    if (!img) return;

    img.src = u.photo || "";
    img.style.display = u.photo ? "block" : "none";
    if (fb) fb.style.display = u.photo ? "none" : "flex";
  }

  function showApp() {
    var overlay = byId("login-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function loadApp() {
    if (document.querySelector('script[data-app-main="true"]')) return;

    var script = document.createElement("script");
    script.src = "app.js";
    script.dataset.appMain = "true";
    document.body.appendChild(script);
  }

  function showLogin() {
    var dd = byId("profile-dropdown");
    var overlay = byId("login-overlay");
    var err = byId("login-error");
    var username = byId("login-username");
    var password = byId("login-password");

    if (dd) dd.classList.remove("open");
    if (overlay) overlay.style.display = "flex";
    if (err) err.textContent = "";
    if (username) username.value = "";
    if (password) password.value = "";
  }

  function setLoginError(message) {
    var err = byId("login-error");
    if (err) err.textContent = message || "";
  }

  function getLoginValue(id) {
    var el = byId(id);
    return el ? el.value.trim() : "";
  }

  function credentialToUser(credential) {
    var existing = load() || {};
    return {
      username: credential.userId,
      lastName: existing.lastName || "",
      firstName: existing.firstName || "",
      name: getDisplayName(existing) || credential.userId || "ArcGIS хэрэглэгч",
      position: existing.position || "ArcGIS Enterprise",
      photo: existing.photo || ""
    };
  }

  function finishLogin(credential) {
    console.log("Login success:", credential);
    var user = credentialToUser(credential);
    save(user);
    setUser(user);
    showApp();
    loadApp();
  }

  function tokenToCredential(tokenInfo, username) {
    return {
      userId: username,
      token: tokenInfo.token,
      expires: tokenInfo.expires,
      ssl: tokenInfo.ssl
    };
  }

  require([
    "esri/identity/OAuthInfo",
    "esri/identity/IdentityManager"
  ], function (OAuthInfo, esriId) {
    var info = new OAuthInfo({
      appId: APP_ID,
      portalUrl: PORTAL_URL,
      popup: true
    });

    esriId.registerOAuthInfos([info]);

    function loginWithOAuth() {
      setLoginError("");
      return esriId.getCredential(SHARING_URL)
        .then(finishLogin)
        .catch(function (error) {
          console.error("Login error:", error);
          setLoginError("ArcGIS Enterprise login амжилтгүй боллоо.");
          alert("ArcGIS Enterprise login амжилтгүй боллоо.");
        });
    }

    function loginWithPassword(username, password) {
      var body = new URLSearchParams();
      body.set("username", username);
      body.set("password", password);
      body.set("client", "referer");
      body.set("referer", window.location.origin && window.location.origin !== "null" ? window.location.origin : window.location.href);
      body.set("expiration", "120");
      body.set("f", "json");

      return fetch(SHARING_REST_URL + "/generateToken", {
        method: "POST",
        body: body
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (tokenInfo) {
          if (!tokenInfo || !tokenInfo.token) {
            throw tokenInfo && tokenInfo.error ? tokenInfo.error : new Error("Token авахад алдаа гарлаа.");
          }

          esriId.registerToken({
            server: SHARING_REST_URL,
            token: tokenInfo.token,
            userId: username,
            expires: tokenInfo.expires,
            ssl: tokenInfo.ssl
          });

          finishLogin(tokenToCredential(tokenInfo, username));
        })
        .catch(function (error) {
          console.error("Login error:", error);
          var message = error && error.message ? error.message : "Нэвтрэх нэр эсвэл нууц үг буруу байна.";
          setLoginError(message);
        });
    }

    window.loginWithArcGIS = function () {
      var username = getLoginValue("login-username");
      var password = getLoginValue("login-password");

      setLoginError("");
      if (username && password) {
        return loginWithPassword(username, password);
      }

      return loginWithOAuth();
    };

    window.logoutArcGIS = function () {
      clear();
      esriId.destroyCredentials();
      location.reload();
    };

    esriId.checkSignInStatus(SHARING_URL)
      .then(finishLogin)
      .catch(function () {
        var session = load();
        if (session) {
          clear();
        }
        showLogin();
      });

    var loginBtn = byId("login-btn");
    if (loginBtn) {
      loginBtn.textContent = "ArcGIS Enterprise-р нэвтрэх";
      loginBtn.addEventListener("click", window.loginWithArcGIS);
    }

    var username = byId("login-username");
    var password = byId("login-password");
    if (username) {
      username.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.loginWithArcGIS();
      });
    }
    if (password) {
      password.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.loginWithArcGIS();
      });
    }

    var logoutBtn = byId("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.logoutArcGIS();
      });
    }
  });

  var profile = byId("user-profile");
  if (profile) {
    profile.addEventListener("click", function (e) {
      e.stopPropagation();
      var dd = byId("profile-dropdown");
      if (dd) dd.classList.toggle("open");
    });
  }

  document.addEventListener("click", function () {
    var dd = byId("profile-dropdown");
    if (dd) dd.classList.remove("open");
  });

  var userPhoto = byId("user-photo");
  if (userPhoto) {
    userPhoto.addEventListener("error", function () {
      this.style.display = "none";
      var fb = byId("user-photo-fallback");
      if (fb) fb.style.display = "flex";
    });
  }

  var pendingPhoto = null;

  function openProfileModal() {
    var dropdown = byId("profile-dropdown");
    if (dropdown) dropdown.classList.remove("open");

    var s = load() || {};
    var names = {
      lastName: s.lastName || "",
      firstName: s.firstName || ""
    };
    if (!names.lastName && !names.firstName) {
      names = splitName(s.name || s.username || "");
    }
    var position = s.position || "";
    var photo = s.photo || "";

    var lastNameInput = byId("pm-last-name");
    var firstNameInput = byId("pm-first-name");
    var positionInput = byId("pm-position");
    if (lastNameInput) lastNameInput.value = names.lastName;
    if (firstNameInput) firstNameInput.value = names.firstName;
    if (positionInput) positionInput.value = position;
    pendingPhoto = null;

    var preview = byId("pm-photo-preview");
    var fallback = byId("pm-photo-fallback");
    if (preview && fallback) {
      if (photo) {
        preview.src = photo;
        preview.style.display = "block";
        fallback.style.display = "none";
      } else {
        preview.src = "";
        preview.style.display = "none";
        fallback.style.display = "flex";
      }
    }

    var overlay = byId("profile-overlay");
    if (overlay) overlay.classList.add("visible");
  }

  function closeProfileModal() {
    var overlay = byId("profile-overlay");
    if (overlay) overlay.classList.remove("visible");
    pendingPhoto = null;
  }

  var profileInfoItem = document.querySelector(".dropdown-item:first-child");
  if (profileInfoItem) {
    profileInfoItem.addEventListener("click", function (e) {
      e.stopPropagation();
      openProfileModal();
    });
  }

  var pmClose = byId("pm-close");
  var pmCancel = byId("pm-cancel");
  var profileOverlay = byId("profile-overlay");
  if (pmClose) pmClose.addEventListener("click", closeProfileModal);
  if (pmCancel) pmCancel.addEventListener("click", closeProfileModal);
  if (profileOverlay) {
    profileOverlay.addEventListener("click", function (e) {
      if (e.target === this) closeProfileModal();
    });
  }

  var photoInput = byId("pm-photo-input");
  if (photoInput) {
    photoInput.addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        pendingPhoto = e.target.result;
        var preview = byId("pm-photo-preview");
        var fallback = byId("pm-photo-fallback");
        if (preview) {
          preview.src = pendingPhoto;
          preview.style.display = "block";
        }
        if (fallback) fallback.style.display = "none";
      };
      reader.readAsDataURL(file);
    });
  }

  var photoPreview = byId("pm-photo-preview");
  if (photoPreview) {
    photoPreview.addEventListener("error", function () {
      this.style.display = "none";
      var fallback = byId("pm-photo-fallback");
      if (fallback) fallback.style.display = "flex";
    });
  }

  var pmSave = byId("pm-save");
  if (pmSave) {
    pmSave.addEventListener("click", function () {
      var lastNameInput = byId("pm-last-name");
      var firstNameInput = byId("pm-first-name");
      var positionInput = byId("pm-position");
      var lastName = lastNameInput ? lastNameInput.value.trim() : "";
      var firstName = firstNameInput ? firstNameInput.value.trim() : "";
      var position = positionInput ? positionInput.value.trim() : "";
      if (!firstName) {
        if (firstNameInput) firstNameInput.focus();
        return;
      }

      var s = load() || {};
      s.lastName = lastName;
      s.firstName = firstName;
      s.name = getDisplayName(s);
      s.position = position;
      if (pendingPhoto) s.photo = pendingPhoto;
      save(s);
      setUser(s);
      closeProfileModal();
    });
  }
})();
