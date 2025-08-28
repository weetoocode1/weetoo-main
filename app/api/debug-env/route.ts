import { NextResponse } from 'next/server';

export async function GET() {
  // This will show the actual environment variables on the server side
  return NextResponse.json({
    message: 'Environment variables check',
    deepcoin: {
      hasKey: !!process.env.DEEPCOIN_API_KEY,
      hasSecret: !!process.env.DEEPCOIN_API_SECRET,
      hasPassphrase: !!process.env.DEEPCOIN_API_PASSPHRASE,
      keyLength: process.env.DEEPCOIN_API_KEY?.length || 0,
      secretLength: process.env.DEEPCOIN_API_SECRET?.length || 0,
      passphraseLength: process.env.DEEPCOIN_API_PASSPHRASE?.length || 0,
      // Show first few characters for debugging (be careful with secrets in production)
      keyPreview: process.env.DEEPCOIN_API_KEY?.substring(0, 8) + '...',
      secretPreview: process.env.DEEPCOIN_API_SECRET?.substring(0, 8) + '...',
      passphrasePreview: process.env.DEEPCOIN_API_PASSPHRASE?.substring(0, 4) + '...',
    }
  });
}
