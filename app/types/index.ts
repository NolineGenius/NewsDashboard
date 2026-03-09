export interface MasterPrompt {
  profileName: string;
  tonality: string;
  targetAudience: string;
  language: string;
  hashtags: string;
  customPrompt: string;
}

export interface CommentMasterPrompt {
  tonality: string;
  style: string;
  language: string;
  customPrompt: string;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  feeds: string[];
  postPrompt: MasterPrompt;
  commentPrompt: CommentMasterPrompt;
  createdAt: string;
  updatedAt: string;
  userId: string;
  ayrshareProfileKey?: string;
  linkedinConnected?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  date: string;
  content: string;
  profileId: string;
  feedUrl: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface GeneratedPost {
  id: string;
  profileId: string;
  newsArticleId: string;
  newsTitle: string;
  content: string;
  imageUrl?: string;
  status: "draft" | "final";
  model: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  linkedinPostUrl?: string;
}

export interface AyrshareProfile {
  profileKey: string;
  refId: string;
  title: string;
  createdAt: string;
}

export interface MonitoredChannel {
  id: string;
  profileId: string;
  name: string;
  linkedinUrl: string;
  lastChecked: string;
  createdAt: string;
}

export interface ChannelPost {
  id: string;
  profileId: string;
  channelId: string;
  channelName: string;
  content: string;
  authorName: string;
  linkedinUrl?: string;
  linkedinPostId?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  date: string;
  createdAt: string;
}

export interface GeneratedComment {
  id: string;
  profileId: string;
  channelPostId: string;
  originalPostContent: string;
  originalAuthor: string;
  content: string;
  model: string;
  createdAt: string;
}
