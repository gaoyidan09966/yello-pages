/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Listing, Category } from '../types';
import { Icon } from './Icon';

interface ListingCardProps {
  listing: Listing;
  categories: Category[];
  onClick: () => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, categories, onClick }) => {
  const category = categories.find((c) => c.id === listing.categoryId);

  return (
    <motion.div
      layoutId={`card-${listing.id}`}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 transition-all outline-none duration-250 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg ${
        listing.isFeatured
          ? 'border-amber-250 bg-gradient-to-br from-amber-50/20 to-white ring-2 ring-amber-400/20'
          : 'border-slate-100'
      }`}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id={`listing-card-${listing.id}`}
    >
      {/* Featured Star Ribbons */}
      {listing.isFeatured && (
        <div className="absolute top-0 right-0 overflow-hidden rounded-bl-xl bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white tracking-wider shadow-sm flex items-center gap-1">
          <Icon name="Sparkles" size={10} />
          <span>精选</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Header containing Category and Title */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 mb-1.5">
            {category && (
              <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 border border-amber-100/40">
                <Icon name={category.icon} size={12} className="text-amber-500" />
                <span>{category.name.split('/')[0]}</span>
              </span>
            )}
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Icon name="Eye" size={11} />
              <span>{listing.views} 浏览</span>
            </span>
          </div>

          <h3 className="font-sans text-lg font-bold text-slate-800 tracking-tight leading-snug line-clamp-1 hover:text-amber-600">
            {listing.title}
          </h3>
        </div>

        {/* Short info snippets */}
        <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px] leading-relaxed">
          {listing.description}
        </p>

        {/* Location & Time Quick Peek */}
        <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-50 pt-3">
          <div className="flex items-center gap-2">
            <Icon name="MapPin" size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{listing.address || '地址见详情'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={13} className="text-slate-400 shrink-0" />
            <span>{listing.businessHours || '通常营业'}</span>
          </div>
        </div>

        {/* Footer Tag Cloud & Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-3 mt-1">
          <div className="flex flex-wrap gap-1">
            {listing.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-100"
              >
                {tag}
              </span>
            ))}
          </div>

          <span className="text-xs font-semibold text-amber-600 flex items-center gap-0.5 group-hover:text-amber-700">
            查看详情
            <Icon name="ChevronRight" size={12} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
