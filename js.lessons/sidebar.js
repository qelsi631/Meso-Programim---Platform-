document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("closeBtn");

  if (!menuBtn || !overlay || !closeBtn) return;

  function openSidebar() {
    document.body.classList.add("sidebar-open");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openSidebar();
  });

  overlay.addEventListener("click", closeSidebar);
  closeBtn.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
});
