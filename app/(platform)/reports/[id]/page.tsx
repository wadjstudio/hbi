import { Reports } from '@/components/workspace/reports';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Reports id={id}/>;}
