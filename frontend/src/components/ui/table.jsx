import { cn } from '@/lib/utils'

function Table({ className, ...props }) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
}

function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-zinc-800', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn('border-b border-zinc-800 transition-colors hover:bg-zinc-900/50', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }) {
  return <th className={cn('h-10 px-3 text-left align-middle font-medium text-zinc-400', className)} {...props} />
}

function TableCell({ className, ...props }) {
  return <td className={cn('p-3 align-middle text-zinc-200', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }

