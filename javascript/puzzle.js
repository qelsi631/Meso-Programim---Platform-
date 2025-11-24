// Elements
const input = document.getElementById("answerInput");
const errorMsg = document.getElementById("errorMsg");
const solutionBtn = document.getElementById("solutionBtn");
const solutionText = document.getElementById("solutionText");
const checkBtn = document.getElementById("checkBtn");

// FOOTER “VAZHDO” BUTTON (BLOCK UNTIL COMPLETED)
const continueBtn = document.querySelector(".lesson-footer-buttons a:last-child");
continueBtn.style.pointerEvents = "none";
continueBtn.style.opacity = "0.4";

// Load success sound
const successSound = new Audio("/Correct Answer Sound Effect.mp3");

// Track solution button
let solutionClicks = 0;

// CHECK ANSWER
checkBtn.addEventListener("click", () => {
    const value = input.value.trim();

    // If empty
    if (value === "") {
        errorMsg.innerHTML = "te lutem shkruaj nje pergjigje ❌";
        errorMsg.style.color = "red";
        return;
    }

    // Check if number
    if (!/^\d+$/.test(value)) {
        errorMsg.innerHTML = "Pergjigja duhet te jete nje numer ❌";
        errorMsg.style.color = "red";
        return;
    }

    // CORRECT ANSWER
    errorMsg.innerHTML = "Sakte! ✔️";
    errorMsg.style.color = "green";

    // Play success sound
    successSound.currentTime = 0;
    successSound.play();

    // Unlock continue button
    continueBtn.style.pointerEvents = "auto";
    continueBtn.style.opacity = "1";

    // Mark puzzle as complete
    localStorage.setItem("puzzle_variable1_completed", true);
});

// SOLUTION BUTTON
solutionBtn.addEventListener("click", () => {
    solutionClicks++;

    if (solutionClicks === 1) {
        solutionText.innerHTML = "Try again 👀";
    } 
    else if (solutionClicks === 2) {
        solutionText.innerHTML = "You can enter any number like: 21";
    } 
    else if (solutionClicks >= 3) {
        solutionText.innerHTML = `Correct example: <strong>let age = 21</strong>`;
    }
});
