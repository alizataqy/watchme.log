import { Film, Search, Clock, Eye } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'watchlist' | 'watched';
}

export function EmptyState({ type }: EmptyStateProps) {
  const content = {
    search: {
      icon: Search,
      title: 'Cari Film atau Series',
      description: 'Gunakan kotak pencarian untuk menemukan film atau series yang ingin kamu tracking.',
    },
    watchlist: {
      icon: Clock,
      title: 'Watchlist Kosong',
      description: 'Belum ada film atau series yang ingin kamu tonton. Cari dan tambahkan sekarang!',
    },
    watched: {
      icon: Eye,
      title: 'Belum Ada yang Ditonton',
      description: 'Tandai film atau series yang sudah kamu tonton.',
    },
  };

  const { icon: Icon, title, description } = content[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[240px]">{description}</p>
    </div>
  );
}
