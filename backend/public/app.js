const consentSection = document.getElementById("consent-section");
const mainSection = document.getElementById("main-section");
const consentCheckbox = document.getElementById("consent-checkbox");
const acceptConsentBtn = document.getElementById("accept-consent");

const duelTab = document.getElementById("duel-tab");
const uploadTab = document.getElementById("upload-tab");
const myPhotosTab = document.getElementById("my-photos-tab");
const rankingsTab = document.getElementById("rankings-tab");
const revokeTab = document.getElementById("revoke-tab");
const adminTab = document.getElementById("admin-tab");
const authTab = document.getElementById("auth-tab");

const myPhotosTabBtn = document.getElementById("my-photos-tab-btn");

const duelMessage = document.getElementById("duel-message");

const faceAImg = document.getElementById("face-a-img");
const faceBImg = document.getElementById("face-b-img");
const voteABtn = document.getElementById("vote-a");
const voteBBtn = document.getElementById("vote-b");
const skipDuelBtn = document.getElementById("skip-duel");
const duelGenderSelect = document.getElementById("duel-gender");

const duelModeAiBtn = document.getElementById("duel-mode-ai");
const duelModeRealBtn = document.getElementById("duel-mode-real");
const duelAiPanel = document.getElementById("duel-ai-panel");
const duelAiCta = document.getElementById("duel-ai-cta");
const duelRealPanel = document.getElementById("duel-real-panel");
const duelRealLocked = document.getElementById("duel-real-locked");
const duelRealUnlocked = document.getElementById("duel-real-unlocked");
const guestCtaRegisterBtn = document.getElementById("guest-cta-register");
const guestCtaLoginBtn = document.getElementById("guest-cta-login");
const realCtaLoginBtn = document.getElementById("real-cta-login");
const realCtaRegisterBtn = document.getElementById("real-cta-register");
const duelRankingsList = document.getElementById("duel-rankings-list");
const challengeList = document.getElementById("challenge-list");
const openRankingsBtn = document.getElementById("open-rankings");

const uploadForm = document.getElementById("upload-form");
const uploadTypeSelect = document.getElementById("upload-type");
const uploadFileInput = document.getElementById("upload-file-input");
const uploadPreviewContainer = document.getElementById("upload-preview-container");
const uploadPreview = document.getElementById("upload-preview");
const realConsentBlock = document.getElementById("real-consent-block");
const aiConsentBlock = document.getElementById("ai-consent-block");
const uploadResult = document.getElementById("upload-result");

const myPhotosList = document.getElementById("my-photos-list");
const myPhotosMsg = document.getElementById("my-photos-msg");

const rankingsList = document.getElementById("rankings-list");

const revokeForm = document.getElementById("revoke-form");
const revokeTokenInput = document.getElementById("revoke-token");
const revokeResult = document.getElementById("revoke-result");

// User Auth Elements
const authButtonsDiv = document.getElementById("auth-buttons");
const loginBtn = document.getElementById("login-btn");
const registerHeaderBtn = document.getElementById("register-header-btn");
const logoutBtn = document.getElementById("logout-btn");
const usernameDisplay = document.getElementById("username-display");

const userLoginForm = document.getElementById("user-login-form");
const userRegisterForm = document.getElementById("user-register-form");
const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const goToRegisterBtn = document.getElementById("go-to-register");
const goToLoginBtn = document.getElementById("go-to-login");

// Forgot Password Elements
const forgotPasswordView = document.getElementById("forgot-password-view");
const resetPasswordView = document.getElementById("reset-password-view");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const resetPasswordForm = document.getElementById("reset-password-form");
const goToForgotBtn = document.getElementById("go-to-forgot");
const backToLoginBtn = document.getElementById("back-to-login");
const forgotEmailInput = document.getElementById("forgot-email");
const forgotMessage = document.getElementById("forgot-message");
const resetTokenInput = document.getElementById("reset-token");
const resetNewPasswordInput = document.getElementById("reset-new-password");
const resetMessage = document.getElementById("reset-message");

// Admin Elements
const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginMsg = document.getElementById("admin-login-msg");
const adminLoginView = document.getElementById("admin-login-view");
const adminDashboardView = document.getElementById("admin-dashboard-view");
const adminLogoutBtn = document.getElementById("admin-logout");
const refreshReportsBtn = document.getElementById("refresh-reports");
const reportsList = document.getElementById("reports-list");
const refreshDuelsBtn = document.getElementById("refresh-duels");
const duelsList = document.getElementById("duels-list");
const adminUserInp = document.getElementById("admin-user");
const adminPassInp = document.getElementById("admin-pass");

const reportButton = document.getElementById("report-button");
const reportDialog = document.getElementById("report-dialog");
const reportForm = document.getElementById("report-form");
const reportFaceIdInput = document.getElementById("report-face-id");
const reportReasonInput = document.getElementById("report-reason");
const reportResult = document.getElementById("report-result");
const closeReportButton = document.getElementById("close-report");

