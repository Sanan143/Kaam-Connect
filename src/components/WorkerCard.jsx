import { Star, MapPin, ShieldCheck, PhoneCall } from 'lucide-react';

const WorkerCard = ({ worker }) => {
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-card hover:shadow-xl hover:border-primary/30 transition-all hover:-translate-y-1">
      
      {/* Top Banner / Image Area */}
      <div className="relative h-24 bg-gradient-to-r from-primary/10 to-orange-500/10 flex justify-center pt-6">
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-foreground flex items-center shadow-sm">
          <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" /> {worker.rating}
        </div>
        {worker.verified && (
          <div className="absolute top-3 right-3 bg-green-500 px-2 py-1 rounded-md text-xs font-bold text-white flex items-center shadow-sm">
            <ShieldCheck className="w-3 h-3 mr-1" /> Verified
          </div>
        )}
      </div>

      <div className="px-5 pb-5 -mt-10 flex-col flex flex-1">
        
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl border-4 border-card overflow-hidden shadow-md bg-muted relative z-10">
          <img src={worker.imageUrl} alt={worker.name} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div className="mt-3">
          <h3 className="font-display font-bold text-xl text-foreground group-hover:text-primary transition-colors">{worker.name}</h3>
          <p className="text-primary font-semibold text-sm mt-0.5">{worker.role}</p>
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{worker.location}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
          <div>
            <span className="text-xl font-bold text-foreground">₹{worker.hourlyRate}</span>
            <span className="text-xs text-muted-foreground">/hr</span>
          </div>
          <button className="inline-flex items-center justify-center font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 h-10 w-10 p-0 rounded-xl">
            <PhoneCall className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkerCard;
