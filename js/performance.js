/**
 * PFM-DenseBench Performance Module
 * Handles detailed performance visualization by dataset and metric
 */

// ==================== Configuration ====================
const PERF_CONFIG = {
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
    metrics: [
        { key: 'Mean_Dice', name: 'mDice' },
        { key: 'mIoU', name: 'mIoU' },
        { key: 'Pixel_Accuracy', name: 'Pixel Acc' },
        { key: 'Mean_Accuracy', name: 'mAcc' },
        { key: 'Frequency_Weighted_IoU', name: 'FW IoU' },
        { key: 'Mean_Precision', name: 'mPrecision' },
        { key: 'Mean_Recall', name: 'mRecall' },
        { key: 'Mean_F1', name: 'mF1' }
    ],
    datasetCategories: {
        Nuclear: ['CoNIC2022', 'CoNSeP', 'cpm15', 'cpm17', 'kumar', 'Lizard', 'NuCLS', 'PanNuke', 'TNBC'],
        Gland: ['GlaS', 'CRAG', 'RINGS'],
        Tissue: ['BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk']
    },
    datasetDisplayNames: {
        'CoNIC2022': 'CoNIC2022',
        'PanNuke': 'PanNuke',
        'cpm15': 'CPM15',
        'cpm17': 'CPM17',
        'kumar': 'Kumar',
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
        'WSSS4LUAD': 'WSSS4LUAD',
        'Janowczyk': 'Janowczyk'
    },
    modelDisplayNames: {
        'PathOrchestra': 'PathOrchestra',
        'conch_v1_5': 'CONCHv1.5',
        'conch_v1': 'CONCH',
        'gigapath': 'Prov-GigaPath',
        'hibou_l': 'Hibou-L',
        'hoptimus_0': 'H-Optimus-0',
        'hoptimus_1': 'H-Optimus-1',
        'kaiko-vitl14': 'Kaiko-L',
        'lunit_vits8': 'Lunit',
        'midnight12k': 'Midnight-12k',
        'musk': 'MUSK',
        'phikon': 'Phikon',
        'phikon_v2': 'Phikon-v2',
        'uni_v1': 'UNI',
        'uni_v2': 'UNI2-h',
        'virchow_v1': 'Virchow',
        'virchow_v2': 'Virchow2'
    }
};

// ==================== Global State ====================
let perfData = {
    rawData: {},
    processedData: {},
    charts: {},
    currentFilters: {
        search: '',
        category: 'all',
        metric: 'all'
    }
};

// ==================== Utility Functions ====================

function getDatasetCategory(dataset) {
    for (const [category, datasets] of Object.entries(PERF_CONFIG.datasetCategories)) {
        if (datasets.includes(dataset)) {
            return category;
        }
    }
    return 'Other';
}

function getModelDisplayName(modelKey) {
    return PERF_CONFIG.modelDisplayNames[modelKey] || modelKey;
}

function getDatasetDisplayName(datasetKey) {
    return PERF_CONFIG.datasetDisplayNames[datasetKey] || datasetKey;
}

function formatNumber(num, decimals = 4) {
    if (num === null || num === undefined) return '-';
    return num.toFixed(decimals);
}

// ==================== Data Loading ====================

async function loadMethodData(method) {
    try {
        const response = await fetch(`${PERF_CONFIG.dataPath}${method}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${method} data:`, error);
        return null;
    }
}

