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
        cnn: 'CNN',
        transformer: 'Trans.'
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
    datasetOrder: [
        // Nuclear
        'CoNIC2022', 'PanNuke', 'cpm15', 'cpm17', 'kumar', 'CoNSeP', 'TNBC', 'NuCLS', 'Lizard',
        // Gland
        'GlaS', 'CRAG', 'RINGS',
        // Tissue
        'BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk'
    ],
    datasetCategories: {
        Nuclear: ['CoNIC2022', 'CoNSeP', 'cpm15', 'cpm17', 'kumar', 'Lizard', 'NuCLS', 'PanNuke', 'TNBC'],
        Gland: ['GlaS', 'CRAG', 'RINGS'],
        Tissue: ['BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk']
    },
    datasetDisplayNames: {
        'CoNIC2022': 'CoNIC2022', 'PanNuke': 'PanNuke', 'cpm15': 'CPM15', 'cpm17': 'CPM17',
        'kumar': 'Kumar', 'CoNSeP': 'CoNSeP', 'TNBC': 'TNBC', 'NuCLS': 'NuCLS', 'Lizard': 'Lizard',
        'GlaS': 'GlaS', 'CRAG': 'CRAG', 'RINGS': 'RINGS', 'BCSS': 'BCSS', 'CoCaHis': 'CoCaHis',
        'COSAS24': 'COSAS24', 'EBHI': 'EBHI', 'WSSS4LUAD': 'WSSS4LUAD', 'Janowczyk': 'Janowczyk'
    },
    modelDisplayNames: {
        'PathOrchestra': 'PathOrch.', 'conch_v1_5': 'CONCHv1.5', 'conch_v1': 'CONCH',
        'gigapath': 'GigaPath', 'hibou_l': 'Hibou-L', 'hoptimus_0': 'H-Opt-0', 'hoptimus_1': 'H-Opt-1',
        'kaiko-vitl14': 'Kaiko-L', 'lunit_vits8': 'Lunit', 'midnight12k': 'Midnight',
        'musk': 'MUSK', 'phikon': 'Phikon', 'phikon_v2': 'Phikon-v2',
        'uni_v1': 'UNI', 'uni_v2': 'UNI2-h', 'virchow_v1': 'Virchow', 'virchow_v2': 'Virchow2'
    }
};

// ==================== Global State ====================
let perfState = {
    rawData: null,
    processedData: null,
    charts: {},
    currentDataset: 'all',
    currentMetric: 'all',
    isLoaded: false
};

// ==================== Utility Functions ====================
function getDatasetCategory(dataset) {
    for (const [cat, datasets] of Object.entries(PERF_CONFIG.datasetCategories)) {
        if (datasets.includes(dataset)) return cat;
    }
    return 'Other';
}

function formatNum(num, dec = 4) {
    return num != null ? num.toFixed(dec) : '-';
}

// ==================== Data Loading ====================
async function loadAllData() {
    try {
        const promises = PERF_CONFIG.methods.map(async m => {
            const res = await fetch(`${PERF_CONFIG.dataPath}${m}.json`);
            return [m, res.ok ? await res.json() : null];
        });
        const results = await Promise.all(promises);
        const data = {};
        results.forEach(([m, d]) => { if (d) data[m] = d; });
        return data;
    } catch (e) {
        console.error('Error loading data:', e);
        return null;
    }
}

