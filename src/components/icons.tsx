import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

export const MenuIcon = () => (
  <Icon>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
)
export const UndoIcon = () => (
  <Icon>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icon>
)
export const RedoIcon = () => (
  <Icon>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </Icon>
)
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const MinusIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
)
export const TrashIcon = () => (
  <Icon>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </Icon>
)
export const DownloadIcon = () => (
  <Icon>
    <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
  </Icon>
)
export const FileIcon = () => (
  <Icon>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
)
export const UploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16" />
  </Icon>
)
export const CheckIcon = () => (
  <Icon strokeWidth="3" width="12" height="12">
    <path d="m5 12 5 5 9-10" />
  </Icon>
)
export const PinIcon = ({ filled }: { filled: boolean }) => (
  <Icon fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" />
  </Icon>
)
