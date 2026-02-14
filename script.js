import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==================== FIREBASE SOZLAMALARI ====================
const firebaseConfig = {
  apiKey: "BEh0j6dG1C7jzEX9emcfJkRWJMVxEhOAh5D7JqRKAj9pQIPxMpMr9h9_QpEdLls7Vq8-aaP01zNWz1Trn3F87rE",  // BU TO'G'RI
  authDomain: "habarim-64231.firebaseapp.com",
  projectId: "habarim-64231",
  appId: "1:65930868923:web:ac4baa99965bb18592519e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==================== DOM ELEMENTLAR ====================
const googleBtn = document.getElementById("google-login");
const userInfo = document.getElementById("user-info");
const userName = document.getElementById("user-name");
const userPhoto = document.getElementById("user-photo");
const logoutBtn = document.getElementById("logout-btn");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatContainer = document.getElementById("chat-container");
const newChatBtn = document.getElementById("new-chat-btn-mobile");
const historyList = document.getElementById("chat-history-list-mobile");
const menuBtn = document.getElementById("menu-btn");
const closeSidebar = document.getElementById("close-sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

// ==================== BACKEND URL (RENDER) ====================
const BACKEND_URL = "https://upg-chat-backend.onrender.com";
const SERVER_URL = BACKEND_URL + "/chat";

// ==================== O'ZGARUVCHILAR ====================
let chatHistory = [];
let isServerConnected = false;

// ==================== MOBIL MENYU ====================
if (menuBtn && closeSidebar && sidebarOverlay) {
  menuBtn.addEventListener('click', () => {
    document.getElementById('mobile-sidebar').classList.add('open');
    sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeMenu = () => {
    document.getElementById('mobile-sidebar').classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  closeSidebar.addEventListener('click', closeMenu);
  sidebarOverlay.addEventListener('click', closeMenu);
}

// ==================== SERVERNI TEKSHIRISH ====================
async function checkServerConnection() {
  try {
    console.log("🔍 Server tekshirilmoqda:", BACKEND_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(BACKEND_URL, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      console.log("✅ Server javobi:", data);
      isServerConnected = true;
      addSystemMessage("✅ Server bilan bog'landi");
      return true;
    } else {
      console.error("❌ Server xatolik:", res.status);
      addSystemMessage(`⚠️ Server xatolik (${res.status})`);
      return false;
    }
  } catch (e) {
    console.error("❌ Serverga ulanish xatolik:", e.message);
    isServerConnected = false;
    
    let errorMsg = "❌ Server bilan bog'lanish yo'q!\n\n";
    errorMsg += "📢 SABABLAR:\n";
    errorMsg += "1. Render server uxlab qolgan (15 daqiqa inaktiv)\n";
    errorMsg += "2. Server ishga tushmagan\n";
    errorMsg += "3. Internet aloqasi tekshiring\n\n";
    errorMsg += "⏳ 30-60 soniya kuting va qayta urinib ko'ring";
    
    addSystemMessage(errorMsg);
    return false;
  }
}

// ==================== SISTEMA XABARI ====================
function addSystemMessage(text) {
  if (!chatContainer) return;
  
  const div = document.createElement("div");
  div.className = "flex justify-center mb-4";
  div.innerHTML = `
    <div class="bg-gray-800/80 text-gray-300 text-xs px-4 py-2 rounded-full border border-white/10 max-w-[90%] text-center">
      <i class="fa-solid fa-info-circle mr-1 text-blue-400"></i>
      ${text.replace(/\n/g, '<br>')}
    </div>
  `;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ==================== GOOGLE LOGIN ====================
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Login muvaffaqiyatli:", result.user.email);
      addSystemMessage("Google orqali kirdingiz!");
      
      setTimeout(checkServerConnection, 1000);
    } catch (error) {
      console.error("❌ Login xatolik:", error);
      
      if (error.code === 'auth/popup-blocked') {
        alert("Popup bloklangan. Brauzer sozlamalarini tekshiring.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Bu domain ruxsat etilmagan. Firebase konsolida domain qo'shing.");
      } else {
        alert("Login xatolik: " + error.message);
      }
    }
  });
}

// ==================== AUTH STATE ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (googleBtn) googleBtn.style.display = "none";
    if (userInfo) {
      userInfo.classList.remove("hidden");
      userName.textContent = user.displayName || "User";
      userPhoto.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "User");
    }
    
    if (userInput) {
      userInput.disabled = false;
      userInput.placeholder = "Xabar yozing...";
    }
    
    if (sendBtn) sendBtn.disabled = false;
    
    if (chatContainer && chatContainer.children.length === 0) {
      addMessage("ai", `👋 Assalomu alaykum, ${user.displayName || 'User'}! Qanday yordam bera olaman?`);
    }
    
    checkServerConnection();
    
  } else {
    if (googleBtn) googleBtn.style.display = "flex";
    if (userInfo) userInfo.classList.add("hidden");
    
    if (userInput) {
      userInput.disabled = true;
      userInput.placeholder = "Avval Google orqali kiring";
    }
    
    if (sendBtn) sendBtn.disabled = true;
    
    if (chatContainer) {
      chatContainer.innerHTML = `
        <div class="flex justify-start mb-4">
          <div class="max-w-[90%] p-4 rounded-xl bg-gradient-to-r from-blue-600/10 to-blue-500/5 border border-blue-500/20">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <i class="fa-solid fa-robot text-sm"></i>
              </div>
              <span class="font-medium text-blue-400">UPG CHAT AI</span>
            </div>
            <p class="text-sm text-gray-300">
              👋 Assalomu alaykum!<br>
              Savol berish uchun <b>Google orqali kiring</b>.
            </p>
          </div>
        </div>
      `;
    }
  }
});

