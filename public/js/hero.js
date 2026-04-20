const title = document.getElementById("hero-title");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const exploreBtn = document.getElementById("explore-btn");

async function loadUser() {
  try {
    const response = await fetch("/api/me");

    if (!response.ok) {
      console.error("Failed to fetch user data:", response.status);
      window.location.href = "/login";
      return;
    }

    const data = await response.json();

    if (!data.user) {
      console.error("No user data returned");
      window.location.href = "/login";
      return;
    }

    const firstName = (data.user.name || "Friend").split(" ")[0];
    const email = data.user.email || "user@example.com";

    title.textContent = `Welcome, ${firstName}! 🚀`;
    userEmail.textContent = `Logged in as: ${email}`;
    userEmail.style.color = "#67d8c2";

    console.log("User loaded successfully:", data.user);
  } catch (error) {
    console.error("Error loading user:", error);
    window.location.href = "/login";
  }
}

logoutBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (response.ok) {
      console.log("Logout successful");
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.href = "/login";
  }
});

exploreBtn.addEventListener("click", () => {
  alert("Dashboard section will be added soon!");
});

document.addEventListener("DOMContentLoaded", () => {
  loadUser();
});
