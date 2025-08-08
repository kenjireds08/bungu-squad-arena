import { MatchApproval } from './MatchApproval';

interface AdminApprovalsProps {
  onBack: () => void;
}

export const AdminApprovals = ({ onBack }: AdminApprovalsProps) => {
  return <MatchApproval />;
};