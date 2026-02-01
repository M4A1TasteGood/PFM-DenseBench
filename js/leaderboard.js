/**
 * PFM-DenseBench Leaderboard - JavaScript Module
 * Handles data loading, chart rendering, table management, and tab navigation
 */

// ==================== Configuration ====================
const CONFIG = {
    statsPath: 'data_computed/stats.json',
    dataPath: 'Data/',
    methods: ['frozen', 'lora', 'dora', 'cnn', 'transformer'],
    methodNames: {
        frozen: 'Frozen',
        lora: 'LoRA',
        dora: 'DoRA',
        cnn: 'CNN Adapter',
        transformer: 'Trans. Adapter'
    },
    methodColors: {
        frozen: '#3b82f6',
        lora: '#22c55e',
        dora: '#a855f7',
        cnn: '#f97316',
        transformer: '#ec4899'
    },
    categoryColors: {
        Nuclear: '#6366f1',
        Gland: '#f59e0b',
        Tissue: '#10b981'
    },
    datasetCategories: {
        Nuclear: ['CoNIC2022', 'CoNSeP', 'cpm15', 'cpm17', 'kumar', 'Kumar', 'Lizard', 'NuCLS', 'PanNuke', 'TNBC'],
        Gland: ['GlaS', 'CRAG', 'RINGS'],
        Tissue: ['BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk']
    }
};

// ==================== Global State ====================
let globalData = {
    stats: null,
    rawData: {},
    charts: {}
};

// ==================== Utility Functions ====================

/**
 * Get category for a dataset
 */
function getDatasetCategory(dataset) {
    for (const [category, datasets] of Object.entries(CONFIG.datasetCategories)) {
        if (datasets.includes(dataset)) {
            return category;
        }
    }
    return 'Other';
}

/**
 * Format number to display
 */
function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

/**
 * Get rank badge HTML
 */
function getRankBadge(position) {
    if (position === 1) return '<span class="lb-rank-badge lb-rank-1">🥇</span>';
    if (position === 2) return '<span class="lb-rank-badge lb-rank-2">🥈</span>';
    if (position === 3) return '<span class="lb-rank-badge lb-rank-3">🥉</span>';
    return `<span class="lb-rank-badge">${position}</span>`;
}

/**
 * Get category badge HTML
 */
function getCategoryBadge(category) {
    const categoryClass = category.toLowerCase();
    return `<span class="lb-category-badge lb-category-badge-${categoryClass}">${category}</span>`;
}

// ==================== Data Loading ====================

/**
 * Load statistics from JSON
 */
async function loadStats() {
    try {
        const response = await fetch(CONFIG.statsPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading stats:', error);
        return null;
    }
}

/**
 * Load raw data for a specific method
 */
async function loadMethodData(method) {
    try {
        const response = await fetch(`${CONFIG.dataPath}${method}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${method} data:`, error);
        return null;
    }
}

/**
 * Load all method data
 */
async function loadAllData() {
    const promises = CONFIG.methods.map(async method => {
        const data = await loadMethodData(method);
        return [method, data];
    });
    
    const results = await Promise.all(promises);
    const rawData = {};
    for (const [method, data] of results) {
        if (data) rawData[method] = data;
    }
    return rawData;
}

/**
 * Compute detailed statistics from raw data
 */
function computeDetailedStats(rawData, stats) {
    // Compute per-category ranks for leaderboard
    const modelCategoryRanks = {};
    
    for (const model of stats.model_ranks) {
        modelCategoryRanks[model.model_key] = {
            model: model.model_display,
            overall: model.avg_rank,
            Nuclear: [],
            Gland: [],
            Tissue: []
        };
    }
    
    // Collect ranks per category
    for (const [method, methodData] of Object.entries(rawData)) {
        for (const [dataset, models] of Object.entries(methodData)) {
            const category = getDatasetCategory(dataset);
            if (category === 'Other') continue;
            
            // Get scores and rank
            const scores = Object.entries(models)
                .filter(([_, m]) => m.Mean_Dice)
                .map(([model, m]) => ({ model, score: m.Mean_Dice.mean }))
                .sort((a, b) => b.score - a.score);
            
            scores.forEach((item, idx) => {
                if (modelCategoryRanks[item.model]) {
                    modelCategoryRanks[item.model][category].push(idx + 1);
                }
            });
        }
    }
    
    // Compute average category ranks
    for (const modelData of Object.values(modelCategoryRanks)) {
        for (const category of ['Nuclear', 'Gland', 'Tissue']) {
            const ranks = modelData[category];
            modelData[`${category}Avg`] = ranks.length > 0 
                ? ranks.reduce((a, b) => a + b, 0) / ranks.length 
                : 999;
        }
    }
    
    // Compute model performance across methods
    const modelMethodPerformance = {};
    
    for (const [method, methodData] of Object.entries(rawData)) {
        for (const [dataset, models] of Object.entries(methodData)) {
            for (const [modelKey, metrics] of Object.entries(models)) {
                if (!metrics.Mean_Dice) continue;
                
                if (!modelMethodPerformance[modelKey]) {
                    modelMethodPerformance[modelKey] = {};
                    for (const m of CONFIG.methods) {
                        modelMethodPerformance[modelKey][m] = [];
                    }
                }
                
                modelMethodPerformance[modelKey][method].push(metrics.Mean_Dice.mean);
            }
        }
    }
    
    // Average across datasets for each method
    for (const modelData of Object.values(modelMethodPerformance)) {
        for (const method of CONFIG.methods) {
            const scores = modelData[method];
            modelData[`${method}Avg`] = scores.length > 0 
                ? scores.reduce((a, b) => a + b, 0) / scores.length 
                : null;
        }
    }
    
    return {
        modelCategoryRanks,
        modelMethodPerformance
    };
}

// ==================== Tab Management ====================

/**
 * Initialize tab switching
 */
function initTabs() {
    const tabs = document.querySelectorAll('.lb-tab');
    const contents = document.querySelectorAll('.lb-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            contents.forEach(content => {
                content.style.display = content.id === `tab-${tabId}` ? 'block' : 'none';
            });
            
            // Trigger chart resize if needed
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
    });
}

