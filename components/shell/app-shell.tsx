import { WorkspaceProvider } from '@/components/workspace/provider';
import { WorkspaceShell } from '@/components/workspace/shell';
export function AppShell({children}:{children:React.ReactNode}){return <WorkspaceProvider><WorkspaceShell>{children}</WorkspaceShell></WorkspaceProvider>;}
