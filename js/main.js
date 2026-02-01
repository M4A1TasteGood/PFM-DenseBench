/**
 * PFM-DenseBench Website - Main JavaScript
 * Handles data loading and table rendering
 */

// Configuration
const CONFIG = {
    dataPath: 'data_computed/stats.json'
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
 * Render Dataset SOTA table with bar charts
 */
function renderDatasetSotaTable(datasetSota) {
    const tbody = document.getElementById('dataset-sota-tbody');
    if (!tbody) return;

    // Sort datasets by mDice descending
    const sortedDatasets = Object.entries(datasetSota).sort((a, b) => {
        return b[1].mDice - a[1].mDice;
    });

    // Get max value for scaling (use 1.0 as max for mDice)
    const maxValue = 1.0;

    let html = '';
    sortedDatasets.forEach(([key, data]) => {
        const percentage = (data.mDice / maxValue) * 100;
        html += `
            <tr>
                <td><strong>${data.dataset_display}</strong></td>
                <td class="bar-cell">
                    <div class="bar-container">
                        <div class="bar-wrapper">
                            <div class="bar-fill bar-fill-sota" style="width: ${percentage}%"></div>
                        </div>
                        <span class="bar-value">${data.mDice_display}</span>
                    </div>
                </td>
                <td>${data.model}</td>
                <td><span class="method-badge">${data.method}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Render Model Rankings table with bar charts
 */
function renderModelRankingsTable(modelRanks) {
    const tbody = document.getElementById('model-ranks-tbody');
    if (!tbody) return;

    // Get max rank for scaling (invert: lower rank = longer bar)
    const maxRank = Math.max(...modelRanks.map(d => d.avg_rank));
    const minRank = Math.min(...modelRanks.map(d => d.avg_rank));

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

        // Invert percentage: lower rank = longer bar (better performance)
        const percentage = ((maxRank - data.avg_rank) / (maxRank - minRank)) * 80 + 20;

        html += `
            <tr>
                <td>
                    <span class="rank-badge ${rankClass}">${data.position <= 3 ? rankIcon : data.position}</span>
                </td>
                <td><strong>${data.model_display}</strong></td>
                <td class="bar-cell">
                    <div class="bar-container">
                        <div class="bar-wrapper">
                            <div class="bar-fill bar-fill-rank" style="width: ${percentage}%"></div>
                        </div>
                        <span class="bar-value">${data.avg_rank_display}</span>
                    </div>
                </td>
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
