/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, Category } from '../types';
import { Icon } from './Icon';

interface ListingDetailModalProps {
  listing: Listing | null;
  categories: Category[];
  onClose: () => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({ listing, categories, onClose }) => {
  const [copiedField, setCopiedField] = useState<'phone' | 'wechat' | 'address' | null>(null);

  if (!listing) return null;

  const category = categories.find((c) => c.id === listing.categoryId);

  const handleCopy = (text: string, field: 'phone' | 'wechat' | 'address') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Preset gradients representing each category class representing convenience aesthetics
  const getBannerGradient = (id: string) => {
    switch (id) {
      case 'repair': return 'from-amber-500 to-orange-600';
      case 'living': return 'from-teal-500 to-emerald-600';
      case 'delivery': return 'from-red-500 to-orange-500';
      case 'logistic': return 'from-blue-500 to-cyan-600';
      case 'medical': return 'from-emerald-500 to-teal-500';
      case 'education': return 'from-indigo-500 to-purple-600';
      case 'leasing': return 'from-purple-500 to-pink-600';
      case 'wedding': return 'from-rose-500 to-pink-500';
      default: return 'from-slate-600 to-slate-800';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Sheet body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
          id={`listing-detail-modal-${listing.id}`}
        >
          {/* Header Banner representing yellow pages design */}
          <div className={`h-36 bg-gradient-to-r ${getBannerGradient(listing.categoryId)} relative p-6 flex flex-col justify-end text-white overflow-hidden`}>
            {/* Visual background accents */}
            <div className="absolute top-[-30px] right-[-20px] opacity-10">
              {category && <Icon name={category.icon} size={180} />}
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 backdrop-blur-xs transition outline-none"
            >
              <Icon name="X" size={16} />
            </button>

            {category && (
              <span className="inline-flex max-w-max items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md mb-2 border border-white/10">
                <Icon name={category.icon} size={12} />
                <span>{category.name}</span>
              </span>
            )}
            <h2 className="text-xl md:text-2xl font-bold tracking-tight line-clamp-1">{listing.title}</h2>
          </div>

          {/* Body contents */}
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
            
            {/* Introduction section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">商家介绍</h4>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-dotted border-slate-200">
                {listing.description}
              </p>
            </div>

            {/* Quick stats tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {listing.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 border border-amber-100/30 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Contact Action Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">联系方式</h4>
              
              {/* Phone Card */}
              <div className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-amber-400 font-sans shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                    <Icon name="Phone" size={18} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block leading-none mb-1">直拨热线</span>
                    <a href={`tel:${listing.phone}`} className="text-lg font-bold text-slate-800 hover:underline">
                      {listing.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${listing.phone}`}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 transition"
                    title="拨打电话"
                  >
                    <Icon name="Phone" size={14} />
                  </a>
                  <button
                    onClick={() => handleCopy(listing.phone, 'phone')}
                    className="flex items-center gap-1 text-xs font-medium py-2 px-3 text-amber-600 bg-amber-50 hover:bg-amber-100/50 rounded-xl transition"
                  >
                    <Icon name={copiedField === 'phone' ? 'Check' : 'Copy'} size={13} />
                    <span>{copiedField === 'phone' ? '已复制' : '复制'}</span>
                  </button>
                </div>
              </div>

              {/* WeChat Card */}
              {listing.wechat && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-emerald-400 font-sans shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <Icon name="MessageCircle" size={18} />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block leading-none mb-1">微信号 (微店/咨询)</span>
                      <strong className="text-base font-bold text-slate-800">{listing.wechat}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(listing.wechat, 'wechat')}
                    className="flex items-center gap-1 text-xs font-medium py-2 px-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50 rounded-xl transition"
                  >
                    <Icon name={copiedField === 'wechat' ? 'Check' : 'Copy'} size={13} />
                    <span>{copiedField === 'wechat' ? '已复制' : '复制'}</span>
                  </button>
                </div>
              )}

              {/* Address Card */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-slate-300 font-sans shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-slate-50 p-2.5 text-slate-600 shrink-0">
                    <Icon name="MapPin" size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 block leading-none mb-1">经营/服务地址</span>
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight pr-2">{listing.address || '全县城区域上门服务'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(listing.address || '上门服务', 'address')}
                  className="flex items-center gap-1 text-xs font-medium py-2 px-3 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition shrink-0"
                >
                  <Icon name={copiedField === 'address' ? 'Check' : 'Copy'} size={13} />
                  <span>{copiedField === 'address' ? '已复制' : '复制'}</span>
                </button>
              </div>
            </div>

            {/* Business Hours */}
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Icon name="Clock" size={13} className="text-slate-400" />
                <span>营业时间：{listing.businessHours || '暂无'}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                发布日期：{new Date(listing.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>

            {/* Note & warning banner */}
            <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 p-3 text-xs leading-relaxed text-yellow-800 flex gap-2">
              <Icon name="AlertCircle" size={14} className="shrink-0 mt-0.5" />
              <div>
                建议：便民信息均由商家自主入驻提供。交易或开锁、维修时，请核实师傅的上门资质和价格。对大额消费、定金交易等请多加防范！
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