let currentMode = "AI";
let currentGender = "male"; 
let currentDuel = null;
let adminToken = localStorage.getItem("adminToken");
let duelRankingsIntervalId = null;

// Check both storages for user token
let userToken = localStorage.getItem("userToken") || sessionStorage.getItem("userToken");
let userName = localStorage.getItem("userName") || sessionStorage.getItem("userName");

function setMessage(el, text, isError) {
  el.textContent = text || "";
  el.classList.toggle("error", !!isError);
}

function setConsentAccepted() {
  localStorage.setItem("facesmashConsentAccepted", "true");
}

function hasConsentAccepted() {
  return localStorage.getItem("facesmashConsentAccepted") === "true";
}

function showMain() {
  consentSection.classList.add("hidden");
  mainSection.classList.remove("hidden");
}

if (hasConsentAccepted()) {
  showMain();
}

consentCheckbox.addEventListener("change", () => {
  acceptConsentBtn.disabled = !consentCheckbox.checked;
});

acceptConsentBtn.addEventListener("click", () => {
  setConsentAccepted();
  showMain();
});

// Auth Logic
function checkUserAuth() {
  if (userToken) {
    usernameDisplay.textContent = `Hola, ${userName}`;
    usernameDisplay.classList.remove("hidden");
    authButtonsDiv.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    
    // Show My Photos tab
    myPhotosTabBtn.classList.remove("hidden");
    if (duelModeRealBtn) {
      duelModeRealBtn.classList.remove("hidden");
    }
    if (duelModeAiBtn && duelModeRealBtn) {
      duelModeAiBtn.classList.remove("active");
      duelModeRealBtn.classList.add("active");
      currentMode = "REAL";
    }
    updateDuelPanels();
    loadDuelRankings();
    loadChallengeList();
    if (!duelRankingsIntervalId) {
      duelRankingsIntervalId = setInterval(() => {
        if (userToken && !duelTab.classList.contains("hidden") && currentMode === "REAL") {
          loadDuelRankings();
        }
      }, 15000);
    }

    logoutBtn.onclick = handleLogout;
  } else {
    usernameDisplay.classList.add("hidden");
    authButtonsDiv.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    // Hide My Photos tab
    myPhotosTabBtn.classList.add("hidden");
    if (duelModeRealBtn) {
      duelModeRealBtn.classList.add("hidden");
    }
    if (duelModeAiBtn) {
      duelModeAiBtn.classList.add("active");
    }
    if (duelModeRealBtn) {
      duelModeRealBtn.classList.remove("active");
      duelModeAiBtn.classList.add("active");
    }
    currentMode = "AI";
    updateDuelPanels();
    if (duelRankingsIntervalId) {
      clearInterval(duelRankingsIntervalId);
      duelRankingsIntervalId = null;
    }

    loginBtn.onclick = () => {
       document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
       hideAllTabs();
       authTab.classList.remove("hidden");
       loginView.classList.remove("hidden");
       registerView.classList.add("hidden");
       forgotPasswordView.classList.add("hidden");
      resetPasswordView.classList.add("hidden");
    };

    registerHeaderBtn.onclick = () => {
       document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
       hideAllTabs();
       authTab.classList.remove("hidden");
       loginView.classList.add("hidden");
       registerView.classList.remove("hidden");
       forgotPasswordView.classList.add("hidden");
       resetPasswordView.classList.add("hidden");
    };
  }
}

function handleLogout() {
  userToken = null;
  userName = null;
  localStorage.removeItem("userToken");
  localStorage.removeItem("userName");
  sessionStorage.removeItem("userToken");
  sessionStorage.removeItem("userName");
  checkUserAuth();
  
  // Redirect if on restricted tab
  if (!uploadTab.classList.contains("hidden") || !myPhotosTab.classList.contains("hidden")) {
     document.querySelector('[data-tab="duel"]').click();
  }
}

function hideAllTabs() {
  [duelTab, uploadTab, myPhotosTab, rankingsTab, revokeTab, adminTab, authTab].forEach(section => {
    section.classList.add("hidden");
  });
}

