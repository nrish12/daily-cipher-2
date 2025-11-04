import { useEffect, useState } from 'react';
import { Achievement } from '../utils/achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const rarityColors = {
    common: 'from-gray-600 to-gray-700 border-gray-500',
    rare: 'from-blue-600 to-blue-700 border-blue-500',
    epic: 'from-purple-600 to-purple-700 border-purple-500',
    legendary: 'from-yellow-600 to-yellow-700 border-yellow-500'
  };

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`bg-gradient-to-r ${rarityColors[achievement.rarity]} border-2 rounded-xl p-6 shadow-2xl min-w-[300px] animate-bounce`}>
        <div className="text-center">
          <div className="text-5xl mb-2">{achievement.icon}</div>
          <div className="text-sm text-white/80 uppercase tracking-wider mb-1">{achievement.rarity} Achievement</div>
          <div className="text-2xl font-black text-white mb-2">{achievement.name}</div>
          <div className="text-sm text-white/90 mb-3">{achievement.description}</div>
          <div className="text-yellow-300 font-bold">+{achievement.points} points</div>
        </div>
      </div>
    </div>
  );
}
