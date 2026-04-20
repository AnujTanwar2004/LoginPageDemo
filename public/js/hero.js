const title = document.getElementById("hero-title");
const logoutBtn = document.getElementById("logout-btn");

async function loadUser() {
  try {
    const response = await fetch("/api/me");

    if (!response.ok) {
      window.location.href = "/login";
      return;
    }

    const data = await response.json();
    const firstName = (data.user.name || "Friend").split(" ")[0];
    title.textContent = `Welcome, ${firstName}.`;
  } catch (_error) {
    window.location.href = "/login";
  }
}

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});

loadUser();
