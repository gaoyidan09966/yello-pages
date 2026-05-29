/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_CATEGORIES, Category, Listing, UserSuggestion } from './types';
import { Icon } from './components/Icon';
import { ListingCard } from './components/ListingCard';
import { ListingDetailModal } from './components/ListingDetailModal';
import { SuggestionForm } from './components/SuggestionForm';

export default function App() {
  // --- APPLICATION STATES ---
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Category Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Triggering Modal states
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState<boolean>(false);

  // --- ADMIN PORTAL STATE ---
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [adminUsername, setAdminUsername] = useState<string | null>(localStorage.getItem('admin_username'));
  
  // Admin Login Inputs
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Admin Dashboard views: 'listings' | 'proposals' | 'categories'
  const [adminTab, setAdminTab] = useState<'listings' | 'proposals' | 'categories'>('listings');
  const [proposals, setProposals] = useState<UserSuggestion[]>([]);
  
  // State for adding or editing merchant listing in Admin Panel
  const [editingListing, setEditingListing] = useState<Partial<Listing> | null>(null);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [adminFormError, setAdminFormError] = useState<string | null>(null);
  const [adminFormSuccess, setAdminFormSuccess] = useState<boolean>(false);

  // State for Category editing in Admin Panel
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // Stats Counters
  const [totalClientViews, setTotalClientViews] = useState<number>(0);

  // --- FETCH DATA FOR USERS ---

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        queryParams.append('category', selectedCategory);
      }
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      if (adminToken) {
        // Admins can see suspended listings too, though standard users see active
        queryParams.append('showInactive', 'true');
      }

      const res = await fetch(`/api/listings?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data);
        
        // Sum total views to showcase statistics
        const sumViews = data.reduce((acc: number, cur: Listing) => acc + (cur.views || 0), 0);
        setTotalClientViews(sumViews);
      }
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH SECURED ADMIN PROPOSALS ---

  const fetchProposals = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/suggestions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    }
  };

  // Load everything on startup & filters changes
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, searchQuery, adminToken]);

  useEffect(() => {
    if (adminToken) {
      fetchProposals();
    }
  }, [adminToken]);

  // Handle click on Listing Card (increases visual viewer statistics)
  const handleOpenListingDetail = async (listing: Listing) => {
    setSelectedListing(listing);
    // Trigger optimistic count update
    setListings(prev => prev.map(item => item.id === listing.id ? { ...item, views: item.views + 1 } : item));
    
    // Smooth ping to backend views registration
    try {
      await fetch(`/api/listings/${listing.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  // --- ADMIN AUTHENTICATION LOGICS ---

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '登录失败，请检查账号密码');
      }

      // Save credentials in client space helper
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_username', data.username);
      setAdminToken(data.token);
      setAdminUsername(data.username);
      setAuthUsername('');
      setAuthPassword('');
      fetchProposals();
    } catch (err: any) {
      setAuthError(err.message || '网络通讯出现意外错误');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setAdminToken(null);
    setAdminUsername(null);
    setIsAdminMode(false);
  };

  // --- AI WRITER POWERED BY GEMINI PROXY ---

  const handleAiFillListing = async () => {
    if (!editingListing?.title) {
      setAdminFormError('请先填写【商家名称】，AI 才会以此分析生成合适的描述！');
      return;
    }

    setAiGenerating(true);
    setAdminFormError(null);

    const matchCat = categories.find(c => c.id === (editingListing.categoryId || categories[0]?.id));
    const catName = matchCat ? matchCat.name : '生活服务';

    try {
      const res = await fetch('/api/admin/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: editingListing.title,
          categoryName: catName
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI 撰写程序运行遇到问题');
      }

      // Populate draft edits from AI suggestions
      const aiData = json.data;
      setEditingListing(prev => ({
        ...prev,
        description: aiData.description,
        businessHours: aiData.businessHours,
        phone: prev.phone || aiData.phone,
        wechat: prev.wechat || aiData.wechat,
        tags: aiData.tags || []
      }));
    } catch (err: any) {
      setAdminFormError('AI 生成服务暂不在线或发生异常: ' + (err.message || '查看服务端日志'));
    } finally {
      setAiGenerating(false);
    }
  };

  // --- ADMIN BUSINESS CRUD OPERATIONS ---

  // Save new or update current Listing
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);
    setAdminFormSuccess(false);

    if (!editingListing?.title || !editingListing?.phone || !editingListing?.categoryId) {
      setAdminFormError('商家名、分类、及电话为必填项');
      return;
    }

    const isExisting = !!editingListing.id;
    const url = isExisting ? `/api/admin/listings/${editingListing.id}` : '/api/admin/listings';
    const method = isExisting ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(editingListing)
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || '保存商家数据时出错');
      }

      setAdminFormSuccess(true);
      fetchListings();
      setTimeout(() => {
        setEditingListing(null);
        setAdminFormSuccess(false);
      }, 1000);

    } catch (err: any) {
      setAdminFormError(err.message || '网络连接不稳定，请检查配置');
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('确定要永久删除该商家吗？此操作无法撤销。')) return;

    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        fetchListings();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Proposals verification: APPRUVE SUGGESTIONS
  const handleApproveProposal = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        fetchProposals();
        fetchListings();
      } else {
        alert(data.error || '校验批准程序出错');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        fetchProposals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!confirm('确定永久物理删除该条草稿档案吗？')) return;
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        fetchProposals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CATEGORIES CRUD LOGICS ---

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);

    if (!editingCategory?.name || !editingCategory?.icon) {
      setCatFormError('分类名称及图标名称必填');
      return;
    }

    const isExisting = !!editingCategory.id;
    const url = isExisting ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
    const method = isExisting ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(editingCategory)
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '保存分类失败');

      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      setCatFormError(err.message || '网络无法响应');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除该分类吗？如果是，则此分类下的商家将不再显示对应的分类标记。')) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        fetchCategories();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset filter selections
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-amber-100 selection:text-amber-800">
      
      {/* 1. TOP UTILITY HEADER RAIL */}
      <nav id="top-nav-bar" className="sticky top-0 z-40 bg-white/90 border-b border-slate-100 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500 p-2 text-white shadow-md shadow-amber-500/20">
              <Icon name="BookOpen" size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block leading-none font-medium mb-0.5">本地生活信息聚合</span>
              <strong className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5 font-sans">
                县城万能便民黄页
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200">
                  2026 最新版
                </span>
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Action toggles */}
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition outline-none border ${
                isAdminMode
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon name={isAdminMode ? 'User' : 'Settings'} size={14} />
              <span>{isAdminMode ? '进入黄页大厅' : '后台管理门户'}</span>
            </button>

            {!isAdminMode && (
              <button
                onClick={() => setIsSuggestionOpen(true)}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/10 transition flex items-center gap-1.5"
                id="header-apply-button"
              >
                <Icon name="PlusCircle" size={14} />
                <span>商家免费入驻</span>
              </button>
            )}

            {isAdminMode && adminToken && (
              <button
                onClick={handleAdminLogout}
                className="rounded-xl bg-rose-50 border border-rose-100 text-rose-600 px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100/50 transition"
              >
                <Icon name="LogOut" size={14} />
                <span>登出后台</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 2. CLIENT MAIN COMPONENT CONTENT CONTAINER */}
      {!isAdminMode ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-10 space-y-8">
          
          {/* CLIENT-SIDE HERO STATEMENT CARD */}
          <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 md:p-10 shadow-xl shadow-slate-900/10">
            {/* Visual ambient circular rings */}
            <div className="absolute top-[-80px] right-[-80px] h-80 w-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-20px] h-60 w-60 rounded-full bg-yellow-500/10 blur-2xl pointer-events-none" />

            <div className="max-w-2xl space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-300">
                <Icon name="Sparkles" size={12} />
                <span>安全 · 便民 · 实时 · 免费</span>
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans leading-tight">
                找微信、查电话、搜开锁维修 <br className="hidden md:inline" />
                <span className="text-amber-400">一键搜索</span> 极速联系县城行家！
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
                汇总修锁通马桶、极速送水保洁、日常同城零食快送、跑腿拉货、夜间救急送药等信息。
                所有商家均通过实名复核，让您在县城的生活更便利，安心有保障！
              </p>

              {/* Instant dynamic statistics pill */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <Icon name="Store" size={13} className="text-amber-400" />
                  <span>已收录商家： {listings.length} 家</span>
                </span>
                <span className="h-3 w-px bg-slate-800" />
                <span className="flex items-center gap-1">
                  <Icon name="Activity" size={13} className="text-emerald-400" />
                  <span>总计查找浏览： {totalClientViews} 人次</span>
                </span>
                <span className="h-3 w-px bg-slate-800" />
                <span className="flex items-center gap-1">
                  <Icon name="ShieldCheck" size={13} className="text-blue-400" />
                  <span>24小时运营巡检</span>
                </span>
              </div>
            </div>
          </section>

          {/* 3. DYNAMIC SEARCH COMPONENT PANEL */}
          <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center">
            
            {/* Input wrap */}
            <div className="relative w-full md:flex-1">
              <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="想要找哪个店？输入关键字，如 '开锁'、'空调'、'老王' 进行智能匹配..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-sm focus:outline-none transition leading-normal"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 rounded-full"
                >
                  <Icon name="XCircle" size={16} />
                </button>
              )}
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={handleClearFilters}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 transition flex items-center gap-1"
              >
                <Icon name="RefreshCw" size={12} />
                <span>清空重置</span>
              </button>
              <button
                onClick={() => setIsSuggestionOpen(true)}
                className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 hover:bg-amber-100/50 transition border border-amber-200/30 flex items-center gap-1.5"
              >
                <Icon name="Briefcase" size={13} />
                <span>我的店铺申请上墙</span>
              </button>
            </div>

          </section>

          {/* 4. CATEGORY SELECTOR CAROUSEL GRID */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Icon name="SlidersHorizontal" size={14} />
              <span>生活分类快速导航</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {/* All elements button */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                  selectedCategory === 'all'
                    ? 'border-amber-500 bg-amber-500 text-white font-semibold shadow-md shadow-amber-500/10'
                    : 'border-slate-100 bg-white hover:border-slate-350 text-slate-600'
                }`}
              >
                <div className="mb-1">
                  <Icon name="LayoutGrid" size={18} />
                </div>
                <span className="text-xs truncate">全部商家</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                    selectedCategory === cat.id
                      ? 'border-amber-500 bg-amber-500 text-white font-semibold shadow-md shadow-amber-500/10'
                      : 'border-slate-100 bg-white hover:border-slate-250 text-slate-600'
                  }`}
                >
                  <div className="mb-1 text-slate-400 select-none">
                    <Icon name={cat.icon} size={18} className={selectedCategory === cat.id ? 'text-white' : 'text-slate-500'} />
                  </div>
                  <span className="text-xs truncate max-w-full">{cat.name.split('/')[0]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 5. DIRECTORY LISTINGS GRID */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1.5 rounded-full bg-amber-500" />
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {selectedCategory === 'all'
                    ? '推荐入驻商家列表'
                    : `${categories.find((c) => c.id === selectedCategory)?.name.split('/')[0] || '选中'} 专区`}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                共有 {listings.length} 家登记服务在线
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <span className="text-xs text-slate-450 font-medium select-none">正在获取最新便民信息库，请稍候...</span>
              </div>
            ) : listings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-slate-100 bg-white p-12 text-center max-w-md mx-auto space-y-4 flex flex-col items-center"
              >
                <div className="rounded-full bg-slate-50 p-4 text-slate-400">
                  <Icon name="Inbox" size={36} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">没有找到匹配的店铺</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
                    非常抱歉，当前还没有在该分类或关键字下登记的县城商户。如果您是本地老板，欢迎免费提交您的信息！
                  </p>
                </div>
                <button
                  onClick={() => setIsSuggestionOpen(true)}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-white tracking-wide transition shadow-sm"
                >
                  我是店主，立即免费入驻
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    categories={categories}
                    onClick={() => handleOpenListingDetail(item)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 6. HELP DESK TIPS & COMMERCE ACCENT */}
          <footer className="rounded-2xl border border-slate-100 bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-500 mt-10">
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                <Icon name="SearchCode" size={15} />
                <span>什么是县城万能便民黄页？</span>
              </h5>
              <p className="text-xs leading-relaxed text-slate-400">
                黄页旨在建立本地化互信的电话微信号召系统，整合零散的生活微信群。把高频的开锁、疏通、送水、送药信息沉淀下来，随用随找。
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                <Icon name="PlusCircle" size={15} />
                <span>商家入驻收费吗？</span>
              </h5>
              <p className="text-xs leading-relaxed text-slate-400">
                本平台对全县城商户永远免费开放录入！只要提供的内容真实有效、电话可拨通即可上架。如需全栏目置顶高亮推荐可联系管理员人工配置。
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                <Icon name="ShieldAlert" size={15} />
                <span>信息纠错/广告位</span>
              </h5>
              <p className="text-xs leading-relaxed text-slate-400">
                若发现商家中包含虚假广告或已经关店无法打通，欢迎点击大厅底部按钮将信息进行上报。维护健康乡里信息站，人人有责。
              </p>
            </div>
          </footer>

        </main>
      ) : (
        /* ======================== ADMIN DASHBOARD VIEW ======================== */
        <div className="flex-1 flex flex-col">
          {!adminToken ? (
            /* SECURE LOGIN CARD SCREEN FOR ADMIN GATEWAY */
            <div className="flex-1 flex items-center justify-center p-4 py-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-3xl bg-white border border-slate-150 p-8 shadow-xl space-y-6"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="rounded-2xl bg-amber-500 p-3 text-white">
                    <Icon name="Lock" size={24} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800 font-sans tracking-tight">
                    黄页系统管理后台登录
                  </h2>
                  <p className="text-xs text-slate-400 leading-snug">
                    非系统运维、非商家核验负责人请勿尝试违规碰撞试错。
                  </p>
                </div>

                {authError && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-xs flex items-center gap-2">
                    <Icon name="AlertCircle" size={14} className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">管理员账号名 <span className="text-[10px] text-slate-300">(测试环境：admin)</span></label>
                    <input
                      type="text"
                      required
                      placeholder="请输入管理员用户名"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">管理员登录密码 <span className="text-[10px] text-slate-300">(测试环境：admin123)</span></label>
                    <input
                      type="password"
                      required
                      placeholder="请输入密码"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-xl bg-slate-900 border border-slate-900 text-white font-bold py-3 text-sm transition hover:bg-slate-800 shadow-md shadow-slate-950/10 flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Icon name="ShieldCheck" size={16} />
                    )}
                    <span>{authLoading ? '正在校验...' : '建立安全通道'}</span>
                  </button>
                </form>

                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-[11px] leading-relaxed text-slate-450 border-dashed">
                  💡 <strong>提示：</strong> 阁下在开发测试阶段可直接使用本地账户：账号名 <code>admin</code>，密码 <code>admin123</code> 连通。后端采用 Express JWT-Session 签名校验。
                </div>
              </motion.div>
            </div>
          ) : (
            /* VERIFIED LOGGED DASHBOARD */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 min-h-[80vh] border-t border-slate-100">
              
              {/* ADMIN LEFT MENU PANEL */}
              <aside className="lg:col-span-1 bg-white border-r border-slate-100 px-4 py-6 space-y-6">
                <div className="flex items-center gap-2.5 px-2">
                  <div className="rounded-full bg-slate-100 p-1.5 text-slate-700">
                    <Icon name="Layout" size={16} />
                  </div>
                  <div className="min-w-0">
                    <strong className="text-sm font-bold text-slate-800 block truncate">
                      {adminUsername || '系统管理员'}
                    </strong>
                    <span className="text-[10px] rounded bg-emerald-50 text-emerald-700 px-1 py-0.2 border border-emerald-100 uppercase tracking-widest font-semibold">
                      Online
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => { setAdminTab('listings'); setEditingListing(null); }}
                    className={`w-full text-left rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-between transition ${
                      adminTab === 'listings'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="Store" size={15} />
                      <span>商户直通 CRUD 库</span>
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${adminTab === 'listings' ? 'bg-white/20 text-white' : 'bg-slate-150 text-slate-500'}`}>
                      {listings.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setAdminTab('proposals'); setEditingListing(null); }}
                    className={`w-full text-left rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-between transition ${
                      adminTab === 'proposals'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="Inbox" size={15} />
                      <span>审核商户提报草稿</span>
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      adminTab === 'proposals' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 font-bold'
                    }`}>
                      {proposals.filter(p => p.status === 'pending').length} 件
                    </span>
                  </button>

                  <button
                    onClick={() => { setAdminTab('categories'); setEditingListing(null); }}
                    className={`w-full text-left rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-between transition ${
                      adminTab === 'categories'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="FolderGit" size={15} />
                      <span>黄页分类目录维护</span>
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${adminTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-150 text-slate-500'}`}>
                      {categories.length} 款
                    </span>
                  </button>
                </div>

                <div className="border-t border-slate-50 pt-5 space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest px-2">系统管理指引</h5>
                  <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                    💡 <strong>AI 助手撰写助手：</strong> <br />
                    在录入或编辑店铺时，可以只需输入标题即可点击 “✨ AI 一键生成” 便能请求 Gemini 3.5 模型智能推演店铺文案与合理配置！
                  </div>
                </div>
              </aside>

              {/* ADMIN CORE WORKSPACE DETAIL AREA */}
              <section className="lg:col-span-4 bg-slate-50/50 p-6 space-y-6">
                
                {/* 1. VIEW A: MERCHANTS DIRECT CRUD LIST */}
                {adminTab === 'listings' && !editingListing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">黄页店铺核心数据库 ({listings.length})</h3>
                        <p className="text-xs text-slate-400">在此直接维护、上下架、置顶高亮显示，并可以建立全新服务。</p>
                      </div>
                      <button
                        onClick={() => setEditingListing({
                          title: '',
                          categoryId: categories[0]?.id || 'repair',
                          phone: '',
                          wechat: '',
                          address: '',
                          description: '',
                          businessHours: '08:00 - 20:00',
                          tags: [],
                          isFeatured: false,
                          status: 'active'
                        })}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/10 transition flex items-center gap-1.5"
                      >
                        <Icon name="Plus" size={14} />
                        <span>手动新增商家入驻</span>
                      </button>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                              <th className="p-4">商户店称</th>
                              <th className="p-4">所属分类</th>
                              <th className="p-4">一键直拨电话</th>
                              <th className="p-4">微信 / 地址</th>
                              <th className="p-4">总浏览 / 状态</th>
                              <th className="p-4 text-right">管理操控</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {listings.map((l) => {
                              const cat = categories.find(c => c.id === l.categoryId);
                              return (
                                <tr key={l.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <strong className="text-sm font-bold text-slate-800">{l.title}</strong>
                                        {l.isFeatured && (
                                          <span className="rounded-full bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 shrink-0 font-bold border border-amber-200">
                                            置顶精选
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-400 max-w-sm font-medium line-clamp-1 truncate">{l.description}</p>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    {cat && (
                                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 font-semibold text-[10px]">
                                        <Icon name={cat.icon} size={11} className="text-amber-500" />
                                        <span>{cat.name.split('/')[0]}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono font-semibold text-slate-700">{l.phone}</td>
                                  <td className="p-4">
                                    <div className="space-y-0.5">
                                      <span className="text-emerald-700 font-bold text-[10px] block font-mono">{l.wechat || '未配对'}</span>
                                      <span className="text-slate-400 text-[10px] block truncate max-w-xs">{l.address || '不限范围'}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="space-y-1">
                                      <span className="text-slate-500 font-bold font-mono">{l.views} 次</span>
                                      <span className={`block max-w-max text-[9px] font-semibold px-1 rounded ${
                                        l.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                      }`}>
                                        {l.status === 'active' ? '正常上架' : '封禁下架'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                      <button
                                        onClick={() => setEditingListing(l)}
                                        className="rounded-lg border border-slate-200 hover:border-amber-400 hover:text-amber-700 p-1.5 transition text-slate-500 bg-white"
                                        title="编辑详细参数"
                                      >
                                        <Icon name="Edit2" size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteListing(l.id)}
                                        className="rounded-lg border border-rose-150 hover:bg-rose-50 p-1.5 transition text-rose-600 bg-white"
                                        title="永久下架删除"
                                      >
                                        <Icon name="Trash2" size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT/ADD MERCHANT ENTRY FORM (AI COPILOT EMBEDDED) */}
                {adminTab === 'listings' && editingListing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                      <div>
                        <strong className="text-base text-slate-800 block">
                          {editingListing.id ? `修改商铺：${editingListing.title}` : '创设全新商家档案'}
                        </strong>
                        <span className="text-xs text-slate-400">
                          请认真核对字段格式。您可以利用 Sparkle 键直接使用大语言模型一键自动写内容！
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingListing(null)}
                        className="rounded-lg p-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                      >
                        <Icon name="X" size={15} />
                      </button>
                    </div>

                    {adminFormError && (
                      <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 p-3.5 text-xs flex items-start gap-2">
                        <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
                        <span>{adminFormError}</span>
                      </div>
                    )}

                    {adminFormSuccess && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 text-xs flex items-start gap-2">
                        <Icon name="CheckCircle" size={16} className="shrink-0 mt-0.5" />
                        <span>数据成功保存同步至黄页数据库！正在重定向...</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveListing} className="space-y-4">
                      
                      {/* Name input + AI generator button trigger */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-50">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-400 mb-1">
                            商户招牌名称 <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={editingListing.title || ''}
                              onChange={(e) => setEditingListing(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="例：东关老陈家电维修部"
                              required
                              className="w-full rounded-xl border border-slate-200 pl-3.5 pr-28 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                            />
                            
                            <button
                              type="button"
                              onClick={handleAiFillListing}
                              disabled={aiGenerating}
                              className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 font-bold text-white px-2.5 text-[10px] tracking-wide transition flex items-center gap-1 disabled:bg-slate-300 disabled:cursor-not-allowed select-none"
                            >
                              {aiGenerating ? (
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                              ) : (
                                <Icon name="Sparkles" size={11} />
                              )}
                              <span>{aiGenerating ? 'AI拟搞中' : 'AI智能写详情'}</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-amber-600 block mt-1">
                            🌟 填完名称后，可直接点击 <strong>“AI 智能写详情”</strong>，将一键自动写简介描述、合理的营业时间、微信号电话等！
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">所属便民分类</label>
                          <select
                            value={editingListing.categoryId || ''}
                            onChange={(e) => setEditingListing(prev => ({ ...prev, categoryId: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none bg-white"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Phone + WeChat + Address row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">直拨热线联系电话</label>
                          <input
                            type="text"
                            value={editingListing.phone || ''}
                            onChange={(e) => setEditingListing(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="如：13812345678"
                            required
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">店主微信号</label>
                          <input
                            type="text"
                            value={editingListing.wechat || ''}
                            onChange={(e) => setEditingListing(prev => ({ ...prev, wechat: e.target.value }))}
                            placeholder="如：wx_laochen_weixiu"
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">营业服务时间表</label>
                          <input
                            type="text"
                            value={editingListing.businessHours || ''}
                            onChange={(e) => setEditingListing(prev => ({ ...prev, businessHours: e.target.value }))}
                            placeholder="如：08:00 - 20:30 或 24小时服务"
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">具体的服务地址</label>
                        <input
                          type="text"
                          value={editingListing.address || ''}
                          onChange={(e) => setEditingListing(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="如：建设路老客运站路南50米或全县上门"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      {/* Main description Area */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">商铺特色或服务项目简介描述</label>
                        <textarea
                          rows={4}
                          value={editingListing.description || ''}
                          onChange={(e) => setEditingListing(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="输入产品卖点，如专业开锁、公安备案、质量保证、不通物理不收费等等..."
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none focus:outline-none"
                        />
                      </div>

                      {/* Tags input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">亮点定位标签 (空格或逗号分隔组装)</label>
                        <input
                          type="text"
                          value={Array.isArray(editingListing.tags) ? editingListing.tags.join('，') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const splitTags = val.split(/[，, ；; ]+/).filter(Boolean);
                            setEditingListing(prev => ({ ...prev, tags: splitTags }));
                          }}
                          placeholder="例如: 24小时上门,公安备案,价格透明"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">目前已解析生成的标签组： {JSON.stringify(editingListing.tags || [])}</span>
                      </div>

                      {/* Featured checkbox */}
                      <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={!!editingListing.isFeatured}
                            onChange={(e) => setEditingListing(prev => ({ ...prev, isFeatured: e.target.checked }))}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 h-4 w-4"
                          />
                          <span>置顶高亮推荐一栏 (Featured Star)</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">展示状态:</span>
                          <button
                            type="button"
                            onClick={() => setEditingListing(prev => ({ ...prev, status: prev.status === 'active' ? 'suspended' : 'active' }))}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                              editingListing.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-100'
                            }`}
                          >
                            {editingListing.status === 'active' ? '● 正常在线上架' : '● 限流封禁暂停'}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <button
                          type="button"
                          onClick={() => setEditingListing(null)}
                          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                        >
                          取消返回
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 font-bold px-6 py-2.5 text-xs text-white shadow-md transition flex items-center gap-1.5"
                        >
                          <Icon name="Save" size={14} />
                          <span>保存并更新至黄页大厅</span>
                        </button>
                      </div>

                    </form>
                  </motion.div>
                )}

                {/* 2. VIEW B: PROPOSALS / SUGGESTIONS REVIEW LIST */}
                {adminTab === 'proposals' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">审核乡亲自主入驻提报草稿簿</h3>
                      <p className="text-xs text-slate-400">
                        用户在前端直接免费申请的商户信息会储存在此。核验电话属实后可一键上线！
                      </p>
                    </div>

                    {proposals.length === 0 ? (
                      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
                        <Icon name="Inbox" size={32} className="mx-auto mb-2 text-slate-300" />
                        <h4 className="text-xs font-bold text-slate-500">暂时没有新的申请待审核</h4>
                        <p className="text-[11px] text-slate-400 mt-1">目前所有的商铺档案都在有序运营中。</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {proposals.map((sug) => {
                          const cat = categories.find(c => c.id === sug.categoryId);
                          return (
                            <div
                              key={sug.id}
                              className={`bg-white border rounded-2xl p-5 shadow-xs transition duration-200 ${
                                sug.status === 'pending'
                                  ? 'border-amber-400 ring-2 ring-amber-400/5'
                                  : sug.status === 'approved'
                                  ? 'border-slate-200 opacity-70'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong className="text-base font-bold text-slate-800">{sug.title}</strong>
                                    {cat && (
                                      <span className="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] uppercase font-semibold">
                                        {cat.name.split('/')[0]}
                                      </span>
                                    )}
                                    <span className={`rounded-xl px-2 py-0.2 text-[9px] font-bold ${
                                      sug.status === 'pending'
                                        ? 'bg-amber-100 text-amber-800'
                                        : sug.status === 'approved'
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : 'bg-rose-50 text-rose-800'
                                    }`}>
                                      {sug.status === 'pending' ? '待审核' : sug.status === 'approved' ? '已批准录入' : '已驳回'}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-dashed text-justify">
                                    {sug.description}
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                                    <div className="flex items-center gap-1">
                                      <Icon name="Phone" size={12} className="text-slate-400 shrink-0" />
                                      <strong>联系电话： <a href={`tel:${sug.phone}`} className="text-amber-600 font-bold hover:underline font-mono">{sug.phone}</a></strong>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Icon name="MessageCircle" size={12} className="text-slate-400 shrink-0" />
                                      <span>微信号： <em className="not-italic font-bold text-emerald-700 font-mono">{sug.wechat || '暂无'}</em></span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Icon name="MapPin" size={12} className="text-slate-400 shrink-0" />
                                      <span className="truncate">地址： {sug.address || '不限'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Review Actions buttons */}
                                <div className="flex items-center md:flex-col gap-2 shrink-0 justify-end md:items-end">
                                  {sug.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveProposal(sug.id)}
                                        className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/10 transition flex items-center gap-1"
                                      >
                                        <Icon name="Check" size={13} />
                                        <span>立即核准上架</span>
                                      </button>
                                      <button
                                        onClick={() => handleRejectProposal(sug.id)}
                                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-500 transition"
                                      >
                                        驳回申请
                                      </button>
                                    </>
                                  )}
                                  
                                  <button
                                    onClick={() => handleDeleteProposal(sug.id)}
                                    className="rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/50 p-2 text-rose-600 transition"
                                    title="永久彻底撕毁草稿"
                                  >
                                    <Icon name="Trash2" size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. VIEW C: CATEGORIES CRUD LIST */}
                {adminTab === 'categories' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add/Edit Category Form list */}
                    <div className="lg:col-span-1 bg-white border border-slate-150 rounded-2xl p-5 space-y-4">
                      <strong className="text-sm text-slate-800 block">
                        {editingCategory?.id ? '编辑现有分类名称' : '新建一级服务分类'}
                      </strong>
                      <p className="text-xs text-slate-400">设定分类目录和 Lucide 图标以展示在大厅导航。</p>

                      {catFormError && (
                        <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 p-2.5 text-xs">
                          {catFormError}
                        </div>
                      )}

                      <form onSubmit={handleSaveCategory} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">分类名称 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="如：同城二手车/检测"
                            value={editingCategory?.name || ''}
                            onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Lucide 图标键名名名称 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="如：Car, HelpCircle, Truck, Key"
                            value={editingCategory?.icon || ''}
                            onChange={(e) => setEditingCategory(prev => ({ ...prev, icon: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-amber-400 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            请输入 Lucide-react 库的标准英文图标名，首字母大写。
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">排序权重值 (越小越前)</label>
                            <input
                              type="number"
                              placeholder="10"
                              value={editingCategory?.sort || ''}
                              onChange={(e) => setEditingCategory(prev => ({ ...prev, sort: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                          
                          <div className="flex items-end justify-center pb-2">
                            {editingCategory && (
                              <button
                                type="text"
                                onClick={() => setEditingCategory(null)}
                                className="text-xs text-rose-500 font-semibold"
                              >
                                清空当前
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 font-bold py-2.5 text-xs text-white shadow-md transition"
                        >
                          保存分类
                        </button>
                      </form>
                    </div>

                    {/* Category Directory List Table */}
                    <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                            <th className="p-3.5">预览图标</th>
                            <th className="p-3.5">分类目录</th>
                            <th className="p-3.5">图标编码</th>
                            <th className="p-3.5">排序权重</th>
                            <th className="p-3.5 text-right">管理</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {categories.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                              <td className="p-3.5">
                                <div className="rounded-lg bg-amber-50 p-2 text-amber-600 max-w-max">
                                  <Icon name={c.icon} size={16} />
                                </div>
                              </td>
                              <td className="p-3.5">
                                <strong className="text-sm font-bold text-slate-700">{c.name}</strong>
                              </td>
                              <td className="p-3.5 font-mono text-slate-450">{c.icon}</td>
                              <td className="p-3.5 font-bold font-mono text-slate-500">{c.sort}</td>
                              <td className="p-3.5 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => setEditingCategory(c)}
                                    className="rounded-lg border border-slate-200 p-1.5 transition text-slate-500 bg-white hover:border-amber-400 hover:text-amber-700"
                                    title="编辑"
                                  >
                                    <Icon name="Edit2" size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(c.id)}
                                    className="rounded-lg border border-rose-100 p-1.5 transition text-rose-600 bg-white hover:bg-rose-50"
                                    title="删除"
                                  >
                                    <Icon name="Trash2" size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </section>

            </div>
          )}
        </div>
      )}

      {/* 4. MODALS & POPUP SHEETS DRAWER PORTIONS */}

      {/* Detail Showcase Modal */}
      <ListingDetailModal
        listing={selectedListing}
        categories={categories}
        onClose={() => setSelectedListing(null)}
      />

      {/* Client proposition popover */}
      {isSuggestionOpen && (
        <SuggestionForm
          categories={categories}
          onClose={() => setIsSuggestionOpen(false)}
          onSubmitSuccess={() => {
            fetchProposals();
          }}
        />
      )}

    </div>
  );
}
