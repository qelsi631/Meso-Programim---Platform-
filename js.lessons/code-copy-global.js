document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".code-copy").forEach((button) => {
    if (button.dataset.copyBound === "true") return;
    button.dataset.copyBound = "true";

    button.addEventListener("click", function () {
      const codeCard = this.closest(".code-card");
      if (!codeCard) return;

      const codeElement = codeCard.querySelector("code");
      if (!codeElement) return;

      const textToCopy = codeElement.textContent;

      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = this.textContent;
        this.textContent = "✅ Copied!";
        this.style.background = "#34D399";
        this.style.color = "#000";

        setTimeout(() => {
          this.textContent = originalText;
          this.style.background = "";
          this.style.color = "";
        }, 2000);
      });
    });
  });
});
