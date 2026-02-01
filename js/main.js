/**
 * PFM-DenseBench Website - Main JavaScript
 * Handles data loading and table rendering
 */

// Configuration
const CONFIG = {
    dataPath: 'data_computed/stats.json',
    categoryOrder: ['Nuclear', 'Gland', 'Tissue', 'Other'],
    categoryColors: {
        'Nuclear': 'badge-nuclear',
        'Gland': 'badge-gland',
        'Tissue': 'badge-tissue',
        'Other': 'badge-nuclear'
    }
};

/**
 * Load statistics data from JSON file
 */
async function loadStats() {
    try {
        const response = await fetch(CONFIG.dataPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading stats:', error);
        return null;
    }
}

/**
 * Render Dataset SOTA table
 */
function renderDatasetSotaTable(datasetSota) {
    const tbody = document.getElementById('dataset-sota-tbody');
    if (!tbody) return;

    // Sort datasets by category first, then by mDice descending
    const sortedDatasets = Object.entries(datasetSota).sort((a, b) => {
        const catA = CONFIG.categoryOrder.indexOf(a[1].category);
        const catB = CONFIG.categoryOrder.indexOf(b[1].category);
        if (catA !== catB) return catA - catB;
        return b[1].mDice - a[1].mDice;
    });

    let html = '';
    sortedDatasets.forEach(([key, data]) => {
        const categoryClass = CONFIG.categoryColors[data.category] || 'badge-nuclear';
        html += `
            <tr>
                <td>
                    <span class="category-badge ${categoryClass}">${data.category}</span>
                </td>
                <td><strong>${data.dataset_display}</strong></td>
                <td class="score-value">${data.mDice_display}</td>
                <td>${data.model}</td>
                <td><span class="method-badge">${data.method}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Render Model Rankings table
 */
function renderModelRankingsTable(modelRanks) {
    const tbody = document.getElementById('model-ranks-tbody');
    if (!tbody) return;

    let html = '';
    modelRanks.forEach((data) => {
        let rankClass = '';
        let rankIcon = data.position;
        
        if (data.position === 1) {
            rankClass = 'rank-1';
            rankIcon = '🥇';
        } else if (data.position === 2) {
            rankClass = 'rank-2';
            rankIcon = '🥈';
        } else if (data.position === 3) {
            rankClass = 'rank-3';
            rankIcon = '🥉';
        }

        html += `
            <tr>
                <td>
                    <span class="rank-badge ${rankClass}">${data.position <= 3 ? rankIcon : data.position}</span>
                </td>
                <td><strong>${data.model_display}</strong></td>
                <td class="score-value">${data.avg_rank_display}</td>
                <td>${data.total_comparisons}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Render Method Comparison cards
 */
function renderMethodComparison(methodComparison) {
    const container = document.getElementById('method-comparison');
    if (!container) return;

    // Sort by avg_mDice descending
    const sorted = Object.entries(methodComparison).sort((a, b) => b[1].avg_mDice - a[1].avg_mDice);
    
    const methodColors = {
        'frozen': '#3b82f6',
        'lora': '#22c55e',
        'dora': '#a855f7',
        'cnn': '#f97316',
        'transformer': '#ec4899'
    };

    let html = '';
    sorted.forEach(([key, data], index) => {
        const isBest = index === 0;
        const color = methodColors[key] || '#6b7280';
        
        html += `
            <div class="method-card" style="border-color: ${color}; ${isBest ? 'border-width: 2px;' : ''}">
                <div class="method-dot" style="background-color: ${color};"></div>
                <div class="method-name">${data.method_display}</div>
                <div class="method-score" style="color: ${color};">
                    ${data.avg_mDice_display}
                    ${isBest ? ' 🏆' : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Initialize the page
 */
async function init() {
    const stats = await loadStats();
    
    if (stats) {
        renderDatasetSotaTable(stats.dataset_sota);
        renderModelRankingsTable(stats.model_ranks);
        renderMethodComparison(stats.method_comparison);
    } else {
        // Show error message
        const errorHtml = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Failed to load data. Please refresh the page.</td></tr>';
        
        const sotaTbody = document.getElementById('dataset-sota-tbody');
        const ranksTbody = document.getElementById('model-ranks-tbody');
        
        if (sotaTbody) sotaTbody.innerHTML = errorHtml;
        if (ranksTbody) ranksTbody.innerHTML = errorHtml;
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);
