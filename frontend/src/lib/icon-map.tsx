import {
  LayoutDashboard,
  Package,
  Tags,
  Rows3,
  Users,
  ArrowRightLeft,
  ClipboardList,
  Truck,
  FileText,
  History,
  Settings,
  Folder,
  Menu,
  Shield,
  Boxes,
} from "lucide-react"

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  Tags: <Tags className="h-4 w-4" />,
  Rows3: <Rows3 className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  ArrowRightLeft: <ArrowRightLeft className="h-4 w-4" />,
  ClipboardList: <ClipboardList className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  History: <History className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  Folder: <Folder className="h-4 w-4" />,
  Menu: <Menu className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  Boxes: <Boxes className="h-4 w-4" />,
}

export function getIcon(name: string | null): React.ReactNode {
  if (!name) return null
  return iconMap[name] || <Menu className="h-4 w-4" />
}
