document.addEventListener("DOMContentLoaded", () => {
  const promptEl = document.getElementById("prompt");
  const modelEl = document.getElementById("model");
  const generateBtn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");
  const resultsGrid = document.getElementById("resultsGrid");
  const galleryGrid = document.getElementById("galleryGrid");
  const countSelector = document.getElementById("countSelector");
  const surpriseBtn = document.getElementById("surpriseBtn");
  const clearResultsBtn = document.getElementById("clearResults");
  const clearGalleryBtn = document.getElementById("clearGallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxClose = document.getElementById("lightboxClose");
  const refInput = document.getElementById("refInput");
  const refDrop = document.getElementById("refDrop");
  const refPreviews = document.getElementById("refPreviews");

  let imageCount = 1;
  let referenceImages = []; // { dataUrl, file }
  const STORAGE_KEY = "auraforge_gallery_v2";
  const MAX_REFS = 4;

  const surprisePrompts = [
    "A majestic white wolf on a snowy mountain at sunrise, cinematic, 8k",
    "Futuristic Tokyo street at night with neon and rain, cyberpunk, detailed",
    "Elegant fantasy elf with glowing silver hair in enchanted forest",
    "Vintage 1950s diner at dusk, warm neon, photorealistic",
    "Astronaut above Earth, dramatic lighting, detailed spacesuit",
    "Cute robot with red umbrella in rainy Tokyo alley, anime style",
    "Ancient Japanese temple with cherry blossoms, soft morning light",
    "Luxury sports car on coastal road at golden hour, cinematic"
  ];

  // Count
  countSelector.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      countSelector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      imageCount = parseInt(btn.dataset.count);
    });
  });

  // Chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const style = chip.dataset.prompt;
      const current = promptEl.value.trim();
      promptEl.value = current ? current + ", " + style : style;
    });
  });

  surpriseBtn.addEventListener("click", () => {
    promptEl.value = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
  });

  // Reference image upload
  refDrop.addEventListener("click", () => refInput.click());
  refInput.addEventListener("change", (e) => handleFiles(e.target.files));

  refDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    refDrop.classList.add("dragover");
  });
  refDrop.addEventListener("dragleave", () => refDrop.classList.remove("dragover"));
  refDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    refDrop.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    const list = Array.from(files).filter(f => f.type.startsWith("image/"));
    list.forEach(file => {
      if (referenceImages.length >= MAX_REFS) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        referenceImages.push({ dataUrl: ev.target.result, file });
        renderRefPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderRefPreviews() {
    refPreviews.innerHTML = "";
    referenceImages.forEach((ref, idx) => {
      const div = document.createElement("div");
      div.className = "ref-thumb";
      div.innerHTML = `<img src="${ref.dataUrl}" alt="ref" /><button type="button" class="remove-ref" data-idx="${idx}">×</button>`;
      div.querySelector(".remove-ref").addEventListener("click", (e) => {
        e.stopPropagation();
        referenceImages.splice(idx, 1);
        renderRefPreviews();
      });
      refPreviews.appendChild(div);
    });
  }

  // Generate
  generateBtn.addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (!prompt) {
      statusEl.textContent = "Please enter a prompt.";
      return;
    }

    setLoading(true);
    statusEl.textContent = "Generating... (Puter consent may appear first time)";
    clearEmptyState(resultsGrid);

    const opts = { model: modelEl.value };
    if (referenceImages.length > 0) {
      // Use input_images for img2img / multi-ref
      opts.input_images = referenceImages.map(r => r.dataUrl);
      // Some models also accept single input_image
      if (referenceImages.length === 1) {
        opts.input_image = referenceImages[0].dataUrl;
      }
    }

    let success = 0;
    for (let i = 0; i < imageCount; i++) {
      try {
        statusEl.textContent = `Generating ${i + 1}/${imageCount}...`;
        const imgData = await generateOne(prompt, opts);
        if (imgData) {
          success++;
          addResultItem(imgData, resultsGrid);
          saveToGallery(imgData);
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = `Error on #${i + 1}: ${err.message || "Failed"}`;
      }
    }

    setLoading(false);
    if (success > 0) {
      statusEl.textContent = `Done! ${success} image(s) generated.`;
      renderGallery();
    } else {
      statusEl.textContent = "Generation failed. Try another model or simpler prompt.";
      showEmpty(resultsGrid);
    }
  });

  async function generateOne(prompt, options) {
    const result = await puter.ai.txt2img(prompt, options);

    let src = null;
    if (result instanceof HTMLImageElement) src = result.src;
    else if (typeof result === "string") src = result;
    else if (result?.url) src = result.url;
    else if (result?.src) src = result.src;

    if (!src) {
      console.warn("Unexpected response", result);
      return null;
    }
    return { src, prompt, model: options.model, time: Date.now() };
  }

  function addResultItem(data, container) {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <img src="${data.src}" alt="Generated" loading="lazy" />
      <div class="result-actions">
        <button type="button" class="view-btn">View</button>
        <a href="${data.src}" download="auraforge-${Date.now()}.png">Save</a>
      </div>`;
    div.querySelector(".view-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(data.src);
    });
    div.addEventListener("click", () => openLightbox(data.src));
    container.appendChild(div);
  }

  function setLoading(on) {
    generateBtn.disabled = on;
    generateBtn.querySelector(".btn-text").classList.toggle("hidden", on);
    generateBtn.querySelector(".btn-loader").classList.toggle("hidden", !on);
  }

  function clearEmptyState(el) {
    const empty = el.querySelector(".empty-state");
    if (empty) empty.remove();
  }

  function showEmpty(el) {
    if (!el.querySelector(".empty-state")) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">✨</div><p>Generated images appear here</p></div>`;
    }
  }

  // Gallery
  function getGallery() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }

  function saveToGallery(item) {
    const g = getGallery();
    g.unshift(item);
    if (g.length > 30) g.length = 30;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
  }

  function renderGallery() {
    const g = getGallery();
    galleryGrid.innerHTML = "";
    if (!g.length) {
      galleryGrid.innerHTML = `<div class="empty-state small"><p>No images yet</p></div>`;
      return;
    }
    g.forEach(item => {
      const div = document.createElement("div");
      div.className = "gallery-item";
      div.innerHTML = `<img src="${item.src}" alt="" loading="lazy" />`;
      div.addEventListener("click", () => openLightbox(item.src));
      galleryGrid.appendChild(div);
    });
  }

  clearResultsBtn.addEventListener("click", () => {
    resultsGrid.innerHTML = "";
    showEmpty(resultsGrid);
  });

  clearGalleryBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderGallery();
  });

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.remove("hidden");
  }
  lightboxClose.addEventListener("click", () => lightbox.classList.add("hidden"));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.classList.add("hidden");
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const t = document.querySelector(a.getAttribute("href"));
      if (t) t.scrollIntoView({ behavior: "smooth" });
    });
  });

  renderGallery();
});