async function loadAllPerformanceData() {
    const promises = PERF_CONFIG.methods.map(async method => {
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

// ==================== Data Processing ====================

function processPerformanceData(rawData) {
    const processed = {};
    
    // Get all datasets
    const allDatasets = new Set();
    for (const methodData of Object.values(rawData)) {
        for (const dataset of Object.keys(methodData)) {
            allDatasets.add(dataset);
        }
    }
    
    // Process each dataset
    for (const dataset of allDatasets) {
        processed[dataset] = {
            name: getDatasetDisplayName(dataset),
            category: getDatasetCategory(dataset),
            metrics: {}
        };
        
        // Process each metric
        for (const metric of PERF_CONFIG.metrics) {
            const metricData = [];
            
            // Collect data from all methods and models
            for (const [method, methodData] of Object.entries(rawData)) {
                if (!methodData[dataset]) continue;
                
                for (const [modelKey, modelMetrics] of Object.entries(methodData[dataset])) {
                    if (modelMetrics[metric.key]) {
                        metricData.push({
                            model: modelKey,
                            modelDisplay: getModelDisplayName(modelKey),
                            method: method,
                            methodDisplay: PERF_CONFIG.methodNames[method],
                            mean: modelMetrics[metric.key].mean,
                            ci_lower: modelMetrics[metric.key].ci_lower,
                            ci_upper: modelMetrics[metric.key].ci_upper,
                            std: (modelMetrics[metric.key].ci_upper - modelMetrics[metric.key].ci_lower) / (2 * 1.96)
                        });
                    }
                }
            }
            
            // Sort by mean descending
            metricData.sort((a, b) => b.mean - a.mean);
            
            processed[dataset].metrics[metric.key] = {
                name: metric.name,
                data: metricData,
                best: metricData.length > 0 ? metricData[0] : null
            };
        }
    }
    
    return processed;
}

// ==================== Rendering ====================

function renderDatasetCard(dataset, datasetData) {
    const categoryClass = datasetData.category.toLowerCase();
    
    return `
        <div class="perf-dataset-card" data-dataset="${dataset}" data-category="${datasetData.category}">
            <div class="perf-dataset-header">
                <div class="perf-dataset-title">
                    <h3>${datasetData.name}</h3>
                    <span class="perf-dataset-badge perf-dataset-badge-${categoryClass}">${datasetData.category}</span>
                </div>
                <div class="perf-dataset-info">
                    17 models • 5 methods • 8 metrics
                </div>
            </div>
            <div class="perf-metrics-grid">
                ${PERF_CONFIG.metrics.map(metric => 
                    renderMetricCard(dataset, metric, datasetData.metrics[metric.key])
                ).join('')}
            </div>
        </div>
    `;
}

function renderMetricCard(dataset, metric, metricData) {
    const best = metricData?.best;
    const bestInfo = best 
        ? `Best: <strong>${formatNumber(best.mean)}</strong> (${best.modelDisplay})`
        : 'No data';
    
    return `
        <div class="perf-metric-card" data-metric="${metric.key}">
            <div class="perf-metric-header">
                <span class="perf-metric-name">${metric.name}</span>
                <span class="perf-metric-best">${bestInfo}</span>
            </div>
            <div class="perf-chart-wrapper">
                <canvas id="chart-${dataset}-${metric.key}"></canvas>
            </div>
        </div>
    `;
}

function renderAllDatasetCards(processedData, filters) {
    const container = document.getElementById('perf-datasets-container');
    if (!container) return;
    
    // Filter datasets
    let datasets = Object.entries(processedData);
    
    // Apply category filter
    if (filters.category !== 'all') {
        datasets = datasets.filter(([_, data]) => data.category === filters.category);
    }
    
    // Apply search filter
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        datasets = datasets.filter(([key, data]) => 
            data.name.toLowerCase().includes(searchLower) ||
            key.toLowerCase().includes(searchLower)
        );
    }
    
    // Sort by category then name
    datasets.sort((a, b) => {
        const catOrder = { Nuclear: 0, Gland: 1, Tissue: 2 };
        const catDiff = (catOrder[a[1].category] || 99) - (catOrder[b[1].category] || 99);
        if (catDiff !== 0) return catDiff;
        return a[1].name.localeCompare(b[1].name);
    });
    
    if (datasets.length === 0) {
        container.innerHTML = '<div class="perf-no-data">No datasets found matching your filters.</div>';
        return;
    }
    
    container.innerHTML = datasets.map(([key, data]) => renderDatasetCard(key, data)).join('');
    
    // Render charts after DOM is ready
    setTimeout(() => {
        datasets.forEach(([dataset, data]) => {
            PERF_CONFIG.metrics.forEach(metric => {
                if (filters.metric === 'all' || filters.metric === metric.key) {
                    renderMetricChart(dataset, metric.key, data.metrics[metric.key]);
                }
            });
        });
    }, 50);
}

// ==================== Chart Rendering ====================

function renderMetricChart(dataset, metricKey, metricData) {
    const canvasId = `chart-${dataset}-${metricKey}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas || !metricData?.data || metricData.data.length === 0) return;
    
    // Destroy existing chart
    const chartKey = `${dataset}-${metricKey}`;
    if (perfData.charts[chartKey]) {
        perfData.charts[chartKey].destroy();
    }
    
    // Prepare data - group by model, show best method for each
    const modelBest = {};
    metricData.data.forEach(item => {
        if (!modelBest[item.model] || item.mean > modelBest[item.model].mean) {
            modelBest[item.model] = item;
        }
    });
    
    // Sort by mean descending and take top entries
    const sortedModels = Object.values(modelBest)
        .sort((a, b) => b.mean - a.mean);
    
    const labels = sortedModels.map(d => d.modelDisplay);
    const data = sortedModels.map(d => d.mean);
    const colors = sortedModels.map(d => PERF_CONFIG.methodColors[d.method]);
    const errorBars = sortedModels.map(d => ({
        lower: d.ci_lower,
        upper: d.ci_upper
    }));
    
    // Store full data for tooltip
    const fullData = sortedModels;
    
    perfData.charts[chartKey] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderRadius: 2,
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: (context) => {
                            const idx = context[0].dataIndex;
                            const item = fullData[idx];
                            return `${item.modelDisplay} + ${item.methodDisplay}`;
                        },
                        label: (context) => {
                            const idx = context.dataIndex;
                            const item = fullData[idx];
                            return [
                                `Mean: ${formatNumber(item.mean)}`,
                                `Std: ${formatNumber(item.std)}`,
                                `CI: [${formatNumber(item.ci_lower)}, ${formatNumber(item.ci_upper)}]`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 9 },
                        autoSkip: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: false,
                    grid: { color: '#f3f4f6' },
                    ticks: {
                        font: { size: 10 },
                        callback: (value) => value.toFixed(2)
                    }
                }
            },
            animation: {
                duration: 300
            }
        }
    });
}

// ==================== Event Handlers ====================

function initPerformanceFilters() {
    // Search input
    const searchInput = document.getElementById('perf-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            perfData.currentFilters.search = e.target.value;
            renderAllDatasetCards(perfData.processedData, perfData.currentFilters);
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('perf-category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            perfData.currentFilters.category = e.target.value;
            renderAllDatasetCards(perfData.processedData, perfData.currentFilters);
        });
    }
    
    // Metric filter
    const metricFilter = document.getElementById('perf-metric-filter');
    if (metricFilter) {
        metricFilter.addEventListener('change', (e) => {
            perfData.currentFilters.metric = e.target.value;
            applyMetricFilter(e.target.value);
        });
    }
}

function applyMetricFilter(metricKey) {
    const metricCards = document.querySelectorAll('.perf-metric-card');
    metricCards.forEach(card => {
        if (metricKey === 'all' || card.dataset.metric === metricKey) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== Initialization ====================

async function initPerformanceTab() {
    const container = document.getElementById('perf-datasets-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-cell">Loading performance data...</div>';
    
    // Load data
    const rawData = await loadAllPerformanceData();
    if (!rawData || Object.keys(rawData).length === 0) {
        container.innerHTML = '<div class="perf-no-data">Failed to load performance data.</div>';
        return;
    }
    
    // Process data
    perfData.rawData = rawData;
    perfData.processedData = processPerformanceData(rawData);
    
    // Render
    renderAllDatasetCards(perfData.processedData, perfData.currentFilters);
    
    // Initialize filters
    initPerformanceFilters();
}

// Export for use in main leaderboard.js
window.initPerformanceTab = initPerformanceTab;
