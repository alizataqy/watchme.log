import { Search, Clock, Eye, CheckCircle, Calendar } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'watchlist' | 'watched' | 'watching' | 'upcoming';
}

export function EmptyState({ type }: EmptyStateProps) {
  const content = {
    search: {
      icon: Search,
      title: 'Mulai Pencarian',
      description: 'Cari film atau serial TV favorit Anda untuk mulai tracking.',
    },
    watching: {
      icon: Eye,
      title: 'Tidak Ada yang Sedang Ditonton',
      description: 'Mulai tonton sesuatu dari watchlist Anda!',
    },
    watchlist: {
      icon: Clock,
      title: 'Watchlist Kosong',
      description: 'Belum ada film atau serial yang ingin ditonton.',
    },
    watched: {
      icon: CheckCircle,
      title: 'Belum Ada yang Selesai',
      description: 'Selesaikan episode atau film pertama Anda untuk melihatnya di sini.',
    },
    upcoming: {
      icon: Calendar,
      title: 'Tidak Ada Jadwal Tayang',
      description: 'Semua film/serial dalam list Anda belum memiliki jadwal tayang baru, atau sudah tayang semua.',
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
