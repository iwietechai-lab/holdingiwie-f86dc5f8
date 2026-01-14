import uavIcon from '@/assets/uav-icon.png';

interface CompanyIconProps {
  companyId: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

export function CompanyIcon({ companyId, icon, size = 'lg', className = '' }: CompanyIconProps) {
  // IWIE Drones uses the UAV icon instead of emoji
  if (companyId === 'iwie-drones') {
    return (
      <img 
        src={uavIcon} 
        alt="IWIE Drones" 
        className={`${sizeClasses[size]} object-contain ${className}`}
      />
    );
  }

  // Default: render the emoji icon
  return (
    <span className={`${textSizeClasses[size]} ${className}`}>
      {icon || '🏢'}
    </span>
  );
}
