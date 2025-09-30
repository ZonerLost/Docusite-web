import React from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Upload, Trash2 } from 'lucide-react';

interface ProfilePictureSectionProps {
  avatarSrc?: string;
  userName: string;
  onUploadPhoto: () => void;
  onDeletePhoto: () => void;
}

const ProfilePictureSection: React.FC<ProfilePictureSectionProps> = ({
  avatarSrc = '/avatar.png',
  userName,
  onUploadPhoto,
  onDeletePhoto
}) => {
  return (
    <div className="">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-1/2 lg:pr-6">
          <h2 className="text-lg font-semibold text-black mb-2">Profile Picture</h2>
          <p className="text-text-gray text-sm">You can edit, remove or upload your profile picture.</p>
        </div>
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar 
            src={avatarSrc} 
            alt={userName} 
            size="xl"
            className="w-16 h-16 flex-shrink-0"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              type="button"
              variant="outline" 
              onClick={onUploadPhoto}
              className="flex items-center space-x-2 px-4 py-2 bg-light-blue border-action text-action hover:bg-light-blue/80"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={onDeletePhoto}
              className="flex items-center space-x-2 border-cancelled-bg bg-cancelled-bg  text-cancelled-color hover:bg-red-50 px-4 py-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureSection;
