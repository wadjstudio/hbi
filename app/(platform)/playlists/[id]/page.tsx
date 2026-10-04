import { Playlists } from '@/components/workspace/meetings';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Playlists id={id}/>;}
