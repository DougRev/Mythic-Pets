import { PlaceHolderImages } from './placeholder-images';

export type Story = {
  id: string;
  title: string;
  createdAt: string;
  personaImage: string;
  imageHint: string;
};

export const mockStories: Story[] = [
  {
    id: '1',
    title: 'Sir Reginald and the Glimmering Shield',
    createdAt: '3 days ago',
    personaImage: PlaceHolderImages.find(p => p.id === 'gallery-item-1')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'gallery-item-1')?.imageHint || '',
  },
  {
    id: '2',
    title: 'Whispers of the Arcane Mouser',
    createdAt: '1 week ago',
    personaImage: PlaceHolderImages.find(p => p.id === 'gallery-item-2')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'gallery-item-2')?.imageHint || '',
  },
  {
    id: '3',
    title: 'Captain Squawk\'s Treasure',
    createdAt: '2 weeks ago',
    personaImage: PlaceHolderImages.find(p => p.id === 'gallery-item-3')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'gallery-item-3')?.imageHint || '',
  },
  {
    id: '4',
    title: 'The Case of the Missing Pellet',
    createdAt: '1 month ago',
    personaImage: PlaceHolderImages.find(p => p.id === 'gallery-item-4')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'gallery-item-4')?.imageHint || '',
  },
];