// ==================== Chart Rendering ====================

/**
 * Render Top Models horizontal bar chart
 */
function renderTopModelsChart(modelRanks) {
    const ctx = document.getElementById('chart-top-models');
    if (!ctx) return;
    
    // Get top 10 models
    const topModels = modelRanks.slice(0, 10);
    
    // Destroy existing chart
    if (globalData.charts.topModels) {
        globalData.charts.topModels.destroy();
    }
    
    globalData.charts.topModels = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topModels.map(m => m.model_display),
            datasets: [{
                label: 'Average Rank',
                data: topModels.map(m => m.avg_rank),
                backgroundColor: '#6366f1',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Average Rank: ${ctx.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6' },
                    title: {
                        display: false
                    }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Render Category Performance grouped bar chart
 */
function renderCategoryPerformanceChart(detailedStats, modelRanks) {
    const ctx = document.getElementById('chart-category-performance');
    if (!ctx) return;
    
    // Get top 10 models
    const topModels = modelRanks.slice(0, 10);
    const labels = topModels.map(m => m.model_display);
    
    // Destroy existing chart
    if (globalData.charts.categoryPerf) {
        globalData.charts.categoryPerf.destroy();
    }
    
    const datasets = [
        {
            label: 'Nuclear Seg.',
            data: topModels.map(m => detailedStats.modelCategoryRanks[m.model_key]?.NuclearAvg || 0),
            backgroundColor: CONFIG.categoryColors.Nuclear,
            borderRadius: 3
        },
        {
            label: 'Gland Seg.',
            data: topModels.map(m => detailedStats.modelCategoryRanks[m.model_key]?.GlandAvg || 0),
            backgroundColor: CONFIG.categoryColors.Gland,
            borderRadius: 3
        },
        {
            label: 'Tissue Seg.',
            data: topModels.map(m => detailedStats.modelCategoryRanks[m.model_key]?.TissueAvg || 0),
            backgroundColor: CONFIG.categoryColors.Tissue,
            borderRadius: 3
        }
    ];
    
    // Render legend
    const legendContainer = document.getElementById('category-legend');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <span class="lb-chart-legend-item">
                <span class="lb-chart-legend-dot" style="background: ${CONFIG.categoryColors.Nuclear}"></span>
                Nuclear Seg.
            </span>
            <span class="lb-chart-legend-item">
                <span class="lb-chart-legend-dot" style="background: ${CONFIG.categoryColors.Gland}"></span>
                Gland Seg.
            </span>
            <span class="lb-chart-legend-item">
                <span class="lb-chart-legend-dot" style="background: ${CONFIG.categoryColors.Tissue}"></span>
                Tissue Seg.
            </span>
        `;
    }
    
    globalData.charts.categoryPerf = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6' },
                    title: {
                        display: true,
                        text: 'Average Rank'
                    }
                }
            }
        }
    });
}

/**
 * Render Method Comparison bar chart
 */
function renderMethodComparisonChart(methodComparison) {
    const ctx = document.getElementById('chart-method-comparison');
    if (!ctx) return;
    
    // Sort by performance
    const sorted = Object.entries(methodComparison)
        .sort((a, b) => b[1].avg_mDice - a[1].avg_mDice);
    
    // Destroy existing chart
    if (globalData.charts.methodComparison) {
        globalData.charts.methodComparison.destroy();
    }
    
    globalData.charts.methodComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([key]) => CONFIG.methodNames[key]),
            datasets: [{
                label: 'Average mDice',
                data: sorted.map(([_, data]) => data.avg_mDice),
                backgroundColor: sorted.map(([key]) => CONFIG.methodColors[key]),
                borderRadius: 6,
                barThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Average mDice: ${ctx.raw.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    min: 0.6,
                    grid: { color: '#f3f4f6' },
                    title: {
                        display: true,
                        text: 'Average mDice'
                    }
                }
            }
        }
    });
}

/**
 * Render Model Methods bar chart
 */
function renderModelMethodsChart(modelKey, detailedStats) {
    const ctx = document.getElementById('chart-model-methods');
    if (!ctx) return;
    
    const modelData = detailedStats.modelMethodPerformance[modelKey];
    if (!modelData) return;
    
    // Destroy existing chart
    if (globalData.charts.modelMethods) {
        globalData.charts.modelMethods.destroy();
    }
    
    const labels = CONFIG.methods.map(m => CONFIG.methodNames[m]);
    const data = CONFIG.methods.map(m => modelData[`${m}Avg`] || 0);
    const colors = CONFIG.methods.map(m => CONFIG.methodColors[m]);
    
    globalData.charts.modelMethods = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Average mDice',
                data,
                backgroundColor: colors,
                borderRadius: 6,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Average mDice: ${ctx.raw.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    min: 0.5,
                    grid: { color: '#f3f4f6' },
                    title: {
                        display: true,
                        text: 'Average mDice'
                    }
                }
            }
        }
    });
}

// ==================== Table Rendering ====================

/**
 * Render Leaderboard table
 */
function renderLeaderboardTable(modelRanks, detailedStats) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    
    let html = '';
    
    modelRanks.forEach((model, idx) => {
        const categoryData = detailedStats.modelCategoryRanks[model.model_key] || {};
        
        html += `
            <tr data-model="${model.model_key}">
                <td>${getRankBadge(model.position)}</td>
                <td><strong>${model.model_display}</strong></td>
                <td><span class="lb-score-cell ${idx < 3 ? 'lb-score-best' : ''}">${model.avg_rank_display}</span></td>
                <td>${formatNumber(categoryData.NuclearAvg || 0)}</td>
                <td>${formatNumber(categoryData.GlandAvg || 0)}</td>
                <td>${formatNumber(categoryData.TissueAvg || 0)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Update model count
    const countEl = document.getElementById('lb-model-count');
    if (countEl) {
        countEl.textContent = `${modelRanks.length} of ${modelRanks.length} models`;
    }
}

/**
 * Render Tasks table
 */
function renderTasksTable(datasetSota, activeTask = 'all') {
    const tbody = document.getElementById('tasks-tbody');
    if (!tbody) return;
    
    // Sort by mDice descending
    let datasets = Object.entries(datasetSota)
        .sort((a, b) => b[1].mDice - a[1].mDice);
    
    // Filter by task if needed
    if (activeTask !== 'all') {
        const categoryMap = { nuclear: 'Nuclear', gland: 'Gland', tissue: 'Tissue' };
        const category = categoryMap[activeTask];
        datasets = datasets.filter(([_, data]) => data.category === category);
    }
    
    let html = '';
    
    datasets.forEach(([key, data]) => {
        html += `
            <tr>
                <td>${getCategoryBadge(data.category)}</td>
                <td><strong>${data.dataset_display}</strong></td>
                <td><span class="lb-score-cell lb-score-best">${data.mDice_display}</span></td>
                <td>${data.model}</td>
                <td><span class="lb-method-badge">${data.method}</span></td>
                <td>[${data.ci_lower.toFixed(3)}, ${data.ci_upper.toFixed(3)}]</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="loading-cell">No data available</td></tr>';
}

/**
 * Render Task category cards
 */
function renderTaskCards(datasetSota) {
    const container = document.getElementById('task-cards');
    if (!container) return;
    
    const categories = ['Nuclear', 'Gland', 'Tissue'];
    let html = '';
    
    categories.forEach(category => {
        const datasets = Object.values(datasetSota).filter(d => d.category === category);
        const avgDice = datasets.length > 0 
            ? datasets.reduce((sum, d) => sum + d.mDice, 0) / datasets.length 
            : 0;
        const bestDice = datasets.length > 0 
            ? Math.max(...datasets.map(d => d.mDice)) 
            : 0;
        
        html += `
            <div class="lb-task-card lb-task-card-${category.toLowerCase()}">
                <h4>${category} Segmentation</h4>
                <div class="lb-task-card-count">${datasets.length} datasets</div>
                <div class="lb-task-card-stats">
                    <div class="lb-task-stat">
                        <div class="lb-task-stat-value">${formatNumber(avgDice, 4)}</div>
                        <div class="lb-task-stat-label">Avg. SOTA</div>
                    </div>
                    <div class="lb-task-stat">
                        <div class="lb-task-stat-value">${formatNumber(bestDice, 4)}</div>
                        <div class="lb-task-stat-label">Best SOTA</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Render Method cards
 */
function renderMethodCards(methodComparison) {
    const container = document.getElementById('method-cards');
    if (!container) return;
    
    // Sort by performance
    const sorted = Object.entries(methodComparison)
        .sort((a, b) => b[1].avg_mDice - a[1].avg_mDice);
    
    let html = '';
    
    sorted.forEach(([key, data], idx) => {
        const isBest = idx === 0;
        html += `
            <div class="lb-method-card ${isBest ? 'best' : ''}" data-method="${key}">
                <div class="lb-method-card-dot" style="background: ${CONFIG.methodColors[key]}"></div>
                <div class="lb-method-card-name">${data.method_display}</div>
                <div class="lb-method-card-score">${data.avg_mDice_display}</div>
                ${isBest ? '<span class="lb-method-card-badge">Best</span>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Render Method performance table
 */
function renderMethodTable(modelRanks, detailedStats) {
    const tbody = document.getElementById('method-tbody');
    if (!tbody) return;
    
    let html = '';
    
    modelRanks.forEach(model => {
        const perfData = detailedStats.modelMethodPerformance[model.model_key];
        if (!perfData) return;
        
        // Find best method
        let bestMethod = null;
        let bestScore = -1;
        for (const method of CONFIG.methods) {
            const score = perfData[`${method}Avg`];
            if (score !== null && score > bestScore) {
                bestScore = score;
                bestMethod = method;
            }
        }
        
        html += `
            <tr>
                <td><strong>${model.model_display}</strong></td>
                ${CONFIG.methods.map(m => {
                    const score = perfData[`${m}Avg`];
                    const isBest = m === bestMethod;
                    return `<td><span class="lb-score-cell ${isBest ? 'lb-score-best' : ''}">${score !== null ? formatNumber(score, 4) : '-'}</span></td>`;
                }).join('')}
                <td><span class="lb-method-badge">${CONFIG.methodNames[bestMethod] || '-'}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="7" class="loading-cell">No data available</td></tr>';
}

/**
 * Populate model selector
 */
function populateModelSelector(modelRanks) {
    const selector = document.getElementById('model-selector');
    if (!selector) return;
    
    let html = '';
    modelRanks.forEach(model => {
        html += `<option value="${model.model_key}">${model.model_display} (Rank #${model.position})</option>`;
    });
    
    selector.innerHTML = html;
}

/**
 * Update model info card
 */
function updateModelInfo(modelKey, modelRanks, detailedStats, datasetSota, rawData) {
    const model = modelRanks.find(m => m.model_key === modelKey);
    if (!model) return;
    
    // Update basic info
    document.getElementById('model-name').textContent = model.model_display;
    document.getElementById('model-rank-text').textContent = `Rank #${model.position} overall`;
    document.getElementById('model-avg-rank').textContent = model.avg_rank_display;
    document.getElementById('model-experiments').textContent = model.total_comparisons;
    
    // Update rank badge
    const rankBadge = document.getElementById('model-rank-badge');
    if (model.position === 1) rankBadge.textContent = '🥇';
    else if (model.position === 2) rankBadge.textContent = '🥈';
    else if (model.position === 3) rankBadge.textContent = '🥉';
    else rankBadge.textContent = `#${model.position}`;
    
    // Find best performance for this model
    let bestPerf = 0;
    for (const [dataset, data] of Object.entries(datasetSota)) {
        if (data.model_key === modelKey) {
            bestPerf = Math.max(bestPerf, data.mDice);
        }
    }
    document.getElementById('model-best-perf').textContent = formatNumber(bestPerf, 4);
    
    // Render methods chart
    renderModelMethodsChart(modelKey, detailedStats);
    
    // Render dataset table
    renderModelDatasetTable(modelKey, rawData, datasetSota);
}

/**
 * Render model dataset table
 */
function renderModelDatasetTable(modelKey, rawData, datasetSota) {
    const tbody = document.getElementById('model-dataset-tbody');
    if (!tbody) return;
    
    // Collect best results for this model per dataset
    const modelResults = {};
    
    for (const [method, methodData] of Object.entries(rawData)) {
        for (const [dataset, models] of Object.entries(methodData)) {
            if (models[modelKey] && models[modelKey].Mean_Dice) {
                const score = models[modelKey].Mean_Dice.mean;
                if (!modelResults[dataset] || score > modelResults[dataset].score) {
                    modelResults[dataset] = {
                        score,
                        method: CONFIG.methodNames[method],
                        category: getDatasetCategory(dataset)
                    };
                }
            }
        }
    }
    
    // Calculate rank in each dataset
    for (const [dataset, result] of Object.entries(modelResults)) {
        let rank = 1;
        for (const [method, methodData] of Object.entries(rawData)) {
            if (methodData[dataset]) {
                for (const [otherModel, metrics] of Object.entries(methodData[dataset])) {
                    if (metrics.Mean_Dice && metrics.Mean_Dice.mean > result.score) {
                        rank++;
                    }
                }
            }
        }
        result.rank = rank;
    }
    
    // Sort by score descending
    const sorted = Object.entries(modelResults)
        .sort((a, b) => b[1].score - a[1].score);
    
    let html = '';
    sorted.forEach(([dataset, result]) => {
        const displayName = datasetSota[dataset]?.dataset_display || dataset;
        html += `
            <tr>
                <td><strong>${displayName}</strong></td>
                <td>${getCategoryBadge(result.category)}</td>
                <td><span class="lb-score-cell">${formatNumber(result.score, 4)}</span></td>
                <td><span class="lb-method-badge">${result.method}</span></td>
                <td>${getRankBadge(Math.min(result.rank, 18))}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="5" class="loading-cell">No data available</td></tr>';
}

// ==================== Event Handlers ====================

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = document.getElementById('model-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#leaderboard-tbody tr');
        
        rows.forEach(row => {
            const model = row.dataset.model || '';
            const text = row.textContent.toLowerCase();
            row.style.display = (text.includes(query) || model.toLowerCase().includes(query)) ? '' : 'none';
        });
    });
}

/**
 * Initialize task filter buttons
 */
function initTaskFilter() {
    const buttons = document.querySelectorAll('.lb-task-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const task = btn.dataset.task;
            renderTasksTable(globalData.stats.dataset_sota, task);
        });
    });
}

/**
 * Initialize method filter buttons
 */
function initMethodFilter() {
    const buttons = document.querySelectorAll('.lb-method-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const method = btn.dataset.method;
            // Could add method-specific filtering here
        });
    });
}

/**
 * Initialize model selector
 */
function initModelSelector() {
    const selector = document.getElementById('model-selector');
    if (!selector) return;
    
    selector.addEventListener('change', (e) => {
        const modelKey = e.target.value;
        updateModelInfo(
            modelKey, 
            globalData.stats.model_ranks, 
            globalData.detailedStats, 
            globalData.stats.dataset_sota,
            globalData.rawData
        );
    });
}

// ==================== Initialization ====================

/**
 * Main initialization function
 */
async function init() {
    // Load data
    const [stats, rawData] = await Promise.all([
        loadStats(),
        loadAllData()
    ]);
    
    if (!stats) {
        console.error('Failed to load statistics');
        return;
    }
    
    // Store globally
    globalData.stats = stats;
    globalData.rawData = rawData;
    
    // Compute detailed statistics
    globalData.detailedStats = computeDetailedStats(rawData, stats);
    
    // Initialize tabs
    initTabs();
    
    // Render Leaderboard tab
    renderTopModelsChart(stats.model_ranks);
    renderCategoryPerformanceChart(globalData.detailedStats, stats.model_ranks);
    renderLeaderboardTable(stats.model_ranks, globalData.detailedStats);
    
    // Render Tasks tab
    renderTaskCards(stats.dataset_sota);
    renderTasksTable(stats.dataset_sota);
    
    // Render Performance tab
    renderMethodCards(stats.method_comparison);
    renderMethodComparisonChart(stats.method_comparison);
    renderMethodTable(stats.model_ranks, globalData.detailedStats);
    
    // Render Models tab
    populateModelSelector(stats.model_ranks);
    if (stats.model_ranks.length > 0) {
        updateModelInfo(
            stats.model_ranks[0].model_key,
            stats.model_ranks,
            globalData.detailedStats,
            stats.dataset_sota,
            rawData
        );
    }
    
    // Initialize event handlers
    initSearch();
    initTaskFilter();
    initMethodFilter();
    initModelSelector();
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);
