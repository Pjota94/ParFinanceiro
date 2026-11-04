import { Toaster } from 'react-hot-toast';

/** Toasts com tokens do tema; avisos de status são anunciados a leitores de tela. */
export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{ top: 16 }}
      toastOptions={{
        duration: 3500,
        ariaProps: { role: 'status', 'aria-live': 'polite' },
        style: {
          borderRadius: 'var(--r-md)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-pop)',
          fontSize: '14px',
          fontWeight: 500,
          maxWidth: 420,
        },
        success: { iconTheme: { primary: '#14804B', secondary: '#fff' } },
        error: { iconTheme: { primary: '#C0262D', secondary: '#fff' }, duration: 5000 },
      }}
    />
  );
}
