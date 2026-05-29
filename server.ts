/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { DEFAULT_CATEGORIES, Listing, Category, UserSuggestion } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Secret Token for basic auth
const ADMIN_TOKEN = 'local-yellowpages-admin-6789';

// Lazy loading Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY is not defined. AI functions will run in backup mode.');
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Seed listings
const SEED_LISTINGS: Listing[] = [
  {
    id: 'l1',
    title: '老王24h专业开锁换锁',
    categoryId: 'repair',
    phone: '13854129988',
    wechat: 'wang_locksmith',
    address: '县城人民路124号（东门公安局旁）',
    description: '专业开防盗门锁、指纹锁、汽车锁。全县10分钟到场，24小时服务。公安备案、持证上门，急人所急。换超B级、C级防盗锁芯、智能门锁，质量保证，诚信第一。',
    images: [],
    tags: ['24小时服务', '10分钟到场', '公安备案', '专业开锁'],
    status: 'active',
    isFeatured: true,
    views: 482,
    businessHours: '24小时服务',
    createdAt: new Date('2026-01-10').toISOString(),
  },
  {
    id: 'l2',
    title: '急速管道疏通与水电维修',
    categoryId: 'repair',
    phone: '15910023344',
    wechat: 'shutong_quick',
    address: '迎宾大道和兴小区地下商业街B区',
    description: '承接马桶疏通、下水道抢修、高压清洗管道、漏水检测。安装各品牌水龙头、洁具、更换电闸。多年老师傅带队，携带专业声呐测漏、抽粪车，价格合理，不通不收费！',
    images: [],
    tags: ['师傅靠谱', '不通不收费', '全城上门'],
    status: 'active',
    isFeatured: false,
    views: 231,
    businessHours: '07:30 - 22:00',
    createdAt: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'l3',
    title: '百川优质大桶水送水站',
    categoryId: 'living',
    phone: '0531-8899223',
    wechat: 'baichuan_water',
    address: '建设路中段农机公司家属院西临',
    description: '代理销售：农夫山泉、景田百岁山、雀巢优质甜水、娃哈哈纯净水、本地崂山泉。5桶起免费赠送大桶水架，一通电话15分钟送货上楼，支持月结送水卡优惠促销中！',
    images: [],
    tags: ['极速送达', '正品保障', '免费搬运上楼'],
    status: 'active',
    isFeatured: true,
    views: 312,
    businessHours: '08:00 - 19:30',
    createdAt: new Date('2026-03-01').toISOString(),
  },
  {
    id: 'l4',
    title: '爱干净政日常家庭保洁',
    categoryId: 'living',
    phone: '18678001122',
    wechat: 'clean_house_helper',
    address: '向阳路财富广场A座608室',
    description: '专业提供家庭日常保洁、新房开荒保洁、油烟机深度拆洗、玻璃擦洗、沙发窗帘除螨。阿姨全部持健康证及背景审核上岗，携带全套多功能专业清洁工具，用心保家。',
    images: [],
    tags: ['阿姨审核', '明码标价', '深度除螨'],
    status: 'active',
    isFeatured: false,
    views: 184,
    businessHours: '08:00 - 18:00',
    createdAt: new Date('2026-04-10').toISOString(),
  },
  {
    id: 'l5',
    title: '阿兵夜市无烟烧烤（同城包邮派送）',
    categoryId: 'delivery',
    phone: '13599881234',
    wechat: 'abing_shaokao',
    address: '青年路步行街夜市第12档口',
    description: '本地十载名店，秘制烤猪蹄、特色蜜汁羊肉串、炭烤生蚝。凡县城主城区点单满50元免配送费，保温锡纸密封配送，保障到手还是刚出炉的火候！深夜必备，味道绝佳。',
    images: [],
    tags: ['深夜食堂', '满50免配送', '特色烤猪蹄'],
    status: 'active',
    isFeatured: true,
    views: 651,
    businessHours: '17:30 - 凌晨02:30',
    createdAt: new Date('2026-04-20').toISOString(),
  },
  {
    id: 'l6',
    title: '德邦同城便民拉货搬家',
    categoryId: 'logistic',
    phone: '13188880000',
    wechat: 'debang_local_mover',
    address: '城南新区客运总站西侧货运部',
    description: '提供面包车、4.2米厢式货车、平板车同城同县拉货、学生搬家、白领迁居、厂房设备转移。配有专业装卸搬运师傅，大件家具拆卸打包。服务周到，绝对无中途临时加价行为！',
    images: [],
    tags: ['明码标价', '绝不加价', '安全高效'],
    status: 'active',
    isFeatured: false,
    views: 145,
    businessHours: '24小时在线',
    createdAt: new Date('2026-05-01').toISOString(),
  },
  {
    id: 'l7',
    title: '新特药大药房（夜间低价专车送药）',
    categoryId: 'medical',
    phone: '15064115566',
    wechat: 'xinte_pharmacy',
    address: '人民医院北门对面路西',
    description: '主营：中西成药、处方药、母婴保健品、医用器械、常用应急药。县城全区24小时紧急送药，夜间宝贝高烧、老人应急、胃痛，致电即可在30分钟内将药品配送上门。',
    images: [],
    tags: ['24小时送药', '医院对口', '正品保障'],
    status: 'active',
    isFeatured: true,
    views: 409,
    businessHours: '24小时营业',
    createdAt: new Date('2026-05-10').toISOString(),
  },
  {
    id: 'l8',
    title: '金牌捷达驾校县城报名处',
    categoryId: 'education',
    phone: '13377771122',
    wechat: 'jieda_driving_sc',
    address: '城北驾考训练基地综合办公楼',
    description: '全县场地最新、教练绝不吃拿卡要！一站式报考C1、C2驾照，设有夜班训练，方便上班商户。专车接送往返考场，最快35天即可拿证！三人成团报名尊享8.8折优惠。',
    images: [],
    tags: ['无吃拿卡要', '通过率高', '专车接送'],
    status: 'active',
    isFeatured: false,
    views: 198,
    businessHours: '08:00 - 20:30',
    createdAt: new Date('2026-05-15').toISOString(),
  },
];

