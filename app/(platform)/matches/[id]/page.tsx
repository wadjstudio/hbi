import { VideoWorkspace } from '@/components/workspace/video-workspace';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <VideoWorkspace matchId={id}/>;}
