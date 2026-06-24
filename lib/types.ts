// 神灯愿望类型
export type WishTypeId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'Z';

// 愿望状态
export type WishStatus = 'drifting' | 'received' | 'implementing' | 'fulfilled' | 'aiFulfilled';

// 案例状态
export type CaseStatus = 'fulfilled' | 'aiFulfilled' | 'comingSoon';

// 支持的语言
export type Language = 'en' | 'zh';

// 愿望类型定义
export interface WishType {
  id: WishTypeId;
  icon: string; // emoji
  color: string; // tailwind gradient classes
  locked?: boolean; // 是否锁定
}

// 愿望
export interface Wish {
  id: string;
  type: WishTypeId;
  content: string;
  authorName: string;
  authorCountry: string;
  status: WishStatus;
  createdAt: string;
  driftCount: number; // 已漂流人数
}

// 案例展示
export interface WishCase {
  id: string;
  type: WishTypeId;
  title: string;
  content: string;
  authorName: string;
  authorCountry: string;
  status: CaseStatus;
  implementerName?: string;
  implementerMessage?: string;
  driftPath: number; // 漂流了多少人
  fulfilledAt?: string;
}
