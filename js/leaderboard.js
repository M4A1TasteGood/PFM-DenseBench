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
    },
    // Ordered list of all datasets for table columns (use actual keys from data)
    allDatasets: [
        // Nuclear (9)
        'CoNIC2022', 'PanNuke', 'cpm15', 'cpm17', 'kumar', 'CoNSeP', 'TNBC', 'NuCLS', 'Lizard',
        // Gland (3)
        'GlaS', 'CRAG', 'RINGS',
        // Tissue (6)
        'BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk'
    ],
    datasetDisplayNames: {
        'CoNIC2022': 'CoNIC22',
        'PanNuke': 'PanNuke',
        'cpm15': 'CPM15',
        'cpm17': 'CPM17',
        'kumar': 'Kumar',
        'Kumar': 'Kumar',
        'CoNSeP': 'CoNSeP',
        'TNBC': 'TNBC',
        'NuCLS': 'NuCLS',
        'Lizard': 'Lizard',
        'GlaS': 'GlaS',
        'CRAG': 'CRAG',
        'RINGS': 'RINGS',
        'BCSS': 'BCSS',
        'CoCaHis': 'CoCaHis',
        'COSAS24': 'COSAS24',
        'EBHI': 'EBHI',
        'WSSS4LUAD': 'WSSS4L',
        'Janowczyk': 'Janowczyk'
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
    
    // Compute per-dataset ranks (best rank across all methods for each model)
    const modelDatasetRanks = computeModelDatasetRanks(rawData, stats.model_ranks);
    
    return {
        modelCategoryRanks,
        modelMethodPerformance,
        modelDatasetRanks
    };
}

/**
 * Compute per-dataset average ranks for each model
 * For each dataset, we average the rank across all 5 methods
 */
