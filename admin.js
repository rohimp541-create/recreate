/**
 * RE:CREATE - Admin Dashboard Logic
 * Powered by ReCreateDB (Real Database & Server Sync)
 * Direct file/API persistence - Nothing disappears on refresh!
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Database Engine
  await ReCreateDB.init();

  let projectSearchQuery = "";
  let categoryFilterValue = "all";
  let itemToDelete = null; // { type: 'project' | 'category', id: string }

  // DOM Elements - Stats
  const statProjectsCount = document.getElementById("statProjectsCount");
  const statCategoriesCount = document.getElementById("statCategoriesCount");
  const statTotalViews = document.getElementById("statTotalViews");
  const statTotalLikes = document.getElementById("statTotalLikes");

  // Tabs
  const adminTabs = document.querySelectorAll(".admin-tab");
  const tabPanes = document.querySelectorAll(".admin-tab-pane");

  // Projects View
  const projectsTableBody = document.getElementById("projectsTableBody");
  const noAdminProjects = document.getElementById("noAdminProjects");
  const adminProjectSearch = document.getElementById("adminProjectSearch");
  const adminCategoryFilter = document.getElementById("adminCategoryFilter");

  // Categories View
  const adminCategoriesList = document.getElementById("adminCategoriesList");
  const openAddCategoryBtn = document.getElementById("openAddCategoryBtn");

  // Add Project Form
  const adminAddProjectForm = document.getElementById("adminAddProjectForm");
  const adminNewCategory = document.getElementById("adminNewCategory");

  // Alert Box
  const adminAlert = document.getElementById("adminAlert");

  // Edit Project Modal
  const editProjectModal = document.getElementById("editProjectModal");
  const closeEditModalBtn = document.getElementById("closeEditModalBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editProjectForm = document.getElementById("editProjectForm");
  const editProjectId = document.getElementById("editProjectId");
  const editTitle = document.getElementById("editTitle");
  const editCategory = document.getElementById("editCategory");
  const editAuthor = document.getElementById("editAuthor");
  const editDifficulty = document.getElementById("editDifficulty");
  const editTime = document.getElementById("editTime");
  const editMaterial = document.getElementById("editMaterial");
  const editSummary = document.getElementById("editSummary");
  const editSupplies = document.getElementById("editSupplies");
  const editSteps = document.getElementById("editSteps");
  const editProTip = document.getElementById("editProTip");
  const editImageFile = document.getElementById("editImageFile");
  const editImagePreviewBox = document.getElementById("editImagePreviewBox");
  const editImagePreviewImg = document.getElementById("editImagePreviewImg");
  const editRemoveImageBtn = document.getElementById("editRemoveImageBtn");
  const editExistingImage = document.getElementById("editExistingImage");
  let editNewImageBase64 = null;

  const adminNewImageFile = document.getElementById("adminNewImageFile");
  const adminNewImagePreviewBox = document.getElementById("adminNewImagePreviewBox");
  const adminNewImagePreviewImg = document.getElementById("adminNewImagePreviewImg");
  const adminRemoveNewImageBtn = document.getElementById("adminRemoveNewImageBtn");
  let adminNewImageBase64 = null;

  // Category Modal
  const categoryModal = document.getElementById("categoryModal");
  const categoryModalTitle = document.getElementById("categoryModalTitle");
  const closeCategoryModalBtn = document.getElementById("closeCategoryModalBtn");
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  const categoryForm = document.getElementById("categoryForm");
  const editCategoryId = document.getElementById("editCategoryId");
  const categoryNameInput = document.getElementById("categoryNameInput");
  const categoryIconSelect = document.getElementById("categoryIconSelect");
  const categoryColorInput = document.getElementById("categoryColorInput");

  // Delete Confirm Modal
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const closeDeleteConfirmBtn = document.getElementById("closeDeleteConfirmBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const executeDeleteBtn = document.getElementById("executeDeleteBtn");
  const deleteConfirmText = document.getElementById("deleteConfirmText");

  // Backup & Tools
  const exportBackupBtn = document.getElementById("exportBackupBtn");
  const triggerImportBtn = document.getElementById("triggerImportBtn");
  const importFileInput = document.getElementById("importFileInput");
  const restoreDefaultsBtn = document.getElementById("restoreDefaultsBtn");
  const resetDataBtn = document.getElementById("resetDataBtn");

  // Authentication & Login Gate
  const adminLoginGate = document.getElementById("adminLoginGate");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const loginErrorMsg = document.getElementById("loginErrorMsg");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");

  function checkAdminAuth() {
    const isLogged = sessionStorage.getItem("recreate_admin_logged") === "true";
    if (adminLoginGate) {
      if (!isLogged) {
        adminLoginGate.style.display = "flex";
        setTimeout(() => adminPasswordInput && adminPasswordInput.focus(), 100);
      } else {
        adminLoginGate.style.display = "none";
      }
    }
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = adminPasswordInput.value.trim();
      if (entered === "admin" || entered === "admin123" || entered === "recreate") {
        sessionStorage.setItem("recreate_admin_logged", "true");
        loginErrorMsg.style.display = "none";
        adminLoginGate.style.display = "none";
        adminPasswordInput.value = "";
        showAlert("مرحباً بك في لوحة تحكم RE:CREATE!");
      } else {
        loginErrorMsg.style.display = "block";
        adminPasswordInput.select();
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("recreate_admin_logged");
      checkAdminAuth();
      showAlert("تم قفل لوحة التحكم بنجاح.", "error");
    });
  }

  // Show Alert Notification
  function showAlert(message, type = "success") {
    adminAlert.textContent = message;
    adminAlert.className = `admin-alert ${type}`;
    adminAlert.style.display = "flex";
    setTimeout(() => {
      adminAlert.style.display = "none";
    }, 4500);
  }

  // Update Stats
  function updateStats() {
    statProjectsCount.textContent = ReCreateDB.projects.length;
    statCategoriesCount.textContent = ReCreateDB.categories.length;

    let totalViews = 0;
    let totalLikes = 0;
    ReCreateDB.projects.forEach(p => {
      const views = parseInt(String(p.views || "0").replace(/[^0-9]/g, "")) || 0;
      totalViews += views;
      totalLikes += (p.likes || 0);
    });

    statTotalViews.textContent = totalViews.toLocaleString("ar-EG");
    statTotalLikes.textContent = totalLikes.toLocaleString("ar-EG");
  }

  // Populate Category Select Dropdowns
  function populateCategoryDropdowns() {
    const optionsHtml = ReCreateDB.categories.map(c => `
      <option value="${c.id}">${escapeHTML(c.name)}</option>
    `).join("");

    if (adminCategoryFilter) {
      adminCategoryFilter.innerHTML = `<option value="all">جميع الأقسام (${ReCreateDB.projects.length})</option>` + optionsHtml;
      adminCategoryFilter.value = categoryFilterValue;
    }

    if (adminNewCategory) {
      adminNewCategory.innerHTML = optionsHtml;
    }

    if (editCategory) {
      editCategory.innerHTML = optionsHtml;
    }
  }

  // Render Projects Table
  function renderProjectsTable() {
    const filtered = ReCreateDB.projects.filter(p => {
      if (categoryFilterValue !== "all" && p.category !== categoryFilterValue) return false;
      if (projectSearchQuery.trim() !== "") {
        const q = projectSearchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(q);
        const inAuthor = p.author ? p.author.toLowerCase().includes(q) : false;
        const inCat = p.categoryName ? p.categoryName.toLowerCase().includes(q) : false;
        if (!inTitle && !inAuthor && !inCat) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      projectsTableBody.innerHTML = "";
      noAdminProjects.style.display = "block";
      return;
    }

    noAdminProjects.style.display = "none";
    projectsTableBody.innerHTML = filtered.map(p => {
      const catObj = ReCreateDB.categories.find(c => c.id === p.category);
      const catName = catObj ? catObj.name : (p.categoryName || "عام");
      const catColor = catObj ? catObj.badgeColor : "#64748B";

      return `
        <tr data-id="${p.id}">
          <td>
            <div class="table-thumb">
              ${p.image ? `<img src="${p.image}" class="table-img" alt="${escapeHTML(p.title)}">` : (p.coverSvg || `<i class="fa-solid fa-recycle text-muted"></i>`)}
            </div>
          </td>
          <td>
            <strong style="color: #1E293B; font-size: 14px; display: block;">${escapeHTML(p.title)}</strong>
            <span style="font-size: 11.5px; color: #64748B;">ID: ${p.id}</span>
          </td>
          <td>
            <span class="category-pill" style="background-color: ${catColor}; font-size: 11px;">
              ${escapeHTML(catName)}
            </span>
          </td>
          <td>
            <span style="font-weight: 700; color: #334155;">${escapeHTML(p.author || 'فريق RE:CREATE')}</span>
          </td>
          <td>
            <span class="level-pill">${p.difficulty || 'سهل'}</span>
            <span style="font-size: 11.5px; color: #64748B; margin-right: 6px;">${p.time || '20 دقيقة'}</span>
          </td>
          <td>
            <span style="font-size: 12px; color: #64748B;">
              <i class="fa-solid fa-eye"></i> ${p.views || '0'} • <i class="fa-solid fa-heart text-red"></i> ${p.likes || '0'}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-action edit" data-edit-id="${p.id}" title="تعديل المنشور">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-action delete" data-delete-id="${p.id}" title="حذف المنشور">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <a href="index.html" class="btn-action view" title="معاينة في الموقع">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Attach row button events
    projectsTableBody.querySelectorAll(".btn-action.edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editId;
        openEditProjectModal(id);
      });
    });

    projectsTableBody.querySelectorAll(".btn-action.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteId;
        const project = ReCreateDB.projects.find(p => p.id === id);
        if (!project) return;
        itemToDelete = { type: "project", id: id };
        deleteConfirmText.textContent = `هل أنت متأكد من رغبتك في حذف منشور: "${project.title}" نهائياً من قاعدة البيانات؟`;
        deleteConfirmModal.style.display = "flex";
      });
    });
  }

  // Render Categories Grid
  function renderCategoriesGrid() {
    adminCategoriesList.innerHTML = ReCreateDB.categories.map(c => {
      const count = ReCreateDB.projects.filter(p => p.category === c.id).length;
      return `
        <div class="category-admin-card" data-cat-id="${c.id}">
          <div class="category-info-wrap">
            <div class="cat-icon-badge" style="background-color: ${c.badgeColor || '#0D9488'};">
              <i class="fa-solid ${c.icon || 'fa-folder'}"></i>
            </div>
            <div>
              <h4 class="cat-title">${escapeHTML(c.name)}</h4>
              <span class="cat-count">${count} مشروعات مسجلة</span>
            </div>
          </div>
          <div class="table-actions">
            <button class="btn-action edit edit-cat-btn" data-cat-id="${c.id}" title="تعديل اسم ولون القسم">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action delete delete-cat-btn" data-cat-id="${c.id}" title="حذف القسم">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    adminCategoriesList.querySelectorAll(".edit-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const catId = btn.dataset.catId;
        openEditCategoryModal(catId);
      });
    });

    adminCategoriesList.querySelectorAll(".delete-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const catId = btn.dataset.catId;
        const cat = ReCreateDB.categories.find(c => c.id === catId);
        if (!cat) return;
        const count = ReCreateDB.projects.filter(p => p.category === catId).length;
        itemToDelete = { type: "category", id: catId };
        deleteConfirmText.textContent = `هل أنت متأكد من رغبتك في حذف قسم "${cat.name}"؟ (يوجد ${count} مشروعات مسجلة في هذا القسم).`;
        deleteConfirmModal.style.display = "flex";
      });
    });
  }

  // Open Edit Project Modal
  function openEditProjectModal(id) {
    const project = ReCreateDB.projects.find(p => p.id === id);
    if (!project) return;

    editProjectId.value = project.id;
    editTitle.value = project.title || "";
    editCategory.value = project.category || ReCreateDB.categories[0].id;
    editAuthor.value = project.author || "";
    editDifficulty.value = project.difficulty || "سهل";
    editTime.value = project.time || "";
    editMaterial.value = project.material || "";
    editSummary.value = project.summary || "";
    editProTip.value = project.proTip || "";

    editSupplies.value = (project.supplies || []).join("\n");

    if (project.steps && project.steps.length > 0) {
      editSteps.value = project.steps.map(s => {
        return s.description || s.title || "";
      }).join("\n");
    } else {
      editSteps.value = "";
    }

    // Image preview in edit modal
    editNewImageBase64 = null;
    if (editImageFile) editImageFile.value = "";
    editExistingImage.value = project.image || "";
    if (project.image) {
      editImagePreviewImg.src = project.image;
      editImagePreviewBox.style.display = "inline-block";
    } else {
      editImagePreviewBox.style.display = "none";
    }

    editProjectModal.style.display = "flex";
  }

  // Image Upload Handlers in Admin
  if (editImageFile) {
    editImageFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          editNewImageBase64 = event.target.result;
          editImagePreviewImg.src = editNewImageBase64;
          editImagePreviewBox.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (editRemoveImageBtn) {
    editRemoveImageBtn.addEventListener("click", () => {
      editNewImageBase64 = null;
      editExistingImage.value = "";
      if (editImageFile) editImageFile.value = "";
      if (editImagePreviewBox) editImagePreviewBox.style.display = "none";
    });
  }

  if (adminNewImageFile) {
    adminNewImageFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          adminNewImageBase64 = event.target.result;
          adminNewImagePreviewImg.src = adminNewImageBase64;
          adminNewImagePreviewBox.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (adminRemoveNewImageBtn) {
    adminRemoveNewImageBtn.addEventListener("click", () => {
      adminNewImageBase64 = null;
      if (adminNewImageFile) adminNewImageFile.value = "";
      if (adminNewImagePreviewBox) adminNewImagePreviewBox.style.display = "none";
    });
  }

  // Submit Edit Project Form (Save to DB)
  editProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editProjectId.value;
    const selectedCatId = editCategory.value;
    const catObj = ReCreateDB.categories.find(c => c.id === selectedCatId);

    const supplies = editSupplies.value.split("\n").map(s => s.trim()).filter(Boolean);
    const steps = editSteps.value.split("\n").map(s => s.trim()).filter(Boolean).map((line, idx) => ({
      title: `الخطوة ${idx + 1}: ${line.replace(/^الخطوة\s*\d+\s*:\s*/, '')}`,
      description: line,
      tip: "تأكد من ضبط الحواف بعناية والعمل في مكان آمن."
    }));

    let finalImageUrl = editExistingImage.value || null;
    if (editNewImageBase64) {
      finalImageUrl = await ReCreateDB.uploadImage(editNewImageBase64);
    }

    const updatePayload = {
      title: editTitle.value.trim(),
      category: selectedCatId,
      categoryName: catObj ? catObj.name : "مشروع إعادة تدوير",
      author: editAuthor.value.trim(),
      difficulty: editDifficulty.value,
      time: editTime.value.trim() || "20 دقيقة",
      material: editMaterial.value.trim() || "خامات متنوعة",
      summary: editSummary.value.trim(),
      supplies,
      steps,
      proTip: editProTip.value.trim(),
      image: finalImageUrl
    };

    // Save in Database
    await ReCreateDB.updateProject(id, updatePayload);

    editProjectModal.style.display = "none";
    renderProjectsTable();
    updateStats();
    showAlert(`تم حفظ وتثبيت تعديلات منشور "${updatePayload.title}" في قاعدة البيانات بنجاح!`);
  });

  // Open Edit Category Modal
  function openEditCategoryModal(catId) {
    const cat = ReCreateDB.categories.find(c => c.id === catId);
    if (!cat) return;

    editCategoryId.value = cat.id;
    categoryModalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-yellow"></i> تعديل قسم: ${escapeHTML(cat.name)}`;
    categoryNameInput.value = cat.name;
    categoryIconSelect.value = cat.icon || "fa-palette";
    categoryColorInput.value = cat.badgeColor || "#0D9488";

    categoryModal.style.display = "flex";
  }

  // Open Add Category Modal
  openAddCategoryBtn.addEventListener("click", () => {
    editCategoryId.value = "";
    categoryModalTitle.innerHTML = `<i class="fa-solid fa-folder-plus text-yellow"></i> إضافة قسم جديد`;
    categoryForm.reset();
    categoryColorInput.value = "#2563EB";
    categoryModal.style.display = "flex";
  });

  // Save Category Form (Add or Edit in DB)
  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editCategoryId.value;
    const name = categoryNameInput.value.trim();
    const icon = categoryIconSelect.value;
    const badgeColor = categoryColorInput.value;

    if (id) {
      await ReCreateDB.updateCategory(id, { name, icon, badgeColor });
      showAlert(`تم تحديث قسم "${name}" في قاعدة البيانات بنجاح!`);
    } else {
      await ReCreateDB.addCategory({ name, icon, badgeColor });
      showAlert(`تمت إضافة القسم الجديد "${name}" في قاعدة البيانات بنجاح!`);
    }

    categoryModal.style.display = "none";
    populateCategoryDropdowns();
    renderCategoriesGrid();
    renderProjectsTable();
    updateStats();
  });

  // Admin Add New Project Form (Direct DB Insert)
  adminAddProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("adminNewTitle").value.trim();
    const category = document.getElementById("adminNewCategory").value;
    const author = document.getElementById("adminNewAuthor").value.trim();
    const difficulty = document.getElementById("adminNewDifficulty").value;
    const time = document.getElementById("adminNewTime").value.trim() || "20 دقيقة";
    const material = document.getElementById("adminNewMaterial").value.trim() || "خامات معاد تدويرها";
    const summary = document.getElementById("adminNewSummary").value.trim();
    const suppliesRaw = document.getElementById("adminNewSupplies").value.trim();
    const stepsRaw = document.getElementById("adminNewSteps").value.trim();
    const proTip = document.getElementById("adminNewProTip").value.trim();

    const catObj = ReCreateDB.categories.find(c => c.id === category);
    const supplies = suppliesRaw ? suppliesRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    const steps = stepsRaw.split("\n").filter(Boolean).map((line, idx) => ({
      title: `الخطوة ${idx + 1}: ${line.replace(/^الخطوة\s*\d+\s*:\s*/, '')}`,
      description: line,
      tip: "تأكد من العمل في مكان جيد الإضاءة وتثبيت الأجزاء بعناية."
    }));

    let imageUrl = null;
    if (adminNewImageBase64) {
      imageUrl = await ReCreateDB.uploadImage(adminNewImageBase64);
    }

    const newProject = {
      id: "admin-proj-" + Date.now(),
      title,
      category,
      categoryName: catObj ? catObj.name : "مشروع إعادة تدوير",
      author,
      difficulty,
      time,
      material,
      views: "1",
      likes: 1,
      summary,
      supplies,
      steps,
      proTip: proTip || "فكرة رائعة تم نشرها مباشرة من لوحة الإدارة لنشر ثقافة إعادة التدوير!",
      image: imageUrl || null,
      coverSvg: `<svg viewBox="0 0 400 240" class="card-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#FEF3C7"/>
        <circle cx="200" cy="115" r="55" fill="#FDE68A"/>
        <path d="M180 115 L220 115 M200 95 L200 135" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
        <text x="200" y="195" font-size="14" font-family="sans-serif" font-weight="bold" fill="#92400E" text-anchor="middle">مشروع مسؤول جديد</text>
      </svg>`
    };

    // Save directly to DB
    await ReCreateDB.addProject(newProject);
    adminAddProjectForm.reset();
    adminNewImageBase64 = null;
    if (adminNewImagePreviewBox) adminNewImagePreviewBox.style.display = "none";

    // Switch back to projects tab
    adminTabs.forEach(t => t.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));
    document.querySelector('[data-tab="tab-projects"]').classList.add("active");
    document.getElementById("tab-projects").classList.add("active");

    renderProjectsTable();
    updateStats();
    showAlert(`تم حفظ ونشر المشروع الجديد "${title}" في قاعدة البيانات بنجاح!`);
  });

  // Execute Deletion in DB
  executeDeleteBtn.addEventListener("click", async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "project") {
      const deleted = await ReCreateDB.deleteProject(itemToDelete.id);
      if (deleted) {
        showAlert(`تم حذف منشور "${deleted.title}" نهائياً من قاعدة البيانات!`, "success");
      }
    } else if (itemToDelete.type === "category") {
      await ReCreateDB.deleteCategory(itemToDelete.id);
      populateCategoryDropdowns();
      renderCategoriesGrid();
      showAlert(`تم حذف القسم نهائياً من قاعدة البيانات!`, "success");
    }

    deleteConfirmModal.style.display = "none";
    itemToDelete = null;
    renderProjectsTable();
    updateStats();
  });

  // Modal Closers
  closeEditModalBtn.addEventListener("click", () => editProjectModal.style.display = "none");
  cancelEditBtn.addEventListener("click", () => editProjectModal.style.display = "none");
  closeCategoryModalBtn.addEventListener("click", () => categoryModal.style.display = "none");
  cancelCategoryBtn.addEventListener("click", () => categoryModal.style.display = "none");
  closeDeleteConfirmBtn.addEventListener("click", () => deleteConfirmModal.style.display = "none");
  cancelDeleteBtn.addEventListener("click", () => deleteConfirmModal.style.display = "none");

  // Tab Switchers
  adminTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      adminTabs.forEach(t => t.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Search and Category Filter
  adminProjectSearch.addEventListener("input", (e) => {
    projectSearchQuery = e.target.value;
    renderProjectsTable();
  });

  adminCategoryFilter.addEventListener("change", (e) => {
    categoryFilterValue = e.target.value;
    renderProjectsTable();
  });

  // Backup & Reset Operations
  exportBackupBtn.addEventListener("click", () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      projects: ReCreateDB.projects,
      categories: ReCreateDB.categories
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recreate_database_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("تم تصدير ملف النسخة الاحتياطية بنجاح!");
  });

  triggerImportBtn.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported.projects) && Array.isArray(imported.categories)) {
          ReCreateDB.projects = imported.projects;
          ReCreateDB.categories = imported.categories;
          ReCreateDB._saveLocal();

          if (ReCreateDB.isServerMode) {
            await fetch("/api/reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projects: ReCreateDB.projects,
                categories: ReCreateDB.categories
              })
            });
          }

          populateCategoryDropdowns();
          renderProjectsTable();
          renderCategoriesGrid();
          updateStats();
          showAlert("تم استيراد وحفظ النسخة الاحتياطية في الداتابيز بنجاح!");
        }
      } catch (err) {
        showAlert("فشل قراءة ملف النسخة الاحتياطية: ملف غير صالح.", "error");
      }
    };
    reader.readAsText(file);
  });

  async function performRestoreDefaults() {
    if (confirm("هل أنت متأكد من رغبتك في استعادة كافة المشروعات والأقسام الافتراضية الأصلية في قاعدة البيانات؟")) {
      await ReCreateDB.resetDefaults();
      populateCategoryDropdowns();
      renderProjectsTable();
      renderCategoriesGrid();
      updateStats();
      showAlert("تمت استعادة كافة البيانات الافتراضية وحفظها في قاعدة البيانات بنجاح!");
    }
  }

  restoreDefaultsBtn.addEventListener("click", performRestoreDefaults);
  resetDataBtn.addEventListener("click", performRestoreDefaults);

  // Initial Boot
  checkAdminAuth();
  populateCategoryDropdowns();
  renderProjectsTable();
  renderCategoriesGrid();
  updateStats();
});

// Escape HTML helper
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