function updateDuelPanels() {
  if (duelAiPanel && duelRealPanel) {
    if (currentMode === "REAL") {
      duelAiPanel.classList.add("hidden");
      duelRealPanel.classList.remove("hidden");
    } else {
      duelRealPanel.classList.add("hidden");
      duelAiPanel.classList.remove("hidden");
    }
  }

  if (duelAiCta) {
    duelAiCta.classList.toggle("hidden", !!userToken);
  }

  if (duelRealLocked && duelRealUnlocked) {
    if (userToken) {
      duelRealLocked.classList.add("hidden");
      duelRealUnlocked.classList.remove("hidden");
    } else {
      duelRealUnlocked.classList.add("hidden");
      duelRealLocked.classList.remove("hidden");
    }
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.getAttribute("data-tab");
    hideAllTabs();
    
    if (target === "duel") {
      duelTab.classList.remove("hidden");
      updateDuelPanels();
      if (currentMode === "REAL" && userToken) {
        loadDuelRankings();
        loadChallengeList();
      }
      loadDuel();
    }
    if (target === "upload") {
      if (!userToken) {
        alert("Debes iniciar sesión para subir rostros.");
        authTab.classList.remove("hidden");
        tab.classList.remove("active");
        return;
      }
      uploadTab.classList.remove("hidden");
    }
    if (target === "my-photos") {
        if (!userToken) {
            alert("Debes iniciar sesión.");
            authTab.classList.remove("hidden");
            tab.classList.remove("active");
            return;
        }
        myPhotosTab.classList.remove("hidden");
        loadMyPhotos();
    }
    if (target === "rankings") {
      rankingsTab.classList.remove("hidden");
    }
    if (target === "revoke") revokeTab.classList.remove("hidden");
    if (target === "admin") {
       adminTab.classList.remove("hidden");
       checkAdminAuth();
    }
  });
});

goToRegisterBtn.addEventListener("click", (e) => {
  e.preventDefault();
  loginView.classList.add("hidden");
  registerView.classList.remove("hidden");
  forgotPasswordView.classList.add("hidden");
  resetPasswordView.classList.add("hidden");
});

goToLoginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  registerView.classList.add("hidden");
  forgotPasswordView.classList.add("hidden");
  resetPasswordView.classList.add("hidden");
  loginView.classList.remove("hidden");
});

goToForgotBtn.addEventListener("click", (e) => {
    e.preventDefault();
    loginView.classList.add("hidden");
    forgotPasswordView.classList.remove("hidden");
});

backToLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    forgotPasswordView.classList.add("hidden");
    loginView.classList.remove("hidden");
});

userLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("user-login-username").value;
  const password = document.getElementById("user-login-password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, rememberMe })
    });
    const data = await res.json();
    if (data.token) {
      userToken = data.token;
      userName = data.username;
      
      if (rememberMe) {
        localStorage.setItem("userToken", userToken);
        localStorage.setItem("userName", userName);
        sessionStorage.removeItem("userToken");
        sessionStorage.removeItem("userName");
      } else {
        sessionStorage.setItem("userToken", userToken);
        sessionStorage.setItem("userName", userName);
        localStorage.removeItem("userToken");
        localStorage.removeItem("userName");
      }

      checkUserAuth();
      alert("Sesión iniciada");
      document.querySelector('[data-tab="duel"]').click();
    } else {
      alert(data.error || "Login fallido");
    }
  } catch (err) {
    alert("Error de conexión");
  }
});

userRegisterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("user-reg-username").value;
  const email = document.getElementById("user-reg-email").value;
  const password = document.getElementById("user-reg-password").value;
  const captcha = document.getElementById("user-reg-captcha").value;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, captcha })
    });
    const data = await res.json();
    if (data.success) {
      userToken = data.token;
      userName = data.username;
      // Default to sessionStorage for new registration unless we add a checkbox there too
      sessionStorage.setItem("userToken", userToken);
      sessionStorage.setItem("userName", userName);
      
      checkUserAuth();
      alert("Cuenta creada y sesión iniciada");
      document.querySelector('[data-tab="duel"]').click();
    } else {
      alert(data.error || "Registro fallido");
    }
  } catch (err) {
    alert("Error de conexión");
  }
});

forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage(forgotMessage, "Enviando...");
    const email = forgotEmailInput.value;
    try {
        const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(forgotMessage, "Si el correo existe, recibirás un enlace (simulado en consola backend).");
        } else {
            setMessage(forgotMessage, data.error || "Error", true);
        }
    } catch (err) {
        setMessage(forgotMessage, "Error de conexión", true);
    }
});

resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = resetTokenInput.value;
    const newPassword = resetNewPasswordInput.value;
    
    try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(resetMessage, "Contraseña actualizada. Inicia sesión.");
            setTimeout(() => {
                resetPasswordView.classList.add("hidden");
                loginView.classList.remove("hidden");
            }, 2000);
        } else {
            setMessage(resetMessage, data.error || "Error", true);
        }
    } catch (err) {
        setMessage(resetMessage, "Error de conexión", true);
    }
});

// Duel Logic
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const isRankings = btn.getAttribute("data-rankings") === "true";
    const groupSelector = isRankings ? '.mode-btn[data-rankings="true"]' : '.mode-btn:not([data-rankings])';
    document.querySelectorAll(groupSelector).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mode = btn.getAttribute("data-mode");
    if (!isRankings) {
      currentMode = mode;
      updateDuelPanels();
      if (currentMode === "REAL" && userToken) {
        loadDuelRankings();
        loadChallengeList();
      }
      loadDuel();
    } else {
      loadRankings(mode);
    }
  });
});

if (guestCtaRegisterBtn) {
  guestCtaRegisterBtn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    hideAllTabs();
    authTab.classList.remove("hidden");
    loginView.classList.add("hidden");
    registerView.classList.remove("hidden");
    forgotPasswordView.classList.add("hidden");
    resetPasswordView.classList.add("hidden");
  });
}

