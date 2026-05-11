import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KBO_TEAMS = [
  { code: 'LG', displayName: 'LG 트윈스', primaryColor: '#C3042F' },
  { code: 'DS', displayName: '두산 베어스', primaryColor: '#131230' },
  { code: 'SS', displayName: '삼성 라이온즈', primaryColor: '#074CA1' },
  { code: 'HH', displayName: '한화 이글스', primaryColor: '#FF6600' },
  { code: 'KT', displayName: 'KT 위즈', primaryColor: '#000000' },
  { code: 'NC', displayName: 'NC 다이노스', primaryColor: '#1D467E' },
  { code: 'OB', displayName: '롯데 자이언츠', primaryColor: '#002955' },
  { code: 'HB', displayName: '키움 히어로즈', primaryColor: '#820024' },
  { code: 'KIA', displayName: 'KIA 타이거즈', primaryColor: '#EA0029' },
  { code: 'SK', displayName: 'SSG 랜더스', primaryColor: '#CE0E2D' },
]

async function main() {
  for (const team of KBO_TEAMS) {
    await prisma.team.upsert({
      where: { code: team.code },
      create: team,
      update: team,
    })
  }
  console.log('teams 시드 완료')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