function computeModelDatasetRanks(rawData, modelRanks) {
    const modelDatasetRanks = {};
    
    // Initialize structure
    for (const model of modelRanks) {
        modelDatasetRanks[model.model_key] = {
            model_display: model.model_display,
            datasets: {}
        };
    }
    
    // Get all unique datasets
    const allDatasets = new Set();
    for (const methodData of Object.values(rawData)) {
        for (const dataset of Object.keys(methodData)) {
            allDatasets.add(dataset);
        }
    }
    
    // For each dataset, compute average rank across methods
    for (const dataset of allDatasets) {
        // Collect all ranks for each model across methods
        const modelRanksByMethod = {};
        
        for (const [method, methodData] of Object.entries(rawData)) {
            if (!methodData[dataset]) continue;
            
            // Get scores and compute ranks for this dataset-method combo
            const scores = Object.entries(methodData[dataset])
                .filter(([_, m]) => m.Mean_Dice)
                .map(([model, m]) => ({ model, score: m.Mean_Dice.mean }))
                .sort((a, b) => b.score - a.score);
            
            scores.forEach((item, idx) => {
                if (!modelRanksByMethod[item.model]) {
                    modelRanksByMethod[item.model] = [];
                }
                modelRanksByMethod[item.model].push(idx + 1);
            });
        }
        
        // Compute average rank for each model on this dataset
        for (const [modelKey, ranks] of Object.entries(modelRanksByMethod)) {
            if (modelDatasetRanks[modelKey]) {
                const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
                modelDatasetRanks[modelKey].datasets[dataset] = avgRank;
            }
        }
    }
    
    return modelDatasetRanks;
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
 * Render Dataset SOTA horizontal bar chart (like main page)
 */
function renderDatasetSotaChart(datasetSota) {
    const ctx = document.getElementById('chart-dataset-sota');
    if (!ctx) return;
    
    // Sort datasets by mDice descending
    const sortedDatasets = Object.entries(datasetSota)
        .sort((a, b) => b[1].mDice - a[1].mDice);
    
    // Destroy existing chart
    if (globalData.charts.datasetSota) {
        globalData.charts.datasetSota.destroy();
    }
    
    // Color based on category
    const colors = sortedDatasets.map(([_, data]) => CONFIG.categoryColors[data.category] || '#6b7280');
    
    globalData.charts.datasetSota = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDatasets.map(([_, d]) => d.dataset_display),
            datasets: [{
                label: 'mDice',
                data: sortedDatasets.map(([_, d]) => d.mDice),
                backgroundColor: colors,
                borderRadius: 4,
                barThickness: 18
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
                        label: (ctx) => {
                            const data = sortedDatasets[ctx.dataIndex][1];
                            return `mDice: ${data.mDice_display} (${data.model}, ${data.method})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 1,
                    grid: { color: '#f3f4f6' },
                    title: {
                        display: true,
                        text: 'mDice Score'
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
 * Render Model Rankings horizontal bar chart (like main page)
 */
function renderModelRanksChart(modelRanks) {
    const ctx = document.getElementById('chart-model-ranks');
    if (!ctx) return;
    
    // Destroy existing chart
    if (globalData.charts.modelRanks) {
        globalData.charts.modelRanks.destroy();
    }
    
    // Generate gradient colors from green (best) to red (worst)
    const colors = modelRanks.map((_, idx) => {
        const ratio = idx / (modelRanks.length - 1);
        if (ratio < 0.33) return '#10b981'; // Green
        if (ratio < 0.66) return '#f59e0b'; // Yellow/Orange
        return '#ef4444'; // Red
    });
    
    globalData.charts.modelRanks = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: modelRanks.map(m => m.model_display),
            datasets: [{
                label: 'Average Rank',
                data: modelRanks.map(m => m.avg_rank),
                backgroundColor: colors,
                borderRadius: 4,
                barThickness: 18
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
                        display: true,
                        text: 'Average Rank (lower is better)'
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

// Store current sort state
let currentSort = { column: 'rank', direction: 'asc' };
let tableData = []; // Store table data for sorting

/**
 * Get unique datasets from stats
 */
function getUniqueDatasets(datasetSota) {
    // Use predefined order from CONFIG, but only include datasets that exist in data
    const existingDatasets = new Set(Object.keys(datasetSota));
    return CONFIG.allDatasets.filter(d => existingDatasets.has(d) || existingDatasets.has(d.toLowerCase()));
}

/**
 * Render Leaderboard table header with dataset columns
 */
function renderLeaderboardTableHeader(datasets) {
    const thead = document.getElementById('leaderboard-thead');
    if (!thead) return;
    
    let html = `
        <tr>
            <th class="sortable sticky-col" data-sort="rank" data-type="number">
                Rank <span class="sort-arrow">▲</span>
            </th>
            <th class="sortable sticky-col sticky-col-2" data-sort="model" data-type="string">
                Model <span class="sort-arrow">▲</span>
            </th>
            <th class="sortable" data-sort="overall" data-type="number">
                Overall <span class="sort-arrow">▲</span>
            </th>
    `;
    
    // Add dataset columns
    datasets.forEach(dataset => {
        const displayName = CONFIG.datasetDisplayNames[dataset] || dataset;
        const category = getDatasetCategory(dataset);
        const categoryClass = `cat-${category.toLowerCase()}`;
        html += `
            <th class="sortable ${categoryClass}" data-sort="${dataset}" data-dataset="${dataset}" data-type="number" title="${dataset} (${category})">
                ${displayName} <span class="sort-arrow">▲</span>
            </th>
        `;
    });
    
    html += '</tr>';
    thead.innerHTML = html;
    
    // Add click handlers for sorting
    thead.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort, th.dataset.type));
    });
}

/**
 * Get rank cell class based on rank
 */
function getRankCellClass(rank, totalModels) {
    if (rank === 1) return 'lb-rank-cell lb-rank-cell-1';
    if (rank === 2) return 'lb-rank-cell lb-rank-cell-2';
    if (rank === 3) return 'lb-rank-cell lb-rank-cell-3';
    if (rank <= 5) return 'lb-rank-cell lb-rank-cell-top5';
    if (rank >= totalModels - 2) return 'lb-rank-cell lb-rank-cell-bottom';
    return 'lb-rank-cell';
}

/**
 * Render Leaderboard table body
 */
function renderLeaderboardTable(modelRanks, detailedStats, datasetSota) {
    const datasets = getUniqueDatasets(datasetSota);
    const totalModels = modelRanks.length;
    
    // Render header first
    renderLeaderboardTableHeader(datasets);
    
    // Build table data
    tableData = modelRanks.map((model, idx) => {
        const datasetRanks = detailedStats.modelDatasetRanks[model.model_key]?.datasets || {};
        
        const row = {
            rank: model.position,
            model: model.model_display,
            model_key: model.model_key,
            overall: model.avg_rank,
            overall_display: model.avg_rank_display,
            isTop3: idx < 3
        };
        
        // Add dataset ranks
        datasets.forEach(dataset => {
            // Try different key formats
            row[dataset] = datasetRanks[dataset] || datasetRanks[dataset.toLowerCase()] || null;
        });
        
        return row;
    });
    
    // Store datasets in global for sorting
    globalData.datasets = datasets;
    globalData.totalModels = totalModels;
    
    // Render table
    renderTableBody(tableData, datasets, totalModels);
    
    // Update model count
    const countEl = document.getElementById('lb-model-count');
    if (countEl) {
        countEl.textContent = `${modelRanks.length} of ${modelRanks.length} models`;
    }
    
    // Highlight current sort column
    updateSortIndicator();
}

/**
 * Render table body from data
 */
function renderTableBody(data, datasets, totalModels) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    
    let html = '';
    
    data.forEach((row) => {
        html += `
            <tr data-model="${row.model_key}">
                <td class="sticky-col">${getRankBadge(row.rank)}</td>
                <td class="sticky-col sticky-col-2"><strong>${row.model}</strong></td>
                <td><span class="lb-score-cell ${row.isTop3 ? 'lb-score-best' : ''}">${row.overall_display}</span></td>
        `;
        
        // Add dataset rank cells
        datasets.forEach(dataset => {
            const rank = row[dataset];
            if (rank !== null && rank !== undefined) {
                const rankClass = getRankCellClass(Math.round(rank), totalModels);
                html += `<td data-dataset="${dataset}"><span class="${rankClass}">${rank.toFixed(1)}</span></td>`;
            } else {
                html += `<td data-dataset="${dataset}">-</td>`;
            }
        });
        
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

/**
 * Handle sort click
 */
function handleSort(column, type) {
    // Toggle direction if same column
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Sort data
    const sortedData = [...tableData].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Handle null values
        if (valA === null || valA === undefined) valA = Infinity;
        if (valB === null || valB === undefined) valB = Infinity;
        
        // String comparison for model names
        if (type === 'string') {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return currentSort.direction === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        }
        
        // Numeric comparison
        return currentSort.direction === 'asc' ? valA - valB : valB - valA;
    });
    
    // Re-render table body
    renderTableBody(sortedData, globalData.datasets, globalData.totalModels);
    
    // Update sort indicator
    updateSortIndicator();
}

/**
 * Update sort indicator in header
 */
function updateSortIndicator() {
    const thead = document.getElementById('leaderboard-thead');
    if (!thead) return;
    
    thead.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
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
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            // Show all rows if search is empty
            renderTableBody(tableData, globalData.datasets, globalData.totalModels);
            return;
        }
        
        // Filter tableData
        const filteredData = tableData.filter(row => {
            return row.model.toLowerCase().includes(query) || 
                   row.model_key.toLowerCase().includes(query);
        });
        
        renderTableBody(filteredData, globalData.datasets, globalData.totalModels);
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
    renderDatasetSotaChart(stats.dataset_sota);
    renderModelRanksChart(stats.model_ranks);
    renderLeaderboardTable(stats.model_ranks, globalData.detailedStats, stats.dataset_sota);
    
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
