export interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  candidateName?: string;
}

export interface LockedTalentModal {
  isOpen: boolean;
  onClose: () => void;
  buttonText?: string;
}
