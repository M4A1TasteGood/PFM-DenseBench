// ===== 导航栏功能 =====
document.addEventListener('DOMContentLoaded', function() {
    // 移动端菜单切换
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // 点击导航链接后关闭菜单
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
        });
    });
    
    // 滚动时改变导航栏样式
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
});

// ===== 附录标签切换 =====
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.appendix-tab');
    const contents = document.querySelectorAll('.appendix-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.dataset.tab + '-tables';
            
            // 移除所有active类
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // 添加active类到当前选项卡
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
});

// ===== 可折叠表格 =====
document.addEventListener('DOMContentLoaded', function() {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const parent = this.closest('.collapsible');
            parent.classList.toggle('collapsed');
        });
    });
});

// ===== 复制引用功能 =====
function copyToClipboard() {
    const codeBlock = document.querySelector('.citation-box code');
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(function() {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '已复制!';
        btn.style.background = '#10b981';
        
        setTimeout(function() {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(function(err) {
        console.error('复制失败: ', err);
        alert('复制失败，请手动复制');
    });
}

// ===== 平滑滚动到锚点 =====
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// ===== 滚动动画 (Intersection Observer) =====
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    const animatedElements = document.querySelectorAll(
        '.stat-card, .rq-card, .feature-card, .strategy-card, .finding-card, .model-category'
    );
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
});

// 添加动画类样式
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ===== 数据表格排序功能 (可选，为未来扩展准备) =====
function sortTable(tableId, columnIndex, isNumeric = false) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.category-header):not(.placeholder-row)'));
    
    const direction = table.dataset.sortDir === 'asc' ? 'desc' : 'asc';
    table.dataset.sortDir = direction;
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        if (isNumeric) {
            const aNum = parseFloat(aValue) || 0;
            const bNum = parseFloat(bValue) || 0;
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
            return direction === 'asc' 
                ? aValue.localeCompare(bValue) 
                : bValue.localeCompare(aValue);
        }
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

// ===== 表格搜索/过滤功能 (可选，为未来扩展准备) =====
function filterTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    
    const filter = input.value.toLowerCase();
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

// ===== 响应式图片懒加载 (为未来图片准备) =====
document.addEventListener('DOMContentLoaded', function() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
});

// ===== 返回顶部按钮 =====
document.addEventListener('DOMContentLoaded', function() {
    // 创建返回顶部按钮
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '↑';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.setAttribute('aria-label', '返回顶部');
    document.body.appendChild(scrollTopBtn);
    
    // 添加样式
    const btnStyle = document.createElement('style');
    btnStyle.textContent = `
        .scroll-top-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--primary);
            color: white;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 999;
        }
        
        .scroll-top-btn:hover {
            background: var(--primary-dark);
            transform: translateY(-3px);
        }
        
        .scroll-top-btn.visible {
            opacity: 1;
            visibility: visible;
        }
    `;
    document.head.appendChild(btnStyle);
    
    // 显示/隐藏按钮
    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    
    // 点击返回顶部
    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

// ===== 控制台欢迎信息 =====
console.log('%c PFM-DenseBench ', 'background: #667eea; color: white; font-size: 16px; padding: 8px 16px; border-radius: 4px;');
console.log('病理基础模型密集预测基准测试 - ICML 2025');
console.log('访问我们的GitHub获取更多信息: https://github.com/xxx/PFM-DenseBench');
