  // Toggle sidebar
  const sidebar = document.getElementById("sidebarLessons");
  const toggle = document.getElementById("toggleSidebar");
  const icons = document.querySelectorAll(".icon");

  let openSidebar = false;

  toggle.addEventListener("click", () => {
    openSidebar = !openSidebar;

    if (openSidebar) {
      sidebar.classList.add("visible");
      icons.forEach(i => i.style.display = "inline");
    } else {
      sidebar.classList.remove("visible");
      icons.forEach(i => i.style.display = "none");
    }
  });

  // Accordion logic
  const chapters = document.querySelectorAll(".chapter");

  chapters.forEach(chapter => {
    const header = chapter.querySelector(".chapter-header");
    const content = chapter.querySelector(".chapter-content");

    header.addEventListener("click", () => {
      header.classList.toggle("active");
      content.style.display =
        content.style.display === "block" ? "none" : "block";
    });
  });


  // Mbylle sidebar kur klikojme jashtë tij
document.addEventListener("click", (event) => {
  const clickedInsideSidebar = sidebar.contains(event.target);
  const clickedFooterTitle = toggle.contains(event.target);

  // Nëse sidebar është i hapur dhe useri klikoi jashtë
  if (openSidebar && !clickedInsideSidebar && !clickedFooterTitle) {
    sidebar.classList.remove("visible");
    icons.forEach(i => i.style.display = "none");
    openSidebar = false;
  }
});


// --------------------
//  LOCK / UNLOCK SYSTEM
// --------------------

document.querySelectorAll(".lesson-item").forEach(item => {
    const lessonId = item.dataset.lesson;
    const requiredId = item.dataset.required;
    const lockIcon = item.querySelector(".lock");
    const tickIcon = item.querySelector(".tick");

    // Nëse s'ka required → është i hapur
    if (!requiredId) {
        item.classList.add("unlocked");
        if (lockIcon) lockIcon.style.display = "none";
        if (tickIcon) tickIcon.style.display = "inline";
        return;
    }

    // Shiko në LocalStorage
    const isCompleted = localStorage.getItem(requiredId + "_completed");

    if (!isCompleted) {
        // LOCKED
        item.classList.add("locked");
        if (lockIcon) lockIcon.style.display = "inline";
        item.addEventListener("click", e => e.preventDefault());
    } else {
        // UNLOCK
        item.classList.remove("locked");
        item.classList.add("unlocked");
        if (lockIcon) lockIcon.style.display = "none";
        if (tickIcon) tickIcon.style.display = "inline";
    }
});
