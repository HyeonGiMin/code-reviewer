import { Loader2 } from 'lucide-react'

export default function ReviewLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-3 text-muted-foreground w-full h-full bg-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#0969da]" />
      <span className="text-sm font-medium">리뷰 페이지를 준비하는 중입니다...</span>
    </div>
  )
}
