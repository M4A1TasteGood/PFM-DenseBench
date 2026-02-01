"""
Compute statistics for PFM-DenseBench website
- SOTA mDice for each dataset (with model and method)
- Average rank for each model across all datasets and methods
"""

import json
import os
from collections import defaultdict

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Data')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data_computed')

METHODS = ['frozen', 'lora', 'dora', 'cnn', 'transformer']
METHOD_DISPLAY_NAMES = {
    'frozen': 'Frozen',
    'lora': 'LoRA',
    'dora': 'DoRA',
    'cnn': 'CNN Adapter',
    'transformer': 'Trans. Adapter'
}

# Model display name mapping
MODEL_DISPLAY_NAMES = {
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
    'virchow_v2': 'Virchow2',
    'patho3dmatrix-vision': 'Patho3DMatrix',
}

# Dataset display names
DATASET_DISPLAY_NAMES = {
    'BCSS': 'BCSS',
    'CoCaHis': 'CoCaHis',
    'CoNIC2022': 'CoNIC2022',
    'CoNSeP': 'CoNSeP',
    'COSAS24': 'COSAS24',
    'CRAG': 'CRAG',
    'EBHI': 'EBHI',
    'GlaS': 'GlaS',
    'Janowczyk': 'Janowczyk',
    'Kumar': 'Kumar',
    'kumar': 'Kumar',
    'Lizard': 'Lizard',
    'NuCLS': 'NuCLS',
    'PanNuke': 'PanNuke',
    'RINGS': 'RINGS',
    'TNBC': 'TNBC',
    'WSSS4LUAD': 'WSSS4LUAD',
    'cpm15': 'CPM15',
    'cpm17': 'CPM17',
}

# Dataset categories
DATASET_CATEGORIES = {
    'Nuclear': ['CoNIC2022', 'CoNSeP', 'cpm15', 'cpm17', 'Kumar', 'kumar', 'Lizard', 'NuCLS', 'PanNuke', 'TNBC'],
    'Gland': ['GlaS', 'CRAG', 'RINGS'],
    'Tissue': ['BCSS', 'CoCaHis', 'COSAS24', 'EBHI', 'WSSS4LUAD', 'Janowczyk']
}


def load_all_data():
    """Load all JSON data files"""
    all_data = {}
    for method in METHODS:
        filepath = os.path.join(DATA_DIR, f'{method}.json')
        with open(filepath, 'r') as f:
            all_data[method] = json.load(f)
    return all_data


def get_model_display_name(model_key):
    """Get display name for model"""
    return MODEL_DISPLAY_NAMES.get(model_key, model_key)


def get_dataset_display_name(dataset_key):
    """Get display name for dataset"""
    return DATASET_DISPLAY_NAMES.get(dataset_key, dataset_key)


def compute_dataset_sota(all_data):
    """
    Compute SOTA mDice for each dataset
    Returns: {dataset: {mDice, model, method, ci_lower, ci_upper}}
    """
    dataset_sota = {}
    
    # Get all datasets from any method
    all_datasets = set()
    for method_data in all_data.values():
        all_datasets.update(method_data.keys())
    
    for dataset in all_datasets:
        best_score = -1
        best_model = None
        best_method = None
        best_ci_lower = None
        best_ci_upper = None
        
        for method, method_data in all_data.items():
            if dataset not in method_data:
                continue
            
            for model, metrics in method_data[dataset].items():
                if 'Mean_Dice' in metrics:
                    score = metrics['Mean_Dice']['mean']
                    if score > best_score:
                        best_score = score
                        best_model = model
                        best_method = method
                        best_ci_lower = metrics['Mean_Dice']['ci_lower']
                        best_ci_upper = metrics['Mean_Dice']['ci_upper']
        
        if best_model:
            dataset_sota[dataset] = {
                'mDice': best_score,
                'mDice_display': f"{best_score:.4f}",
                'ci_lower': best_ci_lower,
                'ci_upper': best_ci_upper,
                'model': get_model_display_name(best_model),
                'model_key': best_model,
                'method': METHOD_DISPLAY_NAMES.get(best_method, best_method),
                'method_key': best_method,
                'dataset_display': get_dataset_display_name(dataset),
                'category': next((cat for cat, datasets in DATASET_CATEGORIES.items() if dataset in datasets), 'Other')
            }
    
    return dataset_sota


