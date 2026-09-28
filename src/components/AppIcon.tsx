import { View } from 'react-native';
import {
  Camera,
  Images,
  Settings2,
  X,
  Maximize,
  Plus,
  Pencil,
  Trash2,
  Download,
  Share2,
  Save,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleDot,
  Check,
} from 'lucide-react-native';
import { colors } from './theme';

// Shared Lucide glyphs across navigation, controls, and status messages.
const icons = {
  camera: Camera,
  album: Images,
  settings: Settings2,
  close: X,
  expand: Maximize,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  download: Download,
  share: Share2,
  save: Save,
  connect: Wifi,
  disconnect: WifiOff,
  down: ChevronDown,
  up: ChevronUp,
  radio: Circle,
  selected: CircleDot,
  check: Check,
};
export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  const Icon = icons[name];
  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Icon size={size} color={color} strokeWidth={1.8} />
    </View>
  );
}
