import Modal from './Modal';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação antes de ações destrutivas (substitui window.confirm). */
export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Excluir', loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} description={description} size="sm">
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="destructive" className="flex-1" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
