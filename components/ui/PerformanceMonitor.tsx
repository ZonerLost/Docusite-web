import React, { useEffect } from 'react';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ enabled = false }) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Monitor page load performance
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        console.log('Performance Metrics:', {
          'Page Load Time': `${loadTime.toFixed(2)}ms`,
          'DOM Content Loaded': `${domContentLoaded.toFixed(2)}ms`,
          'First Contentful Paint': navigation.responseEnd - navigation.requestStart,
        });
      }
    };

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, [enabled]);

  return null;
};

export default PerformanceMonitor;