if (guestCtaLoginBtn) {
  guestCtaLoginBtn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    hideAllTabs();
    authTab.classList.remove("hidden");
    loginView.classList.remove("hidden");
    registerView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    resetPasswordView.classList.add("hidden");
  });
}

if (realCtaLoginBtn) {
  realCtaLoginBtn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    hideAllTabs();
    authTab.classList.remove("hidden");
    loginView.classList.remove("hidden");
    registerView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    resetPasswordView.classList.add("hidden");
  });
}

if (realCtaRegisterBtn) {
  realCtaRegisterBtn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    hideAllTabs();
    authTab.classList.remove("hidden");
    loginView.classList.add("hidden");
    registerView.classList.remove("hidden");
    forgotPasswordView.classList.add("hidden");
    resetPasswordView.classList.add("hidden");
  });
}

if (openRankingsBtn) {
  openRankingsBtn.addEventListener("click", () => {
    document.querySelector('[data-tab="rankings"]').click();
  });
}

duelGenderSelect.addEventListener("change", () => {
  currentGender = duelGenderSelect.value;
  loadDuel();
});

uploadTypeSelect.addEventListener("change", () => {
  const type = uploadTypeSelect.value;
  if (type === "REAL") {
    realConsentBlock.classList.remove("hidden");
    aiConsentBlock.classList.add("hidden");
  } else {
    realConsentBlock.classList.add("hidden");
    aiConsentBlock.classList.remove("hidden");
  }
});

// Upload Preview & Validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

uploadFileInput.addEventListener("change", () => {
    const file = uploadFileInput.files[0];
    setMessage(uploadResult, ""); // Clear previous errors

    if (file) {
        // Validate type
        if (!file.type.startsWith('image/')) {
            setMessage(uploadResult, "El archivo debe ser una imagen.", true);
            uploadFileInput.value = ""; // Clear input
            uploadPreview.src = "";
            uploadPreviewContainer.classList.add("hidden");
            return;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            setMessage(uploadResult, "La imagen no debe superar los 5MB.", true);
            uploadFileInput.value = ""; // Clear input
            uploadPreview.src = "";
            uploadPreviewContainer.classList.add("hidden");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadPreview.src = e.target.result;
            uploadPreviewContainer.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    } else {
        uploadPreview.src = "";
        uploadPreviewContainer.classList.add("hidden");
    }
});

async function loadDuel() {
  setMessage(duelMessage, "");
  currentDuel = null;
  
  if (currentMode === "REAL" && !userToken) {
    setMessage(duelMessage, "Debes iniciar sesión para participar en duelos de personas registradas.", true);
    return;
  }
  
  const genderParam = currentGender ? `&gender=${currentGender}` : '';
  console.log(`Cargando duelo: Modo=${currentMode}, Gender=${currentGender}`);
  
  try {
    const headers = {};
    if (userToken) {
      headers["Authorization"] = `Bearer ${userToken}`;
    }
    const res = await fetch(`/api/faces/duel?category=${encodeURIComponent(currentMode)}${genderParam}`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Error cargando duelo:", data);
      if (res.status === 401 || res.status === 403) {
        setMessage(duelMessage, data.error || "Debes iniciar sesión para acceder a los duelos.", true);
      } else {
        setMessage(duelMessage, data.error || "No se pudo cargar un duelo", true);
      }
      return;
    }
    const data = await res.json();
    console.log("Datos del duelo recibidos:", data);
    
    if (!data.faces || data.faces.length < 2) {
       setMessage(duelMessage, "No hay suficientes perfiles activos que cumplan los requisitos para mostrar un duelo.", true);
       return;
    }

    const [a, b] = data.faces;
    currentDuel = { a, b };
    
    const ensurePath = (p) => p.startsWith('/') ? p : '/' + p;
    
    faceAImg.onload = () => console.log("Face A loaded successfully");
    faceAImg.onerror = (e) => {
       console.error("Error loading Face A:", a.imagePath);
       faceAImg.alt = "Error loading image";
       faceAImg.style.border = "2px solid red";
    };
    faceAImg.src = ensurePath(a.imagePath) + "?t=" + Date.now();
    
    faceBImg.onload = () => console.log("Face B loaded successfully");
    faceBImg.onerror = (e) => {
       console.error("Error loading Face B:", b.imagePath);
       faceBImg.alt = "Error loading image";
       faceBImg.style.border = "2px solid red";
    };
    faceBImg.src = ensurePath(b.imagePath) + "?t=" + Date.now();
    
    console.log("Asignando imágenes:", a.imagePath, b.imagePath);

  } catch (e) {
    console.error("Excepción en loadDuel:", e);
    setMessage(duelMessage, "Error de red al cargar el duelo", true);
  }
}

async function sendVote(winner) {
  if (!currentDuel) return;
  const body = {
    faceAId: currentDuel.a.id,
    faceBId: currentDuel.b.id
  };
  if (winner === "T") {
    body.isTie = true;
  } else if (winner === "A") {
    body.winnerFaceId = currentDuel.a.id;
  } else if (winner === "B") {
    body.winnerFaceId = currentDuel.b.id;
  }
  try {
    if (!userToken) {
      setMessage(duelMessage, "Voto no registrado. Inicia sesión para guardar resultados y acceder al ranking.");
      await loadDuel();
      return;
    }
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(duelMessage, data.error || "No se pudo registrar el voto", true);
      return;
    }
    setMessage(duelMessage, "Preferencia registrada");
    if (userToken && currentMode === "REAL") {
      loadDuelRankings();
      loadChallengeList();
    }
    await loadDuel();
  } catch (e) {
    setMessage(duelMessage, "Error de red al registrar el voto", true);
  }
}

