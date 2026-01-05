import { PublishedAttachment } from '../GuideantsApi';

export type Message = {
  id: string;
  role: 'User' | 'Assistant' | 'System' | 'Tool';
  content: string;
  created: string;
  isEdited: boolean;
  attachments?: PublishedAttachment[];
  // Computed properties for turn tracking (not from API)
  _turnIndex?: number;
  _messageSequence?: number;
};

export type DisplayMode = 'full' | 'last-turn';

