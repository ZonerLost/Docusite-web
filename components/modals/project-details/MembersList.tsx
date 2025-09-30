import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface MembersListProps {
  projectId: string;
  memberCount: number;
  onAddMemberClick?: () => void;
}

const MembersList: React.FC<MembersListProps> = ({ projectId, memberCount, onAddMemberClick }) => {
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'Mike Ross',
      role: 'Contractor',
      avatar: '/avatar.png'
    },
    {
      id: '2',
      name: 'Harvey Specter',
      role: 'Contractor',
      avatar: '/avatar.png'
    },
    {
      id: '3',
      name: 'Louis Litt',
      role: 'Contractor',
      avatar: '/avatar.png'
    }
  ]);

  const handleAddMember = () => {
    if (onAddMemberClick) onAddMemberClick();
  };

  const handleAddMemberSubmit = (memberData: { name: string; role: string }) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name: memberData.name,
      role: memberData.role,
      avatar: '/avatar.png'
    };
    setMembers([...members, newMember]);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(member => member.id !== memberId));
  };

  return (
    <div>
      {/* Add Member Button */}
      <div className="mb-4">
        <button
          onClick={handleAddMember}
          className="text-action hover:text-action/80 font-medium text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add new member</span>
        </button>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-2 bg-white border border-border-dark-gray rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar 
                src={member.avatar} 
                alt={member.name} 
                size="md"
                className="w-10 h-10"
              />
              <div>
                <h4 className="text-black font-normal text-sm">{member.name}</h4>
                <p className="text-text-gray text-xs">{member.role}</p>
              </div>
            </div>
            <button
              onClick={() => handleRemoveMember(member.id)}
              className="px-2 py-1 bg-cancelled-bg text-cancelled-color rounded-md text-xs font-medium hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default MembersList;