voteABtn.addEventListener("click", () => {
  sendVote("A");
});

voteBBtn.addEventListener("click", () => {
  sendVote("B");
});

skipDuelBtn.addEventListener("click", () => {
  loadDuel();
});

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  setMessage(uploadResult, "");
  
  if (!userToken) {
    setMessage(uploadResult, "Debes iniciar sesión para subir.", true);
    return;
  }

  const formData = new FormData(uploadForm);
  const type = formData.get("type");
  
  if (type === "REAL") {
    if (!formData.get("confirmOwnership")) {
      setMessage(uploadResult, "Debes confirmar que eres la persona de la imagen", true);
      return;
    }
    if (!formData.get("acceptPublicRanking")) {
      setMessage(uploadResult, "Debes aceptar aparecer en rankings públicos", true);
      return;
    }
    if (!formData.get("acceptTerms")) {
      setMessage(uploadResult, "Debes aceptar el consentimiento informado", true);
      return;
    }
    formData.set("confirmOwnership", "true");
    formData.set("acceptPublicRanking", "true");
    formData.set("acceptTerms", "true");
  } else {
    if (!formData.get("confirmAiSource")) {
      setMessage(uploadResult, "Debes confirmar que es una imagen generada por IA", true);
      return;
    }
    formData.set("confirmAiSource", "true");
  }

  try {
    const res = await fetch("/api/faces", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(uploadResult, data.error || "Error al subir imagen", true);
    } else {
      setMessage(uploadResult, "Imagen subida exitosamente");
      uploadForm.reset();
      uploadPreviewContainer.classList.add("hidden");
      uploadPreview.src = "";
      if (data.revocationToken) {
         const tokenMsg = document.createElement('div');
         tokenMsg.innerHTML = `<p><strong>Guarda este token para borrar tu foto en el futuro (o usa la sección Mis Fotos):</strong><br>${data.revocationToken}</p>`;
         tokenMsg.style.background = '#334155';
         tokenMsg.style.padding = '1rem';
         tokenMsg.style.marginTop = '1rem';
         tokenMsg.style.borderRadius = '0.5rem';
         uploadResult.appendChild(tokenMsg);
      }
    }
  } catch (e) {
    setMessage(uploadResult, "Error de red", true);
  }
});

