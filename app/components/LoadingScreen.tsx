export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="loading-screen min-h-[50vh]">
      <div className="loading-pulse" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}
