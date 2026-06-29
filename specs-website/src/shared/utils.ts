export function debounce<T extends (...args: any[]) => void>(func: T, wait = 300, immediate = false): (...args: Parameters<T>) => void {
    let timeout: any = null;
    return function executedFunction(this: any, ...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

export function throttle<T extends (...args: any[]) => void>(func: T, wait = 100): (...args: Parameters<T>) => void {
    let lastTime = 0;
    let timeout: any = null;
    
    return function executedFunction(this: any, ...args: Parameters<T>) {
        const now = Date.now();
        const remaining = wait - (now - lastTime);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            lastTime = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                lastTime = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

const chartInstances = new Map<string, any>();

export const chartManager = {
    register(id: string, chart: any) {
        this.destroy(id);
        chartInstances.set(id, chart);
    },
    destroy(id: string) {
        const chart = chartInstances.get(id);
        if (chart) {
            chart.destroy();
            chartInstances.delete(id);
        }
    },
    destroyAll() {
        chartInstances.forEach((chart, id) => {
            try {
                chart.destroy();
            } catch (e) {
                console.warn(`Failed to destroy chart ${id}:`, e);
            }
        });
        chartInstances.clear();
    },
    get(id: string): any {
        return chartInstances.get(id) || null;
    }
};

export function animateNumber(element: HTMLElement | null, targetValue: number, duration = 600, prefix = '', suffix = '') {
    if (!element) return;
    
    const startValue = 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = `${prefix}${currentValue.toLocaleString()}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    } catch (err) {
        console.error('Copy failed:', err);
        return false;
    }
}