def compute_model_ranks(all_data):
    """
    Compute average rank for each model across all datasets and methods
    Returns: {model: {avg_rank, total_comparisons, ranks_detail}}
    """
    # Collect all (dataset, method) scores for each model
    model_ranks = defaultdict(list)
    
    # Get all datasets
    all_datasets = set()
    for method_data in all_data.values():
        all_datasets.update(method_data.keys())
    
    for dataset in all_datasets:
        for method, method_data in all_data.items():
            if dataset not in method_data:
                continue
            
            # Get all model scores for this dataset-method combination
            model_scores = []
            for model, metrics in method_data[dataset].items():
                if 'Mean_Dice' in metrics:
                    score = metrics['Mean_Dice']['mean']
                    model_scores.append((model, score))
            
            # Sort by score descending (higher is better)
            model_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Assign ranks
            for rank, (model, score) in enumerate(model_scores, 1):
                model_ranks[model].append({
                    'dataset': dataset,
                    'method': method,
                    'rank': rank,
                    'score': score,
                    'total_models': len(model_scores)
                })
    
    # Compute average rank for each model
    model_avg_ranks = {}
    for model, ranks_list in model_ranks.items():
        avg_rank = sum(r['rank'] for r in ranks_list) / len(ranks_list)
        model_avg_ranks[model] = {
            'avg_rank': avg_rank,
            'avg_rank_display': f"{avg_rank:.2f}",
            'total_comparisons': len(ranks_list),
            'model_display': get_model_display_name(model),
            'model_key': model
        }
    
    # Sort by average rank (ascending - lower is better)
    sorted_models = sorted(model_avg_ranks.items(), key=lambda x: x[1]['avg_rank'])
    
    # Add position
    result = []
    for pos, (model, data) in enumerate(sorted_models, 1):
        data['position'] = pos
        result.append(data)
    
    return result


def compute_method_comparison(all_data):
    """
    Compute average performance for each method
    """
    method_scores = defaultdict(list)
    
    for method, method_data in all_data.items():
        for dataset, models in method_data.items():
            for model, metrics in models.items():
                if 'Mean_Dice' in metrics:
                    method_scores[method].append(metrics['Mean_Dice']['mean'])
    
    result = {}
    for method, scores in method_scores.items():
        avg_score = sum(scores) / len(scores)
        result[method] = {
            'avg_mDice': avg_score,
            'avg_mDice_display': f"{avg_score:.4f}",
            'method_display': METHOD_DISPLAY_NAMES.get(method, method),
            'num_experiments': len(scores)
        }
    
    return result


def main():
    """Main function to compute and save all statistics"""
    print("Loading data...")
    all_data = load_all_data()
    
    print("Computing dataset SOTA...")
    dataset_sota = compute_dataset_sota(all_data)
    
    print("Computing model ranks...")
    model_ranks = compute_model_ranks(all_data)
    
    print("Computing method comparison...")
    method_comparison = compute_method_comparison(all_data)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save results
    output = {
        'dataset_sota': dataset_sota,
        'model_ranks': model_ranks,
        'method_comparison': method_comparison
    }
    
    output_path = os.path.join(OUTPUT_DIR, 'stats.json')
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Results saved to {output_path}")
    
    # Print summary
    print("\n" + "="*60)
    print("DATASET SOTA (mDice)")
    print("="*60)
    for dataset, info in sorted(dataset_sota.items(), key=lambda x: x[1]['mDice'], reverse=True):
        print(f"{info['dataset_display']:15} | {info['mDice']:.4f} | {info['model']:15} | {info['method']}")
    
    print("\n" + "="*60)
    print("MODEL RANKINGS (Average Rank, lower is better)")
    print("="*60)
    for data in model_ranks:
        print(f"{data['position']:2}. {data['model_display']:20} | Avg Rank: {data['avg_rank']:.2f} | Comparisons: {data['total_comparisons']}")
    
    print("\n" + "="*60)
    print("METHOD COMPARISON (Average mDice)")
    print("="*60)
    for method, info in sorted(method_comparison.items(), key=lambda x: x[1]['avg_mDice'], reverse=True):
        print(f"{info['method_display']:15} | Avg mDice: {info['avg_mDice']:.4f} | Experiments: {info['num_experiments']}")


if __name__ == '__main__':
    main()
