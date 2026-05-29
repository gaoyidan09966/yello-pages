/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name, e.g. "Key", "Tv", "Droplet", "Truck"
  sort: number;
}

export interface Listing {
  id: string;
  title: string;
  categoryId: string;
  phone: string;
  wechat: string;
  address: string;
  description: string;
  images: string[]; // URLs or base64 data
  tags: string[];
  status: 'active' | 'suspended';
  isFeatured: boolean;
  views: number;
  businessHours: string; // e.g. "08:00 - 20:00" or "24小时"
  createdAt: string;
}

export interface UserSuggestion {
  id: string;
  title: string;
  categoryId: string;
  phone: string;
  wechat: string;
  address: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'repair', name: '修锁疏通/维修', icon: 'Wrench', sort: 1 },
  { id: 'living', name: '送水保洁/万能', icon: 'Droplet', sort: 2 },
  { id: 'delivery', name: '同城外卖/零食', icon: 'ShoppingBag', sort: 3 },
  { id: 'logistic', name: '拉货搬家/物流', icon: 'Truck', sort: 4 },
  { id: 'medical', name: '药店送药/健康', icon: 'HeartPulse', sort: 5 },
  { id: 'education', name: '培训托管/驾校', icon: 'GraduationCap', sort: 6 },
  { id: 'leasing', name: '二手租房/中介', icon: 'Home', sort: 7 },
  { id: 'wedding', name: '鲜花婚庆/策划', icon: 'Flower2', sort: 8 },
];