// Load core helpers
function readData<T>(filePath: string, defaultData: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      writeData(filePath, defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading file ${filePath}, falling back to defaults`, error);
    return defaultData;
  }
}

function writeData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing file ${filePath}`, error);
  }
}

// Global states initialized from files
let listings: Listing[] = readData<Listing[]>(LISTINGS_FILE, SEED_LISTINGS);
let categories: Category[] = readData<Category[]>(CATEGORIES_FILE, DEFAULT_CATEGORIES);
let suggestions: UserSuggestion[] = readData<UserSuggestion[]>(SUGGESTIONS_FILE, []);

// Express configurations
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: '未授权：管理员凭证无效，请重新登录' });
    return;
  }
  next();
}

// ---------------- API ENDPOINTS ----------------

// 1. Core Categories
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

// 2. Core Listings (with search & filters)
app.get('/api/listings', (req, res) => {
  const { category, search, showInactive } = req.query;
  let filtered = [...listings];

  // Soft filter out suspended by default
  if (showInactive !== 'true') {
    filtered = filtered.filter((l) => l.status === 'active');
  }

  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter((l) => l.categoryId === category);
  }

  // Search filter
  if (search) {
    const q = (search as string).toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // Sort: Featured first, then views descending
  filtered.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return b.views - a.views;
  });

  res.json(filtered);
});

// 3. Single Listing detail and Views incrementor
app.get('/api/listings/:id', (req, res) => {
  const listingId = req.params.id;
  const listingIndex = listings.findIndex((l) => l.id === listingId);

  if (listingIndex === -1) {
    res.status(404).json({ error: '未找到该店铺' });
    return;
  }

  // Micro view count increment in memories and files
  listings[listingIndex].views += 1;
  writeData(LISTINGS_FILE, listings);

  res.json(listings[listingIndex]);
});

// 4. Contact Request / Quick Suggestion form for non-logged users
app.post('/api/suggestions', (req, res) => {
  const { title, categoryId, phone, wechat, address, description } = req.body;

  if (!title || !phone || !categoryId) {
    res.status(400).json({ error: '参数不完整：商家名称、联系电话、分类为必填项' });
    return;
  }

  const newSuggestion: UserSuggestion = {
    id: 'sug_' + Math.random().toString(36).substr(2, 9),
    title,
    categoryId,
    phone,
    wechat: wechat || '',
    address: address || '',
    description: description || '暂无详细介绍',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  suggestions.push(newSuggestion);
  writeData(SUGGESTIONS_FILE, suggestions);

  res.json({ success: true, message: '提交成功，请等待管理员审核上架！', data: newSuggestion });
});

// 5. Admin Authentication Login Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, token: ADMIN_TOKEN, username });
  } else {
    res.status(401).json({ error: '账号或密码错误。默认管理员：admin 密码：admin123' });
  }
});

