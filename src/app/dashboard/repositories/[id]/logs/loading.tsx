import { Loader2 } from 'lucide-react'

export default function LogsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground w-full h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm font-medium">커밋 로그를 불러오는 중입니다...</span>
    </div>
  )
}
