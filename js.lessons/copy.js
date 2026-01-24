 // Copy button
  document.getElementById("copyBtn").addEventListener("click", async () => {
    const textToCopy = codeEl.textContent;
    await navigator.clipboard.writeText(textToCopy);

    const btn = document.getElementById("copyBtn");
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = old), 900);
  });

  // Line numbers (no Prism plugin needed)
  const pre = document.getElementById("codePre");
  const code = document.getElementById("exampleCode").innerHTML.split("\n").length;
  pre.style.setProperty("--lines", code);