// My Photos Logic
async function loadMyPhotos() {
    myPhotosList.innerHTML = '<p class="message">Cargando...</p>';
    try {
        const res = await fetch('/api/faces/mine', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (res.status === 401) {
            handleLogout();
            return;
        }
        const data = await res.json();
        if (data.faces && data.faces.length > 0) {
            myPhotosList.innerHTML = '';
            data.faces.forEach(face => {
                const item = document.createElement('div');
                item.className = 'photo-item';
                item.innerHTML = `
                  <img src="${face.imagePath}" alt="Mi foto" />
                  <div class="photo-actions">
                    <button class="btn small danger" onclick="deleteMyPhoto(${face.id})">Borrar</button>
                  </div>
                `;
                myPhotosList.appendChild(item);
            });
        } else {
            myPhotosList.innerHTML = '<p class="message">No has subido fotos aún.</p>';
        }
    } catch (err) {
        myPhotosList.innerHTML = '<p class="message error">Error al cargar fotos.</p>';
    }
}

window.deleteMyPhoto = async (id) => {
    if (!confirm("¿Estás seguro de que quieres borrar esta foto?")) return;
    try {
        const res = await fetch(`/api/faces/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (res.ok) {
            loadMyPhotos();
        } else {
            alert("No se pudo borrar la foto");
        }
    } catch (err) {
        alert("Error de conexión");
    }
};

// ADMIN LOGIC (Existing)
function checkAdminAuth() {
  if (adminToken) {
    adminLoginView.classList.add('hidden');
    adminDashboardView.classList.remove('hidden');
    loadReports();
    loadDuels();
  } else {
    adminLoginView.classList.remove('hidden');
    adminDashboardView.classList.add('hidden');
  }
}

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage(adminLoginMsg, '');
  const username = adminUserInp.value;
  const password = adminPassInp.value;

  try {
    const res = await fetch('/api/admin/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
       adminToken = data.token;
       localStorage.setItem('adminToken', adminToken);
       checkAdminAuth();
       adminUserInp.value = '';
       adminPassInp.value = '';
    } else {
       setMessage(adminLoginMsg, data.error || 'Login fallido', true);
    }
  } catch(err) {
     setMessage(adminLoginMsg, 'Error de conexión', true);
  }
});

adminLogoutBtn.addEventListener('click', () => {
  adminToken = null;
  localStorage.removeItem('adminToken');
  checkAdminAuth();
});

refreshReportsBtn.addEventListener('click', loadReports);
if (refreshDuelsBtn) {
  refreshDuelsBtn.addEventListener('click', loadDuels);
}

async function loadReports() {
   if (!adminToken) return;
   reportsList.innerHTML = '<p class="message">Cargando...</p>';
   try {
     const res = await fetch('/api/admin/reports', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
     });
     if (res.status === 401 || res.status === 403) {
        adminToken = null;
        localStorage.removeItem('adminToken');
        checkAdminAuth();
        return;
     }
     const data = await res.json();
     if (data.reports) {
        renderReports(data.reports);
     } else {
        reportsList.innerHTML = '<p class="message">No hay reportes o error.</p>';
     }
   } catch(err) {
     reportsList.innerHTML = '<p class="message error">Error al cargar reportes.</p>';
   }
}

function renderReports(reports) {
  reportsList.innerHTML = '';
  if (reports.length === 0) {
    reportsList.innerHTML = '<p class="message">No hay reportes pendientes.</p>';
    return;
  }
  reports.forEach(r => {
     const item = document.createElement('div');
     item.className = 'report-item';
     item.innerHTML = `
       <div class="report-header">
         <span>Reporte #${r.id} - ${new Date(r.created_at).toLocaleString()}</span>
         <span>Reportes acumulados: ${r.reports_count}</span>
       </div>
       <div class="report-body">
         <img src="${r.image_path}" class="report-img" alt="Face" />
         <div class="report-content">
           <p><strong>Motivo:</strong> ${r.reason || 'Sin motivo'}</p>
           <p>Status: ${r.is_public ? 'Público' : 'Oculto'}</p>
           <div class="report-actions">
             <button class="btn secondary" onclick="moderateFace(${r.face_id}, 'hide')">Ocultar</button>
             <button class="btn secondary" onclick="moderateFace(${r.face_id}, 'restore')">Restaurar</button>
             <button class="btn danger" onclick="moderateFace(${r.face_id}, 'delete')">Borrar (Ban)</button>
           </div>
         </div>
       </div>
     `;
     reportsList.appendChild(item);
  });
}

async function loadDuelRankings() {
  if (!duelRankingsList) return;
  if (!userToken) {
    duelRankingsList.innerHTML = '<li><div class="ranking-meta"><span>Inicia sesión para ver el ranking de duelos reales.</span></div></li>';
    return;
  }
  try {
    const res = await fetch('/api/rankings?category=REAL&limit=10', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (!res.ok) {
      duelRankingsList.innerHTML = '<li><div class="ranking-meta"><span>No se pudo cargar el ranking.</span></div></li>';
      return;
    }
    const data = await res.json();
    const faces = data.faces || [];
    duelRankingsList.innerHTML = '';
    if (!faces.length) {
      duelRankingsList.innerHTML = '<li><div class="ranking-meta"><span>No hay participantes disponibles.</span></div></li>';
      return;
    }
    faces.forEach((face, index) => {
      const li = document.createElement('li');
      const thumb = document.createElement('div');
      thumb.className = 'ranking-thumb';
      const img = document.createElement('img');
      img.src = face.imagePath;
      img.alt = face.displayName || `Rostro ${face.id}`;
      thumb.appendChild(img);
      const meta = document.createElement('div');
      meta.className = 'ranking-meta';
      const title = document.createElement('span');
      title.textContent = `#${index + 1} ${face.displayName || `Rostro ${face.id}`}`;
      const rating = document.createElement('span');
      rating.textContent = `Score: ${Math.round(face.eloRating)} · Duelos: ${face.matches}`;
      meta.appendChild(title);
      meta.appendChild(rating);
      li.appendChild(thumb);
      li.appendChild(meta);
      duelRankingsList.appendChild(li);
    });
  } catch (e) {
    duelRankingsList.innerHTML = '<li><div class="ranking-meta"><span>Error de conexión.</span></div></li>';
  }
}

