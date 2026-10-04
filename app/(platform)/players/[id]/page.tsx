import { Analytics } from '@/components/workspace/analytics';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Analytics playerId={id}/>;}
