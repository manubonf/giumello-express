import Image from 'next/image'

interface NavetteLogoProps {
  height?: number
}

export function NavetteLogo({ height = 28 }: NavetteLogoProps) {
  return (
    <Image
      src="/FlyLibell_Logotipo_Red.svg"
      alt="Flylibell Navette"
      height={height}
      width={0}
      style={{ width: 'auto', height: `${height}px` }}
      priority
    />
  )
}