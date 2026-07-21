type SectionHeaderProps = {
  label?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function SectionHeader({
  label,
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
      <div className="max-w-2xl">
        {label && <p className="section-label mb-3">{label}</p>}
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[2.75rem] lg:leading-[1.05]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
