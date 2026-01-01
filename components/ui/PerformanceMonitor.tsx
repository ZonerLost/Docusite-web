import React, { useEffect } from 'react';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ enabled = false }) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Monitor page load performance
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;

      const now = performance.now();
      const navStart = navigation?.startTime ?? 0;
      const loadEnd =
        navigation?.loadEventEnd && navigation.loadEventEnd > 0
          ? navigation.loadEventEnd
          : now;
      const domContentLoadedEnd =
        navigation?.domContentLoadedEventEnd &&
        navigation.domContentLoadedEventEnd > 0
          ? navigation.domContentLoadedEventEnd
          : now;

      const loadTime = loadEnd - navStart;
      const domContentLoaded = domContentLoadedEnd - navStart;

      const fcpEntry = performance.getEntriesByName(
        'first-contentful-paint'
      )[0] as PerformanceEntry | undefined;
      const fcpTime = fcpEntry?.startTime;

      const metrics: Record<string, string> = {
        'Page Load Time': `${loadTime.toFixed(2)}ms`,
        'DOM Content Loaded': `${domContentLoaded.toFixed(2)}ms`,
      };

      if (typeof fcpTime === 'number') {
        metrics['First Contentful Paint'] = `${fcpTime.toFixed(2)}ms`;
      }

      console.log('Performance Metrics:', metrics);
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