// ==================== Data Processing ====================
function processData(rawData) {
    const processed = {};
    
    // Get all datasets
    const allDatasets = new Set();
    Object.values(rawData).forEach(md => Object.keys(md).forEach(d => allDatasets.add(d)));
    
    allDatasets.forEach(dataset => {
        processed[dataset] = {
            name: PERF_CONFIG.datasetDisplayNames[dataset] || dataset,
            category: getDatasetCategory(dataset),
            metrics: {}
        };
        
        PERF_CONFIG.metrics.forEach(metric => {
            const items = [];
            
            Object.entries(rawData).forEach(([method, methodData]) => {
                if (!methodData[dataset]) return;
                
                Object.entries(methodData[dataset]).forEach(([model, metrics]) => {
                    if (metrics[metric.key]) {
                        const m = metrics[metric.key];
                        items.push({
                            model,
                            modelName: PERF_CONFIG.modelDisplayNames[model] || model,
                            method,
                            methodName: PERF_CONFIG.methodNames[method],
                            mean: m.mean,
                            ci_lower: m.ci_lower,
                            ci_upper: m.ci_upper
                        });
                    }
                });
            });
            
            items.sort((a, b) => b.mean - a.mean);
            processed[dataset].metrics[metric.key] = {
                name: metric.name,
                data: items,
                best: items[0] || null
            };
        });
    });
    
    return processed;
}

// ==================== Rendering ====================
function populateDatasetDropdown() {
    const select = document.getElementById('perf-dataset-filter');
    if (!select || !perfState.processedData) return;
    
    let html = '<option value="all">All Datasets (18)</option>';
    
    // Nuclear datasets
    html += '<optgroup label="── Nuclear ──">';
    PERF_CONFIG.datasetOrder.filter(d => PERF_CONFIG.datasetCategories.Nuclear.includes(d)).forEach(d => {
        if (perfState.processedData[d]) {
            html += `<option value="${d}">${perfState.processedData[d].name}</option>`;
        }
    });
    html += '</optgroup>';
    
    // Gland datasets
    html += '<optgroup label="── Gland ──">';
    PERF_CONFIG.datasetOrder.filter(d => PERF_CONFIG.datasetCategories.Gland.includes(d)).forEach(d => {
        if (perfState.processedData[d]) {
            html += `<option value="${d}">${perfState.processedData[d].name}</option>`;
        }
    });
    html += '</optgroup>';
    
    // Tissue datasets
    html += '<optgroup label="── Tissue ──">';
    PERF_CONFIG.datasetOrder.filter(d => PERF_CONFIG.datasetCategories.Tissue.includes(d)).forEach(d => {
        if (perfState.processedData[d]) {
            html += `<option value="${d}">${perfState.processedData[d].name}</option>`;
        }
    });
    html += '</optgroup>';
    
    select.innerHTML = html;
}

function renderDatasetCard(datasetKey, datasetData, metricFilter) {
    const metricsToShow = metricFilter === 'all' 
        ? PERF_CONFIG.metrics 
        : PERF_CONFIG.metrics.filter(m => m.key === metricFilter);
    
    return `
        <div class="perf-dataset-card" data-dataset="${datasetKey}">
            <div class="perf-dataset-header">
                <div class="perf-dataset-title">
                    <h3>${datasetData.name}</h3>
                </div>
            </div>
            <div class="perf-metrics-grid ${metricsToShow.length === 1 ? 'single-metric' : ''}">
                ${metricsToShow.map(metric => renderMetricCard(datasetKey, metric, datasetData.metrics[metric.key])).join('')}
            </div>
        </div>
    `;
}

function renderMetricCard(dataset, metric, metricData) {
    const best = metricData?.best;
    const bestText = best ? `<strong>${formatNum(best.mean)}</strong> (${best.modelName} + ${best.methodName})` : 'No data';
    
    return `
        <div class="perf-metric-card" data-metric="${metric.key}">
            <div class="perf-metric-header">
                <span class="perf-metric-name">${metric.name}</span>
                <span class="perf-metric-best">Best: ${bestText}</span>
            </div>
            <div class="perf-chart-wrapper">
                <canvas id="chart-${dataset}-${metric.key}"></canvas>
            </div>
        </div>
    `;
}

