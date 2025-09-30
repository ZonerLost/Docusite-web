import React from 'react';
import Image from 'next/image';
import auth from '@/public/auth.png';

const DashboardPreview: React.FC = () => {
  return (
    <div className="hidden lg:flex lg:flex-1 relative p-2 overflow-hidden">
      <div className="absolute inset-0 "></div>
      <div className="relative z-10 w-full h-full rounded-xl justify-end overflow-hidden">
        <Image
          src={auth}
          alt="Dashboard Preview"
          fill
          className="object-contain"
        />
      </div>
    </div>
  );
};

export default DashboardPreview;
