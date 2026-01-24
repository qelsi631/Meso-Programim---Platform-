// Render the preview (decode the &lt; &gt; so it becomes real HTML)
  const codeEl = document.getElementById("exampleCode");
  const previewEl = document.getElementById("examplePreview");
  previewEl.innerHTML = codeEl.textContent;