function renderView() {
    const container = document.getElementById('perf-datasets-container');
    if (!container || !perfState.processedData) return;
    
    // Destroy all existing charts
    Object.values(perfState.charts).forEach(c => c.destroy());
    perfState.charts = {};
    
    const { currentDataset, currentMetric } = perfState;
    
    // Get datasets to show
    let datasetsToShow = currentDataset === 'all' 
        ? PERF_CONFIG.datasetOrder.filter(d => perfState.processedData[d])
        : [currentDataset];
    
    if (datasetsToShow.length === 0) {
        container.innerHTML = '<div class="perf-no-data">No data available.</div>';
        return;
    }
    
    container.innerHTML = datasetsToShow.map(d => 
        renderDatasetCard(d, perfState.processedData[d], currentMetric)
    ).join('');
    
    // Render charts after DOM update
    requestAnimationFrame(() => {
        datasetsToShow.forEach(dataset => {
            const metricsToRender = currentMetric === 'all'
                ? PERF_CONFIG.metrics
                : PERF_CONFIG.metrics.filter(m => m.key === currentMetric);
            
            metricsToRender.forEach(metric => {
                renderChart(dataset, metric.key, perfState.processedData[dataset].metrics[metric.key]);
            });
        });
    });
}

function renderChart(dataset, metricKey, metricData) {
    const canvas = document.getElementById(`chart-${dataset}-${metricKey}`);
    if (!canvas || !metricData?.data?.length) return;
    
    // Show all 85 bars: 17 models × 5 methods, sorted by mean descending
    const sorted = [...metricData.data].sort((a, b) => b.mean - a.mean);
    
    const chartKey = `${dataset}-${metricKey}`;
    perfState.charts[chartKey] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sorted.map(d => `${d.modelName} + ${d.methodName}`),
            datasets: [{
                data: sorted.map(d => d.mean),
                backgroundColor: sorted.map(d => PERF_CONFIG.methodColors[d.method]),
                borderRadius: 3,
                barThickness: 14,
                maxBarThickness: 16
            }]
        },
        options: {
            indexAxis: 'y', // 水平条形图
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 150 },
            layout: {
                padding: { left: 5, right: 15 }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: ctx => {
                            const item = sorted[ctx[0].dataIndex];
                            return `${PERF_CONFIG.modelDisplayNames[item.model] || item.model} + ${PERF_CONFIG.methodNames[item.method]}`;
                        },
                        label: ctx => {
                            const item = sorted[ctx.dataIndex];
                            return [
                                `Mean: ${formatNum(item.mean)}`,
                                `CI: [${formatNum(item.ci_lower)}, ${formatNum(item.ci_upper)}]`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(17,24,39,0.95)',
                    padding: 10,
                    cornerRadius: 6
                }
            },
            scales: {
                x: {
                    beginAtZero: false,
                    grid: { color: '#f0f0f0' },
                    ticks: { font: { size: 9 }, callback: v => v.toFixed(2) }
                },
                y: {
                    grid: { display: false },
                    ticks: { 
                        font: { size: 9 },
                        autoSkip: false
                    }
                }
            }
        }
    });
}

// ==================== Event Handlers ====================
function initFilters() {
    const datasetSelect = document.getElementById('perf-dataset-filter');
    const metricSelect = document.getElementById('perf-metric-filter');
    
    if (datasetSelect) {
        datasetSelect.addEventListener('change', e => {
            perfState.currentDataset = e.target.value;
            renderView();
        });
    }
    
    if (metricSelect) {
        metricSelect.addEventListener('change', e => {
            perfState.currentMetric = e.target.value;
            renderView();
        });
    }
}

// ==================== Initialization ====================
async function initPerformanceTab() {
    const container = document.getElementById('perf-datasets-container');
    if (!container) return;
    
    // Don't reload if already loaded
    if (perfState.isLoaded && perfState.processedData) {
        renderView();
        return;
    }
    
    container.innerHTML = '<div class="loading-cell">Loading...</div>';
    
    const rawData = await loadAllData();
    if (!rawData || Object.keys(rawData).length === 0) {
        container.innerHTML = '<div class="perf-no-data">Failed to load data. Please refresh.</div>';
        return;
    }
    
    perfState.rawData = rawData;
    perfState.processedData = processData(rawData);
    perfState.isLoaded = true;
    
    populateDatasetDropdown();
    initFilters();
    renderView();
}

window.initPerformanceTab = initPerformanceTab;
