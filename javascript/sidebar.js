// Accordion
document.querySelectorAll(".chapter-header").forEach(header => {
  header.addEventListener("click", () => {
    header.parentElement.classList.toggle("open");
  });
});
