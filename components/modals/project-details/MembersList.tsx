import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { removeProjectMember } from '@/lib/projects';
import { toast } from 'react-hot-toast';
import { checkProjectPermission } from '@/lib/permissions';

interface Member {
  id: string;
  email?: string;
  name: string;
  role: string;
  avatar: string;
}

interface MembersListProps {
  projectId: string;
  memberCount: number;
  onAddMemberClick?: () => void;
  collaborators?: { uid: string; email?: string; name: string; role: string; photoUrl?: string }[];
}

const MembersList: React.FC<MembersListProps> = ({ projectId, memberCount, onAddMemberClick, collaborators }) => {
  const [members, setMembers] = useState<Member[]>([]);

  React.useEffect(() => {
    if (collaborators && collaborators.length) {
      setMembers(
        collaborators.map((c, idx) => ({
          id: c.uid || c.email || `local-${idx}-${c.name}`,
          email: c.email,
          name: c.name,
          role: c.role,
          avatar: c.photoUrl || '',
        }))
      );
    } else {
      setMembers([]);
    }
  }, [collaborators]);

  const handleAddMember = () => {
    if (onAddMemberClick) onAddMemberClick();
  };

  const handleAddMemberSubmit = (memberData: { name: string; role: string }) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name: memberData.name,
      role: memberData.role,
      avatar: ''
    };
    setMembers([...members, newMember]);
  };

  const handleRemoveMember = async (member: Member) => {
    const prev = members;
    setMembers((curr) => curr.filter((m) => m.id !== member.id));

    try {
      const ok = await checkProjectPermission(projectId);
      if (!ok) { setMembers(prev); return; }
      const uid = member.id && !member.id.includes('@') && !member.id.startsWith('local-') ? member.id : undefined;
      await removeProjectMember(projectId, { uid, email: member.email });
      toast.success('Member removed');
    } catch (e: any) {
      setMembers(prev);
      const code = e?.code || e?.message || '';
      const msg = code === 'permission-denied'
        ? 'Permission denied. Only the project owner can update.'
        : code === 'invalid-operation'
          ? 'Cannot remove the project owner.'
          : 'Failed to remove member';
      toast.error(msg);
    }
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
                src={member.avatar || undefined}
                alt={member.name}
                name={member.name}
                size="md"
                className="w-10 h-10"
              />
              <div>
                <h4 className="text-black font-normal text-sm">{member.name}</h4>
                <p className="text-text-gray text-xs">{member.role}</p>
              </div>
            </div>
            <button
              onClick={() => handleRemoveMember(member)}
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