async function loadChallengeList() {
  if (!challengeList) return;
  if (!userToken) {
    challengeList.innerHTML = '<li><div class="ranking-meta"><span>Inicia sesión para desafiar a otros jugadores.</span></div></li>';
    return;
  }
  try {
    const res = await fetch('/api/rankings?category=REAL&limit=5', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (!res.ok) {
      challengeList.innerHTML = '<li><div class="ranking-meta"><span>No se pudo cargar la lista de jugadores.</span></div></li>';
      return;
    }
    const data = await res.json();
    const faces = data.faces || [];
    challengeList.innerHTML = '';
    if (!faces.length) {
      challengeList.innerHTML = '<li><div class="ranking-meta"><span>No hay jugadores activos para desafiar.</span></div></li>';
      return;
    }
    faces.forEach(face => {
      const li = document.createElement('li');
      const thumb = document.createElement('div');
      thumb.className = 'ranking-thumb';
      const img = document.createElement('img');
      img.src = face.imagePath;
      img.alt = face.displayName || `Rostro ${face.id}`;
      thumb.appendChild(img);
      const meta = document.createElement('div');
      meta.className = 'ranking-meta';
      const title = document.createElement('span');
      title.textContent = face.displayName || `Rostro ${face.id}`;
      const btn = document.createElement('button');
      btn.className = 'btn small secondary';
      btn.textContent = 'Jugar duelo';
      btn.addEventListener('click', () => {
        currentMode = "REAL";
        if (duelModeRealBtn && duelModeAiBtn) {
          duelModeAiBtn.classList.remove("active");
          duelModeRealBtn.classList.add("active");
        }
        document.querySelector('[data-tab="duel"]').click();
        loadDuel();
      });
      meta.appendChild(title);
      meta.appendChild(btn);
      li.appendChild(thumb);
      li.appendChild(meta);
      challengeList.appendChild(li);
    });
  } catch (e) {
    challengeList.innerHTML = '<li><div class="ranking-meta"><span>Error de conexión.</span></div></li>';
  }
}

window.moderateFace = async (faceId, action) => {
  if (!confirm(`¿Confirmar acción: ${action}?`)) return;
  try {
    const res = await fetch('/api/admin/moderate', {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${adminToken}`
       },
       body: JSON.stringify({ faceId, action })
    });
    const data = await res.json();
    if (data.success) {
      alert('Acción realizada');
      loadReports();
    } else {
      alert('Error: ' + data.error);
    }
  } catch(err) {
    alert('Error de conexión');
  }
};

async function loadDuels() {
  if (!adminToken) return;
  duelsList.innerHTML = '<p class="message">Cargando duelos...</p>';
  try {
    const res = await fetch('/api/admin/duels', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.status === 401 || res.status === 403) {
      adminToken = null;
      localStorage.removeItem('adminToken');
      checkAdminAuth();
      return;
    }
    const data = await res.json();
    const duels = data.duels || [];
    duelsList.innerHTML = '';
    if (!duels.length) {
      duelsList.innerHTML = '<p class="message">No hay duelos registrados.</p>';
      return;
    }
    duels.forEach(d => {
      const item = document.createElement('div');
      item.className = 'report-item';
      const resultLabel = d.is_tie ? 'Empate' : (d.winner_face_id ? `Gana rostro ${d.winner_face_id}` : 'N/A');
      item.innerHTML = `
        <div class="report-header">
          <span>Duel #${d.id} - ${new Date(d.created_at).toLocaleString()}</span>
          <span>Usuario: ${d.username || d.user_id || 'Anónimo'}</span>
        </div>
        <div class="report-body">
          <div class="report-content">
            <p>Rostro A: ${d.face_a_id} | Rostro B: ${d.face_b_id}</p>
            <p>Resultado: ${resultLabel}</p>
            <p>Incidencia: ${d.incident || 'Ninguna'}</p>
          </div>
        </div>
      `;
      duelsList.appendChild(item);
    });
  } catch (err) {
    duelsList.innerHTML = '<p class="message error">Error al cargar duelos.</p>';
  }
}

const rankingSearchInput = document.getElementById("ranking-search");
const rankingSearchBtn = document.getElementById("ranking-search-btn");

if (rankingSearchBtn) {
    rankingSearchBtn.addEventListener("click", () => {
       const activeBtn = document.querySelector('.mode-btn[data-rankings="true"].active');
       const mode = activeBtn ? activeBtn.getAttribute("data-mode") : "IA";
       loadRankings(mode);
    });
}

async function loadRankings(mode) {
  rankingsList.innerHTML = '<p class="message">Cargando rankings...</p>';
  const search = rankingSearchInput ? rankingSearchInput.value : "";
  
  const headers = {};
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  if (!userToken) {
     rankingsList.innerHTML = `
        <div class="message error" style="text-align: center; padding: 2rem;">
            <p style="margin-bottom: 1rem;">Los rankings están disponibles solo para usuarios registrados.</p>
            <button class="btn primary" onclick="document.querySelector('#auth-tab').classList.remove('hidden'); document.querySelector('#login-view').classList.remove('hidden'); hideAllTabs(); document.querySelector('#auth-tab').classList.remove('hidden');">Iniciar Sesión</button>
        </div>
     `;
     return;
  }

  try {
    const res = await fetch(`/api/rankings?category=${encodeURIComponent(mode)}&limit=50&search=${encodeURIComponent(search)}`, {
        headers
    });
    
    if (res.status === 401 || res.status === 403) {
        rankingsList.innerHTML = '<p class="message error">Acceso denegado. Sesión expirada o inválida.</p>';
        return;
    }

    if (!res.ok) {
      rankingsList.innerHTML = '<p class="message error">Error al cargar rankings.</p>';
      return;
    }
    const data = await res.json();
    
    if (!data.faces || data.faces.length === 0) {
        rankingsList.innerHTML = '<p class="message">No hay perfiles activos que cumplan los requisitos para este ranking.</p>';
        return;
    }

    rankingsList.innerHTML = "";
    data.faces.forEach((face, index) => {
      const li = document.createElement("li");
      
      const thumb = document.createElement("div");
      thumb.className = "ranking-thumb";
      const img = document.createElement("img");
      img.src = face.imagePath;
      img.alt = face.displayName || `Rostro ${face.id}`;
      thumb.appendChild(img);
      
      const meta = document.createElement("div");
      meta.className = "ranking-meta";
      
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.marginBottom = "0.25rem";
      
      const title = document.createElement("strong");
      title.style.fontSize = "1.1rem";
      const label = face.displayName || `Rostro ${face.id}`;
      title.textContent = `#${index + 1} ${label}`;
      
      const score = document.createElement("span");
      score.style.fontWeight = "bold";
      score.style.color = "#4ade80";
      score.textContent = Math.round(face.eloRating);
      
      header.appendChild(title);
      header.appendChild(score);
      
      const typeBadge = document.createElement("span");
      typeBadge.style.fontSize = "0.75rem";
      typeBadge.style.marginRight = "0.5rem";
      typeBadge.textContent = face.type === 'REAL' ? 'REAL' : 'IA';

      const stats = document.createElement("div");
      stats.style.fontSize = "0.85rem";
      stats.style.color = "#94a3b8";
      stats.innerHTML = `
        <span>Duelos: ${face.matches}</span> &bull; 
        <span style="color:#4ade80">G: ${face.wins}</span> &bull; 
        <span style="color:#f87171">P: ${face.losses}</span>
      `;

      meta.appendChild(header);
      meta.appendChild(typeBadge);
      meta.appendChild(stats);
      
      li.appendChild(thumb);
      li.appendChild(meta);
      rankingsList.appendChild(li);
    });
  } catch (e) {
      console.error(e);
      rankingsList.innerHTML = '<p class="message error">Error de conexión.</p>';
  }
}

revokeForm.addEventListener("submit", async e => {
  e.preventDefault();
  setMessage(revokeResult, "");
  const token = revokeTokenInput.value.trim();
  if (!token) {
    setMessage(revokeResult, "Token requerido", true);
    return;
  }
  try {
    const res = await fetch("/api/consent/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (data.success) {
       setMessage(revokeResult, "Tu rostro ha sido eliminado correctamente.");
       revokeForm.reset();
    } else {
       setMessage(revokeResult, data.error || "Token inválido", true);
    }
  } catch (e) {
    setMessage(revokeResult, "Error de red", true);
  }
});

// Reporting Logic
reportButton.addEventListener("click", () => {
  reportDialog.showModal();
});

closeReportButton.addEventListener("click", () => {
  reportDialog.close();
});

reportForm.addEventListener("submit", async (e) => {
  // If method="dialog" is used, we might not need to prevent default, 
  // but we want to handle the submission via fetch manually.
  // Actually, method="dialog" closes the dialog on submit. 
  // We should preventDefault to handle async fetch first.
  e.preventDefault();
  
  const faceId = reportFaceIdInput.value;
  const reason = reportReasonInput.value;
  
  setMessage(reportResult, "Enviando reporte...");
  
  try {
    const res = await fetch("/api/reports", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ faceId, reason })
    });
    const data = await res.json();
    if (data.success) {
       alert("Reporte enviado. Gracias.");
       reportForm.reset();
       reportDialog.close();
       setMessage(reportResult, "");
    } else {
       setMessage(reportResult, data.error || "Error al enviar reporte", true);
    }
  } catch (err) {
     setMessage(reportResult, "Error de conexión", true);
  }
});

// Initial check
checkUserAuth();

// Check for reset token in URL
const urlParams = new URLSearchParams(window.location.search);
const resetTokenParam = urlParams.get('reset_token');
if (resetTokenParam) {
    // Switch to auth tab and reset password view
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    hideAllTabs();
    authTab.classList.remove("hidden");
    
    loginView.classList.add("hidden");
    registerView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    resetPasswordView.classList.remove("hidden");
    
    resetTokenInput.value = resetTokenParam;
} else {
    loadDuel();
    if (userToken) {
      loadDuelRankings();
      loadChallengeList();
      setInterval(() => {
        if (!duelTab.classList.contains("hidden")) {
          loadDuelRankings();
        }
      }, 15000);
    }
}
