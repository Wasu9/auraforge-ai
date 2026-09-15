document.addEventListener("DOMContentLoaded", () => {
  const promptEl = document.getElementById("prompt");
  const modelEl = document.getElementById("model");
  const generateBtn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");

  generateBtn.addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (!prompt) {
      statusEl.textContent = "Please enter a prompt.";
      return;
    }

    generateBtn.disabled = true;
    statusEl.textContent = "Generating... (first time may show a consent dialog)";
    resultEl.innerHTML = "";

    try {
      // Puter.js free image generation (User-Pays model)
      // No API key required from the developer
      const imageElement = await puter.ai.txt2img(prompt, {
        model: modelEl.value
      });

      // puter returns an <img> element or URL depending on version
      if (imageElement instanceof HTMLImageElement) {
        resultEl.appendChild(imageElement);
        addDownload(imageElement.src);
      } else if (typeof imageElement === "string") {
        const img = document.createElement("img");
        img.src = imageElement;
        img.alt = "Generated image";
        resultEl.appendChild(img);
        addDownload(imageElement);
      } else if (imageElement && imageElement.url) {
        const img = document.createElement("img");
        img.src = imageElement.url;
        img.alt = "Generated image";
        resultEl.appendChild(img);
        addDownload(imageElement.url);
      } else {
        // Fallback: try to extract src if it's a different structure
        console.log("Unexpected response:", imageElement);
        statusEl.textContent = "Image generated but format unexpected. Check console.";
      }

      statusEl.textContent = "Done!";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + (err.message || "Generation failed. Try again or check console.");
    } finally {
      generateBtn.disabled = false;
    }
  });

  function addDownload(src) {
    const link = document.createElement("a");
    link.href = src;
    link.download = "auraforge-generated.png";
    link.className = "btn secondary download-btn";
    link.textContent = "Download Image";
    link.style.display = "inline-block";
    link.style.marginTop = "1rem";
    resultEl.appendChild(link);
  }

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
