/**
 * RE:CREATE Platform - Main Application Logic
 * Powered by ReCreateDB (Real Database & Server Sync)
 * Slogan: "متترميش القديم.. اصنع منه حاجة جديدة!"
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Database Engine (Server API + Local sync)
  await ReCreateDB.init();

  let currentCategory = "all";
  let currentDifficulty = "all";
  let currentMaterial = "all";
  let searchQuery = "";
  let currentProjectId = null;
  let currentStepIndex = 0;
  let isPagedMode = false;

  // Bookmarks
  let bookmarkedIds = new Set();
  try {
    const savedBookmarks = localStorage.getItem("recreate_bookmarks");
    if (savedBookmarks) bookmarkedIds = new Set(JSON.parse(savedBookmarks));
  } catch (e) {
    console.warn("Bookmarks warning:", e);
  }

  // DOM Elements
  const categoriesNavContainer = document.getElementById("categoriesNavContainer");
  const projectsGrid = document.getElementById("projectsGrid");
  const projectsCount = document.getElementById("projectsCount");
  const noResultsState = document.getElementById("noResultsState");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const difficultyFilter = document.getElementById("difficultyFilter");
  const materialFilter = document.getElementById("materialFilter");
  const bookmarkCountBadge = document.getElementById("bookmarkCount");

  // Modals
  const projectModal = document.getElementById("projectModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const addProjectModal = document.getElementById("addProjectModal");
  const openAddProjectModalBtn = document.getElementById("openAddProjectModalBtn");
  const closeAddModalBtn = document.getElementById("closeAddModalBtn");
  const addProjectForm = document.getElementById("addProjectForm");
  const newCategorySelect = document.getElementById("newCategory");
  const aboutProjectModal = document.getElementById("aboutProjectModal");
  const openAboutProjectBtn = document.getElementById("openAboutProjectBtn");
  const closeAboutModalBtn = document.getElementById("closeAboutModalBtn");
  const teamBadge = document.getElementById("teamBadge");
  const bookmarksModal = document.getElementById("bookmarksModal");
  const bookmarksToggleBtn = document.getElementById("bookmarksToggleBtn");
  const closeBookmarksModalBtn = document.getElementById("closeBookmarksModalBtn");
  const bookmarksList = document.getElementById("bookmarksList");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  // Detail Modal Elements
  const modalCategory = document.getElementById("modalCategory");
  const modalDifficulty = document.getElementById("modalDifficulty");
  const modalTime = document.getElementById("modalTime");
  const modalTitle = document.getElementById("modalTitle");
  const modalAuthor = document.getElementById("modalAuthor");
  const modalViews = document.getElementById("modalViews");
  const modalLikes = document.getElementById("modalLikes");
  const modalFeaturedMedia = document.getElementById("modalFeaturedMedia");
  const modalDescription = document.getElementById("modalDescription");
  const modalSuppliesList = document.getElementById("modalSuppliesList");
  const modalStepsContainer = document.getElementById("modalStepsContainer");
  const modalProTip = document.getElementById("modalProTip");
  const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");
  const modalPrintBtn = document.getElementById("modalPrintBtn");
  const modalDoneBtn = document.getElementById("modalDoneBtn");
  const viewAllStepsBtn = document.getElementById("viewAllStepsBtn");
  const viewPagedStepBtn = document.getElementById("viewPagedStepBtn");
  const pagedControls = document.getElementById("pagedControls");
  const prevStepBtn = document.getElementById("prevStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const stepIndicatorText = document.getElementById("stepIndicatorText");

  // Render Dynamic Category Tabs
  function renderCategoryTabs() {
    if (!categoriesNavContainer) return;

    const categories = ReCreateDB.categories;
    const projects = ReCreateDB.projects;

    let tabsHtml = `
      <button class="nav-tab ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
        <i class="fa-solid fa-border-all"></i>
        <span>جميع المشروعات (${projects.length})</span>
      </button>
    `;

    categories.forEach((c, idx) => {
      const active = currentCategory === c.id ? "active" : "";
      tabsHtml += `
        <button class="nav-tab ${active}" data-category="${c.id}">
          <i class="fa-solid ${c.icon || 'fa-folder'}"></i>
          <span>${idx + 1}. ${escapeHTML(c.name)}</span>
        </button>
      `;
    });

    categoriesNavContainer.innerHTML = tabsHtml;

    // Attach click events
    categoriesNavContainer.querySelectorAll(".nav-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        categoriesNavContainer.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentCategory = tab.dataset.category;
        renderProjects();
      });
    });

    // Populate category select in Add Form
    if (newCategorySelect) {
      newCategorySelect.innerHTML = categories.map((c, idx) => `
        <option value="${c.id}">${idx + 1}. ${escapeHTML(c.name)}</option>
      `).join("");
    }
  }

  // Update Bookmark Count Badge
  function updateBookmarkBadge() {
    if (bookmarkCountBadge) {
      bookmarkCountBadge.textContent = bookmarkedIds.size;
    }
    const mobBookmarkCount = document.getElementById("mobBookmarkCount");
    if (mobBookmarkCount) {
      mobBookmarkCount.textContent = bookmarkedIds.size;
    }
  }
  updateBookmarkBadge();

  // Filter Projects Logic
  function getFilteredProjects() {
    return ReCreateDB.projects.filter(p => {
      if (currentCategory !== "all" && p.category !== currentCategory) return false;
      if (currentDifficulty !== "all" && p.difficulty !== currentDifficulty) return false;
      if (currentMaterial !== "all") {
        if (!p.material || !p.material.includes(currentMaterial)) return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(q);
        const inDesc = p.summary ? p.summary.toLowerCase().includes(q) : false;
        const inCat = p.categoryName ? p.categoryName.toLowerCase().includes(q) : false;
        const inSupplies = p.supplies ? p.supplies.some(s => s.toLowerCase().includes(q)) : false;
        if (!inTitle && !inDesc && !inCat && !inSupplies) return false;
      }
      return true;
    });
  }

  // Render Projects Grid
  function renderProjects() {
    const filtered = getFilteredProjects();

    projectsCount.textContent = `${filtered.length} مشروع`;

    if (filtered.length === 0) {
      projectsGrid.style.display = "none";
      noResultsState.style.display = "block";
      return;
    }

    projectsGrid.style.display = "grid";
    noResultsState.style.display = "none";

    projectsGrid.innerHTML = filtered.map(p => {
      const isBookmarked = bookmarkedIds.has(p.id);
      const catObj = ReCreateDB.categories.find(c => c.id === p.category);
      const catColor = catObj ? catObj.badgeColor : "#0D9488";
      const catName = catObj ? catObj.name : (p.categoryName || "مشروع إعادة تدوير");

      return `
        <article class="project-card" data-id="${p.id}">
          <div class="card-media">
            ${p.image ? `<img src="${p.image}" class="card-img" alt="${escapeHTML(p.title)}">` : (p.coverSvg || `<div class="placeholder-svg"><i class="fa-solid fa-recycle fa-3x text-muted"></i></div>`)}
            <span class="card-category-badge" style="background-color: ${catColor};">${escapeHTML(catName)}</span>
            <button class="card-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-id="${p.id}" title="${isBookmarked ? 'إزالة من المحفوظات' : 'حفظ المشروع'}">
              <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </button>
          </div>

          <div class="card-content">
            <h3 class="card-title">${escapeHTML(p.title)}</h3>
            <p class="card-summary">${escapeHTML(p.summary || '')}</p>

            <div class="card-meta-row">
              <span class="meta-pill"><i class="fa-solid fa-gauge-simple-high"></i> ${p.difficulty || 'سهل'}</span>
              <span class="meta-pill"><i class="fa-regular fa-clock"></i> ${p.time || '20 دقيقة'}</span>
            </div>

            <div class="card-footer">
              <div class="card-author">
                <span class="card-author-avatar">R</span>
                <span class="card-author-name">${escapeHTML(p.author || 'فريق RE:CREATE')}</span>
              </div>
              <div class="card-stats">
                <span><i class="fa-regular fa-eye"></i> ${p.views || '1.8k'}</span>
                <span><i class="fa-regular fa-heart"></i> ${p.likes || '65'}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Card clicks
    document.querySelectorAll(".project-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".card-bookmark-btn")) return;
        const id = card.dataset.id;
        openProjectModal(id);
      });
    });

    // Bookmark toggles
    document.querySelectorAll(".card-bookmark-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.bookmarkId;
        toggleBookmark(id);
      });
    });
  }

  // Toggle Bookmark
  function toggleBookmark(id) {
    if (bookmarkedIds.has(id)) {
      bookmarkedIds.delete(id);
    } else {
      bookmarkedIds.add(id);
    }
    try {
      localStorage.setItem("recreate_bookmarks", JSON.stringify([...bookmarkedIds]));
    } catch (e) {}

    updateBookmarkBadge();
    renderProjects();

    if (currentProjectId === id && modalBookmarkBtn) {
      const isBookmarked = bookmarkedIds.has(id);
      modalBookmarkBtn.innerHTML = `<i class="${isBookmarked ? 'fa-solid text-red' : 'fa-regular'} fa-bookmark"></i>`;
    }
  }

  // Open Project Detail Modal
  function openProjectModal(id) {
    const project = ReCreateDB.projects.find(p => p.id === id);
    if (!project) return;

    currentProjectId = id;
    currentStepIndex = 0;
    isPagedMode = false;

    const catObj = ReCreateDB.categories.find(c => c.id === project.category);
    const catName = catObj ? catObj.name : (project.categoryName || "مشروع إعادة تدوير");

    modalTitle.textContent = project.title;
    modalCategory.textContent = catName;
    if (catObj && catObj.badgeColor) {
      modalCategory.style.backgroundColor = catObj.badgeColor;
    }
    modalDifficulty.textContent = project.difficulty || "سهل";
    modalTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${project.time || '20 دقيقة'}`;
    modalAuthor.textContent = project.author || "فريق RE:CREATE";
    modalViews.textContent = project.views || "2.4k";
    modalLikes.textContent = project.likes || 140;
    modalDescription.textContent = project.summary || "";

    modalFeaturedMedia.innerHTML = project.image ? `<img src="${project.image}" class="modal-featured-img" alt="${escapeHTML(project.title)}">` : (project.coverSvg || `<i class="fa-solid fa-recycle fa-4x text-muted" style="padding: 40px;"></i>`);

    if (project.proTip) {
      document.getElementById("modalProTipBox").style.display = "block";
      modalProTip.textContent = project.proTip;
    } else {
      document.getElementById("modalProTipBox").style.display = "none";
    }

    const isBookmarked = bookmarkedIds.has(project.id);
    modalBookmarkBtn.innerHTML = `<i class="${isBookmarked ? 'fa-solid text-red' : 'fa-regular'} fa-bookmark"></i>`;

    renderSuppliesChecklist(project.supplies || []);

    viewAllStepsBtn.classList.add("active");
    viewPagedStepBtn.classList.remove("active");
    pagedControls.style.display = "none";
    renderSteps(project.steps || []);

    modalDoneBtn.innerHTML = `<i class="fa-solid fa-thumbs-up"></i> إعجاب بالمشروع`;
    modalDoneBtn.disabled = false;

    projectModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  // Render Supplies Checklist
  function renderSuppliesChecklist(supplies) {
    if (!supplies || supplies.length === 0) {
      modalSuppliesList.innerHTML = `<p class="text-muted">لم يتم إدراج خامات إضافية.</p>`;
      return;
    }

    modalSuppliesList.innerHTML = supplies.map((sup, idx) => `
      <label class="supply-item" for="supply_${idx}">
        <input type="checkbox" id="supply_${idx}" class="supply-checkbox">
        <span class="supply-label">${escapeHTML(sup)}</span>
      </label>
    `).join("");

    modalSuppliesList.querySelectorAll(".supply-item").forEach(item => {
      const checkbox = item.querySelector(".supply-checkbox");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          item.classList.add("checked");
        } else {
          item.classList.remove("checked");
        }
      });
    });
  }

  // Render Steps
  function renderSteps(steps) {
    if (!steps || steps.length === 0) {
      modalStepsContainer.innerHTML = `<p>لا توجد خطوات مسجلة لهذا المشروع.</p>`;
      return;
    }

    if (!isPagedMode) {
      modalStepsContainer.innerHTML = steps.map((s, idx) => `
        <div class="step-card">
          <div class="step-header">
            <span class="step-badge">الخطوة ${idx + 1}</span>
            <h4 class="step-title-text">${escapeHTML(s.title || `خطوة رقم ${idx + 1}`)}</h4>
          </div>
          <p class="step-body-text">${escapeHTML(s.description || '')}</p>
          ${s.tip ? `
            <div class="step-tip-callout">
              <i class="fa-solid fa-lightbulb"></i>
              <span>${escapeHTML(s.tip)}</span>
            </div>
          ` : ''}
        </div>
      `).join("");
    } else {
      const s = steps[currentStepIndex];
      stepIndicatorText.textContent = `خطوة ${currentStepIndex + 1} من ${steps.length}`;
      prevStepBtn.disabled = currentStepIndex === 0;
      nextStepBtn.disabled = currentStepIndex === steps.length - 1;

      modalStepsContainer.innerHTML = `
        <div class="step-card" style="border-right: 4px solid var(--color-primary-yellow);">
          <div class="step-header">
            <span class="step-badge">الخطوة ${currentStepIndex + 1}</span>
            <h4 class="step-title-text">${escapeHTML(s.title || `خطوة رقم ${currentStepIndex + 1}`)}</h4>
          </div>
          <p class="step-body-text">${escapeHTML(s.description || '')}</p>
          ${s.tip ? `
            <div class="step-tip-callout">
              <i class="fa-solid fa-lightbulb"></i>
              <span>${escapeHTML(s.tip)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  // Stepper View Mode Listeners
  viewAllStepsBtn.addEventListener("click", () => {
    isPagedMode = false;
    viewAllStepsBtn.classList.add("active");
    viewPagedStepBtn.classList.remove("active");
    pagedControls.style.display = "none";
    const project = ReCreateDB.projects.find(p => p.id === currentProjectId);
    if (project) renderSteps(project.steps || []);
  });

  viewPagedStepBtn.addEventListener("click", () => {
    isPagedMode = true;
    viewPagedStepBtn.classList.add("active");
    viewAllStepsBtn.classList.remove("active");
    pagedControls.style.display = "flex";
    currentStepIndex = 0;
    const project = ReCreateDB.projects.find(p => p.id === currentProjectId);
    if (project) renderSteps(project.steps || []);
  });

  prevStepBtn.addEventListener("click", () => {
    const project = ReCreateDB.projects.find(p => p.id === currentProjectId);
    if (project && currentStepIndex > 0) {
      currentStepIndex--;
      renderSteps(project.steps || []);
    }
  });

  nextStepBtn.addEventListener("click", () => {
    const project = ReCreateDB.projects.find(p => p.id === currentProjectId);
    if (project && currentStepIndex < (project.steps || []).length - 1) {
      currentStepIndex++;
      renderSteps(project.steps || []);
    }
  });

  // Modal Actions
  modalBookmarkBtn.addEventListener("click", () => {
    if (currentProjectId) toggleBookmark(currentProjectId);
  });

  modalPrintBtn.addEventListener("click", () => {
    window.print();
  });

  modalDoneBtn.addEventListener("click", async () => {
    const project = ReCreateDB.projects.find(p => p.id === currentProjectId);
    if (project) {
      const newLikes = (project.likes || 0) + 1;
      await ReCreateDB.updateProject(project.id, { likes: newLikes });
      modalLikes.textContent = newLikes;
      renderProjects();
      modalDoneBtn.innerHTML = `<i class="fa-solid fa-check"></i> تم التقييم! شكراً لتشجيعك`;
      modalDoneBtn.disabled = true;
    }
  });

  closeModalBtn.addEventListener("click", () => {
    projectModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  projectModal.addEventListener("click", (e) => {
    if (e.target === projectModal) {
      projectModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  // Search Input Filter
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery.length > 0 ? "block" : "none";
    renderProjects();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    renderProjects();
    searchInput.focus();
  });

  difficultyFilter.addEventListener("change", (e) => {
    currentDifficulty = e.target.value;
    renderProjects();
  });

  materialFilter.addEventListener("change", (e) => {
    currentMaterial = e.target.value;
    renderProjects();
  });

  resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    difficultyFilter.value = "all";
    currentDifficulty = "all";
    materialFilter.value = "all";
    currentMaterial = "all";
    currentCategory = "all";
    renderCategoryTabs();
    renderProjects();
  });

  // About Project Modal Handlers
  openAboutProjectBtn.addEventListener("click", () => {
    aboutProjectModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeAboutModalBtn.addEventListener("click", () => {
    aboutProjectModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  aboutProjectModal.addEventListener("click", (e) => {
    if (e.target === aboutProjectModal) {
      aboutProjectModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  teamBadge.addEventListener("click", () => {
    aboutProjectModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  // Add Project Form (Visitor submission)
  openAddProjectModalBtn.addEventListener("click", () => {
    addProjectModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeAddModalBtn.addEventListener("click", () => {
    addProjectModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  addProjectModal.addEventListener("click", (e) => {
    if (e.target === addProjectModal) {
      addProjectModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  const newImageFile = document.getElementById("newImageFile");
  const newImagePreviewBox = document.getElementById("newImagePreviewBox");
  const newImagePreviewImg = document.getElementById("newImagePreviewImg");
  const removeNewImageBtn = document.getElementById("removeNewImageBtn");
  let userImageBase64 = null;

  if (newImageFile) {
    newImageFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          userImageBase64 = event.target.result;
          newImagePreviewImg.src = userImageBase64;
          newImagePreviewBox.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeNewImageBtn) {
    removeNewImageBtn.addEventListener("click", () => {
      userImageBase64 = null;
      if (newImageFile) newImageFile.value = "";
      if (newImagePreviewBox) newImagePreviewBox.style.display = "none";
    });
  }

  addProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("newTitle").value.trim();
    const category = document.getElementById("newCategory").value;
    const difficulty = document.getElementById("newDifficulty").value;
    const time = document.getElementById("newTime").value.trim() || "20 دقيقة";
    const material = document.getElementById("newMaterial").value;
    const description = document.getElementById("newDescription").value.trim();
    const suppliesRaw = document.getElementById("newSupplies").value.trim();
    const stepsRaw = document.getElementById("newSteps").value.trim();

    const catObj = ReCreateDB.categories.find(c => c.id === category);
    const supplies = suppliesRaw ? suppliesRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    const steps = stepsRaw.split("\n").filter(Boolean).map((line, idx) => ({
      title: `الخطوة ${idx + 1}: ${line.replace(/^الخطوة\s*\d+\s*:\s*/, '')}`,
      description: line,
      tip: "تأكد من ضبط الحواف بعناية والعمل في مكان آمن."
    }));

    // If an image was selected, upload it to the backend server/database
    let imageUrl = null;
    if (userImageBase64) {
      imageUrl = await ReCreateDB.uploadImage(userImageBase64);
    }

    const newProject = {
      id: "recreate-user-" + Date.now(),
      title,
      category,
      categoryName: catObj ? catObj.name : "مشروع إعادة تدوير",
      author: "طالب مشارك",
      difficulty,
      time,
      material,
      views: "1",
      likes: 1,
      summary: description,
      supplies,
      steps,
      proTip: "فكرة رائعة ومبتكرة شارك بها أحد الطلاب لدعم بيئة مدرستنا!",
      image: imageUrl || null,
      coverSvg: `<svg viewBox="0 0 400 240" class="card-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#FEF3C7"/>
        <circle cx="200" cy="115" r="55" fill="#FDE68A"/>
        <path d="M180 115 L220 115 M200 95 L200 135" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
        <text x="200" y="195" font-size="14" font-family="sans-serif" font-weight="bold" fill="#92400E" text-anchor="middle">فكرة مشارك جديدة</text>
      </svg>`
    };

    // Save directly into database (server / disk / local engine)
    await ReCreateDB.addProject(newProject);

    addProjectForm.reset();
    userImageBase64 = null;
    if (newImagePreviewBox) newImagePreviewBox.style.display = "none";
    addProjectModal.style.display = "none";
    document.body.style.overflow = "auto";
    renderCategoryTabs();
    renderProjects();
    openProjectModal(newProject.id);
  });

  // Bookmarks Modal Handlers
  bookmarksToggleBtn.addEventListener("click", () => {
    renderBookmarksDrawer();
    bookmarksModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeBookmarksModalBtn.addEventListener("click", () => {
    bookmarksModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  bookmarksModal.addEventListener("click", (e) => {
    if (e.target === bookmarksModal) {
      bookmarksModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  function renderBookmarksDrawer() {
    const list = ReCreateDB.projects.filter(p => bookmarkedIds.has(p.id));
    if (list.length === 0) {
      bookmarksList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748B;">
          <i class="fa-regular fa-bookmark fa-3x" style="margin-bottom: 12px; color: #CBD5E1;"></i>
          <p>لم تقم بحفظ أي مشروع بعد! انقر على زر المرجعية في أي بطاقة لحفظها هنا.</p>
        </div>
      `;
      return;
    }

    bookmarksList.innerHTML = list.map(p => `
      <div class="bookmark-item-row" data-id="${p.id}">
        <div>
          <strong style="display: block; font-size: 13.5px; color: #1E293B;">${escapeHTML(p.title)}</strong>
          <span style="font-size: 11.5px; color: #64748B;"><i class="fa-solid fa-tag"></i> ${p.categoryName || ''}</span>
        </div>
        <button class="action-circle-btn remove-bookmark-direct" data-id="${p.id}" title="إزالة">
          <i class="fa-solid fa-trash-can text-red"></i>
        </button>
      </div>
    `).join("");

    bookmarksList.querySelectorAll(".bookmark-item-row").forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".remove-bookmark-direct")) return;
        bookmarksModal.style.display = "none";
        document.body.style.overflow = "auto";
        openProjectModal(row.dataset.id);
      });
    });

    bookmarksList.querySelectorAll(".remove-bookmark-direct").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleBookmark(btn.dataset.id);
        renderBookmarksDrawer();
      });
    });
  }

  // ============================================================
  // Physics Interactive Pendulum Simulator
  // ============================================================
  const canvas = document.getElementById("pendulumCanvas");
  const releaseBtn = document.getElementById("releasePendulumBtn");
  const speedText = document.getElementById("pendulumSpeedText");

  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const originX = 140;
    const originY = 22;
    const length = 95;
    let angle = Math.PI / 4;
    let angleVelocity = 0;
    let angleAcceleration = 0;
    const gravity = 0.45;
    const damping = 0.995;

    function drawPendulum() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      angleAcceleration = (-1 * gravity / length) * Math.sin(angle) * 10;
      angleVelocity += angleAcceleration;
      angleVelocity *= damping;
      angle += angleVelocity;

      const bobX = originX + length * Math.sin(angle);
      const bobY = originY + length * Math.cos(angle);

      ctx.beginPath();
      ctx.moveTo(originX - 25, originY);
      ctx.lineTo(originX + 25, originY);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(bobX, 150, Math.max(4, 16 * (1 - Math.abs(angle))), 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.fill();

      const speed = Math.abs(angleVelocity * length);
      if (speedText) {
        speedText.textContent = `طاقة الحركة: ${(speed * 2.8).toFixed(1)} جول`;
      }

      ctx.beginPath();
      ctx.arc(bobX, bobY, 13, 0, Math.PI * 2);
      ctx.fillStyle = speed > 3.5 ? "#DC2626" : "#2563EB";
      ctx.fill();
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bobX - 4, bobY - 4, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      requestAnimationFrame(drawPendulum);
    }

    requestAnimationFrame(drawPendulum);

    releaseBtn.addEventListener("click", () => {
      angle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3);
      angleVelocity = 0;
    });
  }

  // ============================================================
  // Mobile Bottom Navigation Bar Wireup
  // ============================================================
  const mobNavHome = document.getElementById("mobNavHome");
  const mobNavCategories = document.getElementById("mobNavCategories");
  const mobNavPublish = document.getElementById("mobNavPublish");
  const mobNavBookmarks = document.getElementById("mobNavBookmarks");
  const mobNavAbout = document.getElementById("mobNavAbout");

  function setMobileActiveNav(activeBtn) {
    document.querySelectorAll(".mobile-nav-item").forEach(btn => btn.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
  }

  if (mobNavHome) {
    mobNavHome.addEventListener("click", () => {
      setMobileActiveNav(mobNavHome);
      currentCategory = "all";
      currentSearch = "";
      currentDifficulty = "all";
      currentMaterial = "all";
      if (searchInput) searchInput.value = "";
      if (clearSearchBtn) clearSearchBtn.style.display = "none";
      if (difficultyFilter) difficultyFilter.value = "all";
      if (materialFilter) materialFilter.value = "all";
      renderCategoryTabs();
      renderProjects();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (mobNavCategories) {
    mobNavCategories.addEventListener("click", () => {
      setMobileActiveNav(mobNavCategories);
      const catNav = document.getElementById("categoriesNavContainer");
      if (catNav) {
        catNav.scrollIntoView({ behavior: "smooth", block: "center" });
        catNav.classList.add("pulse-highlight");
        setTimeout(() => catNav.classList.remove("pulse-highlight"), 1000);
      }
    });
  }

  if (mobNavPublish) {
    mobNavPublish.addEventListener("click", () => {
      if (openAddProjectModalBtn) {
        openAddProjectModalBtn.click();
      } else if (addProjectModal) {
        addProjectModal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    });
  }

  if (mobNavBookmarks) {
    mobNavBookmarks.addEventListener("click", () => {
      setMobileActiveNav(mobNavBookmarks);
      bookmarksToggleBtn.click();
    });
  }

  if (mobNavAbout) {
    mobNavAbout.addEventListener("click", () => {
      setMobileActiveNav(mobNavAbout);
      openAboutProjectBtn.click();
    });
  }

  // Initial render
  renderCategoryTabs();
  renderProjects();
});

// Helper Escape HTML
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