// ==================== LOGOUT ====================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("✅ Chiqish muvaffaqiyatli");
      chatContainer.innerHTML = '';
    } catch (error) {
      console.error("❌ Chiqishda xatolik:", error);
    }
  });
}

// ==================== YANGI CHAT ====================
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    if (!auth.currentUser) {
      alert("Avval tizimga kiring!");
      return;
    }
    
    chatContainer.innerHTML = '';
    addMessage("ai", "Yangi chat boshlandi. Savolingizni yozing.");
    
    if (closeSidebar) closeSidebar.click();
  });
}

// ==================== XABAR QO'SHISH ====================
function addMessage(role, text) {
  if (!chatContainer) return;

  const div = document.createElement("div");
  div.className = `flex ${role === "user" ? "justify-end" : "justify-start"} mb-4`;
  
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  div.innerHTML = `
    <div class="max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl ${
      role === "user"
        ? "bg-blue-600"
        : role === "system"
        ? "bg-gray-700 border border-white/10"
        : "bg-[#2f2f2f] border border-white/10"
    }">
      <p class="text-sm sm:text-base">${safeText}</p>
      <div class="text-[10px] text-gray-400 mt-1 text-right">
        ${new Date().toLocaleTimeString().substring(0,5)}
      </div>
    </div>
  `;
  
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ==================== XABAR YUBORISH ====================
async function sendMessage() {
  if (!userInput || !auth.currentUser) {
    alert("Avval tizimga kiring!");
    return;
  }

  const text = userInput.value.trim();
  if (!text) return;

  if (!isServerConnected) {
    addSystemMessage("⚠️ Server bilan bog'lanmagan. Qayta urinilmoqda...");
    const connected = await checkServerConnection();
    if (!connected) {
      addSystemMessage("❌ Server mavjud emas. Keyinroq urinib ko'ring.");
      return;
    }
  }

  addMessage("user", text);
  userInput.value = "";
  userInput.style.height = "auto";

  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loading";
  loadingDiv.className = "flex justify-start mb-4";
  loadingDiv.innerHTML = `
    <div class="bg-[#2f2f2f] border border-white/10 p-4 rounded-xl">
      <div class="flex gap-2">
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
      </div>
    </div>
  `;
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    console.log("📤 So'rov yuborilmoqda:", SERVER_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        message: text,
        userId: auth.currentUser?.uid
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    document.getElementById("loading")?.remove();

    if (!res.ok) {
      throw new Error(`HTTP xatolik: ${res.status}`);
    }

    const data = await res.json();
    console.log("📥 Server javobi:", data);
    
    if (data.reply) {
      addMessage("ai", data.reply);
    } else {
      addMessage("system", "❌ Javob olishda xatolik");
    }
    
  } catch (e) {
    document.getElementById("loading")?.remove();
    
    console.error("❌ Xatolik:", e);
    
    let errorMsg = "❌ Xatolik yuz berdi!\n\n";
    
    if (e.name === 'AbortError') {
      errorMsg += "Server juda sekin javob berdi. 30 soniya kuting va qayta urinib ko'ring.";
    } else if (e.message.includes('Failed to fetch')) {
      errorMsg += "Serverga ulanish imkonsiz. Render server uxlab qolgan bo'lishi mumkin.\n";
      errorMsg += "⏳ 30-60 soniya kuting va qayta urinib ko'ring.";
      isServerConnected = false;
    } else {
      errorMsg += e.message;
    }
    
    addMessage("system", errorMsg);
  }
}

// ==================== EVENT LISTENERLAR ====================
if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
  sendBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    sendMessage();
  });
}

if (userInput) {
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  userInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 150) + "px";
  });
}

// ==================== SAHIFA YUKLANGANDA ====================
window.addEventListener('load', () => {
  console.log("✅ Script yuklandi");
  console.log("📡 Server URL:", SERVER_URL);
  
  setTimeout(checkServerConnection, 2000);

  setTimeout(() => {
    if (userInput && !userInput.disabled) {
      userInput.focus();
    }
  }, 1000);
});

// ==================== KEYBOARD EVENT (MOBIL UCHUN) ====================
if ('visualViewport' in window) {
  window.visualViewport.addEventListener('resize', () => {
    if (window.visualViewport.height < window.innerHeight) {
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  });
}

// ==================== CSS QO'SHIMCHA ====================
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .animate-bounce {
    animation: bounce 1s infinite;
  }
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

console.log("✅ Script to'liq yuklandi");
