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
    currentDataset: 'all',
    currentMetric: 'all',
    currentMethod: 'all',
    currentModel: 'all',
    allModels: [],
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

function populateMethodDropdown() {
    const select = document.getElementById('perf-method-filter');
    if (!select) return;
    
    let html = '<option value="all">All Methods (5)</option>';
    PERF_CONFIG.methods.forEach(m => {
        const color = PERF_CONFIG.methodColors[m];
        html += `<option value="${m}">${PERF_CONFIG.methodNames[m]}</option>`;
    });
    
    select.innerHTML = html;
}

function populateModelDropdown() {
    const select = document.getElementById('perf-model-filter');
    if (!select || !perfState.processedData) return;
    
    // Collect all unique models from data
    const modelSet = new Set();
    Object.values(perfState.processedData).forEach(dataset => {
        Object.values(dataset.metrics).forEach(metric => {
            metric.data.forEach(item => modelSet.add(item.model));
        });
    });
    
    // Sort models by display name
    const models = Array.from(modelSet).sort((a, b) => {
        const nameA = PERF_CONFIG.modelDisplayNames[a] || a;
        const nameB = PERF_CONFIG.modelDisplayNames[b] || b;
        return nameA.localeCompare(nameB);
    });
    
    perfState.allModels = models;
    
    let html = `<option value="all">All Models (${models.length})</option>`;
    models.forEach(m => {
        html += `<option value="${m}">${PERF_CONFIG.modelDisplayNames[m] || m}</option>`;
    });
    
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
    let data = metricData?.data || [];
    
    // Apply filters
    const { currentMethod, currentModel } = perfState;
    
    if (currentMethod !== 'all') {
        data = data.filter(item => item.method === currentMethod);
    }
    
    if (currentModel !== 'all') {
        data = data.filter(item => item.model === currentModel);
    }
    
    // Re-sort and get best after filtering
    data = [...data].sort((a, b) => b.mean - a.mean);
    const best = data[0];
    const bestText = best ? `<strong>${formatNum(best.mean)}</strong> (${best.modelName} + ${best.methodName})` : 'No data';
    
    // Build table rows
    let tableRows = '';
    data.forEach((item, idx) => {
        const rank = idx + 1;
        let rankBadge = rank;
        if (rank === 1) rankBadge = '🥇';
        else if (rank === 2) rankBadge = '🥈';
        else if (rank === 3) rankBadge = '🥉';
        
        const methodColor = PERF_CONFIG.methodColors[item.method] || '#6b7280';
        
        tableRows += `
            <tr>
                <td class="perf-rank-cell">${rankBadge}</td>
                <td class="perf-model-cell">${item.modelName}</td>
                <td class="perf-method-cell">
                    <span class="perf-method-badge" style="background: ${methodColor}20; color: ${methodColor}; border: 1px solid ${methodColor}40;">
                        ${item.methodName}
                    </span>
                </td>
                <td class="perf-score-cell ${rank <= 3 ? 'perf-score-top' : ''}">${formatNum(item.mean)}</td>
                <td class="perf-ci-cell">[${formatNum(item.ci_lower, 3)}, ${formatNum(item.ci_upper, 3)}]</td>
            </tr>
        `;
    });
    
    return `
        <div class="perf-metric-card" data-metric="${metric.key}">
            <div class="perf-metric-header">
                <span class="perf-metric-name">${metric.name}</span>
                <span class="perf-metric-best">Best: ${bestText}</span>
            </div>
            <div class="perf-table-wrapper">
                <table class="perf-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Model</th>
                            <th>Method</th>
                            <th>Score</th>
                            <th>95% CI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="5" class="perf-no-data">No matching data</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderView() {
    const container = document.getElementById('perf-datasets-container');
    if (!container || !perfState.processedData) return;
    
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
}


// ==================== Event Handlers ====================
function initFilters() {
    const datasetSelect = document.getElementById('perf-dataset-filter');
    const metricSelect = document.getElementById('perf-metric-filter');
    const methodSelect = document.getElementById('perf-method-filter');
    const modelSelect = document.getElementById('perf-model-filter');
    
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
    
    if (methodSelect) {
        methodSelect.addEventListener('change', e => {
            perfState.currentMethod = e.target.value;
            renderView();
        });
    }
    
    if (modelSelect) {
        modelSelect.addEventListener('change', e => {
            perfState.currentModel = e.target.value;
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
    populateMethodDropdown();
    populateModelDropdown();
    initFilters();
    renderView();
}

window.initPerformanceTab = initPerformanceTab;
