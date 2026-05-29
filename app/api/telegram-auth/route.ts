import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function validateTelegramInitData(initData: string, botToken: string) {
  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get('hash')

  if (!hash) {
    return { ok: false, error: 'Hash tapılmadı' }
  }

  urlParams.delete('hash')

  const dataCheckString = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (computedHash !== hash) {
    return { ok: false, error: 'InitData doğrulanmadı' }
  }

  const userRaw = urlParams.get('user')
  if (!userRaw) {
    return { ok: false, error: 'User məlumatı tapılmadı' }
  }

  const user = JSON.parse(userRaw)

  return {
    ok: true,
    user,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const initData = body?.initData as string | undefined

    if (!initData) {
      return NextResponse.json(
        { ok: false, error: 'initData göndərilməyib' },
        { status: 400 }
      )
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const adminId = process.env.TELEGRAM_ADMIN_ID

    if (!botToken) {
      return NextResponse.json(
        { ok: false, error: 'Serverdə TELEGRAM_BOT_TOKEN yoxdur' },
        { status: 500 }
      )
    }

    const result = validateTelegramInitData(initData, botToken)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 401 }
      )
    }

    const user = result.user as {
      id: number
      username?: string
      first_name?: string
      last_name?: string
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()

    return NextResponse.json({
      ok: true,
      user: {
        telegramId: user.id,
        username: user.username || null,
        fullName: fullName || 'Telegram User',
        isAdmin: String(user.id) === String(adminId),
      },
    })
  } catch (error) {
    console.error('telegram-auth error:', error)
    return NextResponse.json(
      { ok: false, error: 'Server xətası baş verdi' },
      { status: 500 }
    )
  }
}