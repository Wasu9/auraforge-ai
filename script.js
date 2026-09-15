document.addEventListener("DOMContentLoaded", () => {
  // ===== IMAGE =====
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
  let referenceImages = [];
  const STORAGE_KEY = "auraforge_gallery_v2";
  const MAX_REFS = 4;

  const surprisePrompts = [
    "A majestic white wolf on a snowy mountain at sunrise, cinematic, 8k",
    "Futuristic Tokyo street at night with neon and rain, cyberpunk",
    "Elegant fantasy elf with glowing silver hair in enchanted forest",
    "Vintage 1950s diner at dusk, warm neon, photorealistic",
    "Astronaut above Earth, dramatic lighting, detailed spacesuit",
    "Cute robot with red umbrella in rainy Tokyo alley, anime style"
  ];

  countSelector.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      countSelector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      imageCount = parseInt(btn.dataset.count);
    });
  });

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

  // Image refs
  refDrop.addEventListener("click", () => refInput.click());
  refInput.addEventListener("change", e => handleFiles(e.target.files, referenceImages, refPreviews, MAX_REFS));
  setupDragDrop(refDrop, files => handleFiles(files, referenceImages, refPreviews, MAX_REFS));

  function handleFiles(files, store, previewEl, max) {
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      if (store.length >= max) return;
      const reader = new FileReader();
      reader.onload = ev => {
        store.push({ dataUrl: ev.target.result });
        renderRefs(store, previewEl);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderRefs(store, previewEl) {
    previewEl.innerHTML = "";
    store.forEach((ref, idx) => {
      const div = document.createElement("div");
      div.className = "ref-thumb";
      div.innerHTML = `<img src="${ref.dataUrl}" alt="ref"/><button type="button" class="remove-ref">×</button>`;
      div.querySelector(".remove-ref").onclick = e => {
        e.stopPropagation();
        store.splice(idx, 1);
        renderRefs(store, previewEl);
      };
      previewEl.appendChild(div);
    });
  }

  function setupDragDrop(el, onDrop) {
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("dragover"); });
    el.addEventListener("dragleave", () => el.classList.remove("dragover"));
    el.addEventListener("drop", e => {
      e.preventDefault();
      el.classList.remove("dragover");
      onDrop(e.dataTransfer.files);
    });
  }

  generateBtn.addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (!prompt) { statusEl.textContent = "Enter a prompt."; return; }

    setLoading(generateBtn, true);
    statusEl.textContent = "Generating...";
    clearEmpty(resultsGrid);

    const opts = { model: modelEl.value };
    if (referenceImages.length) {
      opts.input_images = referenceImages.map(r => r.dataUrl);
      if (referenceImages.length === 1) opts.input_image = referenceImages[0].dataUrl;
    }

    let success = 0;
    for (let i = 0; i < imageCount; i++) {
      try {
        statusEl.textContent = `Image ${i+1}/${imageCount}...`;
        const data = await genImage(prompt, opts);
        if (data) {
          success++;
          addImageResult(data, resultsGrid);
          saveGallery(data);
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error: " + (err.message || "Failed");
      }
    }
    setLoading(generateBtn, false);
    statusEl.textContent = success ? `Done! ${success} image(s).` : "Failed. Try another model.";
    if (success) renderGallery();
    else showEmpty(resultsGrid, "✨", "Images appear here");
  });

  async function genImage(prompt, options) {
    const result = await puter.ai.txt2img(prompt, options);
    let src = null;
    if (result instanceof HTMLImageElement) src = result.src;
    else if (typeof result === "string") src = result;
    else if (result?.url) src = result.url;
    else if (result?.src) src = result.src;
    if (!src) return null;
    return { src, prompt, model: options.model, time: Date.now() };
  }

  function addImageResult(data, container) {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `<img src="${data.src}" alt="" loading="lazy"/><div class="result-actions"><button type="button" class="view-btn">View</button><a href="${data.src}" download="auraforge.png">Save</a></div>`;
    div.querySelector(".view-btn").onclick = e => { e.stopPropagation(); openLightbox(data.src); };
    div.onclick = () => openLightbox(data.src);
    container.appendChild(div);
  }

  // ===== VIDEO =====
  const videoPromptEl = document.getElementById("videoPrompt");
  const videoModelEl = document.getElementById("videoModel");
  const videoDurationEl = document.getElementById("videoDuration");
  const generateVideoBtn = document.getElementById("generateVideoBtn");
  const videoStatusEl = document.getElementById("videoStatus");
  const videoResultEl = document.getElementById("videoResult");
  const videoRefInput = document.getElementById("videoRefInput");
  const videoRefDrop = document.getElementById("videoRefDrop");
  const videoRefPreviews = document.getElementById("videoRefPreviews");

  let videoRefImages = [];

  videoRefDrop.addEventListener("click", () => videoRefInput.click());
  videoRefInput.addEventListener("change", e => {
    videoRefImages = [];
    handleFiles(e.target.files, videoRefImages, videoRefPreviews, 1);
  });
  setupDragDrop(videoRefDrop, files => {
    videoRefImages = [];
    handleFiles(files, videoRefImages, videoRefPreviews, 1);
  });

  generateVideoBtn.addEventListener("click", async () => {
    const prompt = videoPromptEl.value.trim();
    if (!prompt) { videoStatusEl.textContent = "Enter a video prompt."; return; }

    setLoading(generateVideoBtn, true);
    videoStatusEl.textContent = "Starting video generation... this can take 30–120+ seconds";
    videoResultEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Generating video, please wait...</p></div>`;

    const opts = {
      model: videoModelEl.value,
      seconds: parseInt(videoDurationEl.value) || 4
    };
    if (videoRefImages.length) {
      opts.input_reference = videoRefImages[0].dataUrl;
    }

    try {
      const result = await puter.ai.txt2vid(prompt, opts);
      let videoEl = null;

      if (result instanceof HTMLVideoElement) {
        videoEl = result;
      } else if (typeof result === "string") {
        videoEl = document.createElement("video");
        videoEl.src = result;
        videoEl.controls = true;
      } else if (result?.src || result?.url) {
        videoEl = document.createElement("video");
        videoEl.src = result.src || result.url;
        videoEl.controls = true;
      }

      if (videoEl) {
        videoEl.controls = true;
        videoEl.style.maxWidth = "100%";
        videoEl.style.borderRadius = "12px";
        videoResultEl.innerHTML = "";
        videoResultEl.appendChild(videoEl);
        const actions = document.createElement("div");
        actions.className = "video-actions";
        const dl = document.createElement("a");
        dl.href = videoEl.src;
        dl.download = "auraforge-video.mp4";
        dl.className = "btn-secondary";
        dl.textContent = "Download";
        actions.appendChild(dl);
        videoResultEl.appendChild(actions);
        videoStatusEl.textContent = "Done!";
        videoEl.play().catch(() => {});
      } else {
        videoStatusEl.textContent = "Unexpected response format.";
        console.log(result);
      }
    } catch (err) {
      console.error(err);
      videoStatusEl.textContent = "Error: " + (err.message || err.code || "Video generation failed");
      videoResultEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎬</div><p>Failed. Try shorter duration or another model.</p></div>`;
    }
    setLoading(generateVideoBtn, false);
  });

  // ===== SHARED =====
  function setLoading(btn, on) {
    btn.disabled = on;
    btn.querySelector(".btn-text").classList.toggle("hidden", on);
    btn.querySelector(".btn-loader").classList.toggle("hidden", !on);
  }

  function clearEmpty(el) {
    const e = el.querySelector(".empty-state");
    if (e) e.remove();
  }

  function showEmpty(el, icon, text) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${text}</p></div>`;
  }

  function getGallery() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  }
  function saveGallery(item) {
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
      div.innerHTML = `<img src="${item.src}" alt="" loading="lazy"/>`;
      div.onclick = () => openLightbox(item.src);
      galleryGrid.appendChild(div);
    });
  }

  clearResultsBtn.onclick = () => { resultsGrid.innerHTML = ""; showEmpty(resultsGrid, "✨", "Images appear here"); };
  clearGalleryBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); renderGallery(); };

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.remove("hidden");
  }
  lightboxClose.onclick = () => lightbox.classList.add("hidden");
  lightbox.onclick = e => { if (e.target === lightbox) lightbox.classList.add("hidden"); };

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const t = document.querySelector(a.getAttribute("href"));
      if (t) t.scrollIntoView({ behavior: "smooth" });
    });
  });

  renderGallery();
});