// ---------------- SECURED ADMIN ENDPOINTS ----------------

// Get user proposals list
app.get('/api/admin/suggestions', requireAdmin, (req, res) => {
  res.json(suggestions);
});

// Process proposals (Approve and import)
app.post('/api/admin/suggestions/:id/approve', requireAdmin, (req, res) => {
  const sugId = req.params.id;
  const sugIdx = suggestions.findIndex((s) => s.id === sugId);

  if (sugIdx === -1) {
    res.status(404).json({ error: '申请提案没找到' });
    return;
  }

  const sug = suggestions[sugIdx];
  sug.status = 'approved';

  // Spawn listing from approved suggestion
  const newListing: Listing = {
    id: 'l_' + Math.random().toString(36).substr(2, 9),
    title: sug.title,
    categoryId: sug.categoryId,
    phone: sug.phone,
    wechat: sug.wechat,
    address: sug.address,
    description: sug.description,
    images: [],
    tags: ['入驻首发', '便民推荐'],
    status: 'active',
    isFeatured: false,
    views: 12,
    businessHours: '08:00 - 20:00',
    createdAt: new Date().toISOString(),
  };

  listings.push(newListing);
  writeData(LISTINGS_FILE, listings);
  writeData(SUGGESTIONS_FILE, suggestions);

  res.json({ success: true, message: '通过批准，并已快捷上架为新商户！', listing: newListing });
});

// Reject suggestion
app.post('/api/admin/suggestions/:id/reject', requireAdmin, (req, res) => {
  const sugId = req.params.id;
  const sugIdx = suggestions.findIndex((s) => s.id === sugId);

  if (sugIdx === -1) {
    res.status(404).json({ error: '申请提案没找到' });
    return;
  }

  suggestions[sugIdx].status = 'rejected';
  writeData(SUGGESTIONS_FILE, suggestions);
  res.json({ success: true, message: '成功拒绝上架申请' });
});

// Suggestion Delete CRUD
app.delete('/api/admin/suggestions/:id', requireAdmin, (req, res) => {
  const sugId = req.params.id;
  suggestions = suggestions.filter((s) => s.id !== sugId);
  writeData(SUGGESTIONS_FILE, suggestions);
  res.json({ success: true, message: '删除提案成功' });
});

// Active Listings CRUD: Add
app.post('/api/admin/listings', requireAdmin, (req, res) => {
  const { title, categoryId, phone, wechat, address, description, businessHours, tags, isFeatured } = req.body;

  if (!title || !phone || !categoryId) {
    res.status(400).json({ error: '参数不完整：商家名称、联系电话、分类为必填项' });
    return;
  }

  const newListing: Listing = {
    id: 'l_' + Math.random().toString(36).substr(2, 9),
    title,
    categoryId,
    phone,
    wechat: wechat || '',
    address: address || '',
    description: description || '暂无详细介绍',
    images: req.body.images || [],
    tags: Array.isArray(tags) ? tags : [],
    status: 'active',
    isFeatured: !!isFeatured,
    views: 0,
    businessHours: businessHours || '08:00 - 20:00',
    createdAt: new Date().toISOString(),
  };

  listings.push(newListing);
  writeData(LISTINGS_FILE, listings);

  res.json({ success: true, listing: newListing });
});

// Active Listings CRUD: Update
app.put('/api/admin/listings/:id', requireAdmin, (req, res) => {
  const listingId = req.params.id;
  const idx = listings.findIndex((l) => l.id === listingId);

  if (idx === -1) {
    res.status(404).json({ error: '未找到该店铺' });
    return;
  }

  listings[idx] = {
    ...listings[idx],
    ...req.body,
    id: listingId, // Lock the ID
  };

  writeData(LISTINGS_FILE, listings);
  res.json({ success: true, listing: listings[idx] });
});

// Active Listings CRUD: Delete
app.delete('/api/admin/listings/:id', requireAdmin, (req, res) => {
  const listingId = req.params.id;
  listings = listings.filter((l) => l.id !== listingId);
  writeData(LISTINGS_FILE, listings);
  res.json({ success: true });
});

