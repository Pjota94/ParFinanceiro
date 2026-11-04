'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import { Button } from '../ui/button';

const OUTPUT_SIZE = 256;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Recorta o centro em quadrado e reduz para 256×256 (JPEG) para caber no banco. */
async function resizeToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null); // nova foto ainda não salva
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) { setPreview(null); setRemoving(false); }
  }, [isOpen]);

  if (!user) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Escolha um arquivo de imagem.'); return; }
    if (file.size > MAX_FILE_BYTES) { toast.error('A imagem é grande demais (máx. 8 MB).'); return; }
    try {
      setPreview(await resizeToDataUrl(file));
      setRemoving(false);
    } catch {
      toast.error('Não conseguimos ler essa imagem. Tente outra.');
    }
  }

  async function handleSave() {
    if (!preview && !removing) { onClose(); return; }
    setSaving(true);
    try {
      await api.put('/auth/avatar', { image: removing ? null : preview });
      await refreshUser();
      toast.success(removing ? 'Foto removida' : 'Foto atualizada');
      onClose();
    } catch {
      toast.error('Não deu para salvar a foto. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  const shown = removing ? null : preview ?? user.avatarUrl ?? null;
  const hasPhoto = !!(preview ?? user.avatarUrl) && !removing;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Meu perfil" description="Escolha uma foto para aparecer no lugar das suas iniciais." size="sm">
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={user.name} color={user.avatarColor} size="xl" src={shown} />
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} aria-label="Escolher foto de perfil" tabIndex={-1} />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <Camera /> {hasPhoto ? 'Trocar foto' : 'Escolher foto'}
            </Button>
            {hasPhoto && (
              <Button type="button" variant="outline" onClick={() => { setPreview(null); setRemoving(true); }}>
                <Trash2 /> Remover
              </Button>
            )}
          </div>
        </div>
        <div className="mb-[25px] flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="button" className="flex-1" loading={saving} disabled={!preview && !removing} onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
}
