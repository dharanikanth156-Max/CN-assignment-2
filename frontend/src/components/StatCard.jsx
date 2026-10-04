import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'brand', trend }) => {
  const colorMap = {
    brand: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/10 to-pink-500/5 border-purple-500/20 text-purple-400',
    rose: 'from-rose-500/10 to-red-500/5 border-rose-500/20 text-rose-400',
  };

  const selectedColor = colorMap[color] || colorMap.brand;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${selectedColor} border backdrop-blur-xl p-5 transition-all hover:translate-y-[-2px] hover:shadow-xl`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-outfit">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/40 flex items-center text-xs text-slate-400">
          <span className="text-emerald-400 font-semibold mr-1.5">{trend}</span>
          <span>vs last cycle</span>
        </div>
      )}
    </div>
  );
};
