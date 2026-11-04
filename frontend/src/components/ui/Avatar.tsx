interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

export default function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 ring-2 ring-surface`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
