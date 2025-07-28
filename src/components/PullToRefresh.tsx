import { useState, useEffect, useRef, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 80,
  className = ''
}: PullToRefreshProps) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    // Only trigger if at the top of the page
    if (window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    setPulling(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!pulling || refreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;
    
    if (distance > 0 && window.scrollY === 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply resistance effect
      const resistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;
    
    setPulling(false);
    
    if (pullDistance >= threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, pullDistance, threshold, refreshing]);

  const getRefreshIndicatorOpacity = () => {
    if (refreshing) return 1;
    return Math.min(pullDistance / threshold, 1);
  };

  const getRefreshIndicatorRotation = () => {
    if (refreshing) return 'animate-spin';
    return pullDistance >= threshold ? 'rotate-180' : '';
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.3, 40)}px)`,
        transition: pulling || refreshing ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
        style={{
          height: '60px',
          transform: `translateY(-60px)`,
          opacity: getRefreshIndicatorOpacity(),
          transition: pulling || refreshing ? 'none' : 'opacity 0.3s ease-out'
        }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-fantasy-frame rounded-full p-3 shadow-soft">
          <RefreshCw 
            className={`h-5 w-5 text-primary transition-transform duration-300 ${getRefreshIndicatorRotation()}`}
          />
        </div>
      </div>

      {/* Status text */}
      {(pulling || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-40"
          style={{
            height: '80px',
            transform: `translateY(-20px)`,
            opacity: getRefreshIndicatorOpacity()
          }}
        >
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-muted-foreground">
            {refreshing ? '更新中...' : pullDistance >= threshold ? '離してリフレッシュ' : '下に引いてリフレッシュ'}
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  );
};