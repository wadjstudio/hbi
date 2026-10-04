import { TacticBoard } from '@/components/workspace/tactics';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TacticBoard id={id}/>;}
