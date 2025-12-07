// Toggle sidebar
document.addEventListener("click", function (e) {
  const toggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar-container");

  if (!toggle || !sidebar) return;

  if (e.target === toggle || toggle.contains(e.target)) {
    sidebar.classList.toggle("open");
  }
});

// Update progress bar automatically
function updateGlobalProgress() {
  let completed = 0;
  let total = 50; // ndryshoje në të ardhmen nëse shtojmë më shumë mësime

  for (let key in localStorage) {
    if (key.startsWith("lesson_") && localStorage[key] === "completed") {
      completed++;
    }
  }

  const percentage = (completed / total) * 100;
  const bar = document.getElementById("global-progress-bar");
  if (bar) bar.style.width = `${percentage}%`;
}

updateGlobalProgress();