// Active Categories CRUD: Add
app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, icon, sort } = req.body;
  if (!name || !icon) {
    res.status(400).json({ error: '名称与图标键为必填项' });
    return;
  }

  const newCategory: Category = {
    id: 'cat_' + Math.random().toString(36).substr(2, 9),
    name,
    icon,
    sort: Number(sort) || 10,
  };

  categories.push(newCategory);
  // Re-sort
  categories.sort((a, b) => a.sort - b.sort);
  writeData(CATEGORIES_FILE, categories);

  res.json({ success: true, category: newCategory });
});

// Active Categories CRUD: Update
app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const catId = req.params.id;
  const idx = categories.findIndex((c) => c.id === catId);

  if (idx === -1) {
    res.status(404).json({ error: '未找到该分类' });
    return;
  }

  categories[idx] = {
    ...categories[idx],
    ...req.body,
    id: catId,
  };

  categories.sort((a, b) => a.sort - b.sort);
  writeData(CATEGORIES_FILE, categories);
  res.json({ success: true, category: categories[idx] });
});

// Active Categories CRUD: Delete
app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const catId = req.params.id;
  categories = categories.filter((c) => c.id !== catId);
  writeData(CATEGORIES_FILE, categories);
  res.json({ success: true });
});

// ---------------- AI COPILOT ENDPOINT ----------------

app.post('/api/admin/ai-generate', requireAdmin, async (req, res) => {
  const { title, categoryName } = req.body;

  if (!title) {
    res.status(400).json({ error: '请输入商家名称进行AI生成。' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are a helpful assistant writing local community business descriptions for a professional web directory of small business listings (县城万能便民黄页网).
Your goals are to generate:
1. An encouraging, professional, and standard local service description (约100字，用中文，体现手艺纯熟、价格透明公正、诚信第一、免费咨询、电话微信可随时联系沟通。比如：如果您需要专业服务，欢迎点击拨打热线与微信沟通，明码标价，满意付款！).
2. exactly 3 or 4 tags (比如：上门快、老牌店、价格公道、24小时、技术专业).
3. Reasonable standard business hours (比如: "24小时" or "08:00 - 21:00").
4. A mock local Mobile Phone (以 138, 159, 131 开头的11位数手机号码) if you want, or leave empty. 
5. A mock local WeChat tag (拼音混合, e.g. "wx_laowang_repair" or "wechat_service").

You must return your output strictly in JSON format matching the schema structure without any surrounding markdown annotation blocks (no \`\`\`json block, just raw JSON text).

JSON keys:
{
  "description": string,
  "tags": string[],
  "businessHours": string,
  "phone": string,
  "wechat": string
}`;

    const prompt = `设计并脑补一个位于县城的小店。
商家名称: ${title}
所属生活分类: ${categoryName || '便民日常'}

根据这个名字，返回精制的JSON数据对象：`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const textOutput = response.text || '';
    const cleanedText = textOutput.trim();

    try {
      const generatedData = JSON.parse(cleanedText);
      res.json({ success: true, data: generatedData });
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON:', cleanedText, parseError);
      // Fallback on json parsing failure, regex clean
      res.json({
        success: true,
        data: {
          description: `【${title}】服务贴心，手艺一流。诚心服务乡亲，收费公开透明，提供专业${categoryName || '便民'}服务。欢迎电话随时联络咨询，全城快速到达，包您安心满意！`,
          tags: ['服务热情', '工艺地道', '快速到场'],
          businessHours: '08:00 - 20:30',
          phone: '138' + Math.floor(10000000 + Math.random() * 90000000),
          wechat: 'wx_' + Math.random().toString(36).substr(2, 6)
        }
      });
    }
  } catch (err: any) {
    console.error('Error in AI Generator:', err);
    // Standard beautiful mocked output if Gemini fails/key not set
    res.json({
      success: true,
      data: {
        description: `【${title}】本地知名商户，专注于广大百姓需求提供高性价比【${categoryName || '便民日常'}】。信誉承诺：不乱加价，用最热忱的态度解决村民急需！`,
        tags: ['价格实在', '服务周到', '本地老字号'],
        businessHours: '08:00 - 21:00',
        phone: '159' + Math.floor(10000000 + Math.random() * 90000000),
        wechat: 'wechat_' + Math.random().toString(36).substr(2, 6)
      }
    });
  }
});

// ---------------- VITE MIDDLEWARE SETUP ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server (Full-Stack) running on http://localhost:${PORT}`);
  });
}

startServer();
