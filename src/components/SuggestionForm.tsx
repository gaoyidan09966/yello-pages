/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../types';
import { Icon } from './Icon';

interface SuggestionFormProps {
  categories: Category[];
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const SuggestionForm: React.FC<SuggestionFormProps> = ({ categories, onClose, onSubmitSuccess }) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [phone, setPhone] = useState('');
  const [wechat, setWechat] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Dynamic Validations
    if (!title.trim() || !phone.trim() || !categoryId) {
      setError('请完整填入商家名称、分类以及联系方式。');
      return;
    }

    if (phone.trim().length < 7) {
      setError('请输入正确的联系电话，确保乡亲们能拨通电话。');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          phone: phone.trim(),
          wechat: wechat.trim(),
          address: address.trim(),
          description: description.trim() || `【${title}】为广大居民提供优质贴心的本地便民生活信息服务，欢迎致电或扫码沟通。`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '提交过程中发生意外');
      }

      setSuccess(true);
      setTimeout(() => {
        onSubmitSuccess();
        onClose();
      }, 2500);

    } catch (err: any) {
      setError(err.message || '网络连接错误，请稍后再试。');
    } finally {
      setLoading(false);
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

        {/* Dialog Panel sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
          id="merchant-suggestion-dialog"
        >
          {/* Header */}
          <div className="bg-amber-500 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition outline-none"
            >
              <Icon name="X" size={16} />
            </button>
            <h2 className="text-xl font-bold tracking-tight">申请免费入驻黄页</h2>
            <p className="text-xs text-amber-100 mt-1 leading-snug">
              让全县乡亲及周边居民更容易找到您的店铺或便民生活服务！
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 space-y-4 text-center"
              >
                <div className="rounded-full bg-emerald-100 p-4 text-emerald-600">
                  <Icon name="CheckCircle" size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">黄页提交成功！</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  您的入驻审核申请已经录入系统。管理员审核（校验电话及真实性）后将立即为您免费上架展示！
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 p-3.5 text-xs flex items-start gap-2">
                    <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1">商家/服务号名称 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：老陈专业墙面粉刷"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">选择服务分类 <span className="text-rose-500">*</span></label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none bg-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name.split('/')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">直拨联系电话 <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      placeholder="固话或手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">微信号 <span className="text-slate-350">(方便微信流联系)</span></label>
                    <input
                      type="text"
                      placeholder="微信号或同绑定手机"
                      value={wechat}
                      onChange={(e) => setWechat(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">详细经营或服务地址</label>
                    <input
                      type="text"
                      placeholder="例：东关新街28号楼一楼"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">服务项目/主营介绍描述</label>
                  <textarea
                    rows={3}
                    placeholder="例如：承接新房墙面刷漆，二手房墙面翻新。明码标价，不偷工减料，随叫随到，包工包料价格公道，满意再给工费！"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition whitespace-nowrap"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-600 transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {loading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Icon name="Upload" size={16} />
                    )}
                    <span>{loading ? '正在提交...' : '立即提交申请'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
